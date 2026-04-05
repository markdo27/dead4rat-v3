/**
 * MediaManager — Offscreen 2D compositing canvas
 * Layers camera feed + imported media (PNG, Text, 3D STL) into a single
 * canvas that feeds the WebGL shader pipeline.
 */
class MediaManager {
    constructor(width, height) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
        
        this.layers = [];
        this.selectedLayerId = null;
        this._idCounter = 0;
    }

    resize(w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
    }

    addLayer(type, data = {}) {
        const layer = {
            id: `layer-${this._idCounter++}`,
            type,
            name: `${type.toUpperCase()} ${this.layers.length + 1}`,
            visible: true,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            scale: 1.0,
            rotation: 0, // degrees
            opacity: 1.0,
            blendMode: 'source-over',
            ...data
        };
        this.layers.push(layer);
        this.selectedLayerId = layer.id;
        return layer;
    }

    removeLayer(id) {
        this.layers = this.layers.filter(l => l.id !== id);
        if (this.selectedLayerId === id) this.selectedLayerId = null;
    }

    composite(videoElement) {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw camera as base
        if (videoElement && videoElement.readyState >= 2) {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        }

        // 2. Draw media layers
        for (const layer of this.layers) {
            if (!layer.visible) continue;
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.globalCompositeOperation = layer.blendMode;
            
            ctx.translate(layer.x, layer.y);
            ctx.rotate(layer.rotation * Math.PI / 180);
            const s = layer.scale;
            ctx.scale(s, s);

            if (layer.type === 'image' && layer.img) {
                ctx.drawImage(layer.img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
            } else if (layer.type === 'text') {
                ctx.fillStyle = layer.color || '#ffffff';
                ctx.font = `${layer.fontSize || 100}px '${layer.fontFamily || 'Share Tech Mono'}', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(layer.text || 'HELLO', 0, 0);
            } else if (layer.type === '3d' && layer.renderCanvas) {
                // Three.js renders to an offscreen canvas, we just draw that canvas here
                ctx.drawImage(layer.renderCanvas, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
            }
            
            ctx.restore();
        }

        return canvas;
    }

    // Interaction helper: returns layer under mouse
    getLayerAt(x, y) {
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const l = this.layers[i];
            const w = l.width || 100;
            const h = l.height || 100;
            if (x >= l.x - w/2 && x <= l.x + w/2 && y >= l.y - h/2 && y <= l.y + h/2) {
                return l;
            }
        }
        return null;
    }
}
