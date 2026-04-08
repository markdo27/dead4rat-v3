/**
 * WFGL — Web FreeFrame GL Plugin System
 * Base plugin class. All plugins extend this.
 * Mirrors Resolume's CFFGLPlugin architecture for the web.
 */

export class WFGLPlugin {
    // ── Metadata (override in subclass) ────────────────────────
    static info = {
        id:          'com.wfgl.base',
        name:        'Base Plugin',
        description: 'Base plugin class — do not instantiate directly',
        type:        'effect',   // 'effect' | 'source'
        author:      'WFGL',
        version:     '1.0.0',
        tags:        [],
    };

    // ── Parameter Definitions (override in subclass) ───────────
    // Each param: { name, type, min?, max?, default, options?, displayName? }
    // Types: 'float', 'bool', 'color', 'option'
    static params = [];

    // ── Fragment shader source (for WFGLShaderPlugin) ──────────
    static fragmentShader = null;

    constructor() {
        this.enabled = true;
        this._paramValues = {};
        this._gl = null;

        // Initialize parameter values from schema
        const params = this.constructor.params;
        for (const p of params) {
            this._paramValues[p.name] = p.default !== undefined ? p.default : 0;
        }
    }

    // ── Parameter Access ───────────────────────────────────────
    getParam(name) {
        return this._paramValues[name];
    }

    setParam(name, value) {
        this._paramValues[name] = value;
    }

    getAllParams() {
        return { ...this._paramValues };
    }

    // ── Lifecycle (override in subclass) ───────────────────────

    /**
     * Called once when plugin is added to the chain.
     * Allocate shaders, textures, FBOs here.
     */
    initGL(gl, width, height) {
        this._gl = gl;
    }

    /**
     * Called when plugin is removed from chain.
     * Free all GPU resources here.
     */
    deinitGL(gl) {
        this._gl = null;
    }

    /**
     * Called when viewport size changes.
     */
    resize(gl, width, height) {}

    /**
     * Main render call.
     * @param {WebGL2RenderingContext} gl
     * @param {Object} ctx
     * @param {WebGLTexture} ctx.inputTexture - Previous stage output (null for sources)
     * @param {WebGLFramebuffer} ctx.outputFBO - Where to draw
     * @param {number} ctx.width
     * @param {number} ctx.height
     * @param {number} ctx.time - Elapsed seconds
     * @param {number} ctx.bpm - Beats per minute
     * @param {number} ctx.beat - Current beat phase (0–1)
     * @param {Float32Array} ctx.audioData - Frequency data (3 bands: bass/mid/high)
     * @param {Object} ctx.params - Current parameter values
     */
    render(gl, ctx) {
        // Default: passthrough (blit input to output)
    }
}
