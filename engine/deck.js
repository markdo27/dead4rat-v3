// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — DECK (application controller)
//
// Owns the current look, every engine, and the one animation loop that
// drives them all. The React UI only calls Deck methods and re-renders when
// the Deck emits; live meters subscribe to onFrame() and write to the DOM
// directly, so nothing in React runs at 60 fps.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
const D = window.D4R;
const { FX_DEFS, FX_BY_KEY, GEN_DEFS, GEN_PARAMS, GESTURE_DEFS, LFO_WAVES, clone, clamp } = D;

// renderScale = fraction of display pixels rendered; genScale = generator
// resolution relative to the render size.
const QUALITY_STEPS = [
    { r: 0.4, g: 0.35 }, { r: 0.5, g: 0.4 }, { r: 0.6, g: 0.45 },
    { r: 0.75, g: 0.5 }, { r: 0.85, g: 0.55 }, { r: 1.0, g: 0.6 },
];
const QUALITY_FIXED = { LOW: 1, MED: 3, HIGH: 5 };
const PREFS_KEY = 'd4r_prefs_v1';
const EMOTION_HUE = { neutral: 0, happy: 0.12, surprise: 0.3, sad: 0.6, fear: 0.72, angry: 0.95, disgust: 0.4 };

const readPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch (e) { return {}; } };

function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

class Deck {
    constructor(canvas, video) {
        this.canvas = canvas;
        this.look = D.defaultLook();
        const prefs = readPrefs();
        this.view = { format: 'SCREEN', quality: 'AUTO', flipH: false, flipV: false, rotation: 0, ...(prefs.view || {}) };
        this.morphMs = typeof prefs.morphMs === 'number' ? prefs.morphMs : 1200;
        this.auto = { on: false, every: prefs.autoEvery || 16, last: 0 };

        this.renderer = new D.Renderer(canvas);
        this.audio = new D.AudioEngine();
        this.camera = new D.Camera(video);
        this.camera.mirror = prefs.mirror !== false;
        this.media = new D.MediaLayers();
        this.blobs = new D.BlobTracker();
        this.overlay = new D.TrackingOverlay();
        this.human = new D.HumanEngine();
        this.mask = new D.MaskEngine();
        this.scenes = new D.SceneBank();
        this.midi = new D.Midi((i) => this.fireScene(i), (t, v) => this._midiCC(t, v));

        this.gesture = { on: false, fx: ['lens', 'energy'], source: 'AUTO', palm: [0.5, 0.5], pinch: 0, span: 0,
                         shockT: 0, present: false, lastSeen: 0, via: '', _pinched: false };
        this.blobTrack = false;       // user asked for motion blobs (with boxes)
        this.showOverlay = true;      // draw boxes / skeleton over the image
        this.faceDrive = false;
        this.isolate = false;

        this.wet = {};
        for (const d of FX_DEFS) this.wet[d.key] = this.look.fx[d.key].on ? 1 : 0;
        this.genLevel = 1;
        this.morph = null;
        this.activeScene = -1;

        this.started = false;
        this.demo = false;
        this.paused = false;
        this.recording = false;
        this.fps = 0;
        this.frameMs = 16.7;
        this._q = { level: QUALITY_FIXED[this.view.quality] ?? 3, lastChange: 0, lastDrop: 0, droppedFrom: -1, samples: [] };
        this._subs = new Set();
        this._frameSubs = new Set();
        this.version = 0;
        this.toast = null;

        this.sharedLook = null;
        const qs = new URLSearchParams(location.search);
        const shared = qs.get('look') || qs.get('p');
        if (shared) {
            this.sharedLook = D.decodeLook(shared);
            this.sharedLinkBroken = !this.sharedLook;
            history.replaceState({}, '', location.pathname);
        }

        this._applyQuality();
        window.addEventListener('resize', () => { this.renderer.resize(); this.emit(); });
        canvas.addEventListener('webglcontextlost', () => this.notify('The browser reset the graphics — recovering…', 'warn'));
        canvas.addEventListener('webglcontextrestored', () => this.notify('Graphics restored'));
        this._loop = this._loop.bind(this);
    }

