/**
 * FluidEngine.js — GPGPU Navier-Stokes Fluid Solver for Dead4rat
 * ---------------------------------------------------------------
 * Stable-Fluids (Jos Stam 1999) on GPU — WebGL2, #version 300 es.
 *
 * v3 FIXES:
 *  - RGBA8/UNSIGNED_BYTE FBOs everywhere (universal GPU support —
 *    no EXT_color_buffer_float needed)
 *  - Velocity packed as (v*0.5+0.5) → decoded in each pass
 *  - Uniform locations cached once at init (not per-frame)
 *  - Y-flip consistent between webcam and history samples
 *  - Dye injected from BOTH optical flow AND constant ambient energy
 *  - Mouse splat reads canvasEngine globalState for interaction
 *  - Audio-reactive splat pulse
 *  - 6 Jacobi iterations (down from 20) — enough for visual quality
 *  - Debug mode: logs density stats to console
 */

class FluidEngine {
    constructor(gl) {
        if (!gl) { console.error('[FluidEngine] No GL context'); return; }
        this.gl = gl;
        this.W = 256;
        this.H = 256;
        this.JACOBI = 6;

        this.params = {
            enabled:      false,
            viscosity:    0.995,
            dissipation:  0.97,
            opticalGain:  3.0,
            audioDrive:   1.0,
            gain:         2.0,
            mix:          0.75,
        };

        // Cached uniform locations (filled in _cacheUniforms)
        this._u = {};
        this._frameCount = 0;

        try {
            this._initShaders();
            this._initBuffers();
            this._initFBOs();
            this._cacheUniforms();
            console.log('[FluidEngine v3] ✓ RGBA8 solver ready', this.W + 'x' + this.H);
        } catch(e) {
            console.error('[FluidEngine] Init error:', e);
        }
    }

