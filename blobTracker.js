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
        this.threshold    = 30;
        this.minArea      = 15;
        this.maxBlobs     = 8;

        // Output data
        this.blobs        = [];
        this.blobCount    = 0;

        // Persistence
        this.persistFrames = 45;
        this._persistBlobs = [];
        this._prevPixels  = null;

        // ── Human AI overlay ───────────────────────────────────
        this.humanData    = null;   // latest result from humanEngine.getData()
        this.showHuman    = true;   // toggle human overlay layer
        // last raw Human result (full object with landmarks)
        this._humanRaw    = null;

        // Resize overlay canvas to match window
        this._resizeOverlay();
        window.addEventListener('resize', () => this._resizeOverlay());
    }

    // ── Feed Human AI data in (called from render loop) ────────
    setHumanData(data, rawResult) {
        this.humanData = data;
        this._humanRaw = rawResult || null;
    }

    _resizeOverlay() {
        this.overlayCanvas.width  = window.innerWidth;
        this.overlayCanvas.height = window.innerHeight;
    }

    // ─────────────────────────────────────────────────
    // MAIN PROCESS — call every frame from render loop
    // ─────────────────────────────────────────────────
    process(source) {
        if (!this.enabled) return;
        if (!source) return;
        // <video> needs readyState check; <canvas> is always ready
        if (source.tagName === 'VIDEO' && source.readyState < 2) return;

        // Down-sample source frame to analysis canvas
        this.analysisCtx.drawImage(source, 0, 0, this.analysisW, this.analysisH);
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

        // ── Step 5: Merge with persistent blobs ─────────────
        this._mergePersistence();

        // ── Step 6: Draw overlay ─────────────────────────────
        if (this.showOverlay) {
            this._drawOverlay();
        } else if (this.showHuman && this.humanData) {
            // Human-only mode: clear blob layer but still draw human
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
            this._drawHumanOverlay();
        } else {
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
    }

    _mergePersistence() {
        const matchRadius = 120; // px — how close a new blob must be to refresh a persistent one

        // Decrement TTL on all persistent blobs
        for (const pb of this._persistBlobs) pb.ttl--;

        // For each newly detected blob, try to match an existing persistent blob
        for (const blob of this.blobs) {
            const bcx = blob.x + blob.w / 2;
            const bcy = blob.y + blob.h / 2;
            let best = null, bestDist = matchRadius;

            for (const pb of this._persistBlobs) {
                const pcx = pb.x + pb.w / 2;
                const pcy = pb.y + pb.h / 2;
                const dist = Math.hypot(bcx - pcx, bcy - pcy);
                if (dist < bestDist) { bestDist = dist; best = pb; }
            }

            if (best) {
                // Update position/size with smooth lerp and reset TTL
                const t = 0.35;
                best.x = best.x + (blob.x - best.x) * t;
                best.y = best.y + (blob.y - best.y) * t;
                best.w = best.w + (blob.w - best.w) * t;
                best.h = best.h + (blob.h - best.h) * t;
                best.area = blob.area;
                best.cx = blob.cx;
                best.cy = blob.cy;
                best.ttl = this.persistFrames;
            } else {
                // New blob — add to persistent list
                this._persistBlobs.push({
                    ...blob,
                    ttl: this.persistFrames,
                    maxTtl: this.persistFrames,
                });
            }
        }

        // Remove expired blobs
        this._persistBlobs = this._persistBlobs.filter(pb => pb.ttl > 0);
    }

    _drawOverlay() {
        const ctx = this.overlayCtx;
        const W   = this.overlayCanvas.width;
        const H   = this.overlayCanvas.height;
        ctx.clearRect(0, 0, W, H);

        // Draw persistent (possibly fading) blobs — sorted so brightest on top
        const sorted = [...this._persistBlobs].sort((a, b) => b.ttl - a.ttl);

        sorted.forEach((blob, i) => {
            const isPrimary = i === 0;
            // Fade alpha based on remaining TTL
            const lifeFrac  = blob.ttl / this.persistFrames; // 1=fresh, 0=dead
            const baseAlpha = isPrimary ? 1.0 : 0.65;
            const alpha     = baseAlpha * lifeFrac;
            const color     = isPrimary ? `rgba(255,85,0,${alpha})` : `rgba(255,136,0,${alpha})`;
            const lineW     = isPrimary ? 3 : 1.5;

            // Bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth   = lineW;
            ctx.strokeRect(blob.x, blob.y, blob.w, blob.h);

            // Corner ticks (brutalist style)
            const tick = 12;
            ctx.strokeStyle = isPrimary ? '#FF5500' : '#FF8800';
            ctx.lineWidth = isPrimary ? 3 : 1.5;
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
            ctx.arc(cx, cy, isPrimary ? 7 : 4, 0, Math.PI * 2);
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

        // Render human overlay on top of blobs
        if (this.showHuman && this.humanData) {
            this._drawHumanOverlay();
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // HUMAN AI OVERLAY — blob-tracker style (orange Safety-Core palette)
    // ─────────────────────────────────────────────────────────────────
    _drawHumanOverlay() {
        const ctx = this.overlayCtx;
        const W   = this.overlayCanvas.width;
        const H   = this.overlayCanvas.height;
        const hd  = this.humanData;
        const raw = this._humanRaw;
        if (!hd) return;

        // Use actual video dimensions from humanData (not hardcoded)
        const vw = hd.videoWidth  || 640;
        const vh = hd.videoHeight || 480;
        const sx = W / vw;
        const sy = H / vh;

        // Blob-tracker palette
        const C_PRI  = '#FF5500';    // primary orange
        const C_SEC  = '#FF8800';    // secondary amber
        const C_DIM  = '#FF880066';  // dim
        const C_TAG  = '#FF5500';    // tags
        const MONO   = '"Share Tech Mono", monospace';

        // Helper: draw corner ticks (identical to blob tracker style)
        const drawCornerTicks = (x, y, w, h, isPrimary) => {
            const tick = 12;
            ctx.strokeStyle = isPrimary ? C_PRI : C_SEC;
            ctx.lineWidth = isPrimary ? 3 : 1.5;
            [
                [x,     y,     tick, 0, 0, tick],
                [x + w, y,    -tick, 0, 0, tick],
                [x,     y + h, tick, 0, 0, -tick],
                [x + w, y + h,-tick, 0, 0, -tick],
            ].forEach(([ox, oy, hx, hy, vx, vy]) => {
                ctx.beginPath();
                ctx.moveTo(ox, oy); ctx.lineTo(ox + hx, oy + hy);
                ctx.moveTo(ox, oy); ctx.lineTo(ox + vx, oy + vy);
                ctx.stroke();
            });
        };

        ctx.save();

        // ── 1. FACE ─────────────────────────────────────────────
        if (hd.faceDetected && raw?.face?.[0]) {
            const face = raw.face[0];
            const [bx, by, bw, bh] = face.box || [0,0,0,0];
            const fx = bx * sx, fy = by * sy, fw = bw * sx, fh = bh * sy;

            // Bounding box
            ctx.strokeStyle = C_PRI;
            ctx.lineWidth = 2;
            ctx.strokeRect(fx, fy, fw, fh);

            // Corner ticks
            drawCornerTicks(fx, fy, fw, fh, true);

            // Centre dot
            const fcx = fx + fw / 2, fcy = fy + fh / 2;
            ctx.fillStyle = C_PRI;
            ctx.beginPath();
            ctx.arc(fcx, fcy, 5, 0, Math.PI * 2);
            ctx.fill();

            // ID label (top-left inside box)
            ctx.fillStyle = C_PRI;
            ctx.font = `bold 11px ${MONO}`;
            ctx.fillText(`FACE_00  ${Math.round(hd.faceScore * 100)}%`, fx + 6, fy + 14);

            // Emotion tag (below box)
            const emo = (hd.emotion || 'neutral').toUpperCase();
            const emoPct = Math.round((hd.emotions?.[hd.emotion] || 0) * 100);
            ctx.fillStyle = '#00000099';
            const tagW = 130;
            ctx.fillRect(fx, fy + fh + 4, tagW, 16);
            ctx.fillStyle = C_TAG;
            ctx.font = `bold 10px ${MONO}`;
            ctx.fillText(`${emo} ${emoPct}%`, fx + 4, fy + fh + 16);

            // ── Head rotation mini-bars (right of face box) ─────
            const hudX = fx + fw + 8;
            const hudY = fy;
            const barW = 50;
            [
                ['YAW',   hd.yaw,   C_SEC],
                ['PITCH', hd.pitch, C_PRI],
                ['ROLL',  hd.roll,  C_SEC],
            ].forEach(([label, val, col], i) => {
                const rowY = hudY + i * 16;
                ctx.fillStyle = '#00000088';
                ctx.fillRect(hudX, rowY, barW + 40, 13);
                // bar bg
                ctx.fillStyle = '#333';
                ctx.fillRect(hudX + 32, rowY + 3, barW, 7);
                // bar fill (centre-out)
                const pct = ((val || 0) + 1) * 0.5;
                const mid = hudX + 32 + barW / 2;
                const fill = (pct - 0.5) * barW;
                ctx.fillStyle = col;
                ctx.fillRect(fill >= 0 ? mid : mid + fill, rowY + 3, Math.abs(fill), 7);
                // label
                ctx.fillStyle = '#ffffff88';
                ctx.font = `8px ${MONO}`;
                ctx.fillText(label, hudX + 2, rowY + 10);
                ctx.fillStyle = col;
                ctx.fillText(`${((val||0)*90).toFixed(0)}°`, hudX + barW + 34, rowY + 10);
            });

            // Face mesh dots (very subtle)
            if (face.mesh && face.mesh.length > 0) {
                ctx.fillStyle = `${C_PRI}30`;
                for (const [px, py] of face.mesh) {
                    ctx.beginPath();
                    ctx.arc(px * sx, py * sy, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // ── 2. HANDS ────────────────────────────────────────────
        if (raw?.hand && raw.hand.length > 0) {
            raw.hand.forEach((hand, hi) => {
                const isLeft = hand.label === 'left';
                const col = isLeft ? C_PRI : C_SEC;
                const colDim = isLeft ? `${C_PRI}88` : `${C_SEC}88`;

                // Bounding box
                if (hand.box) {
                    const [bx, by, bw, bh] = hand.box;
                    const hx = bx*sx, hy = by*sy, hw = bw*sx, hh = bh*sy;
                    ctx.strokeStyle = col;
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(hx, hy, hw, hh);
                    drawCornerTicks(hx, hy, hw, hh, false);
                    // Label
                    ctx.fillStyle = col;
                    ctx.font = `bold 9px ${MONO}`;
                    ctx.fillText(`${isLeft ? 'L' : 'R'}_HAND  ${hi}`, hx + 4, hy + 12);
                }

                // Skeleton — use `keypoints` (numeric [x,y,z] pixel coords), NOT `landmarks`
                // In Human v3.x, `landmarks` is gesture annotations (FingerCurl etc.)
                const kp = hand.keypoints;
                if (kp && kp.length >= 21) {
                    // Helper: keypoints can be [x,y,z] arrays or {x,y,z} objects
                    const getXY = (pt) => {
                        if (Array.isArray(pt)) return pt;
                        if (pt && pt.x !== undefined) return [pt.x, pt.y, pt.z || 0];
                        return null;
                    };
                    const CONN = [
                        [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
                        [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
                        [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
                    ];
                    ctx.strokeStyle = colDim;
                    ctx.lineWidth = 1.5;
                    for (const [a, b] of CONN) {
                        const pa = getXY(kp[a]), pb = getXY(kp[b]);
                        if (!pa || !pb) continue;
                        ctx.beginPath();
                        ctx.moveTo(pa[0]*sx, pa[1]*sy);
                        ctx.lineTo(pb[0]*sx, pb[1]*sy);
                        ctx.stroke();
                    }
                    kp.forEach((pt, idx) => {
                        const xy = getXY(pt);
                        if (!xy) return;
                        const tip = [4,8,12,16,20].includes(idx);
                        ctx.fillStyle = tip ? col : colDim;
                        ctx.beginPath();
                        ctx.arc(xy[0]*sx, xy[1]*sy, tip ? 4 : 2, 0, Math.PI*2);
                        ctx.fill();
                    });
                }
            });
        }

        // ── 3. BODY ─────────────────────────────────────────────
        if (raw?.body && raw.body.length > 0) {
            const body = raw.body[0];
            if (body.keypoints && body.keypoints.length > 0) {
                const kps = body.keypoints;
                const CONN = [
                    [5,6],[5,7],[7,9],[6,8],[8,10],
                    [5,11],[6,12],[11,12],
                    [11,13],[13,15],[12,14],[14,16],
                ];
                ctx.strokeStyle = `${C_SEC}AA`;
                ctx.lineWidth = 2;
                for (const [a, b] of CONN) {
                    const pa = kps[a], pb = kps[b];
                    if (!pa || !pb || (pa.score||0) < 0.25 || (pb.score||0) < 0.25) continue;
                    const pax = (pa.position?.[0] ?? pa.x) * sx;
                    const pay = (pa.position?.[1] ?? pa.y) * sy;
                    const pbx = (pb.position?.[0] ?? pb.x) * sx;
                    const pby = (pb.position?.[1] ?? pb.y) * sy;
                    ctx.beginPath();
                    ctx.moveTo(pax, pay);
                    ctx.lineTo(pbx, pby);
                    ctx.stroke();
                }
                kps.forEach(kp => {
                    if (!kp || (kp.score||0) < 0.25) return;
                    const kx = (kp.position?.[0] ?? kp.x) * sx;
                    const ky = (kp.position?.[1] ?? kp.y) * sy;
                    ctx.fillStyle = C_SEC;
                    ctx.beginPath();
                    ctx.arc(kx, ky, 4, 0, Math.PI*2);
                    ctx.fill();
                });
                // Body bbox
                if (body.box) {
                    const [bx, by, bw, bh] = body.box;
                    ctx.strokeStyle = `${C_SEC}55`;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(bx*sx, by*sy, bw*sx, bh*sy);
                    ctx.setLineDash([]);
                    ctx.fillStyle = C_SEC;
                    ctx.font = `9px ${MONO}`;
                    ctx.fillText('BODY_00', bx*sx + 4, by*sy - 4);
                }
            }
        }

        // ── 4. Gesture text (bottom of face box) ────────────────
        if (hd.handGesture) {
            ctx.fillStyle = '#00000099';
            ctx.fillRect(W - 210, H - 44, 200, 16);
            ctx.fillStyle = C_TAG;
            ctx.font = `bold 9px ${MONO}`;
            ctx.fillText(`GESTURE: ${hd.handGesture.toUpperCase().slice(0,30)}`, W - 206, H - 32);
        }

        // ── 5. Corner HUD ───────────────────────────────────────
        const lines = [
            `// HUMAN_DETECT`,
            `FACE: ${hd.faceDetected ? `ON ${Math.round(hd.faceScore*100)}%` : 'OFF'}`,
            `EMO: ${(hd.emotion||'neutral').toUpperCase()}`,
            `HANDS: ${[hd.handLeft?'L':'',hd.handRight?'R':''].filter(Boolean).join('+')||'—'}`,
            `BODY: ${hd.bodyDetected ? 'ON' : 'OFF'}`,
        ];
        const lineH = 13;
        const padX = 12, padY = H - 14 - 28;
        ctx.fillStyle = '#00000088';
        ctx.fillRect(padX - 2, padY - (lines.length-1)*lineH - 4, 170, lines.length*lineH + 6);
        lines.forEach((line, i) => {
            ctx.fillStyle = i === 0 ? C_PRI : `${C_SEC}CC`;
            ctx.font = `${i===0?'bold ':''}${i===0?10:9}px ${MONO}`;
            ctx.fillText(line, padX, padY - (lines.length-1-i)*lineH);
        });

        ctx.restore();
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
        // Show overlay if blobs ON, or if human AI is active
        const shouldShow = val || (this.showHuman && this.humanData);
        this.overlayCanvas.style.display = (shouldShow && this.showOverlay) ? 'block' : 'none';
        if (!val) {
            this.blobs = [];
            this.blobCount = 0;
            if (!this.showHuman) {
                this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
            }
        }
    }

    setShowOverlay(val) {
        this.showOverlay = val;
        const active = this.enabled || (this.showHuman && !!this.humanData);
        this.overlayCanvas.style.display = (active && val) ? 'block' : 'none';
    }

    // Toggle human layer independently of blob detection
    setShowHuman(val) {
        this.showHuman = val;
        const active = this.enabled || (val && !!this.humanData);
        this.overlayCanvas.style.display = (active && this.showOverlay) ? 'block' : 'none';
    }
}