    // ── Events ─────────────────────────────────────────────────────────────
    subscribe(fn) { this._subs.add(fn); return () => this._subs.delete(fn); }
    onFrame(fn) { this._frameSubs.add(fn); return () => this._frameSubs.delete(fn); }
    emit() {
        if (this._pending) return;
        this._pending = true;
        queueMicrotask(() => { this._pending = false; this.version++; for (const fn of this._subs) fn(this.version); });
    }
    notify(msg, kind = 'info', action = null) { this.toast = { msg, kind, action, id: Date.now() + Math.random() }; this.emit(); }
    _savePrefs() {
        try { localStorage.setItem(PREFS_KEY, JSON.stringify({ view: this.view, morphMs: this.morphMs, autoEvery: this.auto.every, mirror: this.camera.mirror })); } catch (e) {}
    }

    // ── Boot ───────────────────────────────────────────────────────────────
    async start({ camera = true, mic = false, demo = false } = {}) {
        if (this.started) return;
        this.demo = demo;
        const warnings = [];
        if (camera && !demo && !(await this.camera.start())) warnings.push(`${this.camera.error} — running without camera`);
        if (mic && !demo && !(await this.audio.startMic())) warnings.push(this.audio.error);
        if (this.sharedLinkBroken) warnings.push('That shared link could not be read — starting fresh');
        if (warnings.length) this.notify(warnings.join(' · '), 'warn');
        if (this.sharedLook) {
            this._applyLook(this.sharedLook);
            this.sharedLook = null;
            this.notify('Shared look loaded');
        } else if (demo || !this.camera.on) {
            const L = D.defaultLook();
            L.gen.mode = 'GYROID';
            L.fx.rgbsplit.on = true;
            L.fx.feedback.on = true; L.fx.feedback.params.amount = 0.55; L.fx.feedback.params.rotation = 0.3;
            L.fx.rgbsplit.params.amount = 4;
            L.fx.crt.params.grain = 0.08;
            this._applyLook(L);
        }
        this.started = true;
        this._lastT = performance.now();
        this._q.startT = this._lastT;
        this._q.winT = this._lastT;
        requestAnimationFrame(this._loop);
        this.emit();
    }

    setPaused(p) { this.paused = p; this.emit(); }

    // ── Look editing ───────────────────────────────────────────────────────
    _edit() { if (this.morph) this._finishMorph(); this.activeScene = -1; }

    toggleFx(key, on) {
        this._edit();
        const s = this.look.fx[key];
        s.on = on === undefined ? !s.on : on;
        this.emit();
    }
    setFxParam(key, k, v) { this._edit(); this.look.fx[key].params[k] = v; this.emit(); }
    setFxBand(key, band) {
        this._edit();
        const s = this.look.fx[key];
        s.band = s.band === band ? null : band;
        this.emit();
    }
    cycleLfo(where, key, k) {
        this._edit();
        const lfo = where === 'gen' ? this.look.gen.lfo : this.look.fx[key].lfo;
        const i = LFO_WAVES.indexOf(lfo[k]);
        if (i === LFO_WAVES.length - 1) delete lfo[k]; else lfo[k] = LFO_WAVES[i + 1];
        this.emit();
    }
    setMod(k, v) { this.look.mod[k] = v; this.emit(); }
    resetFx(key) {
        this._edit();
        const d = FX_BY_KEY[key], s = this.look.fx[key];
        for (const p of d.params) s.params[p.k] = p.def;
        s.lfo = {}; s.band = null;
        this.emit();
    }

    setGenMode(mode) {
        this._edit();
        if (this.look.gen.mode !== mode) this.genLevel = 0;
        this.look.gen.mode = mode;
        this.emit();
    }
    stepGen(dir) {
        const keys = ['OFF', ...GEN_DEFS.map(d => d.key)];
        const i = keys.indexOf(this.look.gen.mode);
        this.setGenMode(keys[(i + dir + keys.length) % keys.length]);
    }
    setGenParam(k, v) { this._edit(); this.look.gen.params[k] = v; this.emit(); }
    setGenBand(b) { this._edit(); this.look.gen.band = this.look.gen.band === b ? null : b; this.emit(); }
    setCamKey(v) { this._edit(); this.look.gen.camKey = v; this.emit(); }

