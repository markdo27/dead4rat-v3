// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — AI TRACKING (loaded on demand)
//
// HumanEngine wraps @vladmandic/human (face, emotion, hands, body).
// MaskEngine wraps MediaPipe selfie segmentation for the person cut-out.
// Neither library is downloaded until the user switches the feature on.
// All coordinates reported here are 0-1 of the raw camera frame (not
// mirrored); the camera mapping turns them into screen positions.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
const HUMAN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/dist/human.js';
const HUMAN_MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models';
const SELFIE_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747';

const _scripts = {};
function loadScript(url) {
    if (!_scripts[url]) {
        _scripts[url] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url; s.async = true; s.crossOrigin = 'anonymous';
            s.onload = resolve;
            s.onerror = () => { delete _scripts[url]; reject(new Error('Could not download ' + url.split('/').slice(-1)[0])); };
            document.head.appendChild(s);
        });
    }
    return _scripts[url];
}

const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'surprise', 'fear', 'disgust'];

class HumanEngine {
    constructor() {
        this.human = null;
        this.state = 'off';        // off | loading | on | error
        this.error = '';
        this.modules = { face: true, hands: true, body: true, emotion: true };
        this.fps = 0;
        this._timer = null;
        this.reset();
    }

    reset() {
        this.faceDetected = false; this.faceScore = 0;
        this.yaw = 0; this.pitch = 0; this.roll = 0;          // -1..1 (±90°)
        this.yawDeg = 0; this.pitchDeg = 0; this.rollDeg = 0;
        this.emotion = 'neutral'; this.emotions = {};
        this.hands = 0; this.handLeft = false; this.handRight = false;
        this.palm = null;          // {x, y} raw 0-1 of dominant hand
        this.palm2 = null;         // second hand
        this.pinch = 0; this.span = 0;
        this.bodyDetected = false;
        this.gesture = '';
        this.raw = null;
    }

    async start(video) {
        if (this.state === 'on' || this.state === 'loading') return;
        this.state = 'loading'; this.error = '';
        try {
            await loadScript(HUMAN_URL);
            if (!this.human) {
                const H = typeof window.Human.Human === 'function' ? window.Human.Human : window.Human;
                const human = new H({
                    backend: 'webgl', modelBasePath: HUMAN_MODELS,
                    face: { enabled: true, detector: { maxDetected: 1, rotation: false }, mesh: { enabled: true }, iris: { enabled: false },
                            emotion: { enabled: true }, description: { enabled: false }, antispoof: { enabled: false }, liveness: { enabled: false } },
                    hand: { enabled: true, maxDetected: 2, landmarks: true },
                    body: { enabled: true, maxDetected: 1 },
                    gesture: { enabled: true }, segmentation: { enabled: false },
                    filter: { enabled: true, equalization: false }, object: { enabled: false },
                });
                await human.load();
                await human.warmup();
                this.human = human; // only cache an instance that loaded fully, so RETRY really retries
            }
            this._apply();
            this.video = video;
            this.state = 'on';
            this._loop();
        } catch (e) {
            this.state = 'error';
            this.error = (e && e.message) || 'AI failed to load';
            console.error('[HumanEngine]', e);
        }
    }

    stop() {
        clearTimeout(this._timer);
        this.state = this.human ? 'off' : 'off';
        this.reset();
    }

    setModule(key, on) { this.modules[key] = on; this._apply(); }

    _apply() {
        if (!this.human) return;
        const c = this.human.config, m = this.modules;
        c.face.enabled = m.face || m.emotion;
        c.face.mesh.enabled = m.face;
        c.face.emotion.enabled = m.emotion;
        c.hand.enabled = m.hands;
        c.body.enabled = m.body;
    }

    async _loop() {
        if (this.state !== 'on') return;
        const t0 = performance.now();
        const v = this.video;
        if (v && v.readyState >= 2 && !document.hidden) {
            try {
                this._parse(await this.human.detect(v), v.videoWidth || 640, v.videoHeight || 480);
            } catch (e) {
                if (!this._warned) { console.warn('[HumanEngine] detect', e); this._warned = true; }
            }
        }
        const dt = performance.now() - t0;
        this.fps = this.fps * 0.8 + (1000 / Math.max(66, dt + 16)) * 0.2;
        if (this.state === 'on') this._timer = setTimeout(() => this._loop(), Math.max(16, 66 - dt));
    }

