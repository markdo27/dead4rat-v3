/**
 * FluidEngine.js — GPGPU Navier-Stokes Fluid Solver for Dead4rat
 * ---------------------------------------------------------------
 * Based on Stable-Fluids algorithm (Jos Stam, 1999).
 * Inspired by fluidsim pseudospectral principles — operator-split
 * advection + Jacobi pressure projection on the GPU.
 *
 * Architecture:
 *   - All passes run in #version 300 es (WebGL2)
 *   - Shared GL context with CanvasEngine (same WebGL2 ctx)
 *   - Composites fluid OVER webcam feed (webcam remains visible)
 *   - Optical flow drives velocity splats from motion detection
 */

class FluidEngine {
    constructor(gl) {
        if (!gl) { console.error('[FluidEngine] No GL context provided'); return; }
        this.gl = gl;
        this.SIM_W = 256;   // Simulation grid width
        this.SIM_H = 256;   // Simulation grid height
        this.JACOBI_ITER = 20; // Pressure solver iterations

        // Runtime params (overridden by canvasEngine state)
        this.params = {
            enabled: false,
            viscosity: 0.99,      // Velocity dissipation per frame
            dissipation: 0.98,    // Dye/density dissipation per frame
            opticalGain: 2.0,     // Optical flow → velocity scale
            audioDrive: 0.5,      // Audio → splat intensity
            gain: 1.5,            // Render brightness
            mix: 0.7,             // Fluid overlay alpha (0=invisible, 1=full replace)
            webcamAlpha: 1.0,     // Webcam passthrough alpha
        };

        try {
            const ext = this.gl.getExtension('EXT_color_buffer_float');
            if (!ext) {
                console.warn('[FluidEngine] EXT_color_buffer_float not supported; using HALF_FLOAT fallback');
            }
            this._initShaders();
            this._initBuffers();
            this._initFBOs();
            console.log('[FluidEngine] ✓ Initialized', this.SIM_W + 'x' + this.SIM_H, 'GPGPU solver');
        } catch (e) {
            console.error('[FluidEngine] Init failed:', e);
        }
    }

