// ╔═══════════════════════════════════════════════════════════════════╗
// ║  DEAD4RAT — HUMAN ENGINE v2.0                                     ║
// ║  AI-powered body/face/gesture detection via vladmandic/human      ║
// ╚═══════════════════════════════════════════════════════════════════╝

class HumanEngine {
    constructor() {
        this.human = null;
        this.isRunning = false;
        this.isLoading = false;
        this._loopActive = false;

        // Detection outputs
        this.faceDetected = false;
        this.faceScore = 0;
        this.faceYaw   = 0;
        this.facePitch = 0;
        this.faceRoll  = 0;

        this.emotion = 'neutral';
        this.emotionIndex = 0;
        this.emotions = { happy: 0, sad: 0, angry: 0, surprised: 0, fearful: 0, disgusted: 0, neutral: 1 };

        this.gazeX = 0.5;
        this.gazeY = 0.5;

        this.handLeft  = false;
        this.handRight = false;
        this.handGesture = '';
        this.handTipX = 0.5;
        this.handTipY = 0.5;

        this.bodyDetected = false;

        // Smoothing
        this._smooth = 0.5;
        this._prevYaw = 0; this._prevPitch = 0; this._prevRoll = 0;
        this._prevGazeX = 0.5; this._prevGazeY = 0.5;

        // Video dimensions (needed for overlay coordinate scaling)
        this.videoWidth  = 640;
        this.videoHeight = 480;

        // Config — all modules ON by default
        this.config = {
            enableFace:    true,
            enableHands:   true,
            enableBody:    true,
            enableEmotion: true,
        };

        this._lastResult = null;
    }

    _lerp(prev, next) {
        return prev * this._smooth + next * (1.0 - this._smooth);
    }

    // Apply current config to live Human instance
    _applyConfig() {
        if (!this.human) return;
        const c = this.human.config;
        c.face.enabled       = this.config.enableFace;
        c.face.mesh.enabled  = this.config.enableFace;
        c.face.iris.enabled  = this.config.enableFace;
        c.face.emotion.enabled = this.config.enableEmotion;
        c.hand.enabled       = this.config.enableHands;
        c.body.enabled       = this.config.enableBody;
        c.gesture.enabled    = this.config.enableHands || this.config.enableFace;
    }

    async load() {
        if (!window.Human) {
            console.error('[HumanEngine] Human library not loaded');
            return false;
        }
        if (this.human) return true;

        this.isLoading = true;
        try {
            console.log('[HumanEngine] Initialising...');
            const cfg = {
                backend: 'webgl',
                modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models',
                face: {
                    enabled: true,
                    detector: { maxDetected: 1, rotation: true },
                    mesh:     { enabled: true },
                    iris:     { enabled: true },
                    emotion:  { enabled: true },
                    description: { enabled: false },
                },
                hand: {
                    enabled: true,
                    maxDetected: 2,
                    rotation: true,
                    detector: { rotation: true },
                },
                body: {
                    enabled: true,
                    maxDetected: 1,
                    modelPath: 'movenet-multipose.json',
                },
                gesture: { enabled: true },
                segmentation: { enabled: false },
                filter: { enabled: true, equalization: false },
            };
            this.human = new Human.Human(cfg);
            await this.human.load();
            await this.human.warmup();
            console.log('[HumanEngine] Ready ✓');
            this.isLoading = false;
            return true;
        } catch (err) {
            console.error('[HumanEngine] Load failed:', err);
            this.isLoading = false;
            return false;
        }
    }

    async start(videoElement) {
        if (this.isRunning) return;
        const ok = await this.load();
        if (!ok) return;
        this._videoElement = videoElement;
        // Grab actual video dimensions
        if (videoElement) {
            this.videoWidth  = videoElement.videoWidth  || 640;
            this.videoHeight = videoElement.videoHeight || 480;
        }
        this._applyConfig();
        this.isRunning = true;
        this._loopActive = true;
        this._runLoop();
        console.log('[HumanEngine] Detection started');
    }

    stop() {
        this.isRunning = false;
        this._loopActive = false;
        this._resetOutputs();
        console.log('[HumanEngine] Stopped');
    }

    // Toggle a module live (called from UI)
    setModule(key, val) {
        this.config[key] = val;
        this._applyConfig();
    }

    async _runLoop() {
        if (!this._loopActive) return;
        const video = this._videoElement;
        if (video && video.readyState >= 2 && !video.paused) {
            // Keep video dimensions fresh
            if (video.videoWidth)  this.videoWidth  = video.videoWidth;
            if (video.videoHeight) this.videoHeight = video.videoHeight;
            try {
                const result = await this.human.detect(video);
                this._lastResult = result;
                this._parseResult(result);
            } catch (e) { /* skip */ }
        }
        if (this._loopActive) setTimeout(() => this._runLoop(), 66);
    }

