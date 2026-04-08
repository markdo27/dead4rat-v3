/**
 * WFGL — Web FreeFrame GL Plugin System (Bundled)
 * A web-based equivalent of Resolume's FFGL SDK.
 * Loaded as a plain <script> — attaches everything to window.WFGL
 */
(function() {
'use strict';

// ═══════════════════════════════════════════════════════════════
//  WFGLPlugin — Base class
// ═══════════════════════════════════════════════════════════════
class WFGLPlugin {
    static info = {
        id: 'com.wfgl.base', name: 'Base Plugin', description: '',
        type: 'effect', author: 'WFGL', version: '1.0.0', tags: [],
    };
    static params = [];
    static fragmentShader = null;

    constructor() {
        this.enabled = true;
        this._paramValues = {};
        this._gl = null;
        for (const p of this.constructor.params) {
            this._paramValues[p.name] = p.default !== undefined ? p.default : 0;
        }
    }
    getParam(name) { return this._paramValues[name]; }
    setParam(name, value) { this._paramValues[name] = value; }
    getAllParams() { return { ...this._paramValues }; }
    initGL(gl, w, h) { this._gl = gl; }
    deinitGL(gl) { this._gl = null; }
    resize(gl, w, h) {}
    render(gl, ctx) {}
}

// ═══════════════════════════════════════════════════════════════
//  WFGLShaderPlugin — Convenience base for fragment-shader-only plugins
// ═══════════════════════════════════════════════════════════════
const VERT_SRC = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

class WFGLShaderPlugin extends WFGLPlugin {
    constructor() {
        super();
        this._program = null;
        this._vao = null;
        this._vbo = null;
        this._uniformLocs = {};
    }

    initGL(gl, w, h) {
        super.initGL(gl, w, h);
        const fragSrc = this.constructor.fragmentShader;
        if (!fragSrc) throw new Error(`${this.constructor.info.name}: no fragmentShader`);
        this._program = this._createProgram(gl, VERT_SRC, fragSrc);
        this._vao = gl.createVertexArray();
        this._vbo = gl.createBuffer();
        gl.bindVertexArray(this._vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(this._program, 'a_position');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        this._cacheUniforms(gl);
    }

    deinitGL(gl) {
        if (this._program) { gl.deleteProgram(this._program); this._program = null; }
        if (this._vbo) { gl.deleteBuffer(this._vbo); this._vbo = null; }
        if (this._vao) { gl.deleteVertexArray(this._vao); this._vao = null; }
        this._uniformLocs = {};
        super.deinitGL(gl);
    }

    render(gl, ctx) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.outputFBO);
        gl.viewport(0, 0, ctx.width, ctx.height);
        gl.useProgram(this._program);
        if (ctx.inputTexture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, ctx.inputTexture);
            this._setUniform(gl, 'u_input', 0);
        }
        this._setUniform(gl, 'u_time', ctx.time);
        this._setUniform(gl, 'u_resolution', [ctx.width, ctx.height]);
        this._setUniform(gl, 'u_bpm', ctx.bpm || 120);
        this._setUniform(gl, 'u_beat', ctx.beat || 0);
        this._setUniform(gl, 'u_audioBass', ctx.audioData ? ctx.audioData[0] : 0);
        this._setUniform(gl, 'u_audioMid',  ctx.audioData ? ctx.audioData[1] : 0);
        this._setUniform(gl, 'u_audioHigh', ctx.audioData ? ctx.audioData[2] : 0);
        for (const p of this.constructor.params) {
            const val = ctx.params[p.name];
            const uName = 'u_' + p.name;
            if (p.type === 'color' && Array.isArray(val)) this._setUniform(gl, uName, val);
            else if (p.type === 'bool') this._setUniform(gl, uName, val ? 1.0 : 0.0);
            else this._setUniform(gl, uName, val);
        }
        gl.bindVertexArray(this._vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);
    }

    _createProgram(gl, vertSrc, fragSrc) {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertSrc); gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS))
            console.error('WFGL vert:', gl.getShaderInfoLog(vs));
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragSrc); gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
            console.error(`WFGL frag [${this.constructor.info.name}]:`, gl.getShaderInfoLog(fs));
        const prog = gl.createProgram();
        gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            console.error('WFGL link:', gl.getProgramInfoLog(prog));
        gl.deleteShader(vs); gl.deleteShader(fs);
        return prog;
    }

    _cacheUniforms(gl) {
        const count = gl.getProgramParameter(this._program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const info = gl.getActiveUniform(this._program, i);
            if (info) this._uniformLocs[info.name] = gl.getUniformLocation(this._program, info.name);
        }
    }

    _setUniform(gl, name, value) {
        const loc = this._uniformLocs[name];
        if (loc === undefined || loc === null) return;
        if (Array.isArray(value)) {
            if (value.length === 2) gl.uniform2fv(loc, value);
            else if (value.length === 3) gl.uniform3fv(loc, value);
            else if (value.length === 4) gl.uniform4fv(loc, value);
        } else if (typeof value === 'number') {
            if (Number.isInteger(value) && name === 'u_input') gl.uniform1i(loc, value);
            else gl.uniform1f(loc, value);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  WFGLPipeline — FBO chain manager
// ═══════════════════════════════════════════════════════════════
class WFGLPipeline {
    constructor(gl) { this._gl = gl; this._fbos = []; this._width = 0; this._height = 0; }

    ensureFBOs(count) {
        while (this._fbos.length < count) this._fbos.push(this._createFBO(this._width, this._height));
        while (this._fbos.length > count + 2) { this._destroyFBO(this._fbos.pop()); }
    }

    resize(w, h) {
        if (w === this._width && h === this._height) return;
        this._width = w; this._height = h;
        for (let i = 0; i < this._fbos.length; i++) {
            this._destroyFBO(this._fbos[i]);
            this._fbos[i] = this._createFBO(w, h);
        }
    }

    getFBO(i) { return this._fbos[i] || null; }

    destroy() { for (const f of this._fbos) this._destroyFBO(f); this._fbos = []; }

    _createFBO(w, h) {
        const gl = this._gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w||1, h||1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fbo, tex };
    }

    _destroyFBO(f) {
        if (!f) return;
        const gl = this._gl;
        if (f.tex) gl.deleteTexture(f.tex);
        if (f.fbo) gl.deleteFramebuffer(f.fbo);
    }
}

// ═══════════════════════════════════════════════════════════════
//  WFGLHost — Plugin host runtime
// ═══════════════════════════════════════════════════════════════
class WFGLHost {
    constructor(gl) {
        this._gl = gl;
        this._registry = new Map();
        this._chain = [];
        this._pipeline = new WFGLPipeline(gl);
        this._width = 0; this._height = 0;
        this._nextInstanceId = 1;
        this._fpsWarning = false;
        this._frameTimes = [];
    }

    register(PluginClass) { this._registry.set(PluginClass.info.id, PluginClass); }
    getAvailable() { return Array.from(this._registry.values()); }
    getByType(type) { return this.getAvailable().filter(P => P.info.type === type); }

    addToChain(pluginId, position) {
        const PC = this._registry.get(pluginId);
        if (!PC) throw new Error(`WFGL: Unknown plugin "${pluginId}"`);
        const inst = new PC();
        if (this._width > 0) inst.initGL(this._gl, this._width, this._height);
        const entry = { instanceId: this._nextInstanceId++, pluginId, instance: inst, enabled: true, paramValues: inst.getAllParams() };
        if (position >= 0 && position < this._chain.length) this._chain.splice(position, 0, entry);
        else this._chain.push(entry);
        this._updatePipeline();
        return entry.instanceId;
    }

    removeFromChain(instanceId) {
        const idx = this._chain.findIndex(e => e.instanceId === instanceId);
        if (idx < 0) return;
        this._chain[idx].instance.deinitGL(this._gl);
        this._chain.splice(idx, 1);
        this._updatePipeline();
    }

    reorderChain(from, to) {
        if (from < 0 || from >= this._chain.length || to < 0 || to >= this._chain.length) return;
        const [e] = this._chain.splice(from, 1);
        this._chain.splice(to, 0, e);
    }

    setEnabled(instanceId, enabled) {
        const e = this._chain.find(e => e.instanceId === instanceId);
        if (e) e.enabled = enabled;
    }

    getChain() {
        return this._chain.map(e => ({
            instanceId: e.instanceId, pluginId: e.pluginId,
            info: e.instance.constructor.info,
            params: e.instance.constructor.params,
            enabled: e.enabled, paramValues: e.paramValues,
        }));
    }

    setParam(instanceId, paramName, value) {
        const e = this._chain.find(e => e.instanceId === instanceId);
        if (!e) return;
        e.instance.setParam(paramName, value);
        e.paramValues[paramName] = value;
    }

    getParam(instanceId, paramName) {
        const e = this._chain.find(e => e.instanceId === instanceId);
        return e ? e.instance.getParam(paramName) : undefined;
    }

    resize(w, h) {
        this._width = w; this._height = h;
        this._pipeline.resize(w, h);
        for (const e of this._chain) e.instance.resize(this._gl, w, h);
    }

    process(inputTexture, ctx) {
        const t0 = performance.now();
        const active = this._chain.filter(e => e.enabled);
        if (active.length === 0) return inputTexture;
        const gl = this._gl;
        let currentInput = inputTexture;
        for (let i = 0; i < active.length; i++) {
            const entry = active[i];
            const fboObj = this._pipeline.getFBO(i);
            if (!fboObj) continue;
            entry.instance.render(gl, {
                inputTexture: currentInput, outputFBO: fboObj.fbo,
                width: this._width, height: this._height,
                time: ctx.time || 0, bpm: ctx.bpm || 120,
                beat: ctx.beat || 0, audioData: ctx.audioData || null,
                params: entry.paramValues,
            });
            currentInput = fboObj.tex;
        }
        const dt = performance.now() - t0;
        this._frameTimes.push(dt);
        if (this._frameTimes.length > 60) this._frameTimes.shift();
        const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
        this._fpsWarning = avg > 12;
        return currentInput;
    }

    get fpsWarning() { return this._fpsWarning; }
    get activeCount() { return this._chain.filter(e => e.enabled).length; }

    destroy() {
        for (const e of this._chain) e.instance.deinitGL(this._gl);
        this._chain = [];
        this._pipeline.destroy();
    }

    _updatePipeline() {
        this._pipeline.ensureFBOs(Math.max(this._chain.filter(e => e.enabled).length, 1));
    }
}


// ═══════════════════════════════════════════════════════════════
//  STOCK PLUGINS
// ═══════════════════════════════════════════════════════════════

// 1. INVERT COLORS
class InvertColors extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.invert', name: 'Invert Colors', description: 'RGB inversion with mix', type: 'effect', author: 'Dead4rat', version: '1.0.0', tags: ['color'] };
    static params = [{ name: 'mix', type: 'float', min: 0, max: 1, default: 1.0, displayName: 'MIX' }];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform float u_mix; uniform float u_time;
in vec2 v_uv; out vec4 fragColor;
void main() {
    vec4 c = texture(u_input, v_uv);
    fragColor = mix(c, vec4(1.0 - c.rgb, c.a), u_mix);
}`;
}

// 2. CHROMATIC ABERRATION
class ChromaticAberration extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.chromatic', name: 'Chromatic Aberr', description: 'RGB channel offset', type: 'effect', author: 'Dead4rat', version: '1.0.0', tags: ['glitch'] };
    static params = [
        { name: 'amount', type: 'float', min: 0, max: 0.05, default: 0.008, displayName: 'AMOUNT' },
        { name: 'angle', type: 'float', min: 0, max: 6.283, default: 0.0, displayName: 'ANGLE' },
        { name: 'animate', type: 'float', min: 0, max: 1, default: 0.0, displayName: 'ANIMATE' },
    ];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform float u_amount; uniform float u_angle; uniform float u_animate; uniform float u_time;
in vec2 v_uv; out vec4 fragColor;
void main() {
    float a = u_angle + u_animate * u_time * 2.0;
    vec2 dir = vec2(cos(a), sin(a)) * u_amount;
    fragColor = vec4(texture(u_input, v_uv + dir).r, texture(u_input, v_uv).g, texture(u_input, v_uv - dir).b, 1.0);
}`;
}