    // ── Shader Compiler ──────────────────────────────────────────────
    _compile(vert, frag, name) {
        const gl = this.gl;
        const mkShader = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error(`[FluidEngine] ${name} shader error:`, gl.getShaderInfoLog(s));
            }
            return s;
        };
        const prog = gl.createProgram();
        gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vert));
        gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, frag));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error(`[FluidEngine] ${name} link error:`, gl.getProgramInfoLog(prog));
        }
        return prog;
    }

    _initShaders() {
        // Full-screen quad vertex shader (shared by all passes)
        const VERT = `#version 300 es
            in vec2 a_pos;
            out vec2 v_uv;
            void main() {
                v_uv = a_pos * 0.5 + 0.5;
                gl_Position = vec4(a_pos, 0.0, 1.0);
            }
        `;

        // ── 1. Optical Flow (motion detection from webcam frame delta) ──
        this.progFlow = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_curr;
            uniform sampler2D u_prev;
            uniform float u_threshold;
            uniform float u_strength;
            in vec2 v_uv;
            out vec4 fragColor;

            void main() {
                vec2 texel = 1.0 / vec2(textureSize(u_curr, 0));
                vec4 curr = texture(u_curr, v_uv);
                vec4 prev = texture(u_prev, v_uv);

                float lum_curr = dot(curr.rgb, vec3(0.299, 0.587, 0.114));
                float lum_prev = dot(prev.rgb, vec3(0.299, 0.587, 0.114));
                float diff = lum_curr - lum_prev;

                // Horn-Schunck-inspired spatial gradient
                float dx = dot(texture(u_curr, v_uv + vec2(texel.x, 0.0)).rgb - 
                               texture(u_curr, v_uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));
                float dy = dot(texture(u_curr, v_uv + vec2(0.0, texel.y)).rgb - 
                               texture(u_curr, v_uv - vec2(0.0, texel.y)).rgb, vec3(0.333));

                float mag = sqrt(dx * dx + dy * dy) + 0.001;
                vec2 flow = vec2(0.0);
                float absDiff = abs(diff);
                if (absDiff > u_threshold) {
                    flow = -vec2(dx, dy) * (diff / mag) * u_strength;
                }

                // Pack: rg = velocity, b = motion magnitude
                fragColor = vec4(flow, absDiff, 1.0);
            }
        `, 'OpticalFlow');

        // ── 2. Advection (backtrace particle positions) ──
        this.progAdvect = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_velocity;
            uniform sampler2D u_source;
            uniform float u_dt;
            uniform float u_dissipation;
            in vec2 v_uv;
            out vec4 fragColor;

            void main() {
                vec2 vel = texture(u_velocity, v_uv).xy;
                // Backtrace: sample from where fluid came from
                vec2 pos = v_uv - vel * u_dt;
                pos = clamp(pos, 0.0, 1.0);
                fragColor = texture(u_source, pos) * u_dissipation;
            }
        `, 'Advect');

        // ── 3. Divergence ──
        this.progDivergence = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_velocity;
            in vec2 v_uv;
            out vec4 fragColor;

            void main() {
                vec2 h = 1.0 / vec2(textureSize(u_velocity, 0));
                float vL = texture(u_velocity, v_uv - vec2(h.x, 0.0)).x;
                float vR = texture(u_velocity, v_uv + vec2(h.x, 0.0)).x;
                float vB = texture(u_velocity, v_uv - vec2(0.0, h.y)).y;
                float vT = texture(u_velocity, v_uv + vec2(0.0, h.y)).y;
                float div = 0.5 * (vR - vL + vT - vB);
                fragColor = vec4(div, 0.0, 0.0, 1.0);
            }
        `, 'Divergence');

        // ── 4. Pressure (Jacobi iteration) ──
        this.progPressure = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_pressure;
            uniform sampler2D u_divergence;
            in vec2 v_uv;
            out vec4 fragColor;

            void main() {
                vec2 h = 1.0 / vec2(textureSize(u_pressure, 0));
                float pL = texture(u_pressure, v_uv - vec2(h.x, 0.0)).x;
                float pR = texture(u_pressure, v_uv + vec2(h.x, 0.0)).x;
                float pB = texture(u_pressure, v_uv - vec2(0.0, h.y)).x;
                float pT = texture(u_pressure, v_uv + vec2(0.0, h.y)).x;
                float div = texture(u_divergence, v_uv).x;
                float p = (pL + pR + pB + pT - div) * 0.25;
                fragColor = vec4(p, 0.0, 0.0, 1.0);
            }
        `, 'Pressure');

        // ── 5. Gradient Subtract (make velocity divergence-free) ──
        this.progProject = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_velocity;
            uniform sampler2D u_pressure;
            in vec2 v_uv;
            out vec4 fragColor;

            void main() {
                vec2 h = 1.0 / vec2(textureSize(u_pressure, 0));
                float pL = texture(u_pressure, v_uv - vec2(h.x, 0.0)).x;
                float pR = texture(u_pressure, v_uv + vec2(h.x, 0.0)).x;
                float pB = texture(u_pressure, v_uv - vec2(0.0, h.y)).x;
                float pT = texture(u_pressure, v_uv + vec2(0.0, h.y)).x;
                vec2 vel = texture(u_velocity, v_uv).xy;
                vel -= 0.5 * vec2(pR - pL, pT - pB);
                fragColor = vec4(vel, 0.0, 1.0);
            }
        `, 'Project');

        // ── 6. Splat (inject velocity / dye into field) ──
        this.progSplat = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_base;
            uniform sampler2D u_flow;
            uniform float u_scale;
            uniform float u_motionThresh;
            in vec2 v_uv;
            out vec4 fragColor;

            void main() {
                vec4 base = texture(u_base, v_uv);
                vec4 flow = texture(u_flow, v_uv);
                // Only inject where there is sufficient motion
                float motion = flow.b;
                float mask = smoothstep(u_motionThresh, u_motionThresh + 0.05, motion);
                fragColor = base + vec4(flow.xy * mask * u_scale, motion * mask * u_scale, 0.0);
            }
        `, 'Splat');

        // ── 7. Composite Render (webcam + fluid overlay) ──
        this.progRender = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_webcam;      // Live webcam feed
            uniform sampler2D u_density;     // Fluid density field
            uniform float u_gain;            // Fluid brightness multiplier
            uniform float u_mix;             // Fluid overlay strength (0-1)
            uniform float u_webcamAlpha;     // Webcam visibility (1=full)
            in vec2 v_uv;
            out vec4 fragColor;

            // Thermal color mapping: dark → red → orange → white
            vec3 thermalRamp(float t) {
                t = clamp(t, 0.0, 1.0);
                vec3 c0 = vec3(0.0, 0.0, 0.0);
                vec3 c1 = vec3(0.6, 0.0, 0.1);
                vec3 c2 = vec3(1.0, 0.35, 0.0);
                vec3 c3 = vec3(1.0, 0.85, 0.2);
                vec3 c4 = vec3(1.0, 1.0, 1.0);
                if (t < 0.25) return mix(c0, c1, t * 4.0);
                if (t < 0.5)  return mix(c1, c2, (t - 0.25) * 4.0);
                if (t < 0.75) return mix(c2, c3, (t - 0.5)  * 4.0);
                return mix(c3, c4, (t - 0.75) * 4.0);
            }

            // Electric plasma color: cyan → magenta → yellow
            vec3 plasmaRamp(float t) {
                t = clamp(t, 0.0, 1.0);
                float h = t * 2.5; // wrap hue through colors
                vec3 col;
                col.r = 0.5 + 0.5 * sin(h * 3.14159 + 0.0);
                col.g = 0.5 + 0.5 * sin(h * 3.14159 + 2.094);
                col.b = 0.5 + 0.5 * sin(h * 3.14159 + 4.189);
                return col * col; // gamma-like boost
            }

            void main() {
                // Webcam passthrough (flip V because webcam UV is inverted)
                vec2 camUV = vec2(v_uv.x, 1.0 - v_uv.y);
                vec4 cam = texture(u_webcam, camUV);

                // Density field (rg = velocity, b = dye magnitude)
                vec4 den = texture(u_density, v_uv);
                float dye = clamp(den.b * u_gain, 0.0, 1.0);
                float velMag = clamp(length(den.xy) * u_gain * 0.5, 0.0, 1.0);
                float combined = max(dye, velMag);

                // Color: thermal ramp blended with plasma based on velocity direction
                vec3 thermal = thermalRamp(dye);
                vec3 plasma   = plasmaRamp(velMag);
                vec3 fluidCol = mix(thermal, plasma, velMag * 0.5);

                // Composite: show webcam underneath, overlay fluid where it's bright
                vec3 finalCol = cam.rgb * u_webcamAlpha;
                finalCol = mix(finalCol, fluidCol, combined * u_mix);

                fragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
            }
        `, 'Render');

        // ── 8. Copy/Blit ──
        this.progBlit = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_tex;
            in vec2 v_uv;
            out vec4 fragColor;
            void main() {
                fragColor = texture(u_tex, v_uv);
            }
        `, 'Blit');
    }

    _initBuffers() {
        const gl = this.gl;
        this.quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    }

    _createFBO(w, h, internalFormat, format, type) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.warn('[FluidEngine] FBO incomplete:', status);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fbo, tex, w, h };
    }

    _initFBOs() {
        const gl = this.gl;
        const W = this.SIM_W, H = this.SIM_H;

        // Try RGBA32F first, fall back to RGBA16F
        let intFmt = gl.RGBA32F;
        let type = gl.FLOAT;
        let extCBF = gl.getExtension('EXT_color_buffer_float');
        if (!extCBF) {
            intFmt = gl.RGBA16F;
            type = gl.HALF_FLOAT;
            gl.getExtension('EXT_color_buffer_half_float');
        }

        this._floatType = type;
        this._intFmt = intFmt;

        const mk = () => this._createFBO(W, H, intFmt, gl.RGBA, type);

        // Velocity ping-pong
        this.velA = mk(); this.velB = mk();
        // Density ping-pong (dye field driven by motion)
        this.denA = mk(); this.denB = mk();
        // Pressure ping-pong
        this.prsA = mk(); this.prsB = mk();
        // Divergence scratch
        this.divFBO = mk();
        // Optical flow output
        this.flowFBO = mk();
        // History frame (previous webcam frame for optical flow)
        // Use RGBA + UNSIGNED_BYTE for webcam history (can't float-upload a video texture)
        this.histFBO = this._createFBO(W, H, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
    }

    // ── Internal fullscreen draw ──────────────────────────────────────
    _drawQuad(prog) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
        const loc = gl.getAttribLocation(prog, 'a_pos');
        if (loc < 0) return; // attrib not found
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    _bindTex(unit, tex) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
    }

    _setFBO(fbo, w, h) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, w, h);
    }

    _swap(a, b) { return [b, a]; }

    // ── Blit one texture to a framebuffer ────────────────────────────
    _blit(srcTex, destFBO, w, h) {
        const gl = this.gl;
        this._setFBO(destFBO, w, h);
        gl.useProgram(this.progBlit);
        this._bindTex(0, srcTex);
        gl.uniform1i(gl.getUniformLocation(this.progBlit, 'u_tex'), 0);
        this._drawQuad(this.progBlit);
    }

    // ── Copy webcam texture to low-res history FBO ───────────────────
    _captureHistory(webcamTex) {
        const gl = this.gl;
        this._setFBO(this.histFBO.fbo, this.SIM_W, this.SIM_H);
        gl.useProgram(this.progBlit);
        this._bindTex(0, webcamTex);
        gl.uniform1i(gl.getUniformLocation(this.progBlit, 'u_tex'), 0);
        this._drawQuad(this.progBlit);
    }

    // ─────────────────────────────────────────────────────────────────
    // PUBLIC: update(webcamTex, params, dt)
    //   Called every frame by CanvasEngine before rendering.
    //   webcamTex = GL texture ID of the current webcam frame.
    //   params    = { viscosity, dissipation, opticalGain, audioDrive, gain, mix }
    //   dt        = frame delta in seconds (typically 0.016)
    // ─────────────────────────────────────────────────────────────────
    update(webcamTex, params, dt = 0.016) {
        const gl = this.gl;
        if (!this.velA) return; // not initialised

        // Merge params
        if (params) Object.assign(this.params, params);
        const p = this.params;

        const W = this.SIM_W, H = this.SIM_H;

        // ── Pass 1: Optical Flow ──────────────────────────────────────
        this._setFBO(this.flowFBO.fbo, W, H);
        gl.useProgram(this.progFlow);
        this._bindTex(0, webcamTex);            // current frame
        this._bindTex(1, this.histFBO.tex);     // previous frame
        gl.uniform1i(gl.getUniformLocation(this.progFlow, 'u_curr'), 0);
        gl.uniform1i(gl.getUniformLocation(this.progFlow, 'u_prev'), 1);
        gl.uniform1f(gl.getUniformLocation(this.progFlow, 'u_threshold'), 0.01);
        gl.uniform1f(gl.getUniformLocation(this.progFlow, 'u_strength'), p.opticalGain || 2.0);
        this._drawQuad(this.progFlow);

        // ── Pass 2: Splat flow into velocity & density ────────────────
        // Velocity splat
        this._setFBO(this.velB.fbo, W, H);
        gl.useProgram(this.progSplat);
        this._bindTex(0, this.velA.tex);
        this._bindTex(1, this.flowFBO.tex);
        gl.uniform1i(gl.getUniformLocation(this.progSplat, 'u_base'), 0);
        gl.uniform1i(gl.getUniformLocation(this.progSplat, 'u_flow'), 1);
        gl.uniform1f(gl.getUniformLocation(this.progSplat, 'u_scale'), 3.0);
        gl.uniform1f(gl.getUniformLocation(this.progSplat, 'u_motionThresh'), 0.008);
        this._drawQuad(this.progSplat);
        [this.velA, this.velB] = this._swap(this.velA, this.velB);

        // Density splat
        this._setFBO(this.denB.fbo, W, H);
        gl.useProgram(this.progSplat);
        this._bindTex(0, this.denA.tex);
        this._bindTex(1, this.flowFBO.tex);
        gl.uniform1i(gl.getUniformLocation(this.progSplat, 'u_base'), 0);
        gl.uniform1i(gl.getUniformLocation(this.progSplat, 'u_flow'), 1);
        gl.uniform1f(gl.getUniformLocation(this.progSplat, 'u_scale'), 5.0);
        gl.uniform1f(gl.getUniformLocation(this.progSplat, 'u_motionThresh'), 0.008);
        this._drawQuad(this.progSplat);
        [this.denA, this.denB] = this._swap(this.denA, this.denB);

        // ── Pass 3: Advect velocity ───────────────────────────────────
        this._setFBO(this.velB.fbo, W, H);
        gl.useProgram(this.progAdvect);
        this._bindTex(0, this.velA.tex);  // velocity field
        this._bindTex(1, this.velA.tex);  // source = velocity itself
        gl.uniform1i(gl.getUniformLocation(this.progAdvect, 'u_velocity'), 0);
        gl.uniform1i(gl.getUniformLocation(this.progAdvect, 'u_source'), 1);
        gl.uniform1f(gl.getUniformLocation(this.progAdvect, 'u_dt'), dt);
        gl.uniform1f(gl.getUniformLocation(this.progAdvect, 'u_dissipation'), p.viscosity || 0.99);
        this._drawQuad(this.progAdvect);
        [this.velA, this.velB] = this._swap(this.velA, this.velB);

        // ── Pass 4: Advect density ────────────────────────────────────
        this._setFBO(this.denB.fbo, W, H);
        gl.useProgram(this.progAdvect);
        this._bindTex(0, this.velA.tex);  // use advected velocity
        this._bindTex(1, this.denA.tex);  // source = density
        gl.uniform1i(gl.getUniformLocation(this.progAdvect, 'u_velocity'), 0);
        gl.uniform1i(gl.getUniformLocation(this.progAdvect, 'u_source'), 1);
        gl.uniform1f(gl.getUniformLocation(this.progAdvect, 'u_dt'), dt);
        gl.uniform1f(gl.getUniformLocation(this.progAdvect, 'u_dissipation'), p.dissipation || 0.97);
        this._drawQuad(this.progAdvect);
        [this.denA, this.denB] = this._swap(this.denA, this.denB);

        // ── Pass 5: Compute divergence ────────────────────────────────
        this._setFBO(this.divFBO.fbo, W, H);
        gl.useProgram(this.progDivergence);
        this._bindTex(0, this.velA.tex);
        gl.uniform1i(gl.getUniformLocation(this.progDivergence, 'u_velocity'), 0);
        this._drawQuad(this.progDivergence);

        // ── Pass 6: Jacobi pressure solve ─────────────────────────────
        // Clear pressure field
        this._setFBO(this.prsA.fbo, W, H);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.progPressure);
        gl.uniform1i(gl.getUniformLocation(this.progPressure, 'u_divergence'), 1);
        this._bindTex(1, this.divFBO.tex);

        for (let i = 0; i < this.JACOBI_ITER; i++) {
            this._setFBO(this.prsB.fbo, W, H);
            this._bindTex(0, this.prsA.tex);
            gl.uniform1i(gl.getUniformLocation(this.progPressure, 'u_pressure'), 0);
            this._drawQuad(this.progPressure);
            [this.prsA, this.prsB] = this._swap(this.prsA, this.prsB);
        }

        // ── Pass 7: Subtract pressure gradient ───────────────────────
        this._setFBO(this.velB.fbo, W, H);
        gl.useProgram(this.progProject);
        this._bindTex(0, this.velA.tex);
        this._bindTex(1, this.prsA.tex);
        gl.uniform1i(gl.getUniformLocation(this.progProject, 'u_velocity'), 0);
        gl.uniform1i(gl.getUniformLocation(this.progProject, 'u_pressure'), 1);
        this._drawQuad(this.progProject);
        [this.velA, this.velB] = this._swap(this.velA, this.velB);

        // ── Update History (copy webcam to prev-frame buffer) ─────────
        this._captureHistory(webcamTex);

        // -- Store current webcam texture for render pass ---
        this._webcamTex = webcamTex;
    }

    // ─────────────────────────────────────────────────────────────────
    // PUBLIC: render(gain, mix)
    //   Called by CanvasEngine to composite fluid over webcam.
    //   Renders to WHATEVER framebuffer is currently bound (renderTarget).
    // ─────────────────────────────────────────────────────────────────
    render(gain, mix) {
        const gl = this.gl;
        if (!this.velA || !this.denA) return;

        const p = this.params;
        const g = gain !== undefined ? gain : (p.gain || 1.5);
        const m = mix  !== undefined ? mix  : (p.mix  || 0.7);

        // Note: we DO NOT bind an FBO here. CanvasEngine sets up the
        // correct destination FBO (renderTarget) before calling render().
        gl.useProgram(this.progRender);

        this._bindTex(0, this._webcamTex || this.histFBO.tex);  // webcam
        this._bindTex(1, this.denA.tex);                         // density field

        gl.uniform1i(gl.getUniformLocation(this.progRender, 'u_webcam'),  0);
        gl.uniform1i(gl.getUniformLocation(this.progRender, 'u_density'), 1);
        gl.uniform1f(gl.getUniformLocation(this.progRender, 'u_gain'), g);
        gl.uniform1f(gl.getUniformLocation(this.progRender, 'u_mix'),  m);
        gl.uniform1f(gl.getUniformLocation(this.progRender, 'u_webcamAlpha'), p.webcamAlpha || 1.0);

        this._drawQuad(this.progRender);
    }

    // ─────────────────────────────────────────────────────────────────
    // PUBLIC: dispose()
    //   Frees all GPU resources.
    // ─────────────────────────────────────────────────────────────────
    dispose() {
        const gl = this.gl;
        const fbos = [this.velA, this.velB, this.denA, this.denB,
                      this.prsA, this.prsB, this.divFBO, this.flowFBO, this.histFBO];
        fbos.forEach(f => {
            if (f) { gl.deleteFramebuffer(f.fbo); gl.deleteTexture(f.tex); }
        });
        const progs = [this.progFlow, this.progAdvect, this.progDivergence,
                       this.progPressure, this.progProject, this.progSplat,
                       this.progRender, this.progBlit];
        progs.forEach(p => { if (p) gl.deleteProgram(p); });
        gl.deleteBuffer(this.quadBuf);
        console.log('[FluidEngine] Disposed.');
    }
}

window.FluidEngine = FluidEngine;
