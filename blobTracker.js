/**
 * BlobTracker — Real-time motion blob detection
 * Uses Canvas 2D API only (no WebGL, no external deps).
 * Detects motion regions via frame-diff thresholding + BFS connected-components.
 * Renders bounding-box overlays in Dead4rat's brutalist orange palette.
 */
class BlobTracker {
    constructor() {
        // Low-res analysis canvas for performance (down-sampled from webcam)
        this.analysisW = 160;
        this.analysisH = 90;
        this.analysisCanvas = document.createElement('canvas');
        this.analysisCanvas.width  = this.analysisW;
        this.analysisCanvas.height = this.analysisH;
        this.analysisCtx = this.analysisCanvas.getContext('2d', { willReadFrequently: true });

        // Full-res overlay canvas rendered on top of the WebGL canvas
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:100%',
            'height:100%',
            'pointer-events:none',
            'z-index:5',
            'display:none',
        ].join(';');
        document.body.appendChild(this.overlayCanvas);
        this.overlayCtx = this.overlayCanvas.getContext('2d');

        // State
        this.enabled      = false;
        this.showOverlay  = true;
        this.threshold    = 30;    // frame-diff threshold (0–255)
        this.minArea      = 15;    // minimum blob area in analysis-canvas pixels
        this.maxBlobs     = 8;     // max tracked blobs per frame

        // Output data (read by dead4rat.jsx)
        this.blobs        = [];    // [{x, y, w, h, area, cx, cy}] — screen-space coords
        this.blobCount    = 0;

        this._prevPixels  = null;

