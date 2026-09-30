// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — MOTION BLOBS + TRACKING OVERLAY
//
// BlobTracker: frame-difference on a 160×90 copy of the camera, then
// connected components. Runs only on fresh camera frames. The biggest blob
// can stand in for a hand, so gesture effects work without the AI models.
//
// TrackingOverlay: one 2D canvas laid exactly over the displayed image that
// draws blob boxes and the AI skeleton. It is only redrawn while something is
// being shown, and hidden otherwise.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
const TWO_PI = Math.PI * 2;

class BlobTracker {
    constructor() {
        this.W = 160; this.H = 90;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.W; this.canvas.height = this.H;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.enabled = false;
        this.threshold = 30;
        this.minArea = 15;
        this.persist = 45;          // frames a blob survives without being seen
        this.maxBlobs = 8;
        this.blobs = [];            // persistent blobs, normalised source coords
        this._prev = null;
        const n = this.W * this.H;
        this._bin = new Uint8Array(n);
        this._seen = new Uint8Array(n);
        this._queue = new Int32Array(n);
    }

    get count() { return this.blobs.filter(b => b.fresh).length; }

    reset() { this.blobs = []; this._prev = null; this.seq = (this.seq || 0) + 1; }

    // source: <video> or <canvas>; drawFn optionally draws the source (for cover/mirror)
    process(drawFn) {
        if (!this.enabled) return;
        const { W, H, ctx } = this;
        drawFn(ctx, W, H);
        const cur = ctx.getImageData(0, 0, W, H).data;
        if (!this._prev) { this._prev = new Uint8ClampedArray(cur); return; }
        const bin = this._bin, seen = this._seen, q = this._queue, prev = this._prev;
        const t3 = this.threshold * 3;
        for (let i = 0, p = 0; i < cur.length; i += 4, p++) {
            bin[p] = (Math.abs(cur[i] - prev[i]) + Math.abs(cur[i + 1] - prev[i + 1]) + Math.abs(cur[i + 2] - prev[i + 2])) > t3 ? 1 : 0;
        }
        prev.set(cur);
        seen.fill(0);
        const found = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const s = y * W + x;
            if (!bin[s] || seen[s]) continue;
            let head = 0, tail = 0, minX = x, maxX = x, minY = y, maxY = y, count = 0;
            q[tail++] = s; seen[s] = 1;
            while (head < tail) {
                const c = q[head++];
                const cx = c % W, cy = (c / W) | 0;
                count++;
                if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
                if (cx > 0 && bin[c - 1] && !seen[c - 1]) { seen[c - 1] = 1; q[tail++] = c - 1; }
                if (cx < W - 1 && bin[c + 1] && !seen[c + 1]) { seen[c + 1] = 1; q[tail++] = c + 1; }
                if (cy > 0 && bin[c - W] && !seen[c - W]) { seen[c - W] = 1; q[tail++] = c - W; }
                if (cy < H - 1 && bin[c + W] && !seen[c + W]) { seen[c + W] = 1; q[tail++] = c + W; }
            }
            if (count >= this.minArea) found.push({ x0: minX / W, y0: minY / H, x1: (maxX + 1) / W, y1: (maxY + 1) / H, area: count });
        }
        found.sort((a, b) => b.area - a.area);
        this._merge(found.slice(0, this.maxBlobs));
        this.seq = (this.seq || 0) + 1;
    }

    _merge(found) {
        for (const b of this.blobs) { b.ttl--; b.fresh = false; }
        for (const f of found) {
            const fx = (f.x0 + f.x1) / 2, fy = (f.y0 + f.y1) / 2;
            let best = null, bestD = 0.12;
            for (const b of this.blobs) {
                const d = Math.hypot((b.x0 + b.x1) / 2 - fx, (b.y0 + b.y1) / 2 - fy);
                if (d < bestD) { bestD = d; best = b; }
            }
            if (best) {
                for (const k of ['x0', 'y0', 'x1', 'y1']) best[k] += (f[k] - best[k]) * 0.35;
                best.area = f.area; best.ttl = this.persist; best.fresh = true;
            } else {
                this.blobs.push({ ...f, ttl: this.persist, fresh: true, id: (this._nextId = (this._nextId || 0) + 1) });
            }
        }
        this.blobs = this.blobs.filter(b => b.ttl > 0).sort((a, b) => b.area - a.area);
    }

    // Largest live blob as a "virtual hand": centre + strength from its size.
    lead() {
        const b = this.blobs.find(x => x.fresh) || this.blobs[0];
        if (!b) return null;
        return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, strength: Math.min(1, b.area / 600), second: this.blobs[1] || null };
    }
}

class TrackingOverlay {
    constructor() {
        const c = document.createElement('canvas');
        c.className = 'tracking-overlay';
        c.style.cssText = 'position:fixed;pointer-events:none;z-index:2;display:none;';
        document.body.appendChild(c);
        this.canvas = c;
        this.ctx = c.getContext('2d');
        this.visible = false;
    }

    place(disp) {
        const c = this.canvas;
        if (c.width !== disp.w || c.height !== disp.h) { c.width = disp.w; c.height = disp.h; }
        c.style.left = disp.left + 'px'; c.style.top = disp.top + 'px';
        c.style.width = disp.w + 'px'; c.style.height = disp.h + 'px';
    }