// 3. VHS
class VHS extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.vhs', name: 'VHS Distortion', description: 'Scanlines + noise + tracking', type: 'effect', author: 'Dead4rat', version: '1.0.0', tags: ['retro'] };
    static params = [
        { name: 'scanlines', type: 'float', min: 0, max: 1, default: 0.4, displayName: 'SCANLINES' },
        { name: 'noise', type: 'float', min: 0, max: 1, default: 0.15, displayName: 'NOISE' },
        { name: 'colorBleed', type: 'float', min: 0, max: 1, default: 0.3, displayName: 'BLEED' },
        { name: 'tracking', type: 'float', min: 0, max: 1, default: 0.2, displayName: 'TRACKING' },
    ];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform float u_time; uniform vec2 u_resolution;
uniform float u_scanlines; uniform float u_noise; uniform float u_colorBleed; uniform float u_tracking;
in vec2 v_uv; out vec4 fragColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
    vec2 uv = v_uv;
    float tp = fract(u_time * 0.15);
    float tb = smoothstep(tp - 0.02, tp, uv.y) - smoothstep(tp, tp + 0.02, uv.y);
    uv.x += tb * u_tracking * 0.08 * sin(u_time * 37.0);
    float bo = u_colorBleed * 0.004;
    float r = texture(u_input, vec2(uv.x + bo, uv.y)).r;
    float g = texture(u_input, uv).g;
    float b = texture(u_input, vec2(uv.x - bo, uv.y)).b;
    vec3 col = vec3(r, g, b);
    float sl = sin(uv.y * u_resolution.y * 3.14159) * 0.5 + 0.5;
    col *= 1.0 - u_scanlines * (1.0 - sl) * 0.6;
    float n = hash(uv * u_resolution + u_time * 1000.0);
    col += (n - 0.5) * u_noise * 0.3;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
}

