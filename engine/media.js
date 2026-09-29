// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — MEDIA LAYERS
//
// Image / text / video layers composited over the camera on a 2D canvas that
// feeds the shader. Only used while at least one layer exists — otherwise the
// camera goes straight to the GPU. Layer x/y are 0-1 of the frame and scale is
// relative to the frame height, so layers survive resizes and format changes.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
const TEXT_FONTS = ['Share Tech Mono', 'VT323', 'Rubik Glitch', 'Space Mono', 'Bungee', 'Roboto Mono', 'Inter'];

class MediaLayers {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.layers = [];
        this._id = 0;
    }

    get active() { return this.layers.some(l => l.visible); }

    _add(type, data) {
        const layer = {
            id: `L${++this._id}`, type, name: `${type.toUpperCase()} ${this._id}`,
            visible: true, x: 0.5, y: 0.5, scale: 0.5, rotation: 0, opacity: 1, ...data,
        };
        this.layers.push(layer);
        return layer;
    }

    addImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve(this._add('image', { name: file.name.replace(/\.[^.]+$/, '').slice(0, 24), img, url, aspect: img.width / img.height }));
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not an image')); };
            img.src = url;
        });
    }

    addText(text = 'TERMINAL DECAY') {
        return this._add('text', { name: 'TEXT', text, font: 'Share Tech Mono', color: '#ffffff', scale: 0.12 });
    }

    addVideo(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const vid = document.createElement('video');
            vid.src = url; vid.loop = true; vid.muted = true; vid.playsInline = true;
            vid.onloadedmetadata = () => {
                vid.play().catch(() => {});
                resolve(this._add('video', {
                    name: file.name.replace(/\.[^.]+$/, '').slice(0, 24), vid, url,
                    aspect: vid.videoWidth / Math.max(1, vid.videoHeight), playing: true, speed: 1,
                }));
            };
            vid.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unsupported video')); };
        });
    }

    remove(id) {
        const l = this.layers.find(x => x.id === id);
        if (!l) return;
        if (l.vid) { l.vid.pause(); l.vid.removeAttribute('src'); l.vid.load(); }
        if (l.url) URL.revokeObjectURL(l.url);
        this.layers = this.layers.filter(x => x.id !== id);
    }

    update(id, patch) {
        const l = this.layers.find(x => x.id === id);
        if (!l) return;
        Object.assign(l, patch);
        // Canvas text does not trigger web-font downloads on its own.
        if (patch.font && document.fonts) document.fonts.load(`48px "${patch.font}"`).catch(() => {});
        if (l.vid) {
            l.vid.playbackRate = l.speed || 1;
            if ('playing' in patch) { if (l.playing) l.vid.play().catch(() => {}); else l.vid.pause(); }
        }
    }

    // Draw camera (cover-fit) + layers at W×H. Returns the canvas.
    composite(camera, W, H) {
        const { canvas, ctx } = this;
        if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        if (camera && camera.ready) camera.drawCover(ctx, W, H);
        for (const l of this.layers) {
            if (!l.visible) continue;
            ctx.save();
            ctx.globalAlpha = l.opacity;
            ctx.translate(l.x * W, l.y * H);
            ctx.rotate(l.rotation * Math.PI / 180);
            const h = l.scale * H;
            if (l.type === 'image' && l.img) {
                ctx.drawImage(l.img, -h * l.aspect / 2, -h / 2, h * l.aspect, h);
            } else if (l.type === 'video' && l.vid && l.vid.readyState >= 2) {
                ctx.drawImage(l.vid, -h * l.aspect / 2, -h / 2, h * l.aspect, h);
            } else if (l.type === 'text') {
                ctx.fillStyle = l.color || '#fff';
                ctx.font = `${Math.max(4, Math.round(h))}px '${l.font}', monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(l.text || '', 0, 0);
            }
            ctx.restore();
        }
        return canvas;
    }
}

window.D4R.MediaLayers = MediaLayers;
window.D4R.TEXT_FONTS = TEXT_FONTS;
})();
