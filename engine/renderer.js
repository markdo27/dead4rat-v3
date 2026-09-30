// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — RENDERER
//
// Frame graph (each pass only exists when something needs it):
//
//   GEN   active scene ray-march  → genTex   (reduced resolution)
//   A     uv warps + source + feedback family → baseTex
//   B     colour/texture effects, gestures, CRT, strobe → screen, or → outTex
//         when a feedback effect needs this frame next frame
//   BLIT  outTex → screen
//
// Programs are generated from the effect chunks that are actually switched
// on and cached by key. With KHR_parallel_shader_compile the old pipeline
// keeps drawing while a new one compiles, so toggling never hitches.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
const { FX_BY_KEY, GESTURE_BY_KEY, GEN_BY_KEY, GLSL_COMMON, fxChunk, fxUniformDecls, genFragmentSource } = window.D4R;

const VS_IMAGE = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() { v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5); gl_Position = vec4(a_pos, 0.0, 1.0); }`;
const VS_GL = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;
const FS_BLIT = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
void main() { gl_FragColor = texture2D(u_tex, v_uv); }`;

const PASS_HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform float u_time, u_aspect;
uniform vec2 u_res, u_disp;
uniform sampler2D u_cam, u_gen, u_mask, u_prev, u_base, u_prevBase, u_out;
uniform vec2 u_camScale, u_camOffset, u_maskScale, u_maskOffset;
uniform float u_camOn, u_camKey, u_genOn;
uniform float u_flipH, u_flipV, u_rotation;
uniform vec2 u_palm;
uniform float u_pinch, u_span, u_shockT;
${GLSL_COMMON}
vec2 fboUV(vec2 uv) { return vec2(uv.x, 1.0 - uv.y); }
vec2 viewUV(vec2 uv) {
    if (u_flipH > 0.5) uv.x = 1.0 - uv.x;
    if (u_flipV > 0.5) uv.y = 1.0 - uv.y;
    if (u_rotation > 0.5) {
        vec2 p = uv - 0.5; p.x *= u_aspect;
        float a = u_rotation * 1.5707963;
        p = rot2(a) * p;
        if (u_rotation < 1.5 || u_rotation > 2.5) p /= max(u_aspect, 1.0 / u_aspect);
        p.x /= u_aspect;
        uv = p + 0.5;
    }
    return uv;
}
vec3 src(vec2 uv) {
    uv = clamp(uv, 0.0, 1.0);
    vec2 cuv = uv * u_camScale + u_camOffset;
    vec3 cam = texture2D(u_cam, cuv).rgb * u_camOn;
#ifdef HAS_MASK
    float m = texture2D(u_mask, uv * u_maskScale + u_maskOffset).r;
#endif
#ifdef HAS_GEN
    vec3 g = texture2D(u_gen, fboUV(uv)).rgb;
  #ifdef HAS_MASK
    return mix(g, cam, m);
  #else
    // CAMERA MIX: 0 = generator only; higher lets darker camera areas through.
    return mix(g, cam, clamp((luma(cam) - (1.0 - u_camKey)) * 4.0, 0.0, 1.0));
  #endif
#else
  #ifdef HAS_MASK
    return cam * m;
  #else
    return cam;
  #endif
#endif
}
vec3 prev(vec2 uv) { return texture2D(u_prev, fboUV(clamp(uv, 0.0, 1.0))).rgb; }
vec3 prevBase(vec2 uv) { return texture2D(u_prevBase, fboUV(clamp(uv, 0.0, 1.0))).rgb; }
`;

const COMPLETION_STATUS_KHR = 0x91B1;
const MAX_PROGRAMS = 48;

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.stats = { programs: 0, compiles: 0, lastCompileMs: 0, passes: 0, failed: [] };
        this.view = { format: 'SCREEN', renderScale: 1, genScale: 0.5 };
        this._snapshotCbs = [];
        this._lost = false;
        canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this._lost = true; });
        canvas.addEventListener('webglcontextrestored', () => { this._lost = false; this._init(); this.resize(); });
        this._init();
        this.resize();
    }

    get ok() { return !!this.gl && !this._lost; }

    _init() {
        const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
                       preserveDrawingBuffer: false, powerPreference: 'high-performance' };
        const gl = this.canvas.getContext('webgl2', opts) || this.canvas.getContext('webgl', opts);
        this.gl = gl;
        if (!gl) return;
        this.isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        this.parallel = gl.getExtension('KHR_parallel_shader_compile');
        this.programs = new Map();
        this._vs = { image: this._shader(gl.VERTEX_SHADER, VS_IMAGE), gl: this._shader(gl.VERTEX_SHADER, VS_GL) };

        this.quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);

        this.tex = {
            cam: this._texture(),
            mask: this._texture(),
            black: this._texture(),
        };
        for (const t of [this.tex.cam, this.tex.mask, this.tex.black]) {
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
        }
        this._camSource = null;
        this._maskVersion = -1;
        this.fbo = { gen: null, base: [null, null], out: [null, null] };
        this._outIndex = 0;
        this._baseIndex = 0;
        this._prevBaseValid = false;
        this._prevValid = false;
        this._pipeline = null;
        this.blit = this._program('BLIT', this._vs.gl, FS_BLIT, true);
    }

    // ── GL helpers ─────────────────────────────────────────────────────────
    _texture() {
        const gl = this.gl;
        // Work on a scratch unit so creating a texture never replaces an input
        // that is bound for the pass we are in the middle of drawing.
        gl.activeTexture(gl.TEXTURE7);
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        return t;
    }

    _target(w, h) {
        const gl = this.gl;
        const tex = this._texture();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { tex, fb, w, h };
    }

    _freeTarget(t) {
        if (!t) return;
        this.gl.deleteFramebuffer(t.fb);
        this.gl.deleteTexture(t.tex);
    }

    _ensureTarget(name, w, h, index) {
        const cur = index === undefined ? this.fbo[name] : this.fbo[name][index];
        if (cur && cur.w === w && cur.h === h) return cur;
        this._freeTarget(cur);
        const t = this._target(w, h);
        if (index === undefined) this.fbo[name] = t; else this.fbo[name][index] = t;
        if (name === 'out') this._prevValid = false;
        if (name === 'base') this._prevBaseValid = false;
        return t;
    }

    _shader(type, src) {
        const gl = this.gl;
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    }

    // Create a program. Compilation runs in the background when the parallel
    // extension exists; _ready() finishes it.
    _program(key, vs, fsSource, sync = false) {
        const gl = this.gl;
        const t0 = performance.now();
        const fs = this._shader(gl.FRAGMENT_SHADER, fsSource);
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        const p = { key, prog, fs, fsSource, ready: false, failed: false, locs: new Map(), vals: new Map(), t0, used: 0 };
        this.stats.compiles++;
        if (sync || !this.parallel) this._finish(p);
        return p;
    }

    _finish(p) {
        const gl = this.gl;
        if (!gl.getProgramParameter(p.prog, gl.LINK_STATUS)) {
            p.failed = true;
            const log = gl.getShaderInfoLog(p.fs) || gl.getProgramInfoLog(p.prog);
            console.error(`[Renderer] program ${p.key} failed:\n${log}`);
            this.stats.failed.push(p.key);
        } else {
            gl.useProgram(p.prog);
            const unit = { u_tex: 0, u_cam: 0, u_gen: 1, u_prev: 2, u_base: 3, u_mask: 4, u_prevBase: 5, u_out: 6 };
            for (const [name, u] of Object.entries(unit)) {
                const loc = gl.getUniformLocation(p.prog, name);
                if (loc) gl.uniform1i(loc, u);
            }
            p.aPos = gl.getAttribLocation(p.prog, 'a_pos');
        }
        p.ready = true;
        this.stats.lastCompileMs = Math.round(performance.now() - p.t0);
        return p;
    }

    _ready(p) {
        if (p.ready) return !p.failed;
        if (this.parallel && !this.gl.getProgramParameter(p.prog, COMPLETION_STATUS_KHR)) return false;
        this._finish(p);
        return !p.failed;
    }

    _cached(key, build) {
        let p = this.programs.get(key);
        if (!p) {
            p = build();
            p.used = performance.now(); // newest first, so eviction never removes the program just built
            this.programs.set(key, p);
            this._evict();
        }
        p.used = performance.now();
        return p;
    }

    _evict() {
        if (this.programs.size <= MAX_PROGRAMS) return;
        const live = new Set(this._pipeline ? this._pipeline.keys : []);
        const old = [...this.programs.values()].filter(p => !live.has(p.key)).sort((a, b) => a.used - b.used);
        while (this.programs.size > MAX_PROGRAMS && old.length) {
            const p = old.shift();
            this.gl.deleteProgram(p.prog);
            this.gl.deleteShader(p.fs);
            this.programs.delete(p.key);
        }
    }

    // Uniform setters with a per-program value cache.
    _u1(p, name, v) {
        let loc = p.locs.get(name);
        if (loc === undefined) { loc = this.gl.getUniformLocation(p.prog, name); p.locs.set(name, loc); }
        if (loc === null || p.vals.get(name) === v) return;
        this.gl.uniform1f(loc, v);
        p.vals.set(name, v);
    }

    _u2(p, name, x, y) {
        let loc = p.locs.get(name);
        if (loc === undefined) { loc = this.gl.getUniformLocation(p.prog, name); p.locs.set(name, loc); }
        if (loc === null) return;
        const prev = p.vals.get(name);
        if (prev && prev[0] === x && prev[1] === y) return;
        this.gl.uniform2f(loc, x, y);
        p.vals.set(name, [x, y]);
    }

    _u3(p, name, v) {
        let loc = p.locs.get(name);
        if (loc === undefined) { loc = this.gl.getUniformLocation(p.prog, name); p.locs.set(name, loc); }
        if (loc === null) return;
        const prev = p.vals.get(name);
        if (prev && prev[0] === v[0] && prev[1] === v[1] && prev[2] === v[2]) return;
        this.gl.uniform3f(loc, v[0], v[1], v[2]);
        p.vals.set(name, v);
    }

    _draw(p) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.enableVertexAttribArray(p.aPos);
        gl.vertexAttribPointer(p.aPos, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this.stats.passes++;
    }

    // ── Program builders ───────────────────────────────────────────────────
    _genProgram(mode) {
        return this._cached('G:' + mode, () => this._program('G:' + mode, this._vs.gl, genFragmentSource(GEN_BY_KEY[mode])));
    }

    _passAProgram(uvKeys, timeKeys, flags) {
        const key = `A:${uvKeys.join(',')}|${timeKeys.join(',')}|${flags}`;
        return this._cached(key, () => {
            const defs = [...uvKeys, ...timeKeys].map(k => FX_BY_KEY[k]);
            const src = [
                flags.includes('g') ? '#define HAS_GEN' : '',
                flags.includes('m') ? '#define HAS_MASK' : '',
                PASS_HEADER,
                defs.map(fxUniformDecls).join('\n'),
                'void main() {',
                '  vec2 uv = v_uv;',
                uvKeys.map(k => fxChunk(FX_BY_KEY[k])).join('\n'),
                '  vec3 c = src(viewUV(uv));  // flips/rotation apply to the source only, never to the feedback loop',
                timeKeys.map(k => fxChunk(FX_BY_KEY[k])).join('\n'),
                '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
                '}',
            ].join('\n');
            return this._program(key, this._vs.image, src);
        });
    }

    // withFinal = false: CRT / STROBE / gesture glows are left to pass C so they
    // are never fed back into the feedback loop.
    _passBProgram(colorKeys, finalKeys, gestureKeys, flags, withFinal) {
        if (!withFinal) { finalKeys = []; gestureKeys = gestureKeys.filter(k => GESTURE_BY_KEY[k].kind !== 'overlay'); }
        const key = `B:${colorKeys.join(',')}|${finalKeys.join(',')}|${gestureKeys.join(',')}|${flags}`;
        return this._cached(key, () => {
            const defs = [...colorKeys, ...finalKeys].map(k => FX_BY_KEY[k]);
            const warps = gestureKeys.filter(k => GESTURE_BY_KEY[k].kind === 'warp');
            const overlays = gestureKeys.filter(k => GESTURE_BY_KEY[k].kind === 'overlay');
            const pres = gestureKeys.filter(k => GESTURE_BY_KEY[k].kind === 'pre');
            const hasA = flags.includes('a');
            const src = [
                flags.includes('g') ? '#define HAS_GEN' : '',
                flags.includes('m') ? '#define HAS_MASK' : '',
                PASS_HEADER,
                defs.map(fxUniformDecls).join('\n'),
                hasA
                    ? 'vec3 img(vec2 uv) { return texture2D(u_base, fboUV(clamp(uv, 0.0, 1.0))).rgb; }'
                    : 'vec3 img(vec2 uv) { return src(viewUV(uv)); }',
                'void main() {',
                '  vec2 puv = v_uv;',
                warps.map(k => GESTURE_BY_KEY[k].glsl).join('\n'),
                '  vec2 uv = puv;',
                '  vec3 c = img(uv);',
                pres.map(k => GESTURE_BY_KEY[k].glsl).join('\n'),
                colorKeys.map(k => fxChunk(FX_BY_KEY[k])).join('\n'),
                overlays.map(k => GESTURE_BY_KEY[k].glsl).join('\n'),
                finalKeys.map(k => fxChunk(FX_BY_KEY[k])).join('\n'),
                '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
                '}',
            ].join('\n');
            return this._program(key, this._vs.image, src);
        });
    }

    // Pass C: final stage on top of the feedback-safe frame, drawn to screen.
    _passCProgram(finalKeys, gestureKeys) {
        const overlays = gestureKeys.filter(k => GESTURE_BY_KEY[k].kind === 'overlay');
        const key = `C:${finalKeys.join(',')}|${overlays.join(',')}`;
        return this._cached(key, () => {
            const src = [
                PASS_HEADER,
                finalKeys.map(k => fxUniformDecls(FX_BY_KEY[k])).join('\n'),
                'vec3 img(vec2 uv) { return texture2D(u_out, fboUV(clamp(uv, 0.0, 1.0))).rgb; }',
                'void main() {',
                '  vec2 uv = v_uv;',
                '  vec3 c = img(uv);',
                overlays.map(k => GESTURE_BY_KEY[k].glsl).join('\n'),
                finalKeys.map(k => fxChunk(FX_BY_KEY[k])).join('\n'),
                '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
                '}',
            ].join('\n');
            return this._program(key, this._vs.image, src);
        });
    }

    // ── Sizing ─────────────────────────────────────────────────────────────
    // format: SCREEN | 16:9 | 9:16 | 1:1 ; renderScale 0.25-1 ; genScale 0.2-1
    setView(view) {
        Object.assign(this.view, view);
        this.resize();
    }

    // Screen space the UI covers (px). The picture is fitted into the rest.
    setInsets(ins) {
        this.insets = { top: 0, right: 0, bottom: 0, left: 0, ...ins };
        this.resize();
    }

    resize() {
        if (!this.gl) return;
        const ins = this.insets || { top: 0, right: 0, bottom: 0, left: 0 };
        const vw = Math.max(64, window.innerWidth - ins.left - ins.right);
        const vh = Math.max(64, window.innerHeight - ins.top - ins.bottom);
        const ratios = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };
        let dw = vw, dh = vh;
        const r = ratios[this.view.format];
        if (r) { if (vw / vh > r) { dh = vh; dw = vh * r; } else { dw = vw; dh = vw / r; } }
        dw = Math.round(dw); dh = Math.round(dh);
        const s = this.canvas.style;
        s.position = 'fixed';
        s.width = dw + 'px'; s.height = dh + 'px';
        const left = ins.left + Math.round((vw - dw) / 2), top = ins.top + Math.round((vh - dh) / 2);
        s.left = left + 'px';
        s.top = top + 'px';
        const w = Math.max(16, Math.round(dw * this.view.renderScale));
        const h = Math.max(16, Math.round(dh * this.view.renderScale));
        this.disp = { w: dw, h: dh, left, top };
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
            this._prevValid = false;
        }
    }

    // ── Inputs ─────────────────────────────────────────────────────────────
    // Upload the camera/composite source. Only uploads when the caller says
    // a new frame is available.
    uploadSource(source, fresh) {
        const gl = this.gl;
        if (!gl || !source) return;
        if (!fresh && this._camSource === source) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex.cam);
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            this._camSource = source;
        } catch (e) { /* source not ready yet */ }
    }

    uploadMask(canvas, version) {
        const gl = this.gl;
        if (!gl || !canvas || version === this._maskVersion) return;
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.tex.mask);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        this._maskVersion = version;
    }

    // Call cb(canvas) right after the next frame is drawn, while the drawing
    // buffer is still valid (preserveDrawingBuffer is off for speed).
    snapshot(cb) { this._snapshotCbs.push(cb); }

    // Programs for a desired frame; null entries mean "not needed".
    _plan(f) {
        const byStage = { uv: [], time: [], color: [], final: [] };
        for (const fx of f.fx) byStage[FX_BY_KEY[fx.key].stage].push(fx.key);
        // Effects that sample neighbours read the pre-colour image, so run them
        // first; per-pixel colour effects then apply on top of their result.
        byStage.color.sort((a, b) => (FX_BY_KEY[b].taps ? 1 : 0) - (FX_BY_KEY[a].taps ? 1 : 0));
        const flags = (f.gen ? 'g' : '') + (f.mask ? 'm' : '');
        const needsPrevBase = byStage.color.some(k => FX_BY_KEY[k].prevBase);
        // Neighbour-sampling effects call img() many times. When the source is
        // costly to rebuild per tap (generator or cut-out mixed in), render it
        // once in pass A so each tap is a single texture read.
        const taps = byStage.color.some(k => FX_BY_KEY[k].taps) || f.gestures.includes('freeze');
        const needA = byStage.uv.length > 0 || byStage.time.length > 0 || needsPrevBase || (taps && (f.gen || f.mask));
        const needsPrev = byStage.time.length > 0;
        const plan = {
            gen: f.gen ? this._genProgram(f.gen.mode) : null,
            A: needA ? this._passAProgram(byStage.uv, byStage.time, flags) : null,
            B: this._passBProgram(byStage.color, byStage.final, f.gestures, flags + (needA ? 'a' : ''), !needsPrev),
            C: needsPrev ? this._passCProgram(byStage.final, f.gestures) : null,
            needsPrev,
            needsPrevBase,
        };
        plan.keys = [plan.gen, plan.A, plan.B, plan.C].filter(Boolean).map(p => p.key);
        plan.id = plan.keys.join('#');
        return plan;
    }

    // ── Frame ──────────────────────────────────────────────────────────────
    // f = {
    //   time, fx: [{ key, wet, values: {param: value}, level? }],
    //   gen: { mode, values, band, transient, level, fog } | null,
    //   gestures: [keys], palm: [x, y], pinch, span, shockT,
    //   cam: { on, scale: [sx, sy], offset: [ox, oy] }, camKey, mask: bool,
    //   transform: { flipH, flipV, rotation }
    // }
    render(f) {
        const gl = this.gl;
        if (!gl || this._lost) return;
        this.stats.passes = 0;

        let plan = this._plan(f);
        const ready = [plan.gen, plan.A, plan.B, plan.C].every(p => !p || this._ready(p));
        if (ready) {
            this._pipeline = plan;
        } else if (this._pipeline && this._pipeline.keys.every(k => { const p = this.programs.get(k); return p && !p.failed; })) {
            plan = this._pipeline; // keep drawing the previous pipeline until the new one is linked
        } else {
            for (const p of [plan.gen, plan.A, plan.B, plan.C]) if (p && !p.ready) this._finish(p);
            if ([plan.gen, plan.A, plan.B, plan.C].some(p => p && p.failed)) return;
            this._pipeline = plan;
        }

        const W = this.canvas.width, H = this.canvas.height;
        const aspect = this.disp.w / this.disp.h;

        // GEN pass
        if (plan.gen && f.gen) {
            const gw = Math.max(16, Math.round(W * this.view.genScale));
            const gh = Math.max(16, Math.round(H * this.view.genScale));
            const t = this._ensureTarget('gen', gw, gh);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.tex.black);
            gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
            gl.viewport(0, 0, gw, gh);
            const p = plan.gen;
            gl.useProgram(p.prog);
            const v = f.gen.values;
            this._u2(p, 'u_res', gw, gh);
            this._u1(p, 'u_time', f.gen.time);
            this._u1(p, 'u_transient', f.gen.transient);
            this._u1(p, 'u_genBand', f.gen.band);
            this._u1(p, 'u_level', f.gen.level);
            this._u1(p, 'u_genSpeed', 1); // speed is already folded into f.gen.time
            this._u1(p, 'u_genScale', v.zoom);
            this._u1(p, 'u_genWarp', v.warp);
            this._u1(p, 'u_genDensity', v.density);
            this._u1(p, 'u_genIter', v.iterations);
            this._u1(p, 'u_genColor1', v.colorA);
            this._u1(p, 'u_genColor2', v.colorB);
            this._u1(p, 'u_genRotX', v.rotateX);
            this._u1(p, 'u_genRotY', v.rotateY);
            this._u1(p, 'u_genRotZ', v.rotateZ);
            this._u3(p, 'u_fog', GEN_BY_KEY[f.gen.mode].fog);
            this._draw(p);
        }

        // Bind shared inputs (units 3 and 5 are cleared first so nothing we are
        // about to render into is still bound as a texture).
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.tex.black);
        gl.activeTexture(gl.TEXTURE5);
        const prevBase = this.fbo.base[this._baseIndex ^ 1];
        gl.bindTexture(gl.TEXTURE_2D, plan.needsPrevBase && prevBase && this._prevBaseValid ? prevBase.tex : this.tex.black);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, f.cam.on ? this.tex.cam : this.tex.black);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, plan.gen && this.fbo.gen ? this.fbo.gen.tex : this.tex.black);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.tex.mask);

        const prevTarget = this.fbo.out[this._outIndex ^ 1];
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, plan.needsPrev && prevTarget && this._prevValid ? prevTarget.tex : this.tex.black);

        const common = (p) => {
            this._u1(p, 'u_time', f.time);
            this._u1(p, 'u_aspect', aspect);
            this._u2(p, 'u_res', W, H);
            this._u2(p, 'u_disp', this.disp.w, this.disp.h);
            this._u2(p, 'u_camScale', f.cam.scale[0], f.cam.scale[1]);
            this._u2(p, 'u_camOffset', f.cam.offset[0], f.cam.offset[1]);
            if (f.maskMap) { this._u2(p, 'u_maskScale', f.maskMap.scale[0], f.maskMap.scale[1]); this._u2(p, 'u_maskOffset', f.maskMap.offset[0], f.maskMap.offset[1]); }
            this._u1(p, 'u_camOn', f.cam.on ? 1 : 0);
            this._u1(p, 'u_camKey', f.camKey);
            this._u1(p, 'u_flipH', f.transform.flipH ? 1 : 0);
            this._u1(p, 'u_flipV', f.transform.flipV ? 1 : 0);
            this._u1(p, 'u_rotation', f.transform.rotation || 0);
            for (const fx of f.fx) {
                this._u1(p, `u_${fx.key}_wet`, fx.wet);
                for (const k in fx.values) this._u1(p, `u_${fx.key}_${k}`, fx.values[k]);
                if (fx.level !== undefined) this._u1(p, `u_${fx.key}_level`, fx.level);
            }
        };

        // A pass
        if (plan.A) {
            const t = this._ensureTarget('base', W, H, this._baseIndex);
            gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
            gl.viewport(0, 0, W, H);
            gl.useProgram(plan.A.prog);
            common(plan.A);
            this._draw(plan.A);
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, t.tex);
            if (plan.needsPrevBase && !this._prevBaseValid) { gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, t.tex); }
            if (plan.needsPrevBase) { this._baseIndex ^= 1; this._prevBaseValid = true; }
            else this._prevBaseValid = false;
        }

        // B pass
        const B = plan.B;
        let out = null;
        if (plan.needsPrev) {
            out = this._ensureTarget('out', W, H, this._outIndex);
            gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        gl.viewport(0, 0, W, H);
        gl.useProgram(B.prog);
        common(B);
        this._u2(B, 'u_palm', f.palm[0], f.palm[1]);
        this._u1(B, 'u_pinch', f.pinch);
        this._u1(B, 'u_span', f.span);
        this._u1(B, 'u_shockT', f.shockT);
        this._draw(B);

        if (out) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, W, H);
            const C = plan.C;
            gl.useProgram(C.prog);
            gl.activeTexture(gl.TEXTURE6);
            gl.bindTexture(gl.TEXTURE_2D, out.tex);
            common(C);
            this._u2(C, 'u_palm', f.palm[0], f.palm[1]);
            this._u1(C, 'u_pinch', f.pinch);
            this._u1(C, 'u_span', f.span);
            this._draw(C);
            this._outIndex ^= 1;
            this._prevValid = true;
        } else {
            this._prevValid = false;
        }

        this.stats.programs = this.programs.size;
        if (this._snapshotCbs.length) {
            const cbs = this._snapshotCbs.splice(0);
            for (const cb of cbs) { try { cb(this.canvas); } catch (e) { console.error(e); } }
        }
    }

    // Warm a pipeline in the background (e.g. the scene we are about to morph to).
    prewarm(f) { if (this.gl && !this._lost) this._plan(f); }
}

window.D4R.Renderer = Renderer;
})();