    // A new random look, reached by a morph. Keeps CRT as is and never picks
    // STROBE (flashing should be a deliberate choice).
    randomize() {
        const L = clone(this.look);
        const weight = { mirror: 0.5, feedback: 0.6, melt: 0.5, motion: 0.4, slice: 0.7, vhs: 0.7, edges: 0.6, thermal: 0.5, halftone: 0.6 };
        const pool = FX_DEFS.filter(d => d.key !== 'strobe' && d.key !== 'crt');
        for (const d of pool) L.fx[d.key].on = false;
        const n = 2 + Math.floor(Math.random() * 3);
        const picks = [];
        while (picks.length < n) {
            const total = pool.reduce((a, d) => a + (picks.includes(d) ? 0 : (weight[d.key] || 1)), 0);
            let r = Math.random() * total;
            for (const d of pool) {
                if (picks.includes(d)) continue;
                r -= weight[d.key] || 1;
                if (r <= 0) { picks.push(d); break; }
            }
        }
        for (const d of picks) {
            const s = L.fx[d.key];
            s.on = true;
            for (const p of d.params) {
                if (p.k === 'blend') { s.params.blend = Math.random() < 0.7 ? 0 : [1, 3, 5][Math.floor(Math.random() * 3)]; continue; }
                if (d.key === 'edges' && p.k === 'mode') { s.params.mode = 1; continue; }
                if (p.opts) { s.params[p.k] = Math.floor(Math.random() * p.opts.length); continue; }
                const v = p.min + (p.max - p.min) * (0.15 + Math.random() * 0.55);
                s.params[p.k] = Math.round(v / p.step) * p.step;
            }
        }
        if (L.gen.mode !== 'OFF') {
            L.gen.params.colorA = Math.random();
            L.gen.params.colorB = Math.random();
            L.gen.params.warp = 0.5 + Math.random();
        }
        this.activeScene = -1;
        this._startMorph(L, Math.min(this.morphMs, 900));
        this.emit();
    }

    reset() {
        const L = D.defaultLook();
        L.gen.mode = this.look.gen.mode;
        this.activeScene = -1;
        this._startMorph(L, 400);
        this.emit();
    }

    // ── Scenes ─────────────────────────────────────────────────────────────
    storeScene(i) {
        if (this.morph) this._finishMorph();
        const gen = this.look.gen.mode;
        const on = FX_DEFS.filter(d => this.look.fx[d.key].on).length;
        const prev = this.scenes.slots[i];
        const keep = prev && prev.custom;
        this.scenes.set(i, this.look, keep ? prev.name : (gen !== 'OFF' ? gen : `${on} FX`), keep);
        this.activeScene = i;
        if (this.scenes.saveError) this.notify('Browser storage is full — scene kept for this session only', 'warn');
        this.emit();
    }
    fireScene(i) {
        const s = this.scenes.slots[i];
        if (!s) return;
        this.activeScene = i;
        this._startMorph(s.look);
        this.emit();
    }
    clearScene(i) {
        const old = this.scenes.slots[i];
        if (!old) return;
        this.scenes.clear(i);
        if (this.activeScene === i) this.activeScene = -1;
        this.notify(`Scene ${i + 1} cleared`, 'info', { label: 'UNDO', run: () => { if (!this.scenes.slots[i]) { this.scenes.restore(i, old); this.emit(); } } });
    }
    renameScene(i, name) { this.scenes.rename(i, name); this.emit(); }
    setMorphMs(ms) { this.morphMs = ms; this._savePrefs(); this.emit(); }
    setAuto(on) {
        this.auto.on = on;
        this.auto.last = performance.now();
        if (on && this.scenes.filled < 2) this.notify('AUTO makes random looks until you save 2 or more scenes');
        this.emit();
    }
    setAutoEvery(s) { this.auto.every = s; this._savePrefs(); this.emit(); }

    _applyLook(look) {
        this.look = D.normalizeLook(clone(look));
        for (const d of FX_DEFS) this.wet[d.key] = this.look.fx[d.key].on ? 1 : 0;
        this.genLevel = 1;
    }

    // Morphs always start from what is on screen right now — including a
    // morph that is still running — so chained scene changes never jump.
    _startMorph(target, ms = this.morphMs) {
        target = D.normalizeLook(clone(target));
        if (!this.started || ms <= 0) { this._applyLook(target); this.morph = null; return; }
        const from = clone(this.look);
        const fromWet = { ...this.wet };
        for (const d of FX_DEFS) from.fx[d.key].on = fromWet[d.key] > 0.001;
        this.morph = { from, fromWet, fromGen: this.genLevel, to: target, t0: performance.now(), dur: ms };
    }

    _finishMorph() { const m = this.morph; this.morph = null; if (m) this._applyLook(m.to); }

