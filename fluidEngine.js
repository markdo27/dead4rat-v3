/**
 * FluidEngine.js
 * High-performance GPGPU Navier-Stokes Fluid Solver for Dead4rat.
 * Based on the stable "Safety-Core" architectural principles.
 */

class FluidEngine {
    constructor(gl) {
        this.gl = gl;
        this.width = 512; // Simulation resolution (upscaled for render)
        this.height = 512;

        this.initShaders();
        this.initBuffers();
        this.initFBOs();
        
        console.log("[FluidEngine] GPGPU Solver Initialized (512x512)");
    }

    initShaders() {
        const gl = this.gl;

        const vsh = `#version 300 es
            precision highp float;
            in vec2 a_position;
            out vec2 v_uv;
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        const compile = (vs, fs, name) => {
            const vShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vShader, vs);
            gl.compileShader(vShader);
            if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
                console.error(`VS Compile Error [${name}]:`, gl.getShaderInfoLog(vShader));
            }

            const fShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fShader, fs);
            gl.compileShader(fShader);
            if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
                console.error(`FS Compile Error [${name}]:`, gl.getShaderInfoLog(fShader));
            }

            const prog = gl.createProgram();
            gl.attachShader(prog, vShader);
            gl.attachShader(prog, fShader);
            gl.linkProgram(prog);
            return prog;
        };

        // --- 1. Optical Flow Pass ---
        this.progFlow = compile(vsh, `#version 300 es
            precision highp float;
            uniform sampler2D u_curr;
            uniform sampler2D u_prev;
            uniform float u_threshold;
            uniform float u_strength;
            in vec2 v_uv;
            out vec4 outColor;

            void main() {
                vec4 curr = texture(u_curr, v_uv);
                vec4 prev = texture(u_prev, v_uv);
                
                // Simple intensity-based optical flow
                float diff = length(curr.rgb - prev.rgb);
                vec2 flow = vec2(0.0);
                
                if (diff > u_threshold) {
                    // Sample neighbors to find motion direction
                    float offset = 1.0 / 512.0;
                    float nx = length(texture(u_curr, v_uv + vec2(offset, 0.0)).rgb - prev.rgb);
                    float ny = length(texture(u_curr, v_uv + vec2(0.0, offset)).rgb - prev.rgb);
                    flow = vec2(nx - diff, ny - diff) * u_strength;
                }
                
                outColor = vec4(flow, diff, 1.0);
            }
        `, "OpticalFlow");

        // --- 2. Advection Pass ---
        this.progAdvect = compile(vsh, `#version 300 es
            precision highp float;
            uniform sampler2D u_velocity;
            uniform sampler2D u_source;
            uniform float u_dt;
            uniform float u_dissipation;
            in vec2 v_uv;
            out vec4 outColor;

            void main() {
                vec2 vel = texture(u_velocity, v_uv).xy;
                vec2 coord = v_uv - u_dt * vel;
                outColor = texture(u_source, coord) * u_dissipation;
            }
        `, "Advect");

        // --- 3. Divergence Pass ---
        this.progDiverge = compile(vsh, `#version 300 es
            precision highp float;
            uniform sampler2D u_velocity;
            in vec2 v_uv;
            out vec4 outColor;

            void main() {
                float h = 1.0 / 512.0;
                float vL = texture(u_velocity, v_uv - vec2(h, 0)).x;
                float vR = texture(u_velocity, v_uv + vec2(h, 0)).x;
                float vB = texture(u_velocity, v_uv - vec2(0, h)).y;
                float vT = texture(u_velocity, v_uv + vec2(0, h)).y;
                
                float div = 0.5 * (vR - vL + vT - vB);
                outColor = vec4(div, 0, 0, 1);
            }
        `, "Diverge");

        // --- 4. Pressure (Jacobi) Pass ---
        this.progPressure = compile(vsh, `#version 300 es
            precision highp float;
            uniform sampler2D u_pressure;
            uniform sampler2D u_divergence;
            in vec2 v_uv;
            out vec4 outColor;

            void main() {
                float h = 1.0 / 512.0;
                float pL = texture(u_pressure, v_uv - vec2(h, 0)).x;
                float pR = texture(u_pressure, v_uv + vec2(h, 0)).x;
                float pB = texture(u_pressure, v_uv - vec2(0, h)).x;
                float pT = texture(u_pressure, v_uv + vec2(0, h)).x;
                float div = texture(u_divergence, v_uv).x;
                
                float p = 0.25 * (pL + pR + pB + pT - div);
                outColor = vec4(p, 0, 0, 1);
            }
        `, "Pressure");

        // --- 5. Project Pass ---
        this.progProject = compile(vsh, `#version 300 es
            precision highp float;
            uniform sampler2D u_velocity;
            uniform sampler2D u_pressure;
            in vec2 v_uv;
            out vec4 outColor;

            void main() {
                float h = 1.0 / 512.0;
                float pL = texture(u_pressure, v_uv - vec2(h, 0)).x;
                float pR = texture(u_pressure, v_uv + vec2(h, 0)).x;
                float pB = texture(u_pressure, v_uv - vec2(0, h)).x;
                float pT = texture(u_pressure, v_uv + vec2(0, h)).x;
                
                vec2 vel = texture(u_velocity, v_uv).xy;
                vel -= 0.5 * vec2(pR - pL, pT - pB);
                outColor = vec4(vel, 0, 1);
            }
        `, "Project");

        // --- 6. Render Pass (Thermal) ---
        this.progRender = compile(vsh, `#version 300 es
            precision highp float;
            uniform sampler2D u_density;
            uniform float u_gain;
            uniform float u_mix;
            in vec2 v_uv;
            out vec4 outColor;

            vec3 thermal(float t) {
                // Safety-Core Thermal: Black -> Red -> Orange -> White
                t = clamp(t * u_gain, 0.0, 1.0);
                vec3 c1 = vec3(0.0, 0.0, 0.0);
                vec3 c2 = vec3(0.5, 0.0, 0.0);
                vec3 c3 = vec3(1.0, 0.4, 0.0);
                vec3 c4 = vec3(1.0, 1.0, 1.0);
                
                if (t < 0.33) return mix(c1, c2, t * 3.0);
                if (t < 0.66) return mix(c2, c3, (t - 0.33) * 3.0);
                return mix(c3, c4, (t - 0.66) * 3.0);
            }

            void main() {
                float d = texture(u_density, v_uv).z; // density stored in .z from Flow pass
                outColor = vec4(thermal(d), d * u_mix);
            }
        `, "Render");
    }

    initBuffers() {
        const gl = this.gl;
        this.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    }

    initFBOs() {
        const gl = this.gl;
        const createFBO = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            return { fbo, tex };
        };

        this.fboVelA = createFBO();
        this.fboVelB = createFBO();
        this.fboDenA = createFBO();
        this.fboDenB = createFBO();
        this.fboPressureA = createFBO();
        this.fboPressureB = createFBO();
        this.fboDiverge = createFBO();
        
        // For Optical Flow tracking
        this.fboHistory = createFBO();
    }

    update(webcamTex, params, dt = 0.016) {
        const gl = this.gl;
        gl.viewport(0, 0, this.width, this.height);
        
        // Pass A: Optical Flow (Inject into Velocity + Density)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboDenB.fbo);
        gl.useProgram(this.progFlow);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, webcamTex);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.fboHistory.tex);
        gl.uniform1i(gl.getUniformLocation(this.progFlow, "u_curr"), 0);
        gl.uniform1i(gl.getUniformLocation(this.progFlow, "u_prev"), 1);
        gl.uniform1f(gl.getUniformLocation(this.progFlow, "u_threshold"), 0.05);
        gl.uniform1f(gl.getUniformLocation(this.progFlow, "u_strength"), params.opticalGain || 1.0);
        this.drawQuad(this.progFlow);

        // Inject Flow into Velocity
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboVelB.fbo);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); // Re-use Flow shader output

        // Update History
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboHistory.fbo);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, webcamTex);
        this.blit(webcamTex);

        // Step 1: Advection (Velocity)
        this.swapVel();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboVelB.fbo);
        gl.useProgram(this.progAdvect);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fboVelA.tex);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.fboVelA.tex);
        gl.uniform1i(gl.getUniformLocation(this.progAdvect, "u_velocity"), 0);
        gl.uniform1i(gl.getUniformLocation(this.progAdvect, "u_source"), 1);
        gl.uniform1f(gl.getUniformLocation(this.progAdvect, "u_dt"), dt);
        gl.uniform1f(gl.getUniformLocation(this.progAdvect, "u_dissipation"), params.viscosity || 0.99);
        this.drawQuad(this.progAdvect);

        // Step 2: Advection (Density)
        this.swapDen();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboDenB.fbo);
        gl.useProgram(this.progAdvect);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fboVelB.tex);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.fboDenA.tex);
        gl.uniform1i(gl.getUniformLocation(this.progAdvect, "u_velocity"), 0);
        gl.uniform1i(gl.getUniformLocation(this.progAdvect, "u_source"), 1);
        gl.uniform1f(gl.getUniformLocation(this.progAdvect, "u_dt"), dt);
        gl.uniform1f(gl.getUniformLocation(this.progAdvect, "u_dissipation"), params.dissipation || 0.98);
        this.drawQuad(this.progAdvect);

        // Step 3: Divergence
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboDiverge.fbo);
        gl.useProgram(this.progDiverge);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fboVelB.tex);
        gl.uniform1i(gl.getUniformLocation(this.progDiverge, "u_velocity"), 0);
        this.drawQuad(this.progDiverge);

        // Step 4: Pressure (Jacobi)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboPressureA.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.progPressure);
        gl.uniform1i(gl.getUniformLocation(this.progPressure, "u_divergence"), 1);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.fboDiverge.tex);
        for(let i=0; i<20; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboPressureB.fbo);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fboPressureA.tex);
            gl.uniform1i(gl.getUniformLocation(this.progPressure, "u_pressure"), 0);
            this.drawQuad(this.progPressure);
            this.swapPressure();
        }

        // Step 5: Project
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboVelA.fbo); // Output to VelA
        gl.useProgram(this.progProject);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fboVelB.tex);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.fboPressureA.tex);
        gl.uniform1i(gl.getUniformLocation(this.progProject, "u_velocity"), 0);
        gl.uniform1i(gl.getUniformLocation(this.progProject, "u_pressure"), 1);
        this.drawQuad(this.progProject);
        this.swapVel(); // Keep VelB as the primary
    }

    render(gain = 1.0, mix = 0.5) {
        const gl = this.gl;
        gl.useProgram(this.progRender);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fboDenB.tex);
        gl.uniform1i(gl.getUniformLocation(this.progRender, "u_density"), 0);
        gl.uniform1f(gl.getUniformLocation(this.progRender, "u_gain"), gain);
        gl.uniform1f(gl.getUniformLocation(this.progRender, "u_mix"), mix);
        this.drawQuad(this.progRender);
    }

    drawQuad(prog) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        const posLoc = gl.getAttribLocation(prog, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    blit(tex) {
        // Simple internal blit helper
        const gl = this.gl;
        if (!this._blitProg) {
            this._blitProg = this.initSimpleBlit();
        }
        gl.useProgram(this._blitProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(gl.getUniformLocation(this._blitProg, "u_tex"), 0);
        this.drawQuad(this._blitProg);
    }

    initSimpleBlit() {
        const gl = this.gl;
        const vs = `#version 300 es
            in vec2 a_position;
            out vec2 v_uv;
            void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }
        `;
        const fs = `#version 300 es
            precision highp float;
            uniform sampler2D u_tex;
            in vec2 v_uv;
            out vec4 color;
            void main() { color = texture(u_tex, v_uv); }
        `;
        const vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader, vs); gl.compileShader(vShader);
        const fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader, fs); gl.compileShader(fShader);
        const prog = gl.createProgram();
        gl.attachShader(prog, vShader); gl.attachShader(prog, fShader);
        gl.linkProgram(prog);
        return prog;
    }

    swapVel() { let tmp = this.fboVelA; this.fboVelA = this.fboVelB; this.fboVelB = tmp; }
    swapDen() { let tmp = this.fboDenA; this.fboDenA = this.fboDenB; this.fboDenB = tmp; }
    swapPressure() { let tmp = this.fboPressureA; this.fboPressureA = this.fboPressureB; this.fboPressureB = tmp; }
}

window.FluidEngine = FluidEngine;
