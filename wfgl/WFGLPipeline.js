/**
 * WFGL — WFGLPipeline
 * FBO chain manager. Creates/destroys FBOs as plugins are added.
 * Handles ping-pong rendering between chain stages.
 */

export class WFGLPipeline {
    constructor(gl) {
        this._gl = gl;
        this._fbos = [];      // Array of { fbo, tex }
        this._width = 0;
        this._height = 0;
    }

    /**
     * Ensure we have at least `count` FBOs available.
     */
    ensureFBOs(count) {
        while (this._fbos.length < count) {
            this._fbos.push(this._createFBO(this._width, this._height));
        }
        // Trim excess
        while (this._fbos.length > count + 2) {
            const old = this._fbos.pop();
            this._destroyFBO(old);
        }
    }

    /**
     * Resize all FBOs.
     */
    resize(width, height) {
        if (width === this._width && height === this._height) return;
        this._width = width;
        this._height = height;
        // Rebuild all
        for (let i = 0; i < this._fbos.length; i++) {
            this._destroyFBO(this._fbos[i]);
            this._fbos[i] = this._createFBO(width, height);
        }
    }

    /**
     * Get FBO at index.
     */
    getFBO(index) {
        return this._fbos[index] || null;
    }

    /**
     * Free all GPU resources.
     */
    destroy() {
        for (const fbo of this._fbos) {
            this._destroyFBO(fbo);
        }
        this._fbos = [];
    }

    // ── Internal ──────────────────────────────────────────────
    _createFBO(width, height) {
        const gl = this._gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width || 1, height || 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
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

    _destroyFBO(fboObj) {
        if (!fboObj) return;
        const gl = this._gl;
        if (fboObj.tex) gl.deleteTexture(fboObj.tex);
        if (fboObj.fbo) gl.deleteFramebuffer(fboObj.fbo);
    }
}