    _stepMorph(t) {
        const m = this.morph;
        if (!m) return;
        const x = Math.min(1, (t - m.t0) / m.dur);
        const e = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
        const L = this.look;
        for (const d of FX_DEFS) {
            const a = m.from.fx[d.key], b = m.to.fx[d.key], s = L.fx[d.key];
            s.on = a.on || b.on;
            for (const p of d.params) {
                s.params[p.k] = p.opts ? (e < 0.5 ? a.params[p.k] : b.params[p.k]) : a.params[p.k] + (b.params[p.k] - a.params[p.k]) * e;
            }
            s.lfo = e < 0.5 ? a.lfo : b.lfo;
            s.band = e < 0.5 ? a.band : b.band;
            this.wet[d.key] = (a.on ? m.fromWet[d.key] * (1 - e) : 0) + (b.on ? e : 0);
        }
        const ga = m.from.gen, gb = m.to.gen, g = L.gen;
        for (const p of GEN_PARAMS) g.params[p.k] = ga.params[p.k] + (gb.params[p.k] - ga.params[p.k]) * e;
        g.camKey = ga.camKey + (gb.camKey - ga.camKey) * e;
        g.band = e < 0.5 ? ga.band : gb.band;
        g.lfo = e < 0.5 ? ga.lfo : gb.lfo;
        if (ga.mode === gb.mode) { g.mode = gb.mode; this.genLevel = m.fromGen + (1 - m.fromGen) * e; }
        else if (ga.mode === 'OFF') { g.mode = gb.mode; this.genLevel = e; }
        else if (gb.mode === 'OFF') { g.mode = ga.mode; this.genLevel = m.fromGen * (1 - e); }
        else if (e < 0.5) { g.mode = ga.mode; this.genLevel = m.fromGen * (1 - 2 * e); }
        else { g.mode = gb.mode; this.genLevel = 2 * e - 1; }
        L.mod.rate = m.from.mod.rate + (m.to.mod.rate - m.from.mod.rate) * e;
        L.mod.depth = m.from.mod.depth + (m.to.mod.depth - m.from.mod.depth) * e;
        if (x >= 1) { this._finishMorph(); this.emit(); }
    }

    _stepAuto(t) {
        const a = this.auto;
        if (!a.on) return;
        if (t - a.last < a.every * 1000) return;
        // With audio running, wait for the next bass hit so changes land on the beat.
        if (this.audio.running && !this.audio.onset.BASS && t - a.last < a.every * 1000 + 2000) return;
        a.last = t;
        const next = this.scenes.next(this.activeScene);
        if (this.scenes.filled >= 2 && next >= 0 && next !== this.activeScene) this.fireScene(next);
        else this.randomize();
    }

    // ── Output / view ──────────────────────────────────────────────────────
    setView(patch) {
        Object.assign(this.view, patch);
        if ('quality' in patch) {
            if (patch.quality !== 'AUTO') this._q.level = QUALITY_FIXED[patch.quality];
            this._q.droppedFrom = -1;
        }
        this._applyQuality();
        this._savePrefs();
        this.emit();
    }
    setMirror(on) { this.camera.mirror = on; this._savePrefs(); this.emit(); }

    _applyQuality() {
        const s = QUALITY_STEPS[this._q.level];
        this.renderer.setView({ format: this.view.format, renderScale: s.r, genScale: s.g });
    }
    get renderScale() { return QUALITY_STEPS[this._q.level].r; }

    // AUTO quality: judge the median frame time over ~1 s windows. Drop fast
    // (two steps when far over budget), climb slowly, never climb in the first
    // 5 s, and don't retry a level that just proved too slow.
    _governor(t, dt) {
        const q = this._q;
        q.samples.push(dt);
        if (t - (q.winT || t) < 1000 || q.samples.length < 8) return;
        q.winT = t;
        const s = q.samples.sort((a, b) => a - b);
        const median = s[s.length >> 1];
        q.samples = [];
        this.frameMs = median;
        if (this.view.quality !== 'AUTO' || this.morph || this.recording) return;
        if (median > 24 && q.level > 0 && t - q.lastChange > 900) {
            q.droppedFrom = q.level; q.lastDrop = t;
            q.level = Math.max(0, q.level - (median > 48 ? 2 : 1));
            q.lastChange = t; this._applyQuality(); this.emit();
        } else if (median < 18.5 && q.level < QUALITY_STEPS.length - 1 && t - q.lastChange > 4000 && t - (q.startT || 0) > 5000
                   && !(q.droppedFrom === q.level + 1 && t - q.lastDrop < 30000)) {
            q.level++; q.lastChange = t; this._applyQuality(); this.emit();
        }
    }

