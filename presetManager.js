/**
 * PresetManager — Save/Load effect configurations to localStorage
 * Thumbnails removed (localStorage quota killer) — text-only with metadata
 */
class PresetManager {
    constructor() {
        this.storageKey = 'dead4rat_presets_v3';
        this.presets = this.loadAll();
    }

    loadAll() {
        const data = localStorage.getItem(this.storageKey);
        if (!data) return [];
        try {
            // Strip thumbnails from legacy presets to reclaim storage
            return JSON.parse(data).map(p => {
                const { thumbnail, ...rest } = p;
                return rest;
            });
        } catch (e) { return []; }
    }

    savePreset(name, glitchezState) {
        const activeCount = Object.values(glitchezState).filter(e => e.enabled).length;
        const preset = {
            id: Date.now(),
            name: name || `PRESET ${this.presets.length + 1}`,
            settings: JSON.parse(JSON.stringify(glitchezState)),
            activeCount,
            timestamp: new Date().toISOString()
        };
        this.presets.push(preset);
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
        } catch (e) {
            // localStorage quota exceeded — trim oldest preset and retry
            this.presets.shift();
            localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
        }
        return preset;
    }

    deletePreset(id) {
        this.presets = this.presets.filter(p => p.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
    }

    // Serialize full session state to a shareable Base64 URL param
    static encodeState(glitchezState, genMode, genParams) {
        const payload = {
            g: glitchezState,
            m: genMode,
            p: genParams,
        };
        try {
            return btoa(encodeURIComponent(JSON.stringify(payload)));
        } catch (e) { return null; }
    }

    // Decode URL param back to state
    static decodeState(encoded) {
        try {
            return JSON.parse(decodeURIComponent(atob(encoded)));
        } catch (e) { return null; }
    }
}