// 4. KALEIDOSCOPE
class Kaleidoscope extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.kaleidoscope', name: 'Kaleidoscope', description: 'Radial mirror', type: 'effect', author: 'Dead4rat', version: '1.0.0', tags: ['mirror'] };
    static params = [
        { name: 'segments', type: 'float', min: 2, max: 24, default: 6.0, displayName: 'SEGMENTS' },
        { name: 'rotation', type: 'float', min: 0, max: 6.283, default: 0.0, displayName: 'ROTATION' },
        { name: 'spin', type: 'float', min: 0, max: 2, default: 0.0, displayName: 'SPIN' },
        { name: 'zoom', type: 'float', min: 0.2, max: 3, default: 1.0, displayName: 'ZOOM' },
    ];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform float u_segments; uniform float u_rotation; uniform float u_spin; uniform float u_zoom; uniform float u_time;
in vec2 v_uv; out vec4 fragColor;
void main() {
    vec2 c = (v_uv - 0.5) / max(0.01, u_zoom);
    float angle = atan(c.y, c.x) + u_rotation + u_time * u_spin;
    float r = length(c);
    float segA = 6.28318 / max(2.0, floor(u_segments));
    angle = mod(angle, segA);
    if (angle > segA * 0.5) angle = segA - angle;
    fragColor = texture(u_input, clamp(vec2(cos(angle), sin(angle)) * r + 0.5, 0.0, 1.0));
}`;
}

// 5. EDGE GLOW
class EdgeGlow extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.edgeglow', name: 'Edge Glow', description: 'Sobel edge detection', type: 'effect', author: 'Dead4rat', version: '1.0.0', tags: ['edge'] };
    static params = [
        { name: 'strength', type: 'float', min: 0, max: 5, default: 1.5, displayName: 'STRENGTH' },
        { name: 'hue', type: 'float', min: 0, max: 1, default: 0.0, displayName: 'HUE' },
        { name: 'mix', type: 'float', min: 0, max: 1, default: 0.5, displayName: 'MIX' },
    ];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform vec2 u_resolution; uniform float u_strength; uniform float u_hue; uniform float u_mix; uniform float u_time;
in vec2 v_uv; out vec4 fragColor;
vec3 hsl2rgb(float h) { return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1., 0., 1.); }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void main() {
    vec2 px = 1.0 / u_resolution;
    float tl=luma(texture(u_input,v_uv+vec2(-px.x,px.y)).rgb), t=luma(texture(u_input,v_uv+vec2(0,px.y)).rgb), tr=luma(texture(u_input,v_uv+vec2(px.x,px.y)).rgb);
    float l=luma(texture(u_input,v_uv+vec2(-px.x,0)).rgb), r=luma(texture(u_input,v_uv+vec2(px.x,0)).rgb);
    float bl=luma(texture(u_input,v_uv+vec2(-px.x,-px.y)).rgb), b=luma(texture(u_input,v_uv+vec2(0,-px.y)).rgb), br=luma(texture(u_input,v_uv+vec2(px.x,-px.y)).rgb);
    float gx = -tl-2.0*l-bl+tr+2.0*r+br, gy = -tl-2.0*t-tr+bl+2.0*b+br;
    float edge = sqrt(gx*gx + gy*gy) * u_strength;
    vec3 edgeCol = hsl2rgb(u_hue + edge*0.2) * edge;
    fragColor = vec4(clamp(texture(u_input, v_uv).rgb * 0.7 + edgeCol * u_mix, 0.0, 1.0), 1.0);
}`;
}

