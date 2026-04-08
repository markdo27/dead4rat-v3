/**
 * WFGL — WFGLHost
 * The plugin host/runtime. Manages registration, chain ordering,
 * parameter state, and orchestrates the FBO render pipeline.
 */

import { WFGLPipeline } from './WFGLPipeline.js';

export class WFGLHost {
    constructor(gl) {
        this._gl = gl;
        this._registry = new Map();    // id → PluginClass
        this._chain = [];              // Array of { id, instance, enabled, paramValues }
        this._pipeline = new WFGLPipeline(gl);
        this._width = 0;
        this._height = 0;
        this._nextInstanceId = 1;

        // FPS warning
        this._fpsWarning = false;
        this._frameTimes = [];
    }

    // ══════════════════════════════════════════════════════════
    //  REGISTRY
    // ══════════════════════════════════════════════════════════

    /**
     * Register a plugin class (not instance).
     */
    register(PluginClass) {
        const id = PluginClass.info.id;
        this._registry.set(id, PluginClass);
    }

    /**
     * Get all registered plugin classes.
     */
    getAvailable() {
        return Array.from(this._registry.values());
    }

    /**
     * Get registered plugins filtered by type.
     */
    getByType(type) {
        return this.getAvailable().filter(P => P.info.type === type);
    }

    /**
     * Get a plugin class by its id.
     */
    getPluginClass(pluginId) {
        return this._registry.get(pluginId);
    }

    // ══════════════════════════════════════════════════════════
    //  CHAIN MANAGEMENT
    // ══════════════════════════════════════════════════════════

    /**
     * Add a plugin to the effect chain.
     * @returns {number} instanceId
     */
    addToChain(pluginId, position = -1) {
        const PluginClass = this._registry.get(pluginId);
        if (!PluginClass) throw new Error(`WFGL: Unknown plugin "${pluginId}"`);

        const instance = new PluginClass();
        if (this._width > 0) {
            instance.initGL(this._gl, this._width, this._height);
        }

        const entry = {
            instanceId: this._nextInstanceId++,
            pluginId,
            instance,
            enabled: true,
            paramValues: instance.getAllParams(),
        };

        if (position >= 0 && position < this._chain.length) {
            this._chain.splice(position, 0, entry);
        } else {
            this._chain.push(entry);
        }

        this._updatePipeline();
        return entry.instanceId;
    }

    /**
     * Remove a plugin from the chain by instanceId.
     */
    removeFromChain(instanceId) {
        const idx = this._chain.findIndex(e => e.instanceId === instanceId);
        if (idx < 0) return;
        const entry = this._chain[idx];
        entry.instance.deinitGL(this._gl);
        this._chain.splice(idx, 1);
        this._updatePipeline();
    }

    /**
     * Move a plugin in the chain.
     */
    reorderChain(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this._chain.length) return;
        if (toIndex < 0 || toIndex >= this._chain.length) return;
        const [entry] = this._chain.splice(fromIndex, 1);
        this._chain.splice(toIndex, 0, entry);
    }

    /**
     * Toggle a plugin's enabled state.
     */
    setEnabled(instanceId, enabled) {
        const entry = this._chain.find(e => e.instanceId === instanceId);
        if (entry) entry.enabled = enabled;
    }

    /**
     * Get the current chain state (for UI).
     */
    getChain() {
        return this._chain.map(e => ({
            instanceId: e.instanceId,
            pluginId:   e.pluginId,
            info:       e.instance.constructor.info,
            params:     e.instance.constructor.params,
            enabled:    e.enabled,
            paramValues: e.paramValues,
        }));
    }

    // ══════════════════════════════════════════════════════════
    //  PARAMETERS
    // ══════════════════════════════════════════════════════════

    setParam(instanceId, paramName, value) {
        const entry = this._chain.find(e => e.instanceId === instanceId);
        if (!entry) return;
        entry.instance.setParam(paramName, value);
        entry.paramValues[paramName] = value;
    }

    getParam(instanceId, paramName) {
        const entry = this._chain.find(e => e.instanceId === instanceId);
        return entry ? entry.instance.getParam(paramName) : undefined;
    }

    // ══════════════════════════════════════════════════════════
    //  RESIZE
    // ══════════════════════════════════════════════════════════

    resize(width, height) {
        this._width = width;
        this._height = height;
        this._pipeline.resize(width, height);
        for (const entry of this._chain) {
            entry.instance.resize(this._gl, width, height);
        }
    }

    // ══════════════════════════════════════════════════════════
    //  RENDER PIPELINE
    // ══════════════════════════════════════════════════════════

    /**
     * Process the input texture through the entire active chain.
     * @param {WebGLTexture} inputTexture - The engine's current render output
     * @param {Object} ctx - { time, bpm, beat, audioData }
     * @returns {WebGLTexture} - The final processed texture (or inputTexture if chain empty)
     */
    process(inputTexture, ctx) {
        const t0 = performance.now();
        const activeChain = this._chain.filter(e => e.enabled);

        if (activeChain.length === 0) {
            return inputTexture;
        }

        const gl = this._gl;
        let currentInput = inputTexture;

        for (let i = 0; i < activeChain.length; i++) {
            const entry = activeChain[i];
            const isLast = (i === activeChain.length - 1);
            const fboObj = this._pipeline.getFBO(i);
            if (!fboObj) continue;

            const renderCtx = {
                inputTexture: currentInput,
                outputFBO:    fboObj.fbo,
                width:        this._width,
                height:       this._height,
                time:         ctx.time || 0,
                bpm:          ctx.bpm || 120,
                beat:         ctx.beat || 0,
                audioData:    ctx.audioData || null,
                params:       entry.paramValues,
            };

            entry.instance.render(gl, renderCtx);
            currentInput = fboObj.tex;
        }

        // FPS warning tracking
        const dt = performance.now() - t0;
        this._frameTimes.push(dt);
        if (this._frameTimes.length > 60) this._frameTimes.shift();
        const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
        this._fpsWarning = avg > 12; // >12ms just for WFGL pass = warning

        return currentInput;
    }

    /**
     * Whether WFGL processing is taking too long.
     */
    get fpsWarning() {
        return this._fpsWarning;
    }

    /**
     * Number of active (enabled) plugins in chain.
     */
    get activeCount() {
        return this._chain.filter(e => e.enabled).length;
    }

    // ══════════════════════════════════════════════════════════
    //  CLEANUP
    // ══════════════════════════════════════════════════════════

    destroy() {
        for (const entry of this._chain) {
            entry.instance.deinitGL(this._gl);
        }
        this._chain = [];
        this._pipeline.destroy();
    }

    // ── Internal ──────────────────────────────────────────────
    _updatePipeline() {
        const count = this._chain.filter(e => e.enabled).length;
        this._pipeline.ensureFBOs(Math.max(count, 1));
    }
}
