import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class Feedback extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.feedback',
        name: 'Feedback',
        description: 'Temporal frame blending with decay and zoom',
        type: 'effect',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['temporal', 'trail', 'feedback'],
    };

    static params = [
        { name: 'decay',    type: 'float', min: 0, max: 0.99, default: 0.85, displayName: 'DECAY' },
        { name: 'zoomFB',   type: 'float', min: 0.95, max: 1.05, default: 1.005, displayName: 'ZOOM' },
        { name: 'rotFB',    type: 'float', min: -0.05, max: 0.05, default: 0.0, displayName: 'ROTATE' },
        { name: 'mix',      type: 'float', min: 0, max: 1, default: 0.5, displayName: 'MIX' },
    ];

    constructor() {
        super();
        this._prevFBO = null;
        this._prevTex = null;
        this._blitProg = null;
    }

    initGL(gl, width, height) {
        super.initGL(gl, width, height);
        // Create previous-frame FBO
        this._createPrevFBO(gl, width, height);
    }

    resize(gl, width, height) {
        this._destroyPrevFBO(gl);
        this._createPrevFBO(gl, width, height);
    }

    deinitGL(gl) {
        this._destroyPrevFBO(gl);
        super.deinitGL(gl);
    }

    render(gl, ctx) {
        // Render the mixed frame to output
        gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.outputFBO);
        gl.viewport(0, 0, ctx.width, ctx.height);
        gl.useProgram(this._program);

        // input = current frame
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, ctx.inputTexture);
        this._setUniform(gl, 'u_input', 0);

        // previous frame
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._prevTex);
        this._setUniform(gl, 'u_prev', 1);

        this._setUniform(gl, 'u_time', ctx.time);
        this._setUniform(gl, 'u_decay', ctx.params.decay);
        this._setUniform(gl, 'u_zoomFB', ctx.params.zoomFB);
        this._setUniform(gl, 'u_rotFB', ctx.params.rotFB);
        this._setUniform(gl, 'u_mix', ctx.params.mix);

        gl.bindVertexArray(this._vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);

        // Copy output to prev FBO for next frame
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, ctx.outputFBO);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this._prevFBO);
        gl.blitFramebuffer(0, 0, ctx.width, ctx.height, 0, 0, ctx.width, ctx.height, gl.COLOR_BUFFER_BIT, gl.LINEAR);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform sampler2D u_prev;
uniform float u_decay;
uniform float u_zoomFB;
uniform float u_rotFB;
uniform float u_mix;
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;
void main() {
    // Zoom + rotate the previous frame UV
    vec2 c = v_uv - 0.5;
    float cs = cos(u_rotFB), sn = sin(u_rotFB);
    c = mat2(cs, -sn, sn, cs) * c;
    c /= u_zoomFB;
    vec2 prevUV = c + 0.5;

    vec4 current = texture(u_input, v_uv);
    vec4 prev = texture(u_prev, prevUV) * u_decay;

    fragColor = mix(current, max(current, prev), u_mix);
}`;

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