    _parse(r, vw, vh) {
        const lerp = (a, b, k = 0.5) => a + (b - a) * k;
        const raw = { face: [], hand: [], body: [] };

        const face = r.face && r.face[0];
        this.faceDetected = !!(face && face.score > 0.3);
        if (this.faceDetected) {
            this.faceScore = face.score;
            const a = (face.rotation && face.rotation.angle) || {};
            // Human reports radians
            this.yawDeg = lerp(this.yawDeg, (a.yaw || 0) * 57.2958);
            this.pitchDeg = lerp(this.pitchDeg, (a.pitch || 0) * 57.2958);
            this.rollDeg = lerp(this.rollDeg, (a.roll || 0) * 57.2958);
            this.yaw = Math.max(-1, Math.min(1, this.yawDeg / 90));
            this.pitch = Math.max(-1, Math.min(1, this.pitchDeg / 90));
            this.roll = Math.max(-1, Math.min(1, this.rollDeg / 90));
            if (face.emotion && face.emotion.length) {
                this.emotions = {};
                for (const e of face.emotion) this.emotions[e.emotion] = e.score;
                this.emotion = face.emotion.slice().sort((x, y) => y.score - x.score)[0].emotion;
            }
            raw.face.push({ boxRaw: face.boxRaw, meshRaw: face.meshRaw });
        } else {
            this.yawDeg *= 0.9; this.pitchDeg *= 0.9; this.rollDeg *= 0.9;
            this.yaw = this.yawDeg / 90; this.pitch = this.pitchDeg / 90; this.roll = this.rollDeg / 90;
        }

        const palms = [];
        this.handLeft = false; this.handRight = false;
        for (const h of r.hand || []) {
            const kp = h.keypoints;
            if (!kp || kp.length < 21) continue;
            const norm = kp.map(p => [p[0] / vw, p[1] / vh]);
            const label = (h.label || '').toLowerCase();
            if (label === 'left') this.handLeft = true; else this.handRight = true;
            raw.hand.push({ label, keypointsNorm: norm });
            const size = Math.hypot(norm[9][0] - norm[0][0], norm[9][1] - norm[0][1]) || 0.1;
            const pinch = Math.max(0, Math.min(1, 1 - Math.hypot(norm[4][0] - norm[8][0], norm[4][1] - norm[8][1]) / (size * 1.6)));
            palms.push({ x: norm[9][0], y: norm[9][1], pinch, size });
        }
        this.hands = palms.length;
        palms.sort((a, b) => b.size - a.size);
        if (palms[0]) {
            const p = palms[0];
            this.palm = this.palm ? { x: lerp(this.palm.x, p.x), y: lerp(this.palm.y, p.y) } : { x: p.x, y: p.y };
            this.pinch = lerp(this.pinch, Math.max(...palms.map(q => q.pinch)));
        } else {
            this.pinch *= 0.8;
        }
        this.palm2 = palms[1] ? { x: palms[1].x, y: palms[1].y } : null;
        this.span = lerp(this.span, palms.length >= 2 ? Math.min(1, Math.hypot(palms[0].x - palms[1].x, palms[0].y - palms[1].y) * 1.5) : 0);

        const body = r.body && r.body[0];
        this.bodyDetected = !!(body && body.score > 0.2);
        if (this.bodyDetected && body.keypoints) {
            raw.body.push({ keypointsNorm: body.keypoints.map(k => ({ x: k.positionRaw ? k.positionRaw[0] : k.position[0] / vw, y: k.positionRaw ? k.positionRaw[1] : k.position[1] / vh, score: k.score })) });
        }
        this.gesture = (r.gesture || []).map(g => g.gesture).filter((g, i, a) => a.indexOf(g) === i).slice(0, 3).join(' · ');
        this.raw = raw;
    }
}

class MaskEngine {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 256; this.canvas.height = 144;
        this.ctx = this.canvas.getContext('2d');
        this.state = 'off';   // off | loading | on | error
        this.error = '';
        this.version = 0;
        this._busy = false;
        this._model = null;
    }

    async start() {
        if (this.state === 'on' || this.state === 'loading') return;
        this.state = 'loading'; this.error = '';
        try {
            await loadScript(`${SELFIE_BASE}/selfie_segmentation.js`);
            if (!this._model) {
                this._model = new window.SelfieSegmentation({ locateFile: (f) => `${SELFIE_BASE}/${f}` });
                this._model.setOptions({ modelSelection: 1, selfieMode: false });
                this._model.onResults((res) => this._onResults(res));
                const warm = document.createElement('canvas'); warm.width = warm.height = 64;
                await this._model.send({ image: warm });
            }
            this.state = 'on';
        } catch (e) {
            this.state = 'error';
            this.error = (e && e.message) || 'Cut-out model failed to load';
            console.error('[MaskEngine]', e);
        }
    }

    stop() { this.state = 'off'; }

    _onResults(res) {
        const { ctx, canvas } = this;
        const W = canvas.width, H = canvas.height;
        ctx.globalCompositeOperation = 'copy';
        if (res.segmentationMask) ctx.drawImage(res.segmentationMask, 0, 0, W, H);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
        this.version++;
    }

    // Feed one camera frame; skips while a previous frame is still processing.
    process(video) {
        if (this.state !== 'on' || this._busy || !video || video.readyState < 2) return;
        this._busy = true;
        this._model.send({ image: video }).catch(() => {}).finally(() => { this._busy = false; });
    }
}

window.D4R = Object.assign(window.D4R, { HumanEngine, MaskEngine, EMOTIONS, loadScript });
})();