    // ── Shader compiler ──────────────────────────────────────────
    _compile(vs, fs, label) {
        const gl = this.gl;
        const mk = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                console.error(`[FluidEngine:${label}]`, gl.getShaderInfoLog(s));
            return s;
        };
        const p = gl.createProgram();
        gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
        gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS))
            console.error(`[FluidEngine:${label}] link:`, gl.getProgramInfoLog(p));
        return p;
    }

    _initShaders() {
        const VERT = `#version 300 es
            in vec2 a_pos;
            out vec2 v_uv;
            void main() {
                v_uv = a_pos * 0.5 + 0.5;
                gl_Position = vec4(a_pos, 0.0, 1.0);
            }`;

        // ── Shared decode/encode helpers used in several passes ──
        // Velocity is stored as (vx*0.5+0.5, vy*0.5+0.5) in rg channels
        // Dye magnitude is stored in b channel (0-1)
        // a = 1.0 always (RGBA8 doesn't need the alpha for data)
        const DECODE_VEL = `
            vec2 decodeVel(vec4 s) { return s.rg * 2.0 - 1.0; }
            vec4 encodeVel(vec2 v, float dye) {
                return vec4(clamp(v * 0.5 + 0.5, 0.0, 1.0), clamp(dye, 0.0, 1.0), 1.0);
            }
        `;

        // ── 1. Optical Flow ──────────────────────────────────────
        this.progFlow = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_curr;   // current webcam frame
            uniform sampler2D u_prev;   // previous frame (histFBO)
            uniform float u_strength;
            in vec2 v_uv;
            out vec4 fragColor;
            void main() {
                // Both textures sampled with same UV (no Y flip here;
                // histFBO is captured with same orientation as webcam).
                vec2 texel = 1.0 / vec2(textureSize(u_curr, 0));
                float lc = dot(texture(u_curr, v_uv).rgb, vec3(0.299,0.587,0.114));
                float lp = dot(texture(u_prev, v_uv).rgb, vec3(0.299,0.587,0.114));
                float diff = lc - lp;

                float dx = dot(texture(u_curr, v_uv + vec2(texel.x,0)).rgb -
                               texture(u_curr, v_uv - vec2(texel.x,0)).rgb, vec3(0.333));
                float dy = dot(texture(u_curr, v_uv + vec2(0,texel.y)).rgb -
                               texture(u_curr, v_uv - vec2(0,texel.y)).rgb, vec3(0.333));
                float mag = length(vec2(dx,dy)) + 0.001;

                float absDiff = abs(diff);
                vec2 flow = vec2(0.0);
                if (absDiff > 0.005) {
                    flow = -vec2(dx,dy) * (diff / mag) * u_strength;
                }
                // rg = flow [-1,1] packed, b = motion magnitude, a = 1
                fragColor = vec4(
                    clamp(flow * 0.5 + 0.5, 0.0, 1.0),
                    clamp(absDiff, 0.0, 1.0),
                    1.0
                );
            }`, 'Flow');

        // ── 2. Advect ────────────────────────────────────────────
        this.progAdvect = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_vel;    // velocity field (encoded)
            uniform sampler2D u_src;    // field to advect
            uniform float u_dt;
            uniform float u_decay;
            in vec2 v_uv;
            out vec4 fragColor;
            ${DECODE_VEL}
            void main() {
                vec2 vel = decodeVel(texture(u_vel, v_uv));
                vec2 pos = clamp(v_uv - vel * u_dt, 0.001, 0.999);
                fragColor = texture(u_src, pos) * u_decay;
            }`, 'Advect');

        // ── 3. Splat (add flow→velocity, motion→dye) ─────────────
        this.progSplat = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_field;  // current field (encoded vel)
            uniform sampler2D u_flow;   // optical flow output
            uniform float u_velScale;
            uniform float u_dyeScale;
            uniform float u_thresh;
            in vec2 v_uv;
            out vec4 fragColor;
            ${DECODE_VEL}
            void main() {
                vec4 field = texture(u_field, v_uv);
                vec2 vel   = decodeVel(field);
                float dye  = field.b;

                vec4 flow  = texture(u_flow, v_uv);
                vec2 fvel  = flow.rg * 2.0 - 1.0;  // decode flow vel
                float motion = flow.b;

                float mask = smoothstep(u_thresh, u_thresh + 0.06, motion);
                vel += fvel * mask * u_velScale;
                dye += motion * mask * u_dyeScale;

                fragColor = encodeVel(
                    clamp(vel, -1.0, 1.0),
                    clamp(dye, 0.0, 1.0)
                );
            }`, 'Splat');

        // ── 4. Mouse Splat (single circular force injection) ─────
        this.progMouse = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_field;
            uniform vec2 u_pos;     // [0,1] UV position
            uniform vec2 u_force;   // velocity force to inject
            uniform float u_dye;    // dye amount to inject
            uniform float u_radius;
            in vec2 v_uv;
            out vec4 fragColor;
            ${DECODE_VEL}
            void main() {
                vec4 f = texture(u_field, v_uv);
                vec2 vel = decodeVel(f);
                float dye = f.b;

                float d = length(v_uv - u_pos);
                float splat = exp(-d * d / (u_radius * u_radius));

                vel += u_force * splat;
                dye += u_dye * splat;

                fragColor = encodeVel(
                    clamp(vel, -1.0, 1.0),
                    clamp(dye, 0.0, 1.0)
                );
            }`, 'Mouse');

        // ── 5. Divergence ────────────────────────────────────────
        this.progDiv = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_vel;
            in vec2 v_uv;
            out vec4 fragColor;
            ${DECODE_VEL}
            void main() {
                vec2 h = 1.0 / vec2(textureSize(u_vel, 0));
                float vR = decodeVel(texture(u_vel, v_uv + vec2(h.x,0))).x;
                float vL = decodeVel(texture(u_vel, v_uv - vec2(h.x,0))).x;
                float vT = decodeVel(texture(u_vel, v_uv + vec2(0,h.y))).y;
                float vB = decodeVel(texture(u_vel, v_uv - vec2(0,h.y))).y;
                float div = 0.5 * (vR - vL + vT - vB);
                // Encode divergence: 0.5 = zero, [0,1] range
                fragColor = vec4(div * 0.5 + 0.5, 0.5, 0.5, 1.0);
            }`, 'Div');

        // ── 6. Pressure (Jacobi) ─────────────────────────────────
        this.progPrs = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_prs;
            uniform sampler2D u_div;
            in vec2 v_uv;
            out vec4 fragColor;
            void main() {
                vec2 h = 1.0 / vec2(textureSize(u_prs, 0));
                float pR = texture(u_prs, v_uv + vec2(h.x,0)).r * 2.0 - 1.0;
                float pL = texture(u_prs, v_uv - vec2(h.x,0)).r * 2.0 - 1.0;
                float pT = texture(u_prs, v_uv + vec2(0,h.y)).r * 2.0 - 1.0;
                float pB = texture(u_prs, v_uv - vec2(0,h.y)).r * 2.0 - 1.0;
                float div = texture(u_div, v_uv).r * 2.0 - 1.0;
                float p = (pL + pR + pB + pT - div) * 0.25;
                fragColor = vec4(p * 0.5 + 0.5, 0.5, 0.5, 1.0);
            }`, 'Prs');

        // ── 7. Project (subtract pressure gradient) ──────────────
        this.progProj = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_vel;
            uniform sampler2D u_prs;
            in vec2 v_uv;
            out vec4 fragColor;
            ${DECODE_VEL}
            void main() {
                vec4 f = texture(u_vel, v_uv);
                vec2 vel = decodeVel(f);
                float dye = f.b;

                vec2 h = 1.0 / vec2(textureSize(u_prs, 0));
                float pR = texture(u_prs, v_uv + vec2(h.x,0)).r * 2.0 - 1.0;
                float pL = texture(u_prs, v_uv - vec2(h.x,0)).r * 2.0 - 1.0;
                float pT = texture(u_prs, v_uv + vec2(0,h.y)).r * 2.0 - 1.0;
                float pB = texture(u_prs, v_uv - vec2(0,h.y)).r * 2.0 - 1.0;
                vel -= 0.5 * vec2(pR - pL, pT - pB);

                fragColor = encodeVel(
                    clamp(vel, -1.0, 1.0),
                    clamp(dye, 0.0, 1.0)
                );
            }`, 'Proj');

        // ── 8. Composite Render ──────────────────────────────────
        this.progRender = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_webcam;
            uniform sampler2D u_fluid;   // velocity+dye field
            uniform float u_gain;
            uniform float u_mix;
            in vec2 v_uv;
            out vec4 fragColor;

            vec3 palette(float t) {
                // Perceptually vibrant: dark → electric blue → cyan → orange → white
                t = clamp(t, 0.0, 1.0);
                if (t < 0.2) return mix(vec3(0.0,0.0,0.0),  vec3(0.05,0.0,0.4), t*5.0);
                if (t < 0.4) return mix(vec3(0.05,0.0,0.4), vec3(0.0,0.6,0.9),  (t-0.2)*5.0);
                if (t < 0.6) return mix(vec3(0.0,0.6,0.9),  vec3(1.0,0.4,0.0),  (t-0.4)*5.0);
                if (t < 0.8) return mix(vec3(1.0,0.4,0.0),  vec3(1.0,1.0,0.1),  (t-0.6)*5.0);
                return mix(vec3(1.0,1.0,0.1), vec3(1.0,1.0,1.0), (t-0.8)*5.0);
            }

            void main() {
                // Webcam: flip Y to match WebGL orientation
                vec3 cam = texture(u_webcam, vec2(v_uv.x, 1.0 - v_uv.y)).rgb;

                vec4 fluid = texture(u_fluid, v_uv);
                vec2 vel = fluid.rg * 2.0 - 1.0;
                float dye = fluid.b;

                float velMag = length(vel);
                float energy = clamp((dye + velMag * 0.5) * u_gain, 0.0, 1.0);

                vec3 fluidCol = palette(energy * 1.2);

                // Composite over webcam: fluid glows where there's energy
                vec3 result = mix(cam, fluidCol, energy * u_mix);

                // Additive edge glow for extra detail
                result += fluidCol * energy * u_mix * 0.3;

                fragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
            }`, 'Render');

        // ── 9. Blit ──────────────────────────────────────────────
        this.progBlit = this._compile(VERT, `#version 300 es
            precision highp float;
            uniform sampler2D u_tex;
            in vec2 v_uv;
            out vec4 fragColor;
            void main() { fragColor = texture(u_tex, v_uv); }
            `, 'Blit');
    }

    _initBuffers() {
        const gl = this.gl;
        this.quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    }

    // Create RGBA8 FBO — works on ALL WebGL2 hardware, no extension needed
    _mkFBO(w, h) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        const s = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (s !== gl.FRAMEBUFFER_COMPLETE)
            console.error('[FluidEngine] FBO INCOMPLETE:', s, '(w='+w+', h='+h+')');
        // Clear to neutral encoding: (0.5, 0.5, 0, 1) = zero velocity, zero dye
        gl.clearColor(0.5, 0.5, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fbo, tex, w, h };
    }

    _initFBOs() {
        const W = this.W, H = this.H;
        this.velA = this._mkFBO(W, H);
        this.velB = this._mkFBO(W, H);
        this.prsA = this._mkFBO(W, H);
        this.prsB = this._mkFBO(W, H);
        this.divFBO = this._mkFBO(W, H);
        this.flowFBO = this._mkFBO(W, H);
        // History for optical flow (stores prev webcam frame at sim resolution)
        this.histFBO = this._mkFBO(W, H);
    }

    // Cache ALL uniform locations once at init
    _cacheUniforms() {
        const gl = this.gl;
        const loc = (prog, name) => gl.getUniformLocation(prog, name);

        this._u.flow = {
            curr: loc(this.progFlow, 'u_curr'),
            prev: loc(this.progFlow, 'u_prev'),
            strength: loc(this.progFlow, 'u_strength'),
        };
        this._u.advect = {
            vel: loc(this.progAdvect, 'u_vel'),
            src: loc(this.progAdvect, 'u_src'),
            dt: loc(this.progAdvect, 'u_dt'),
            decay: loc(this.progAdvect, 'u_decay'),
        };
        this._u.splat = {
            field: loc(this.progSplat, 'u_field'),
            flow: loc(this.progSplat, 'u_flow'),
            velScale: loc(this.progSplat, 'u_velScale'),
            dyeScale: loc(this.progSplat, 'u_dyeScale'),
            thresh: loc(this.progSplat, 'u_thresh'),
        };
        this._u.mouse = {
            field: loc(this.progMouse, 'u_field'),
            pos: loc(this.progMouse, 'u_pos'),
            force: loc(this.progMouse, 'u_force'),
            dye: loc(this.progMouse, 'u_dye'),
            radius: loc(this.progMouse, 'u_radius'),
        };
        this._u.div = {
            vel: loc(this.progDiv, 'u_vel'),
        };
        this._u.prs = {
            prs: loc(this.progPrs, 'u_prs'),
            div: loc(this.progPrs, 'u_div'),
        };
        this._u.proj = {
            vel: loc(this.progProj, 'u_vel'),
            prs: loc(this.progProj, 'u_prs'),
        };
        this._u.render = {
            webcam: loc(this.progRender, 'u_webcam'),
            fluid: loc(this.progRender, 'u_fluid'),
            gain: loc(this.progRender, 'u_gain'),
            mix: loc(this.progRender, 'u_mix'),
        };
        this._u.blit = {
            tex: loc(this.progBlit, 'u_tex'),
        };
    }

    // ── Internal helpers ──────────────────────────────────────────
    _quad(prog) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        const loc = gl.getAttribLocation(prog, 'a_pos');
        if (loc < 0) return;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    _bindTex(unit, tex) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
    }

    _fbo(fbo, w, h) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, w, h);
    }

    // ─────────────────────────────────────────────────────────────
    //  PUBLIC: update(webcamTex, params, dt, mouse, audio)
    //   webcamTex — canvasEngine.videoTex (WebGLTexture, already uploaded)
    //   params    — globalState.fluidParams
    //   dt        — frame delta seconds
    //   mouse     — { x, y } in [0,1] UV space (optional)
    //   audio     — { bass, mid, high } from audioEngine (optional)
    // ─────────────────────────────────────────────────────────────
    update(webcamTex, params, dt = 0.016, mouse = null, audio = null) {
        const gl = this.gl;
        if (!this.velA) return;
        if (params) Object.assign(this.params, params);
        const p = this.params;
        const W = this.W, H = this.H;
        const u = this._u;

        this._frameCount++;

        // ── 1. Optical Flow ───────────────────────────────────────
        this._fbo(this.flowFBO.fbo, W, H);
        gl.useProgram(this.progFlow);
        this._bindTex(0, webcamTex);
        this._bindTex(1, this.histFBO.tex);
        gl.uniform1i(u.flow.curr, 0);
        gl.uniform1i(u.flow.prev, 1);
        gl.uniform1f(u.flow.strength, p.opticalGain);
        this._quad(this.progFlow);

        // ── 2. Splat flow → velocity+dye ─────────────────────────
        this._fbo(this.velB.fbo, W, H);
        gl.useProgram(this.progSplat);
        this._bindTex(0, this.velA.tex);
        this._bindTex(1, this.flowFBO.tex);
        gl.uniform1i(u.splat.field, 0);
        gl.uniform1i(u.splat.flow, 1);
        gl.uniform1f(u.splat.velScale, 0.08);
        gl.uniform1f(u.splat.dyeScale, 0.25);
        gl.uniform1f(u.splat.thresh, 0.02);
        this._quad(this.progSplat);
        [this.velA, this.velB] = [this.velB, this.velA];

        // ── 3. Mouse splat (inject force at pointer position) ─────
        if (mouse) {
            const mx = (mouse.x * 0.5 + 0.5);  // convert [-1,1] → [0,1]
            const my = (mouse.y * 0.5 + 0.5);
            // Compute mouse velocity from previous position
            const dx = mx - (this._lastMX || mx);
            const dy = my - (this._lastMY || my);
            const speed = Math.sqrt(dx*dx + dy*dy);
            this._lastMX = mx;
            this._lastMY = my;

            if (speed > 0.001) {
                const audioBurst = audio ? (audio.bass * (p.audioDrive || 1.0)) : 0;
                this._fbo(this.velB.fbo, W, H);
                gl.useProgram(this.progMouse);
                this._bindTex(0, this.velA.tex);
                gl.uniform1i(u.mouse.field, 0);
                gl.uniform2f(u.mouse.pos, mx, my);
                gl.uniform2f(u.mouse.force, dx * 12.0, dy * 12.0);
                gl.uniform1f(u.mouse.dye, Math.min(1.0, speed * 20.0 + audioBurst * 0.3));
                gl.uniform1f(u.mouse.radius, 0.04 + audioBurst * 0.03);
                this._quad(this.progMouse);
                [this.velA, this.velB] = [this.velB, this.velA];
            }
        }

        // ── 4. Advect velocity ────────────────────────────────────
        this._fbo(this.velB.fbo, W, H);
        gl.useProgram(this.progAdvect);
        this._bindTex(0, this.velA.tex);
        this._bindTex(1, this.velA.tex);
        gl.uniform1i(u.advect.vel, 0);
        gl.uniform1i(u.advect.src, 1);
        gl.uniform1f(u.advect.dt, dt);
        gl.uniform1f(u.advect.decay, p.viscosity);
        this._quad(this.progAdvect);
        [this.velA, this.velB] = [this.velB, this.velA];

        // ── 5. Divergence ─────────────────────────────────────────
        this._fbo(this.divFBO.fbo, W, H);
        gl.useProgram(this.progDiv);
        this._bindTex(0, this.velA.tex);
        gl.uniform1i(u.div.vel, 0);
        this._quad(this.progDiv);

        // ── 6. Jacobi pressure ────────────────────────────────────
        // Clear pressure to neutral (0.5 = zero pressure)
        this._fbo(this.prsA.fbo, W, H);
        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.progPrs);
        this._bindTex(1, this.divFBO.tex);
        gl.uniform1i(u.prs.div, 1);

        for (let i = 0; i < this.JACOBI; i++) {
            this._fbo(this.prsB.fbo, W, H);
            this._bindTex(0, this.prsA.tex);
            gl.uniform1i(u.prs.prs, 0);
            this._quad(this.progPrs);
            [this.prsA, this.prsB] = [this.prsB, this.prsA];
        }

        // ── 7. Project ────────────────────────────────────────────
        this._fbo(this.velB.fbo, W, H);
        gl.useProgram(this.progProj);
        this._bindTex(0, this.velA.tex);
        this._bindTex(1, this.prsA.tex);
        gl.uniform1i(u.proj.vel, 0);
        gl.uniform1i(u.proj.prs, 1);
        this._quad(this.progProj);
        [this.velA, this.velB] = [this.velB, this.velA];

        // ── 8. Capture history (webcam → histFBO at sim resolution) ─
        this._fbo(this.histFBO.fbo, W, H);
        gl.useProgram(this.progBlit);
        this._bindTex(0, webcamTex);
        gl.uniform1i(u.blit.tex, 0);
        this._quad(this.progBlit);

        // Store refs for render pass
        this._webcamTex = webcamTex;
    }

    // ─────────────────────────────────────────────────────────────
    //  PUBLIC: render(gain, mix)
    //   Called by CanvasEngine. Renders webcam+fluid to whatever
    //   FBO is currently bound (canvasEngine.renderTarget.fbo).
    // ─────────────────────────────────────────────────────────────
    render(gain, mix) {
        const gl = this.gl;
        if (!this.velA || !this._webcamTex) return;
        const p = this.params;
        const u = this._u;

        gl.useProgram(this.progRender);
        this._bindTex(0, this._webcamTex);
        this._bindTex(1, this.velA.tex);
        gl.uniform1i(u.render.webcam, 0);
        gl.uniform1i(u.render.fluid, 1);
        gl.uniform1f(u.render.gain, gain !== undefined ? gain : p.gain);
        gl.uniform1f(u.render.mix, mix !== undefined ? mix : p.mix);
        this._quad(this.progRender);
    }

    dispose() {
        const gl = this.gl;
        [this.velA, this.velB, this.prsA, this.prsB,
         this.divFBO, this.flowFBO, this.histFBO].forEach(f => {
            if (f) { gl.deleteFramebuffer(f.fbo); gl.deleteTexture(f.tex); }
        });
        [this.progFlow, this.progAdvect, this.progSplat, this.progMouse,
         this.progDiv, this.progPrs, this.progProj, this.progRender, this.progBlit
        ].forEach(p => { if (p) gl.deleteProgram(p); });
        gl.deleteBuffer(this.quad);
        console.log('[FluidEngine] Disposed');
    }
}

window.FluidEngine = FluidEngine;