    // UI tells the deck which screen edges it covers so the picture fits beside it.
    setInsets(ins) {
        const k = JSON.stringify(ins);
        if (k === this._insetKey) return;
        this._insetKey = k;
        this.renderer.setInsets(ins);
        this.emit();
    }

    async toggleCamera() {
        if (this.camera.on) { this.camera.stop(); }
        else if (!(await this.camera.start())) this.notify(this.camera.error, 'warn');
        this.emit();
    }

    // ── Audio ──────────────────────────────────────────────────────────────
    async useMic() { if (!(await this.audio.startMic())) this.notify(this.audio.error, 'warn'); this.emit(); }
    async useFile(file) {
        if (!(await this.audio.startFile(file))) {
            this.notify(this.audio.error, 'warn');
            clearTimeout(this._audioErrT);
            this._audioErrT = setTimeout(() => { this.audio.error = ''; this.emit(); }, 6000);
        }
        this.emit();
    }
    audioOff() { this.audio.stop(); this.emit(); }
    setAudio(patch) {
        for (const [k, v] of Object.entries(patch)) {
            if (k in this.audio.bandGain) this.audio.bandGain[k] = v; else this.audio[k] = v;
        }
        this.emit();
    }

    // ── AI / tracking ──────────────────────────────────────────────────────
    async toggleHuman() {
        if (this.human.state === 'on' || this.human.state === 'loading') { this.human.stop(); this.emit(); return; }
        if (!this.camera.on) { this.notify('Turn the camera on first', 'warn'); return; }
        const p = this.human.start(this.camera.video);
        this.emit();
        await p;
        if (this.human.state === 'error') this.notify(this.human.error, 'warn');
        this.emit();
    }
    setHumanModule(k, on) { this.human.setModule(k, on); this.emit(); }
    toggleGesture() { this.gesture.on = !this.gesture.on; this.emit(); }
    toggleGestureFx(key) {
        const f = this.gesture.fx;
        this.gesture.fx = f.includes(key) ? f.filter(k => k !== key) : GESTURE_DEFS.map(d => d.key).filter(k => k === key || f.includes(k));
        this.emit();
    }
    setGestureSource(s) { this.gesture.source = s; this.emit(); }
    toggleFaceDrive() { this.faceDrive = !this.faceDrive; this.emit(); }
    async toggleIsolate() {
        if (this.isolate) { this.isolate = false; this.emit(); return; }
        if (!this.camera.on) { this.notify('Turn the camera on first', 'warn'); return; }
        this.isolate = true;
        this.emit();
        await this.mask.start();
        if (this.mask.state === 'error') { this.isolate = false; this.notify(this.mask.error, 'warn'); }
        this.emit();
    }
    toggleBlobs() { this.blobTrack = !this.blobTrack; if (!this.blobTrack) this.blobs.reset(); this.emit(); }
    setBlob(patch) { Object.assign(this.blobs, patch); this.emit(); }
    toggleOverlay() { this.showOverlay = !this.showOverlay; this.emit(); }

    // ── Media layers ───────────────────────────────────────────────────────
    // New image/video layers start at half the frame height, shrunk if needed
    // so they fit the frame's width (portrait formats).
    _fitLayer(l) {
        const frame = this.renderer.disp.w / this.renderer.disp.h;
        l.scale = Math.min(0.5, (0.8 * frame) / (l.aspect || 1));
    }
    async addImage(file) { try { this._fitLayer(await this.media.addImage(file)); } catch (e) { this.notify(e.message, 'warn'); } this.emit(); }
    async addVideo(file) { try { this._fitLayer(await this.media.addVideo(file)); } catch (e) { this.notify(e.message, 'warn'); } this.emit(); }
    addText() { this.media.addText(); this.emit(); }
    updateLayer(id, patch) { this.media.update(id, patch); this.emit(); }
    removeLayer(id) { this.media.remove(id); this.emit(); }

    // ── Capture ────────────────────────────────────────────────────────────
    _compose(src) {
        const out = document.createElement('canvas');
        out.width = src.width; out.height = src.height;
        const ctx = out.getContext('2d');
        ctx.drawImage(src, 0, 0);
        if (this.overlay.visible) ctx.drawImage(this.overlay.canvas, 0, 0, out.width, out.height);
        return out;
    }

