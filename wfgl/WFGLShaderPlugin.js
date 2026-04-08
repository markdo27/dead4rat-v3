/**
 * WFGL — WFGLShaderPlugin
 * Convenience base class for plugins that are just a fragment shader + params.
 * Handles shader compilation, uniform binding, and fullscreen quad rendering.
 */

import { WFGLPlugin } from './WFGLPlugin.js';

const VERT_SRC = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export class WFGLShaderPlugin extends WFGLPlugin {

    constructor() {
        super();
        this._program = null;
        this._vao = null;
        this._vbo = null;
        this._uniformLocs = {};
    }

    initGL(gl, width, height) {
        super.initGL(gl, width, height);
        const fragSrc = this.constructor.fragmentShader;
        if (!fragSrc) throw new Error(`${this.constructor.info.name}: no fragmentShader defined`);

        // Compile
        this._program = this._createProgram(gl, VERT_SRC, fragSrc);

        // Fullscreen quad VAO
        this._vao = gl.createVertexArray();
        this._vbo = gl.createBuffer();
        gl.bindVertexArray(this._vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1,  -1, 1,  1, 1
        ]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(this._program, 'a_position');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        // Cache uniform locations
        this._cacheUniforms(gl);
    }

    deinitGL(gl) {
        if (this._program) { gl.deleteProgram(this._program); this._program = null; }
        if (this._vbo)     { gl.deleteBuffer(this._vbo); this._vbo = null; }
        if (this._vao)     { gl.deleteVertexArray(this._vao); this._vao = null; }
        this._uniformLocs = {};
        super.deinitGL(gl);
    }

    render(gl, ctx) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.outputFBO);
        gl.viewport(0, 0, ctx.width, ctx.height);
        gl.useProgram(this._program);

        // Bind input texture
        if (ctx.inputTexture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, ctx.inputTexture);
            this._setUniform(gl, 'u_input', 0);
        }

        // Built-in uniforms
        this._setUniform(gl, 'u_time', ctx.time);
        this._setUniform(gl, 'u_resolution', [ctx.width, ctx.height]);
        this._setUniform(gl, 'u_bpm', ctx.bpm || 120);
        this._setUniform(gl, 'u_beat', ctx.beat || 0);
        this._setUniform(gl, 'u_audioBass', ctx.audioData ? ctx.audioData[0] : 0);
        this._setUniform(gl, 'u_audioMid',  ctx.audioData ? ctx.audioData[1] : 0);
        this._setUniform(gl, 'u_audioHigh', ctx.audioData ? ctx.audioData[2] : 0);

        // Plugin parameters → uniforms (u_paramName)
        const params = this.constructor.params;
        for (const p of params) {
            const val = ctx.params[p.name];
            const uName = 'u_' + p.name;
            if (p.type === 'color' && Array.isArray(val)) {
                this._setUniform(gl, uName, val);
            } else if (p.type === 'bool') {
                this._setUniform(gl, uName, val ? 1.0 : 0.0);
            } else {
                this._setUniform(gl, uName, val);
            }
        }

        // Draw
        gl.bindVertexArray(this._vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);
    }

    // ── Internal Helpers ──────────────────────────────────────
    _createProgram(gl, vertSrc, fragSrc) {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertSrc);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('WFGL vert:', gl.getShaderInfoLog(vs));
        }

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragSrc);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error(`WFGL frag [${this.constructor.info.name}]:`, gl.getShaderInfoLog(fs));
        }

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('WFGL link:', gl.getProgramInfoLog(prog));
        }

        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return prog;
    }

    _cacheUniforms(gl) {
        const count = gl.getProgramParameter(this._program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const info = gl.getActiveUniform(this._program, i);
            if (info) {
                this._uniformLocs[info.name] = gl.getUniformLocation(this._program, info.name);
            }
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
