// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — AUDIO ENGINE
//
// Mic or file input → analyser → three bands (BASS <250 Hz, MID <4 kHz,
// HIGH). Each band gets a smoothed level, an onset detector (energy jump
// above its own running average, with a refractory period) and a decaying
// beat envelope. update() is called once per frame by the main loop — the
// engine has no animation loop of its own.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
const BAND_NAMES = ['BASS', 'MID', 'HIGH'];

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.data = null;
        this.source = null;        // current source node
        this.stream = null;        // mic stream
        this.fileEl = null;        // <audio> for file playback
        this.fileName = '';
        this.kind = 'off';         // 'off' | 'mic' | 'file'
        this.error = '';

        this.gain = 1.0;                       // master
        this.bandGain = { BASS: 1, MID: 1, HIGH: 1 };
        this.smoothing = 0.7;                  // 0 = raw, 0.99 = very slow
        this.sensitivity = 0.5;                // onset sensitivity 0-1

        this.level = { BASS: 0, MID: 0, HIGH: 0 };   // smoothed, gained, 0-1
        this.env = { BASS: 0, MID: 0, HIGH: 0 };     // beat envelope 0-1
        this.onset = { BASS: false, MID: false, HIGH: false };
        this.beat = 0;              // overall beat envelope (max of bands)
        this.transient = false;     // any onset this frame
        this.bpm = 0;

        this._avg = { BASS: 0, MID: 0, HIGH: 0 };
        this._raw = { BASS: 0, MID: 0, HIGH: 0 };
        this._last = { BASS: 0, MID: 0, HIGH: 0 };
        this._onsetTimes = [];
        this._lastT = 0;
    }

    get running() { return this.kind !== 'off'; }

    _ensureContext() {
        if (!this.ctx || this.ctx.state === 'closed') {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.5;
            this.data = new Uint8Array(this.analyser.frequencyBinCount);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    _detach() {
        if (this.source) { try { this.source.disconnect(); } catch (_) {} this.source = null; }
        try { this.analyser && this.analyser.disconnect(); } catch (_) {}
        if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
        if (this.fileEl) {
            this.fileEl.pause();
            if (this.fileEl.src.startsWith('blob:')) URL.revokeObjectURL(this.fileEl.src);
            this.fileEl.removeAttribute('src');
            this.fileEl = null;
        }
        this.fileName = '';
    }

    async startMic() {
        if (this._starting) return this._starting;
        this._starting = this._startMic().finally(() => { this._starting = null; });
        return this._starting;
    }

    async _startMic() {
        this.error = '';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false,
            });
            this.stop();
            const ctx = this._ensureContext();
            this.stream = stream;
            this.source = ctx.createMediaStreamSource(stream);
            this.source.connect(this.analyser);
            this.kind = 'mic';
            return true;
        } catch (e) {
            this.error = e && e.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Microphone unavailable';
            console.warn('[Audio] mic failed', e);
            return false;
        }
    }

    async startFile(file) {
        this.error = '';
        this.stop();
        try {
            const ctx = this._ensureContext();
            const el = new Audio();
            el.src = URL.createObjectURL(file);
            el.loop = true;
            this.fileEl = el;
            this.fileName = file.name;
            // Media elements can only be wrapped once, so each file gets a new element.
            this.source = ctx.createMediaElementSource(el);
            this.source.connect(this.analyser);
            this.analyser.connect(ctx.destination);
            await el.play();
            this.kind = 'file';
            return true;
        } catch (e) {
            this.error = 'Could not play that file';
            console.warn('[Audio] file failed', e);
            this.stop();
            return false;
        }
    }

    setFilePaused(paused) {
        if (!this.fileEl) return;
        if (paused) this.fileEl.pause(); else this.fileEl.play().catch(() => {});
    }

    stop() {
        this._detach();
        this.kind = 'off';
        for (const b of BAND_NAMES) { this.level[b] = 0; this.env[b] = 0; this.onset[b] = false; this._avg[b] = 0; this._raw[b] = 0; }
        this.beat = 0; this.transient = false; this.bpm = 0; this._onsetTimes = [];
        // The context itself is kept: browsers cap how many can be created.
        if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
    }

    // Live byte spectrum (shared buffer — read only).
    spectrum() {
        if (this.kind === 'off' || !this.analyser) return null;
        return this.data;
    }

    update(now) {
        const dt = Math.min(0.1, Math.max(0.001, (now - (this._lastT || now)) / 1000 || 0.016));
        this._lastT = now;
        this.transient = false;
        if (this.kind === 'off' || !this.analyser) return;

        this.analyser.getByteFrequencyData(this.data);
        const bins = this.data.length;
        const hzPerBin = this.ctx.sampleRate / 2 / bins;
        const bassEnd = Math.max(1, Math.floor(250 / hzPerBin));
        const midEnd = Math.floor(4000 / hzPerBin);
        // Each band = 60% mean + 40% peak: the mean tracks broadband energy,
        // the peak lets a single loud tone register in a wide band (HIGH spans
        // ~800 bins, so a mean alone barely moves).
        let bs = 0, ms = 0, hs = 0, bp = 0, mp = 0, hp = 0;
        for (let i = 1; i < bins; i++) {
            const a = this.data[i];
            if (i < bassEnd) { bs += a; if (a > bp) bp = a; }
            else if (i < midEnd) { ms += a; if (a > mp) mp = a; }
            else { hs += a; if (a > hp) hp = a; }
        }
        this._raw.BASS = (0.6 * bs / (bassEnd - 1) + 0.4 * bp) / 255;
        this._raw.MID = (0.6 * ms / (midEnd - bassEnd) + 0.4 * mp) / 255;
        this._raw.HIGH = Math.min(1, (0.6 * hs / (bins - midEnd) * 2 + 0.4 * hp) / 255);

        // Frame-rate independent smoothing and envelope decay
        const k = Math.pow(this.smoothing, dt * 60);
        const envDecay = Math.pow(0.001, dt / 0.35);
        const avgK = Math.pow(0.5, dt / 0.6);
        const ratio = 1.6 - this.sensitivity * 0.6;       // 1.0-1.6× above average
        const floor = 0.06 - this.sensitivity * 0.04;
        let beat = 0;
        for (const b of BAND_NAMES) {
            const raw = Math.min(1, this._raw[b] * this.bandGain[b] * this.gain);
            this.level[b] = Math.min(1, this.level[b] * k + raw * (1 - k));
            const avg = this._avg[b];
            const isOnset = raw > avg * ratio + floor && now - this._last[b] > 110;
            this.onset[b] = isOnset;
            if (isOnset) {
                this._last[b] = now;
                this.env[b] = 1;
                this.transient = true;
                if (b === 'BASS') this._trackTempo(now);
            } else {
                this.env[b] *= envDecay;
            }
            this._avg[b] = avg * avgK + raw * (1 - avgK);
            beat = Math.max(beat, this.env[b]);
        }
        this.beat = beat;
    }

    _trackTempo(now) {
        const t = this._onsetTimes;
        t.push(now);
        while (t.length && now - t[0] > 8000) t.shift();
        if (t.length < 5) { this.bpm = 0; return; }
        const iois = [];
        for (let i = 1; i < t.length; i++) {
            let d = t[i] - t[i - 1];
            while (d < 300) d *= 2;      // fold double-time
            while (d > 1000) d /= 2;     // fold half-time
            iois.push(d);
        }
        iois.sort((a, b) => a - b);
        this.bpm = Math.round(60000 / iois[iois.length >> 1]);
    }
}

window.D4R.AudioEngine = AudioEngine;
window.D4R.BAND_NAMES = BAND_NAMES;
})();
