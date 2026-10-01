// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — AUDIO ENGINE
//
// source (mic | file) → bus (GainNode, lives as long as the page) → analyser
//                         └→ speakers (file only) └→ recorder (while REC)
//
// Keeping one persistent bus means switching source never cuts a recording.
//
// Per band (BASS <250 Hz, MID <4 kHz, HIGH): a smoothed display level
// (after MASTER/EQ gain), and an onset detector that works on the raw,
// pre-gain energy: it fires when energy RISES well above its own running
// average and re-arms only after it falls back — so a held note doesn't
// re-trigger. update() is driven by the deck's single loop.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
const BAND_NAMES = ['BASS', 'MID', 'HIGH'];

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.bus = null;
        this.data = null;
        this.source = null;
        this.stream = null;
        this.fileEl = null;
        this.fileName = '';
        this.kind = 'off';         // 'off' | 'mic' | 'file'
        this.error = '';
        this._token = 0;           // newest start request wins

        this.gain = 1.0;
        this.bandGain = { BASS: 1, MID: 1, HIGH: 1 };
        this.smoothing = 0.7;
        this.sensitivity = 0.5;

        this.level = { BASS: 0, MID: 0, HIGH: 0 };
        this.env = { BASS: 0, MID: 0, HIGH: 0 };
        this.onset = { BASS: false, MID: false, HIGH: false };
        this.lastOnset = { BASS: -1e9, MID: -1e9, HIGH: -1e9 };
        this.beat = 0;
        this.transient = false;
        this.bpm = 0;

        this._avg = { BASS: -1, MID: -1, HIGH: -1 };
        this._armed = { BASS: true, MID: true, HIGH: true };
        this._raw = { BASS: 0, MID: 0, HIGH: 0 };
        this._onsetTimes = [];
        this._lastT = 0;
    }

    get running() { return this.kind !== 'off'; }

    ensureContext() {
        if (!this.ctx || this.ctx.state === 'closed') {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
            this.bus = this.ctx.createGain();
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 2048;
            // No analyser smoothing: it is applied per read, so it would make
            // beat detection depend on the frame rate. We smooth ourselves.
            this.analyser.smoothingTimeConstant = 0;
            this.analyser.minDecibels = -85;
            this.analyser.maxDecibels = -20;
            this.bus.connect(this.analyser);
            this.data = new Uint8Array(this.analyser.frequencyBinCount);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return this.ctx;
    }

    // Drop the current source only (the bus and any recording stay connected).
    _dropSource() {
        if (this.source) { try { this.source.disconnect(); } catch (_) {} this.source = null; }
        if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
        if (this.fileEl) {
            this.fileEl.pause();
            if (this.fileEl.src.startsWith('blob:')) URL.revokeObjectURL(this.fileEl.src);
            this.fileEl.removeAttribute('src');
            this.fileEl = null;
        }
        if (this.bus) { try { this.bus.disconnect(this.ctx.destination); } catch (_) {} }
        this.fileName = '';
    }

    _resetAnalysis() {
        for (const b of BAND_NAMES) {
            this.level[b] = 0; this.env[b] = 0; this.onset[b] = false;
            this._avg[b] = -1; this._armed[b] = true; this._raw[b] = 0;
        }
        this.beat = 0; this.transient = false; this.bpm = 0; this._onsetTimes = [];
    }

    // A second click while the permission prompt is open reuses that request.
    startMic() {
        if (this._micPending) return this._micPending;
        this._micPending = this._startMic().finally(() => { this._micPending = null; });
        return this._micPending;
    }

    async _startMic() {
        const token = ++this._token;
        this.error = '';
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false,
            });
        } catch (e) {
            if (token === this._token) this.error = e && e.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Microphone unavailable';
            console.warn('[Audio] mic failed', e);
            return false;
        }
        if (token !== this._token) { stream.getTracks().forEach(t => t.stop()); return false; } // a newer request won
        const ctx = this.ensureContext();
        this._dropSource();
        this.stream = stream;
        this.source = ctx.createMediaStreamSource(stream);
        this.source.connect(this.bus);
        this.kind = 'mic';
        this._resetAnalysis();
        return true;
    }

    async startFile(file) {
        const token = ++this._token;
        this.error = '';
        const ctx = this.ensureContext();
        const el = new Audio();
        const url = URL.createObjectURL(file);
        el.src = url;
        el.loop = true;
        let src;
        try {
            src = ctx.createMediaElementSource(el);
            await el.play();
        } catch (e) {
            // The new file failed: keep whatever was already playing.
            try { src && src.disconnect(); } catch (_) {}
            el.pause(); el.removeAttribute('src'); URL.revokeObjectURL(url);
            if (token === this._token) this.error = `Could not play "${file.name}"`;
            console.warn('[Audio] file failed', e);
            return false;
        }
        if (token !== this._token) { el.pause(); src.disconnect(); URL.revokeObjectURL(url); return false; }
        this._dropSource();
        this.fileEl = el;
        this.fileName = file.name;
        this.source = src;
        src.connect(this.bus);
        this.bus.connect(ctx.destination);
        this.kind = 'file';
        this._resetAnalysis();
        return true;
    }

    stop() {
        this._token++;
        this._dropSource();
        this.kind = 'off';
        this._resetAnalysis();
        // Keep the context (browsers cap how many can exist); just let it sleep.
        if (this.ctx && this.ctx.state === 'running' && !this.recordTap) this.ctx.suspend().catch(() => {});
    }

    // A MediaStream carrying everything that goes through the bus, for recording.
    openRecordTap() {
        const ctx = this.ensureContext();
        if (!this.recordTap) {
            this.recordTap = ctx.createMediaStreamDestination();
            this.bus.connect(this.recordTap);
        }
        return this.recordTap.stream;
    }

    closeRecordTap() {
        if (!this.recordTap) return;
        try { this.bus.disconnect(this.recordTap); } catch (_) {}
        this.recordTap = null;
        if (this.kind === 'off' && this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
    }

    spectrum() {
        if (this.kind === 'off' || !this.analyser) return null;
        return this.data;
    }

    get sampleRate() { return this.ctx ? this.ctx.sampleRate : 48000; }

    update(now) {
        const dt = Math.min(0.1, Math.max(0.001, (now - (this._lastT || now)) / 1000 || 0.016));
        this._lastT = now;
        this.transient = false;
        if (this.kind === 'off' || !this.analyser) return;

        this.analyser.getByteFrequencyData(this.data);
        const bins = this.data.length;
        const hzPerBin = this.ctx.sampleRate / 2 / bins;
        const bassEnd = Math.max(2, Math.floor(250 / hzPerBin));
        const midEnd = Math.floor(4000 / hzPerBin);
        // Each band = 60% mean + 40% peak: the mean follows broadband energy,
        // the peak lets one loud tone register in a wide band.
        let bs = 0, ms = 0, hs = 0, bp = 0, mp = 0, hp = 0;
        for (let i = 1; i < bins; i++) {
            const a = this.data[i];
            if (i < bassEnd) { bs += a; if (a > bp) bp = a; }
            else if (i < midEnd) { ms += a; if (a > mp) mp = a; }
            else { hs += a; if (a > hp) hp = a; }
        }
        this._raw.BASS = (0.6 * bs / (bassEnd - 1) + 0.4 * bp) / 255;
        this._raw.MID = (0.6 * ms / (midEnd - bassEnd) + 0.4 * mp) / 255;
        this._raw.HIGH = (0.6 * hs / (bins - midEnd) + 0.4 * hp) / 255;

        const k = Math.pow(this.smoothing, dt * 60);
        const envDecay = Math.pow(0.001, dt / 0.35);
        const avgK = Math.pow(0.5, dt / 0.5);
        const rise = 1.6 - this.sensitivity * 0.5;       // must jump 1.1-1.6× above its average
        const floor = 0.05 - this.sensitivity * 0.035;
        let beat = 0;
        for (const b of BAND_NAMES) {
            const raw = this._raw[b];
            this.level[b] = Math.min(1, this.level[b] * k + Math.min(1, raw * this.bandGain[b] * this.gain) * (1 - k));
            if (this._avg[b] < 0) this._avg[b] = raw; // seed from the first frame
            const avg = this._avg[b];
            const threshold = avg * rise + floor;
            let isOnset = false;
            // A band whose EQ is at 0 is switched off: no beats from it either.
            if (this._armed[b] && this.bandGain[b] > 0 && raw > threshold && now - this.lastOnset[b] > 100) {
                isOnset = true;
                this._armed[b] = false;
                this.lastOnset[b] = now;
                this.env[b] = 1;
                this.transient = true;
                if (b === 'BASS') this._trackTempo(now);
            } else if (!this._armed[b] && raw < avg * (1 + (rise - 1) * 0.5) + floor * 0.5) {
                this._armed[b] = true; // fell back: ready for the next hit
            }
            if (!isOnset) this.env[b] *= envDecay;
            this.onset[b] = isOnset;
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
            if (d < 150) continue;                // double trigger
            while (d < 330) d *= 2;               // fold into 60-180 BPM
            while (d > 1000) d /= 2;
            iois.push(d);
        }
        if (iois.length < 3) { this.bpm = 0; return; }
        // Mean of the middle half: at low frame rates gaps alternate long/short
        // around the true beat, and a plain median would pick one side.
        iois.sort((a, b) => a - b);
        const q = Math.floor(iois.length / 4);
        const mid = iois.slice(q, iois.length - q);
        this.bpm = Math.round(60000 / (mid.reduce((s, x) => s + x, 0) / mid.length));
    }
}

window.D4R.AudioEngine = AudioEngine;
window.D4R.BAND_NAMES = BAND_NAMES;
})();
