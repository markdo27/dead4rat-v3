// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — CAMERA
//
// Owns the webcam stream and the single mapping between camera pixels and
// screen UV (cover-fit, optional selfie mirror). The shader, the tracking
// overlays and the hand/palm coordinates all use this one mapping, so they
// always line up.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
class Camera {
    constructor(video) {
        this.video = video;
        this.on = false;
        this.mirror = true;
        this.error = '';
        this._fresh = true;
        this._rvfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
        this._frameCb = () => {
            this._fresh = true;
            if (this.on) this.video.requestVideoFrameCallback(this._frameCb);
        };
    }

    async start() {
        this.error = '';
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.error = 'Camera needs https or localhost';
            return false;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false,
            });
            this.video.srcObject = stream;
            this.video.muted = true;
            this.video.playsInline = true;
            await this.video.play().catch(() => {});
            this.on = true;
            if (this._rvfc) this.video.requestVideoFrameCallback(this._frameCb);
            return true;
        } catch (e) {
            this.error = e && e.name === 'NotAllowedError' ? 'Camera permission denied' : 'No camera found';
            console.warn('[Camera]', e);
            return false;
        }
    }

    stop() {
        const s = this.video.srcObject;
        if (s) s.getTracks().forEach(t => t.stop());
        this.video.srcObject = null;
        this.on = false;
    }

    get ready() { return this.on && this.video.readyState >= 2 && this.video.videoWidth > 0; }
    get size() { return { w: this.video.videoWidth || 640, h: this.video.videoHeight || 480 }; }

    // True when a new camera frame arrived since the last call.
    takeFresh() {
        if (!this._rvfc) return true;
        const f = this._fresh;
        this._fresh = false;
        return f;
    }

    // Screen UV → camera UV:  cam = uv * scale + offset
    mapping(dispW, dispH) {
        const { w, h } = this.size;
        const va = w / h, da = dispW / Math.max(1, dispH);
        let sx = 1, sy = 1, ox = 0, oy = 0;
        if (va > da) { sx = da / va; ox = (1 - sx) / 2; } else { sy = va / da; oy = (1 - sy) / 2; }
        if (this.mirror) { ox = 1 - ox; sx = -sx; }
        return { scale: [sx, sy], offset: [ox, oy] };
    }

    // Camera-normalised point (0-1 of the raw frame) → screen UV.
    toScreen(nx, ny, dispW, dispH) {
        const m = this.mapping(dispW, dispH);
        return [(nx - m.offset[0]) / m.scale[0], (ny - m.offset[1]) / m.scale[1]];
    }

    // Draw the camera into a 2D context with the same cover/mirror mapping.
    // aspectW/H: the display shape to crop for (defaults to W×H).
    drawCover(ctx, W, H, aspectW = W, aspectH = H) {
        if (!this.ready) return;
        const { w, h } = this.size;
        const m = this.mapping(aspectW, aspectH);
        const sw = Math.abs(m.scale[0]) * w, sh = m.scale[1] * h;
        const sx = (this.mirror ? 1 - m.offset[0] : m.offset[0]) * w, sy = m.offset[1] * h;
        ctx.save();
        if (this.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
        ctx.drawImage(this.video, sx, sy, sw, sh, 0, 0, W, H);
        ctx.restore();
    }
}

window.D4R.Camera = Camera;
})();
