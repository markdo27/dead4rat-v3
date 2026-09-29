// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — SCENES + MIDI
//
// SceneBank: 8 saved looks (replaces the old Presets list and Clip Launcher,
// which stored nearly the same thing twice). Stored in localStorage. Old
// presets from v3 are imported into empty slots once; the old storage key is
// left untouched.
//
// Midi: pads (notes 36-43 or 60-67) fire scenes 1-8. Any CC can be learned
// onto a slider: switch LEARN on, touch a slider, turn a knob.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
const { normalizeLook, migrateLegacy, clone } = window.D4R;
const KEY = 'd4r_scenes_v4';
const LEGACY_KEY = 'dead4rat_presets_v3';
const IMPORTED_KEY = 'd4r_legacy_imported';
const SLOTS = 8;

function store(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}
function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}

class SceneBank {
    constructor() {
        this.slots = Array(SLOTS).fill(null);
        this.saveError = false;
        try {
            const data = JSON.parse(read(KEY) || 'null');
            if (Array.isArray(data)) data.slice(0, SLOTS).forEach((s, i) => {
                if (s && s.look) this.slots[i] = { name: String(s.name || `SCENE ${i + 1}`).slice(0, 18), look: normalizeLook(s.look), at: s.at || 0 };
            });
        } catch (e) { /* corrupt storage: start empty */ }
        this._importLegacy();
    }

    _importLegacy() {
        if (read(IMPORTED_KEY)) return;
        try {
            const old = JSON.parse(read(LEGACY_KEY) || '[]');
            for (const p of old) {
                const i = this.slots.indexOf(null);
                if (i < 0) break;
                if (!p || !p.settings) continue;
                this.slots[i] = { name: String(p.name || 'PRESET').toUpperCase().slice(0, 18), look: migrateLegacy(p.settings, p.genMode, null), at: Date.parse(p.timestamp) || Date.now() };
            }
            this._save();
        } catch (e) { /* ignore */ }
        store(IMPORTED_KEY, '1');
    }

    _save() {
        this.saveError = !store(KEY, JSON.stringify(this.slots));
    }

    set(i, look, name) {
        this.slots[i] = { name: (name || `SCENE ${i + 1}`).toUpperCase().slice(0, 18), look: clone(look), at: Date.now() };
        this._save();
    }

    rename(i, name) {
        if (!this.slots[i]) return;
        this.slots[i].name = String(name).toUpperCase().slice(0, 18);
        this._save();
    }

    clear(i) { this.slots[i] = null; this._save(); }

    next(from) {
        for (let k = 1; k <= SLOTS; k++) {
            const i = ((from < 0 ? -1 : from) + k) % SLOTS;
            if (this.slots[i]) return i;
        }
        return -1;
    }
}

const MIDI_KEY = 'd4r_midi_map_v1';

class Midi {
    constructor(onPad, onCC) {
        this.onPad = onPad;
        this.onCC = onCC;
        this.state = 'off';      // off | on | unsupported | denied
        this.inputs = 0;
        this.learn = false;
        this.armed = null;       // target waiting for a CC
        this.map = {};           // cc → target
        this.last = '';
        try { this.map = JSON.parse(read(MIDI_KEY) || '{}'); } catch (e) { this.map = {}; }
    }

    async enable() {
        if (!navigator.requestMIDIAccess) { this.state = 'unsupported'; return; }
        try {
            const access = await navigator.requestMIDIAccess();
            const bind = () => {
                this.inputs = 0;
                for (const input of access.inputs.values()) { input.onmidimessage = (m) => this.handle(m.data); this.inputs++; }
            };
            bind();
            access.onstatechange = bind;
            this.state = 'on';
        } catch (e) {
            this.state = 'denied';
        }
    }

    arm(target) { if (this.learn) this.armed = target; }

    handle(data) {
        const [status, a, b = 0] = data;
        const cmd = status & 0xf0;
        if (cmd === 0x90 && b > 0) {
            this.last = `NOTE ${a}`;
            const pad = a >= 60 && a < 68 ? a - 60 : (a >= 36 && a < 44 ? a - 36 : -1);
            if (pad >= 0) this.onPad(pad);
        } else if (cmd === 0xb0) {
            this.last = `CC ${a} = ${b}`;
            if (this.learn && this.armed) {
                this.map[a] = this.armed;
                this.armed = null;
                store(MIDI_KEY, JSON.stringify(this.map));
            }
            const t = this.map[a];
            if (t) this.onCC(t, b / 127);
        }
    }

    forget() { this.map = {}; store(MIDI_KEY, '{}'); }
}

window.D4R = Object.assign(window.D4R, { SceneBank, Midi, SLOTS });
})();