// 6. PIXEL SORT
class PixelSort extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.pixelsort', name: 'Pixel Sort', description: 'Brightness sorting glitch', type: 'effect', author: 'Dead4rat', version: '1.0.0', tags: ['glitch'] };
    static params = [
        { name: 'threshold', type: 'float', min: 0, max: 1, default: 0.4, displayName: 'THRESHOLD' },
        { name: 'direction', type: 'float', min: 0, max: 1, default: 0.0, displayName: 'VERTICAL' },
        { name: 'length', type: 'float', min: 1, max: 80, default: 20.0, displayName: 'LENGTH' },
        { name: 'mix', type: 'float', min: 0, max: 1, default: 0.7, displayName: 'MIX' },
    ];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform vec2 u_resolution; uniform float u_threshold; uniform float u_direction; uniform float u_length; uniform float u_mix; uniform float u_time;
in vec2 v_uv; out vec4 fragColor;
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void main() {
    vec4 orig = texture(u_input, v_uv);
    float oL = luma(orig.rgb);
    if (oL < u_threshold) { fragColor = orig; return; }
    vec2 px = 1.0 / u_resolution;
    vec2 dir = u_direction > 0.5 ? vec2(0, px.y) : vec2(px.x, 0);
    vec4 sorted = orig; float sL = oL; int len = int(u_length);
    for (int i = 1; i <= 80; i++) {
        if (i > len) break;
        vec2 suv = v_uv + dir * float(i);
        if (suv.x>1.0||suv.y>1.0||suv.x<0.0||suv.y<0.0) break;
        vec4 s = texture(u_input, suv); float sl = luma(s.rgb);
        if (sl < u_threshold) break;
        if (sl > sL) { sorted = s; sL = sl; }
    }
    fragColor = mix(orig, sorted, u_mix);
}`;
}

// 7. HUE SHIFT
class HueShift extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.hueshift', name: 'Hue Shift', description: 'HSL rotation', type: 'effect', author: 'Dead4rat', version: '1.0.0', tags: ['color'] };
    static params = [
        { name: 'shift', type: 'float', min: 0, max: 1, default: 0.0, displayName: 'SHIFT' },
        { name: 'speed', type: 'float', min: 0, max: 2, default: 0.0, displayName: 'SPEED' },
        { name: 'satBoost', type: 'float', min: 0, max: 2, default: 1.0, displayName: 'SATURATION' },
    ];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform float u_shift; uniform float u_speed; uniform float u_satBoost; uniform float u_time;
in vec2 v_uv; out vec4 fragColor;
vec3 rgb2hsl(vec3 c) {
    float mx=max(c.r,max(c.g,c.b)), mn=min(c.r,min(c.g,c.b)), l=(mx+mn)*0.5;
    if(mx==mn) return vec3(0,0,l);
    float d=mx-mn, s=l>0.5?d/(2.0-mx-mn):d/(mx+mn), h;
    if(mx==c.r) h=(c.g-c.b)/d+(c.g<c.b?6.0:0.0); else if(mx==c.g) h=(c.b-c.r)/d+2.0; else h=(c.r-c.g)/d+4.0;
    return vec3(h/6.0,s,l);
}
float hue2rgb(float p,float q,float t){if(t<0.0)t+=1.0;if(t>1.0)t-=1.0;if(t<1.0/6.0)return p+(q-p)*6.0*t;if(t<0.5)return q;if(t<2.0/3.0)return p+(q-p)*(2.0/3.0-t)*6.0;return p;}
vec3 hsl2rgb(vec3 hsl){if(hsl.y==0.0)return vec3(hsl.z);float q=hsl.z<0.5?hsl.z*(1.0+hsl.y):hsl.z+hsl.y-hsl.z*hsl.y,p=2.0*hsl.z-q;return vec3(hue2rgb(p,q,hsl.x+1.0/3.0),hue2rgb(p,q,hsl.x),hue2rgb(p,q,hsl.x-1.0/3.0));}
void main() {
    vec4 c = texture(u_input, v_uv);
    vec3 hsl = rgb2hsl(c.rgb);
    hsl.x = fract(hsl.x + u_shift + u_speed * u_time);
    hsl.y = clamp(hsl.y * u_satBoost, 0.0, 1.0);
    fragColor = vec4(hsl2rgb(hsl), c.a);
}`;
}