    _parseResult(result) {
        // ── Face ──────────────────────────────────────────────
        const face = result.face && result.face[0];
        if (face && face.score > 0.3) {
            this.faceDetected = true;
            this.faceScore = face.score;

            // Rotation — Human returns face.rotation as {angle:{roll,yaw,pitch}, matrix, gaze}
            // OR sometimes just face.rotation.yaw etc at top level
            let yawDeg = 0, pitchDeg = 0, rollDeg = 0;
            if (face.rotation) {
                const r = face.rotation;
                if (r.angle) {
                    yawDeg   = r.angle.yaw   || 0;
                    pitchDeg = r.angle.pitch  || 0;
                    rollDeg  = r.angle.roll   || 0;
                } else {
                    yawDeg   = r.yaw   || 0;
                    pitchDeg = r.pitch  || 0;
                    rollDeg  = r.roll   || 0;
                }
            }
            // Convert radians to degrees if values are tiny (Human sometimes returns radians)
            if (Math.abs(yawDeg) < 3.2 && Math.abs(pitchDeg) < 3.2 && Math.abs(rollDeg) < 3.2) {
                yawDeg   *= (180 / Math.PI);
                pitchDeg *= (180 / Math.PI);
                rollDeg  *= (180 / Math.PI);
            }
            const rawYaw   = Math.max(-1, Math.min(1, yawDeg   / 90.0));
            const rawPitch = Math.max(-1, Math.min(1, pitchDeg / 90.0));
            const rawRoll  = Math.max(-1, Math.min(1, rollDeg  / 90.0));
            this.faceYaw   = this._lerp(this._prevYaw,   rawYaw);
            this.facePitch = this._lerp(this._prevPitch, rawPitch);
            this.faceRoll  = this._lerp(this._prevRoll,  rawRoll);
            this._prevYaw   = this.faceYaw;
            this._prevPitch = this.facePitch;
            this._prevRoll  = this.faceRoll;

            // Emotion
            if (face.emotion && face.emotion.length > 0) {
                const sorted = [...face.emotion].sort((a, b) => b.score - a.score);
                this.emotion = sorted[0].emotion;
                const emoMap = ['neutral','happy','angry','sad','surprised','fearful','disgusted'];
                this.emotionIndex = Math.max(0, emoMap.indexOf(this.emotion));
                // Reset all then fill
                for (const k of Object.keys(this.emotions)) this.emotions[k] = 0;
                sorted.forEach(e => {
                    const key = e.emotion === 'fear' ? 'fearful' : e.emotion === 'disgust' ? 'disgusted' : e.emotion;
                    if (this.emotions[key] !== undefined) this.emotions[key] = e.score;
                });
            }

            // Gaze
            if (face.rotation && face.rotation.gaze) {
                const g = face.rotation.gaze;
                this.gazeX = this._lerp(this._prevGazeX, 0.5 + (g.bearing || 0) * 0.5);
                this.gazeY = this._lerp(this._prevGazeY, 0.5 + (g.strength || 0) * 0.5);
                this._prevGazeX = this.gazeX;
                this._prevGazeY = this.gazeY;
            }
        } else {
            this.faceDetected = false;
            this.faceYaw *= 0.9; this.facePitch *= 0.9; this.faceRoll *= 0.9;
        }

        // ── Hands ─────────────────────────────────────────────
        this.handLeft = false;
        this.handRight = false;
        if (result.hand && result.hand.length > 0) {
            result.hand.forEach(h => {
                if (h.label === 'left')  this.handLeft  = true;
                if (h.label === 'right') this.handRight = true;
                if (h.landmarks && h.landmarks[8]) {
                    this.handTipX = h.landmarks[8][0] / this.videoWidth;
                    this.handTipY = h.landmarks[8][1] / this.videoHeight;
                }
            });
        }

        // ── Gestures ──────────────────────────────────────────
        this.handGesture = '';
        if (result.gesture && result.gesture.length > 0) {
            this.handGesture = result.gesture.map(g => g.gesture).join(', ');
        }

        // ── Body ──────────────────────────────────────────────
        this.bodyDetected = result.body && result.body.length > 0;
    }

    _resetOutputs() {
        this.faceDetected = false; this.faceScore = 0;
        this.faceYaw = this.facePitch = this.faceRoll = 0;
        this.emotion = 'neutral'; this.emotionIndex = 0;
        this.emotions = { happy:0, sad:0, angry:0, surprised:0, fearful:0, disgusted:0, neutral:1 };
        this.gazeX = this.gazeY = 0.5;
        this.handLeft = this.handRight = false;
        this.handGesture = '';
        this.bodyDetected = false;
    }

    getData() {
        return {
            faceDetected: this.faceDetected, faceScore: this.faceScore,
            yaw: this.faceYaw, pitch: this.facePitch, roll: this.faceRoll,
            emotion: this.emotion, emotionIndex: this.emotionIndex, emotions: this.emotions,
            gazeX: this.gazeX, gazeY: this.gazeY,
            handLeft: this.handLeft, handRight: this.handRight,
            handGesture: this.handGesture, handTipX: this.handTipX, handTipY: this.handTipY,
            bodyDetected: this.bodyDetected,
            videoWidth: this.videoWidth, videoHeight: this.videoHeight,
        };
    }
}