        // Resize overlay canvas to match window
        this._resizeOverlay();
        window.addEventListener('resize', () => this._resizeOverlay());
    }

    _resizeOverlay() {
        this.overlayCanvas.width  = window.innerWidth;
        this.overlayCanvas.height = window.innerHeight;
    }

    // ─────────────────────────────────────────────────
    // MAIN PROCESS — call every frame from render loop
    // ─────────────────────────────────────────────────
    process(videoElement) {
        if (!this.enabled) return;
        if (!videoElement || videoElement.readyState < 2) return;

        // Down-sample webcam frame to analysis canvas
        this.analysisCtx.drawImage(videoElement, 0, 0, this.analysisW, this.analysisH);
        const frame = this.analysisCtx.getImageData(0, 0, this.analysisW, this.analysisH);
        const curr  = frame.data;

        if (!this._prevPixels) {
            this._prevPixels = new Uint8Array(curr.length);
            this._prevPixels.set(curr);
            return;
        }

        // ── Step 1: Frame-diff → binary mask ────────────────
        const W = this.analysisW;
        const H = this.analysisH;
        const binary = new Uint8Array(W * H); // 1 = active pixel

        for (let i = 0; i < curr.length; i += 4) {
            const pi = i / 4;
            const dr = Math.abs(curr[i]   - this._prevPixels[i]);
            const dg = Math.abs(curr[i+1] - this._prevPixels[i+1]);
            const db = Math.abs(curr[i+2] - this._prevPixels[i+2]);
            binary[pi] = (dr + dg + db) / 3 > this.threshold ? 1 : 0;
        }

        // Save prev frame
        this._prevPixels.set(curr);

        // ── Step 2: BFS connected-components ────────────────
        const visited = new Uint8Array(W * H);
        const rawBlobs = [];

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const idx = y * W + x;
                if (!binary[idx] || visited[idx]) continue;

                // BFS
                const queue = [idx];
                visited[idx] = 1;
                let minX = x, maxX = x, minY = y, maxY = y, count = 0;

                while (queue.length > 0) {
                    const cur = queue.shift();
                    const cx  = cur % W;
                    const cy  = Math.floor(cur / W);
                    count++;
                    if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                    if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;

                    // 4-connected neighbours
                    const neighbours = [cur - 1, cur + 1, cur - W, cur + W];
                    for (const n of neighbours) {
                        if (n < 0 || n >= W * H) continue;
                        const nx = n % W, ny = Math.floor(n / W);
                        // Prevent wrap-around
                        if (Math.abs(nx - (cur % W)) > 1) continue;
                        if (!visited[n] && binary[n]) {
                            visited[n] = 1;
                            queue.push(n);
                        }
                    }
                }

                if (count >= this.minArea) {
                    rawBlobs.push({ minX, maxX, minY, maxY, area: count });
                }
            }
        }

        // ── Step 3: Scale blobs to screen coordinates ───────
        const scaleX = window.innerWidth  / W;
        const scaleY = window.innerHeight / H;

        this.blobs = rawBlobs
            .sort((a, b) => b.area - a.area)
            .slice(0, this.maxBlobs)
            .map(b => ({
                x:    Math.round(b.minX * scaleX),
                y:    Math.round(b.minY * scaleY),
                w:    Math.round((b.maxX - b.minX) * scaleX),
                h:    Math.round((b.maxY - b.minY) * scaleY),
                area: b.area,
                cx:   ((b.minX + b.maxX) / 2) / W,   // normalised 0–1
                cy:   ((b.minY + b.maxY) / 2) / H,
            }));

        this.blobCount = this.blobs.length;

        // ── Step 4: Draw overlay ─────────────────────────────
        if (this.showOverlay) {
            this._drawOverlay();
        } else {
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
    }

    _drawOverlay() {
        const ctx = this.overlayCtx;
        const W   = this.overlayCanvas.width;
        const H   = this.overlayCanvas.height;
        ctx.clearRect(0, 0, W, H);

        this.blobs.forEach((blob, i) => {
            const isPrimary = i === 0;
            const alpha     = isPrimary ? 1.0 : 0.55;
            const color     = isPrimary ? `rgba(255,85,0,${alpha})` : `rgba(255,136,0,${alpha})`;
            const lineW     = isPrimary ? 2 : 1;

            // Bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth   = lineW;
            ctx.strokeRect(blob.x, blob.y, blob.w, blob.h);

            // Corner ticks (brutalist style)
            const tick = 8;
            ctx.strokeStyle = isPrimary ? '#FF5500' : '#FF8800';
            ctx.lineWidth = isPrimary ? 2 : 1;
            [
                [blob.x, blob.y, tick, 0, 0, tick],
                [blob.x + blob.w, blob.y, -tick, 0, 0, tick],
                [blob.x, blob.y + blob.h, tick, 0, 0, -tick],
                [blob.x + blob.w, blob.y + blob.h, -tick, 0, 0, -tick],
            ].forEach(([ox, oy, hx, hy, vx, vy]) => {
                ctx.beginPath();
                ctx.moveTo(ox, oy); ctx.lineTo(ox + hx, oy + hy);
                ctx.moveTo(ox, oy); ctx.lineTo(ox + vx, oy + vy);
                ctx.stroke();
            });

            // Center dot
            const cx = blob.x + blob.w / 2;
            const cy = blob.y + blob.h / 2;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx, cy, isPrimary ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();

            // ID label
            ctx.fillStyle = isPrimary ? '#FF5500' : '#FF880099';
            ctx.font = `bold ${isPrimary ? 11 : 9}px "Share Tech Mono", monospace`;
            ctx.fillText(`BLOB_${i.toString().padStart(2, '0')}  ${blob.area}px`, blob.x + 6, blob.y + 14);
        });

        // Corner HUD — blob count
        ctx.fillStyle = 'rgba(255,85,0,0.85)';
        ctx.font = '10px "Share Tech Mono", monospace';
        ctx.fillText(`// BLOB_DETECT  COUNT: ${this.blobCount}`, 12, H - 14);
    }

    // ─────────────────────────────────────────────────
    // MODULATION OUTPUTS (0–1, for use by effects)
    // ─────────────────────────────────────────────────
    getBlobMod()      { return Math.min(1, this.blobCount / 5); }
    getLargestX()     { return this.blobs[0]?.cx ?? 0.5; }
    getLargestY()     { return this.blobs[0]?.cy ?? 0.5; }
    getLargestArea()  { return this.blobs[0] ? Math.min(1, this.blobs[0].area / 500) : 0; }

    setEnabled(val) {
        this.enabled = val;
        this.overlayCanvas.style.display = (val && this.showOverlay) ? 'block' : 'none';
        if (!val) {
            this.blobs = [];
            this.blobCount = 0;
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
    }

    setShowOverlay(val) {
        this.showOverlay = val;
        this.overlayCanvas.style.display = (this.enabled && val) ? 'block' : 'none';
    }
}