    snapshot() {
        if (!this.started) return;
        if (this.paused) { this.notify('Close SANDER to take a snapshot', 'warn'); return; }
        this.renderer.snapshot((c) => {
            const w = c.width, h = c.height, full = this.renderScale >= 1;
            this._compose(c).toBlob((blob) => {
                if (!blob) return;
                download(blob, `dead4rat_${stamp()}.png`);
                this.notify(full ? `Snapshot saved (${w}×${h})` : `Snapshot saved (${w}×${h}) — set QUALITY to HIGH for full size`);
            }, 'image/png');
        });
    }

    toggleRecord() {
        if (this.recording) { this._rec && this._rec.stop(); return; }
        if (typeof MediaRecorder === 'undefined') { this.notify('Recording is not supported in this browser', 'warn'); return; }
        const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
        const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
        let stream;
        if (this.overlay.visible) {
            // Tracking boxes live on a separate canvas: compose both every frame.
            const rc = document.createElement('canvas');
            const rctx = rc.getContext('2d');
            this._recCompose = (c) => {
                if (rc.width !== c.width || rc.height !== c.height) { rc.width = c.width; rc.height = c.height; }
                rctx.drawImage(c, 0, 0);
                if (this.overlay.visible) rctx.drawImage(this.overlay.canvas, 0, 0, rc.width, rc.height);
            };
            stream = rc.captureStream(30);
        } else {
            stream = this.canvas.captureStream(30);
        }
        // Sound comes from the audio bus, which survives source changes, so
        // switching mic/file mid-recording (or starting audio later) is recorded too.
        this.audio.openRecordTap().getAudioTracks().forEach(tr => stream.addTrack(tr));
        const chunks = [];
        let rec;
        try {
            rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8e6 } : undefined);
        } catch (e) {
            this.audio.closeRecordTap();
            this._recCompose = null;
            this.notify('This browser could not start recording', 'warn');
            return;
        }
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = () => {
            this.recording = false;
            this._recCompose = null;
            this.audio.closeRecordTap();
            const type = rec.mimeType || 'video/webm';
            download(new Blob(chunks, { type }), `dead4rat_${stamp()}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
            this.notify('Recording saved');
            this.emit();
        };
        rec.start(1000);
        this._rec = rec;
        this.recording = true;
        this._recStart = performance.now();
        this.emit();
    }

    toggleFullscreen() {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => this.notify('Fullscreen was blocked', 'warn'));
    }

    shareLink() {
        const url = `${location.origin}${location.pathname}?look=${D.encodeLook(this.look)}`;
        const done = () => this.notify('Link copied — anyone opening it gets this look');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done, () => { window.prompt('Copy this link:', url); });
        } else {
            window.prompt('Copy this link:', url);
        }
        return url;
    }

    // ── MIDI ───────────────────────────────────────────────────────────────
    async enableMidi() {
        await this.midi.enable();
        if (this.midi.state !== 'on') this.notify(this.midi.state === 'unsupported' ? 'This browser has no Web MIDI' : 'MIDI access was blocked', 'warn');
        this.emit();
    }
    setMidiLearn(on) { this.midi.learn = on; this.midi.armed = null; this.emit(); }
    armMidi(target) { if (this.midi.learn) { this.midi.arm(target); this.emit(); } }
    _midiCC(t, v) {
        let spec;
        if (t.t === 'fx') spec = FX_BY_KEY[t.key] && FX_BY_KEY[t.key].params.find(p => p.k === t.k);
        else if (t.t === 'gen') spec = GEN_PARAMS.find(p => p.k === t.k);
        if (!spec) return;
        this._edit();
        const val = Math.round((spec.min + (spec.max - spec.min) * v) / spec.step) * spec.step;
        if (t.t === 'fx') { if (!this.look.fx[t.key].on && v > 0.01) this.look.fx[t.key].on = true; this.look.fx[t.key].params[t.k] = clamp(val, spec.min, spec.max); }
        else this.look.gen.params[t.k] = clamp(val, spec.min, spec.max);
        this.activeScene = -1;
        this.emit();
    }

    // ── Frame loop ─────────────────────────────────────────────────────────
    _loop(t) {
        requestAnimationFrame(this._loop);
        const dt = Math.min(250, t - (this._lastT || t));
        this._lastT = t;
        if (this.paused || !this.renderer.ok) return;

        this._fpsN = (this._fpsN || 0) + 1;
        if (t - (this._fpsT || 0) >= 1000) { this.fps = Math.round(this._fpsN * 1000 / (t - (this._fpsT || t - 1000))); this._fpsN = 0; this._fpsT = t; }

        this.audio.update(t);
        this._stepMorph(t);
        this._stepAuto(t);
        if (!this.morph) {
            const k = dt / 150;
            for (const d of FX_DEFS) {
                const target = this.look.fx[d.key].on ? 1 : 0;
                const w = this.wet[d.key];
                if (w !== target) this.wet[d.key] = target > w ? Math.min(1, w + k) : Math.max(0, w - k);
            }
            if (this.genLevel < 1) this.genLevel = Math.min(1, this.genLevel + dt / 300);
        }

        const disp = this.renderer.disp;
        const cam = this.camera;
        const fresh = cam.ready ? cam.takeFresh() : false;
        let camMap = { on: false, scale: [1, 1], offset: [0, 0] };
        if (this.media.active) {
            const cw = Math.min(this.canvas.width, 1280);
            const ch = Math.round(cw * this.canvas.height / this.canvas.width);
            this.renderer.uploadSource(this.media.composite(cam, cw, ch), true);
            camMap = { on: true, scale: [1, 1], offset: [0, 0] };
        } else if (cam.ready) {
            this.renderer.uploadSource(cam.video, fresh);
            camMap = { on: true, ...cam.mapping(disp.w, disp.h) };
        }

        const maskOn = this.isolate && this.mask.state === 'on' && cam.ready;
        if (maskOn) {
            if (fresh) this.mask.process(cam.video);
            this.renderer.uploadMask(this.mask.canvas, this.mask.version);
        }

        const handReady = this.human.state === 'on' && this.human.modules.hands;
        this.blobs.enabled = this.blobTrack || (this.gesture.on && this.gesture.source !== 'HAND' && !(handReady && this.human.hands > 0));
        if (!cam.ready && !this.media.active && this.blobs.blobs.length) this.blobs.reset();
        if (this.blobs.enabled && (fresh || this.media.active)) {
            this.blobs.process((ctx, W, H) => {
                if (this.media.active) ctx.drawImage(this.media.canvas, 0, 0, W, H);
                else if (cam.ready) cam.drawCover(ctx, W, H, disp.w, disp.h);
            });
        }

        this._stepGesture(t, dt);
        this._dt = dt;
        this.renderer.render(this._frame(t, camMap, maskOn && this.mask.version > 0));
        if (this._recCompose) this.renderer.snapshot(this._recCompose);
        this._drawOverlay();
        for (const fn of this._frameSubs) fn(this);
        this._governor(t, dt);
    }

    _stepGesture(t, dt) {
        const g = this.gesture;
        if (!g.on) { g.present = false; return; }
        const disp = this.renderer.disp;
        let target = null, pinch = 0, span = 0, via = '';
        const h = this.human;
        if (g.source !== 'MOTION' && h.state === 'on' && h.palm && h.hands > 0) {
            target = this._toView(...this.camera.toScreen(h.palm.x, h.palm.y, disp.w, disp.h));
            pinch = h.pinch; span = h.span; via = 'HAND';
        } else if (g.source !== 'HAND' && this.blobs.enabled) {
            const L = this.blobs.lead();
            if (L && this.blobs.count > 0) {
                target = this._toView(L.x, L.y);
                pinch = L.strength;
                span = L.second ? Math.min(1, Math.hypot((L.second.x0 + L.second.x1) / 2 - L.x, (L.second.y0 + L.second.y1) / 2 - L.y) * 1.5) : 0;
                via = 'MOTION';
            }
        }
        if (target) {
            g.palm[0] += (target[0] - g.palm[0]) * 0.35;
            g.palm[1] += (target[1] - g.palm[1]) * 0.35;
            g.lastSeen = t;
        }
        g.via = via || g.via;
        g.pinch += ((target ? pinch : 0) - g.pinch) * 0.3;
        g.span += ((target ? span : 0) - g.span) * 0.3;
        g.present = t - g.lastSeen < 600;
        const pinched = g.pinch > 0.7;
        if (pinched && !g._pinched) g.shockT = 0.001;
        g._pinched = pinched;
        if (g.shockT > 0) { g.shockT += dt / 1000; if (g.shockT >= 1) g.shockT = 0; }
    }

    _frame(t, camMap, maskOn) {
        const time = (t / 1000) % 3600;
        const L = this.look;
        const levels = this.audio.level;
        const fx = [];
        for (const d of FX_DEFS) {
            const wet = this.wet[d.key];
            if (wet <= 0.001) continue;
            const s = L.fx[d.key];
            const item = { key: d.key, wet, values: D.resolveFxValues(d, s, time, L.mod, levels) };
            if (d.key === 'strobe') {
                const v = item.values;
                // Beat mode: stay lit for HOLD × 250 ms after each hit. Rate mode: square wave.
                item.level = s.band && this.audio.running
                    ? (t - this.audio.lastOnset[s.band] < v.hold * 250 ? 1 : 0)
                    : ((time * v.rate) % 1 < v.hold ? 1 : 0);
            }
            fx.push(item);
        }
        let gen = null;
        if (L.gen.mode !== 'OFF') {
            const values = D.resolveGenValues(L.gen, time, L.mod);
            if (this.faceDrive && this.human.state === 'on' && this.human.faceDetected) {
                values.rotateY += this.human.yaw * 1.6;
                values.rotateX += this.human.pitch * 1.2;
                values.colorA = (values.colorA + (EMOTION_HUE[this.human.emotion] || 0)) % 1;
            }
            const band = L.gen.band;
            // Scene clock runs at SPEED, so SPEED 0 really freezes the scene.
            this._genT = ((this._genT || 0) + (this._dt || 0) / 1000 * values.speed) % 3600;
            gen = {
                mode: L.gen.mode, values, time: this._genT,
                band: band ? levels[band] : 0,
                transient: band ? this.audio.env[band] : 0,
                level: this.genLevel,
            };
        }
        const g = this.gesture;
        return {
            time, fx, gen, camKey: L.gen.camKey,
            gestures: g.on && g.present ? g.fx : [],
            palm: g.palm, pinch: g.pinch, span: g.span, shockT: g.shockT,
            cam: camMap, mask: maskOn,
            maskMap: maskOn ? this.camera.mapping(this.renderer.disp.w, this.renderer.disp.h) : null,
            transform: { flipH: this.view.flipH, flipV: this.view.flipV, rotation: this.view.rotation },
        };
    }

    // Where a point of the (unflipped, unrotated) source appears on screen:
    // the inverse of viewUV() in the shader, so overlays and the gesture palm
    // follow FLIP and ROTATE exactly like the picture does.
    _toView(u, v) {
        const a = this.renderer.disp.w / this.renderer.disp.h;
        const r = this.view.rotation || 0;
        let x = u - 0.5, y = v - 0.5;
        if (r) {
            x *= a;
            if (r === 1 || r === 3) { const k = Math.max(a, 1 / a); x *= k; y *= k; }
            const ang = -r * Math.PI / 2, c = Math.cos(ang), s = Math.sin(ang);
            const nx = c * x - s * y, ny = s * x + c * y;
            x = nx / a; y = ny;
        }
        x += 0.5; y += 0.5;
        if (this.view.flipV) y = 1 - y;
        if (this.view.flipH) x = 1 - x;
        return [x, y];
    }

    _drawOverlay() {
        const showBlobs = this.blobTrack && this.showOverlay;
        const showHuman = this.showOverlay && this.human.state === 'on' && !!this.human.raw;
        const vis = showBlobs || showHuman;
        this.overlay.setVisible(vis);
        if (!vis) { this._ovKey = ''; return; }
        const disp = this.renderer.disp, v = this.view;
        // Redraw only when there is something new to draw.
        const key = `${showBlobs && this.blobs.seq}|${showHuman && this.human.seq}|${disp.w}x${disp.h}+${disp.left}+${disp.top}|${v.flipH}${v.flipV}${v.rotation}|${this.camera.mirror}`;
        if (key === this._ovKey) return;
        this._ovKey = key;
        this.overlay.place(disp);
        const cam = this.camera;
        this.overlay.draw({
            blobs: showBlobs ? this.blobs.blobs : null,
            blobToPx: (x, y) => { const s = this._toView(x, y); return [s[0] * disp.w, s[1] * disp.h]; },
            human: showHuman ? this.human : null,
            humanToPx: (x, y) => { const s = this._toView(...cam.toScreen(x, y, disp.w, disp.h)); return [s[0] * disp.w, s[1] * disp.h]; },
            persist: this.blobs.persist,
        });
    }
}

D.Deck = Deck;
D.QUALITY_STEPS = QUALITY_STEPS;
})();