    setVisible(v) {
        if (v === this.visible) return;
        this.visible = v;
        this.canvas.style.display = v ? 'block' : 'none';
        if (!v) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // toPx(nx, ny) maps source-normalised coords → overlay pixels.
    draw({ blobs, blobToPx, human, humanToPx, persist = 45 }) {
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'miter';
        const mono = '"Share Tech Mono", monospace';

        if (blobs) {
            blobs.forEach((b, i) => {
                const [ax, ay] = blobToPx(b.x0, b.y0), [bx, by] = blobToPx(b.x1, b.y1);
                const x = Math.min(ax, bx), y = Math.min(ay, by), w = Math.abs(bx - ax), h = Math.abs(by - ay);
                const a = Math.min(1, Math.max(0, b.ttl) / persist) * (i === 0 ? 1 : 0.65);
                ctx.strokeStyle = `rgba(255,${i === 0 ? 85 : 136},0,${a})`;
                ctx.lineWidth = i === 0 ? 2.5 : 1.25;
                ctx.strokeRect(x, y, w, h);
                if (i === 0) this._ticks(x, y, w, h);
                ctx.fillStyle = `rgba(255,120,0,${a})`;
                ctx.font = `11px ${mono}`;
                ctx.fillText(`BLOB_${String(b.id % 100).padStart(2, '0')}`, x + 5, y + 13);
            });
        }

        if (human && human.raw) this._drawHuman(human, humanToPx, mono);
    }

    _ticks(x, y, w, h) {
        const ctx = this.ctx, t = 12;
        ctx.strokeStyle = '#FF5500'; ctx.lineWidth = 3;
        ctx.beginPath();
        for (const [px, py, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
            ctx.moveTo(px, py); ctx.lineTo(px + t * dx, py);
            ctx.moveTo(px, py); ctx.lineTo(px, py + t * dy);
        }
        ctx.stroke();
    }

    _drawHuman(h, toPx, mono) {
        const ctx = this.ctx;
        const raw = h.raw;
        const box = (bx) => {
            const [ax, ay] = toPx(bx[0], bx[1]), [cx, cy] = toPx(bx[0] + bx[2], bx[1] + bx[3]);
            return [Math.min(ax, cx), Math.min(ay, cy), Math.abs(cx - ax), Math.abs(cy - ay)];
        };
        const pt = (p) => toPx(Array.isArray(p) ? p[0] : p.x, Array.isArray(p) ? p[1] : p.y);

        const face = raw.face && raw.face[0];
        if (h.faceDetected && face && face.boxRaw) {
            const [x, y, w, hh] = box(face.boxRaw);
            ctx.strokeStyle = '#FF5500'; ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, hh);
            this._ticks(x, y, w, hh);
            ctx.fillStyle = '#FF5500'; ctx.font = `bold 11px ${mono}`;
            ctx.fillText(`FACE ${Math.round(h.faceScore * 100)}%`, x + 5, y + 14);
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y + hh + 4, 150, 16);
            ctx.fillStyle = '#FF8800'; ctx.font = `bold 10px ${mono}`;
            ctx.fillText(`${h.emotion.toUpperCase()} · YAW ${Math.round(h.yawDeg)}°`, x + 4, y + hh + 16);
            if (face.meshRaw && face.meshRaw.length) {
                ctx.fillStyle = 'rgba(255,85,0,0.25)';
                ctx.beginPath();
                for (let i = 0; i < face.meshRaw.length; i += 2) {
                    const [px, py] = toPx(face.meshRaw[i][0], face.meshRaw[i][1]);
                    ctx.moveTo(px + 1, py); ctx.arc(px, py, 1, 0, TWO_PI);
                }
                ctx.fill();
            }
        }

        const CONN = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12],
                      [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]];
        for (const hand of raw.hand || []) {
            const kp = hand.keypointsNorm;
            if (!kp || kp.length < 21) continue;
            const col = hand.label === 'left' ? '#FF5500' : '#FF8800';
            ctx.strokeStyle = col + 'AA'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (const [a, b] of CONN) { const pa = pt(kp[a]), pb = pt(kp[b]); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); }
            ctx.stroke();
            ctx.fillStyle = col;
            ctx.beginPath();
            for (const i of [4, 8, 12, 16, 20]) { const p = pt(kp[i]); ctx.moveTo(p[0] + 4, p[1]); ctx.arc(p[0], p[1], 4, 0, TWO_PI); }
            ctx.fill();
        }

        const body = raw.body && raw.body[0];
        if (body && body.keypointsNorm) {
            const kps = body.keypointsNorm;
            const BONES = [[5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];
            ctx.strokeStyle = 'rgba(255,136,0,0.65)'; ctx.lineWidth = 2;
            ctx.beginPath();
            for (const [a, b] of BONES) {
                const pa = kps[a], pb = kps[b];
                if (!pa || !pb || pa.score < 0.25 || pb.score < 0.25) continue;
                const A = toPx(pa.x, pa.y), B = toPx(pb.x, pb.y);
                ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
            }
            ctx.stroke();
        }
    }
}

window.D4R.BlobTracker = BlobTracker;
window.D4R.TrackingOverlay = TrackingOverlay;
})();