// 8. BLOOM
class Bloom extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.bloom', name: 'Bloom', description: 'Gaussian glow', type: 'effect', author: 'Dead4rat', version: '1.0.0', tags: ['glow'] };
    static params = [
        { name: 'threshold', type: 'float', min: 0, max: 1, default: 0.5, displayName: 'THRESHOLD' },
        { name: 'intensity', type: 'float', min: 0, max: 3, default: 1.0, displayName: 'INTENSITY' },
        { name: 'radius', type: 'float', min: 1, max: 12, default: 4.0, displayName: 'RADIUS' },
        { name: 'mix', type: 'float', min: 0, max: 1, default: 0.5, displayName: 'MIX' },
    ];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform vec2 u_resolution; uniform float u_threshold; uniform float u_intensity; uniform float u_radius; uniform float u_mix; uniform float u_time;
in vec2 v_uv; out vec4 fragColor;
float luma(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}
void main() {
    vec4 orig = texture(u_input, v_uv);
    vec2 px = u_radius / u_resolution;
    vec3 bloom = vec3(0); float weights = 0.0;
    for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++) {
        vec3 s = texture(u_input, v_uv + vec2(float(x),float(y))*px).rgb;
        float bright = max(0.0, luma(s) - u_threshold);
        float w = bright * exp(-float(x*x+y*y)*0.3);
        bloom += s*w; weights += w;
    }
    if(weights>0.001) bloom /= weights;
    fragColor = vec4(clamp(orig.rgb + bloom * u_intensity * u_mix, 0.0, 1.0), 1.0);
}`;
}

// 9. FEEDBACK
class Feedback extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.feedback', name: 'Feedback Loop', description: 'Temporal blending', type: 'effect', author: 'Dead4rat', version: '1.0.0', tags: ['temporal'] };
    static params = [
        { name: 'decay', type: 'float', min: 0, max: 0.99, default: 0.85, displayName: 'DECAY' },
        { name: 'zoomFB', type: 'float', min: 0.95, max: 1.05, default: 1.005, displayName: 'ZOOM' },
        { name: 'rotFB', type: 'float', min: -0.05, max: 0.05, default: 0.0, displayName: 'ROTATE' },
        { name: 'mix', type: 'float', min: 0, max: 1, default: 0.5, displayName: 'MIX' },
    ];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform sampler2D u_prev;
uniform float u_decay; uniform float u_zoomFB; uniform float u_rotFB; uniform float u_mix; uniform float u_time;
in vec2 v_uv; out vec4 fragColor;
void main() {
    vec2 c = v_uv - 0.5;
    float cs = cos(u_rotFB), sn = sin(u_rotFB);
    c = mat2(cs,-sn,sn,cs) * c / u_zoomFB;
    vec4 prev = texture(u_prev, c + 0.5) * u_decay;
    vec4 cur = texture(u_input, v_uv);
    fragColor = mix(cur, max(cur, prev), u_mix);
}`;

    constructor() { super(); this._prevFBO = null; this._prevTex = null; }

    initGL(gl, w, h) {
        super.initGL(gl, w, h);
        this._createPrevFBO(gl, w, h);
    }
    resize(gl, w, h) { this._destroyPrevFBO(gl); this._createPrevFBO(gl, w, h); }
    deinitGL(gl) { this._destroyPrevFBO(gl); super.deinitGL(gl); }

    render(gl, ctx) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.outputFBO);
        gl.viewport(0, 0, ctx.width, ctx.height);
        gl.useProgram(this._program);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ctx.inputTexture);
        this._setUniform(gl, 'u_input', 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this._prevTex);
        this._setUniform(gl, 'u_prev', 1);
        this._setUniform(gl, 'u_time', ctx.time);
        for (const p of this.constructor.params) this._setUniform(gl, 'u_' + p.name, ctx.params[p.name]);
        gl.bindVertexArray(this._vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, ctx.outputFBO);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this._prevFBO);
        gl.blitFramebuffer(0,0,ctx.width,ctx.height,0,0,ctx.width,ctx.height,gl.COLOR_BUFFER_BIT,gl.LINEAR);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    _createPrevFBO(gl, w, h) {
        this._prevTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._prevTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this._prevFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._prevFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._prevTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    _destroyPrevFBO(gl) {
        if (this._prevTex) { gl.deleteTexture(this._prevTex); this._prevTex = null; }
        if (this._prevFBO) { gl.deleteFramebuffer(this._prevFBO); this._prevFBO = null; }
    }
}

