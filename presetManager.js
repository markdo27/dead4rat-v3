/**
 * PresetManager — Save/Load effect configurations to localStorage
 */
class PresetManager {
    constructor() {
        this.storageKey = 'dead4rat_presets_v3';
        this.presets = this.loadAll();
    }

    loadAll() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    savePreset(name, glitchezState, canvas) {
        const thumb = this.captureThumbnail(canvas);
        const preset = {
            id: Date.now(),
            name: name || `PRESET ${this.presets.length + 1}`,
            settings: JSON.parse(JSON.stringify(glitchezState)), // Deep clone
            thumbnail: thumb,
            timestamp: new Date().toISOString()
        };
        this.presets.push(preset);
        localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
        return preset;
    }

    deletePreset(id) {
        this.presets = this.presets.filter(p => p.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
    }

    captureThumbnail(canvas) {
        const thumbCanvas = document.createElement('canvas');
        const ctx = thumbCanvas.getContext('2d');
        thumbCanvas.width = 160;
        thumbCanvas.height = 90;
        ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        return thumbCanvas.toDataURL('image/jpeg', 0.7);
    }
}
 Broadway