// 10. NOISE FIELD (Source)
class NoiseField extends WFGLShaderPlugin {
    static info = { id: 'com.dead4rat.noisefield', name: 'Noise Field', description: 'FBM noise overlay', type: 'source', author: 'Dead4rat', version: '1.0.0', tags: ['noise'] };
    static params = [
        { name: 'scale', type: 'float', min: 0.5, max: 20, default: 4.0, displayName: 'SCALE' },
        { name: 'speed', type: 'float', min: 0, max: 3, default: 0.3, displayName: 'SPEED' },
        { name: 'octaves', type: 'float', min: 1, max: 8, default: 4.0, displayName: 'OCTAVES' },
        { name: 'hue', type: 'float', min: 0, max: 1, default: 0.0, displayName: 'HUE' },
        { name: 'overlay', type: 'float', min: 0, max: 1, default: 0.3, displayName: 'OVERLAY' },
    ];
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input; uniform float u_scale; uniform float u_speed; uniform float u_octaves; uniform float u_hue; uniform float u_overlay; uniform float u_time;
in vec2 v_uv; out vec4 fragColor;
vec3 hsl2rgb(float h){return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;int o=int(u_octaves);for(int i=0;i<8;i++){if(i>=o)break;v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
void main() {
    float n = fbm(v_uv * u_scale + u_time * u_speed);
    vec3 col = hsl2rgb(u_hue + n*0.3) * n * 1.5;
    vec4 inp = texture(u_input, v_uv);
    fragColor = vec4(clamp(mix(inp.rgb, inp.rgb + col, u_overlay), 0.0, 1.0), 1.0);
}`;
}

// ═══════════════════════════════════════════════════════════════
//  PUBLIC API — attach to window.WFGL
// ═══════════════════════════════════════════════════════════════
const STOCK_PLUGINS = [
    InvertColors, ChromaticAberration, VHS, Kaleidoscope,
    EdgeGlow, PixelSort, HueShift, Bloom, Feedback, NoiseField
];

function registerStockPlugins(host) {
    for (const P of STOCK_PLUGINS) host.register(P);
}

window.WFGL = {
    WFGLPlugin, WFGLShaderPlugin, WFGLHost, WFGLPipeline,
    InvertColors, ChromaticAberration, VHS, Kaleidoscope,
    EdgeGlow, PixelSort, HueShift, Bloom, Feedback, NoiseField,
    STOCK_PLUGINS, registerStockPlugins,
};

console.log('[WFGL] Web FreeFrame GL loaded — 10 stock plugins registered');

})();
