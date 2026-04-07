/**
 * CompositorEngine — Offscreen 2D compositing canvas
 * Layers camera feed + imported media (PNG, Text, 3D STL) into a single
 * canvas that feeds the WebGL shader pipeline.
 * All layers go through the glitch effects.
 */
class CompositorEngine {
    constructor(width, height) {
        this.compCanvas = document.createElement('canvas');
        this.compCanvas.width = width;
        this.compCanvas.height = height;
        this.ctx = this.compCanvas.getContext('2d');

        this.layers = [];
        this.selectedLayerId = null;
        this._nextId = 1;

        // Drag state
        this._isDragging = false;
        this._dragOffsetX = 0;
        this._dragOffsetY = 0;
    }

    resize(width, height) {
        this.compCanvas.width = width;
        this.compCanvas.height = height;
    }

    // ─────────────────────────────────────────────
    // LAYER CRUD
    // ─────────────────────────────────────────────

    _createBaseLayer(type) {
        return {
            id: `layer-${this._nextId++}`,
            type,
            name: `${type.toUpperCase()} ${this._nextId - 1}`,
            visible: true,
            locked: false,
            opacity: 1.0,
            blendMode: 'source-over',
            x: this.compCanvas.width / 2 - 100,
            y: this.compCanvas.height / 2 - 100,
            width: 200,
            height: 200,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            flipH: false,
            flipV: false,
        };
    }

    addImageLayer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const layer = this._createBaseLayer('image');
                    layer.name = file.name.replace(/\.[^.]+$/, '');
                    layer.img = img;
                    // Scale to reasonable size (max 400px on longest side)
                    const maxDim = 400;
                    const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
                    layer.width = img.width * ratio;
                    layer.height = img.height * ratio;
                    layer.x = (this.compCanvas.width - layer.width) / 2;
                    layer.y = (this.compCanvas.height - layer.height) / 2;

                    this.layers.push(layer);
                    this.selectedLayerId = layer.id;
                    resolve(layer);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    addVideoLayer(file) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const vid = document.createElement('video');
            vid.src = url;
            vid.loop = true;
            vid.muted = true;
            vid.playsInline = true;
            vid.autoplay = true;
            vid.style.display = 'none';
            document.body.appendChild(vid);

            vid.onloadedmetadata = () => {
                const layer = this._createBaseLayer('video');
                layer.name = file.name.replace(/\.[^.]+$/, '');
                layer.vid = vid;
                layer.objectUrl = url;
                layer.isPlaying = true;
                layer.loop = true;
                layer.speed = 1.0;

                // Scale to fit within 640x480 max, preserving aspect
                const maxDim = 640;
                const ratio = Math.min(maxDim / vid.videoWidth, maxDim / vid.videoHeight, 1);
                layer.width  = vid.videoWidth  * ratio;
                layer.height = vid.videoHeight * ratio;
                layer.x = (this.compCanvas.width  - layer.width)  / 2;
                layer.y = (this.compCanvas.height - layer.height) / 2;

                vid.play().catch(() => {});
                this.layers.push(layer);
                this.selectedLayerId = layer.id;
                resolve(layer);
            };

            // Fallback if metadata already loaded
            if (vid.readyState >= 1) vid.onloadedmetadata();
        });
    }

    addTextLayer(content = 'TYPE HERE') {
        const layer = this._createBaseLayer('text');
        layer.name = 'Text';
        layer.content = content;
        layer.fontFamily = 'Inter';
        layer.fontSize = 64;
        layer.color = '#ffffff';
        layer.bold = true;
        layer.italic = false;
        layer.strokeColor = '#000000';
        layer.strokeWidth = 2;
        layer.width = 400;
        layer.height = 100;
        layer.x = (this.compCanvas.width - layer.width) / 2;
        layer.y = (this.compCanvas.height - layer.height) / 2;

        this.layers.push(layer);
        this.selectedLayerId = layer.id;
        return layer;
    }

    add3DLayer(file) {
        return new Promise((resolve, reject) => {
            if (typeof THREE === 'undefined') {
                reject(new Error('Three.js not loaded'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const layer = this._createBaseLayer('3d');
                    layer.name = file.name.replace(/\.[^.]+$/, '');

                    // Offscreen Three.js setup
                    const size = 512;
                    const offCanvas = document.createElement('canvas');
                    offCanvas.width = size;
                    offCanvas.height = size;

                    const renderer = new THREE.WebGLRenderer({
                        canvas: offCanvas,
                        alpha: true,
                        antialias: true,
                    });
                    renderer.setSize(size, size);
                    renderer.setClearColor(0x000000, 0);

                    const scene = new THREE.Scene();
                    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
                    camera.position.set(0, 0, 5);

                    // Lighting
                    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
                    scene.add(ambientLight);
                    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
                    dirLight.position.set(3, 5, 4);
                    scene.add(dirLight);
                    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.6);
                    rimLight.position.set(-3, -2, -4);
                    scene.add(rimLight);

                    // Parse STL
                    const loader = new THREE.STLLoader();
                    const geometry = loader.parse(e.target.result);
                    geometry.computeVertexNormals();

                    // Center and scale
                    geometry.computeBoundingBox();
                    const box = geometry.boundingBox;
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    geometry.translate(-center.x, -center.y, -center.z);
                    const maxDim = Math.max(
                        box.max.x - box.min.x,
                        box.max.y - box.min.y,
                        box.max.z - box.min.z
                    );
                    const scaleFactor = 3.0 / maxDim;
                    geometry.scale(scaleFactor, scaleFactor, scaleFactor);

                    const material = new THREE.MeshPhongMaterial({
                        color: 0x00ffff,
                        shininess: 80,
                        wireframe: false,
                        transparent: true,
                        opacity: 1.0,
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    scene.add(mesh);

                    // Store Three.js refs on layer
                    layer.threeCanvas = offCanvas;
                    layer.renderer = renderer;
                    layer.scene = scene;
                    layer.camera = camera;
                    layer.mesh = mesh;
                    layer.material = material;
                    layer.rotX = 0;
                    layer.rotY = 0;
                    layer.rotZ = 0;
                    layer.wireframe = false;
                    layer.meshColor = '#00ffff';
                    layer.animate = true;
                    layer.width = 400;
                    layer.height = 400;
                    layer.x = (this.compCanvas.width - layer.width) / 2;
                    layer.y = (this.compCanvas.height - layer.height) / 2;

                    this.layers.push(layer);
                    this.selectedLayerId = layer.id;
                    resolve(layer);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    removeLayer(id) {
        const idx = this.layers.findIndex(l => l.id === id);
        if (idx === -1) return;
        const layer = this.layers[idx];

        // Cleanup Three.js resources
        if (layer.type === '3d' && layer.renderer) {
            layer.renderer.dispose();
            layer.material?.dispose();
            layer.mesh?.geometry?.dispose();
        }

        // Cleanup Video resources
        if (layer.type === 'video' && layer.vid) {
            layer.vid.pause();
            layer.vid.src = '';
            layer.vid.remove();
            if (layer.objectUrl) URL.revokeObjectURL(layer.objectUrl);
        }

        this.layers.splice(idx, 1);
        if (this.selectedLayerId === id) {
            this.selectedLayerId = this.layers.length > 0 ? this.layers[this.layers.length - 1].id : null;
        }
    }

    getLayer(id) {
        return this.layers.find(l => l.id === id);
    }

    reorderLayer(id, direction) {
        const idx = this.layers.findIndex(l => l.id === id);
        if (idx === -1) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= this.layers.length) return;
        const temp = this.layers[idx];
        this.layers[idx] = this.layers[newIdx];
        this.layers[newIdx] = temp;
    }

    // ─────────────────────────────────────────────
    // PER-FRAME COMPOSITING
    // ─────────────────────────────────────────────

    composite(videoElement) {
        const ctx = this.ctx;
        const w = this.compCanvas.width;
        const h = this.compCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Draw camera feed as background
        if (videoElement && videoElement.readyState >= 2) {
            ctx.drawImage(videoElement, 0, 0, w, h);
        }

        // 2. Draw each layer in order
        for (const layer of this.layers) {
            if (!layer.visible) continue;

            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.globalCompositeOperation = layer.blendMode;

            // Transform from layer center
            const cx = layer.x + layer.width / 2;
            const cy = layer.y + layer.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate(layer.rotation * Math.PI / 180);
            ctx.scale(
                layer.scaleX * (layer.flipH ? -1 : 1),
                layer.scaleY * (layer.flipV ? -1 : 1)
            );

            switch (layer.type) {
                case 'image':
                    this._drawImageLayer(ctx, layer);
                    break;
                case 'text':
                    this._drawTextLayer(ctx, layer);
                    break;
                case '3d':
                    this._draw3DLayer(ctx, layer);
                    break;
                case 'video':
                    this._drawVideoLayer(ctx, layer);
                    break;
            }

            ctx.restore();
        }

        // 3. Draw selection handles on top (for UI feedback, not composited into effects)
        // Handles are drawn on the MAIN canvas overlay, not here.

        return this.compCanvas;
    }

    _drawImageLayer(ctx, layer) {
        if (!layer.img) return;
        ctx.drawImage(layer.img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    }

    _drawTextLayer(ctx, layer) {
        const fontStyle = `${layer.italic ? 'italic ' : ''}${layer.bold ? 'bold ' : ''}${layer.fontSize}px ${layer.fontFamily}`;
        ctx.font = fontStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Stroke
        if (layer.strokeWidth > 0) {
            ctx.strokeStyle = layer.strokeColor;
            ctx.lineWidth = layer.strokeWidth;
            ctx.strokeText(layer.content, 0, 0);
        }

        // Fill
        ctx.fillStyle = layer.color;
        ctx.fillText(layer.content, 0, 0);
    }

    _draw3DLayer(ctx, layer) {
        if (!layer.renderer || !layer.scene || !layer.camera || !layer.mesh) return;

        // Update rotation
        if (layer.animate) {
            layer.rotY += 0.5;
        }
        layer.mesh.rotation.set(
            layer.rotX * Math.PI / 180,
            layer.rotY * Math.PI / 180,
            layer.rotZ * Math.PI / 180
        );

        // Update material
        layer.material.wireframe = layer.wireframe;

        // Render
        layer.renderer.render(layer.scene, layer.camera);

        // Draw Three.js canvas onto compositor
        ctx.drawImage(layer.threeCanvas, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    }

    _drawVideoLayer(ctx, layer) {
        if (!layer.vid || layer.vid.readyState < 2) return;
        // Update playback speed
        if (layer.vid.playbackRate !== (layer.speed || 1.0)) {
            layer.vid.playbackRate = layer.speed || 1.0;
        }
        layer.vid.loop = layer.loop !== false;
        ctx.drawImage(layer.vid, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    }

    // ─────────────────────────────────────────────
    // INTERACTION HELPERS
    // ─────────────────────────────────────────────

    getLayerAtPoint(canvasX, canvasY) {
        // Check from top layer to bottom (reverse order)
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (!layer.visible || layer.locked) continue;

            if (canvasX >= layer.x && canvasX <= layer.x + layer.width &&
                canvasY >= layer.y && canvasY <= layer.y + layer.height) {
                return layer;
            }
        }
        return null;
    }

    startDrag(canvasX, canvasY) {
        const layer = this.getLayerAtPoint(canvasX, canvasY);
        if (!layer) {
            this.selectedLayerId = null;
            return false;
        }
        this.selectedLayerId = layer.id;
        this._isDragging = true;
        this._dragOffsetX = canvasX - layer.x;
        this._dragOffsetY = canvasY - layer.y;
        return true;
    }

    drag(canvasX, canvasY) {
        if (!this._isDragging || !this.selectedLayerId) return;
        const layer = this.getLayer(this.selectedLayerId);
        if (!layer || layer.locked) return;
        layer.x = canvasX - this._dragOffsetX;
        layer.y = canvasY - this._dragOffsetY;
    }

    endDrag() {
        this._isDragging = false;
    }

    scaleSelectedLayer(delta) {
        if (!this.selectedLayerId) return;
        const layer = this.getLayer(this.selectedLayerId);
        if (!layer) return;
        const factor = delta > 0 ? 1.05 : 0.95;
        layer.width *= factor;
        layer.height *= factor;
    }

    // ─────────────────────────────────────────────
    // SERIALIZATION (for presets — excludes runtime objects)
    // ─────────────────────────────────────────────

    serializeLayers() {
        return this.layers.map(l => {
            const base = {
                type: l.type,
                name: l.name,
                visible: l.visible,
                locked: l.locked,
                opacity: l.opacity,
                blendMode: l.blendMode,
                x: l.x, y: l.y,
                width: l.width, height: l.height,
                rotation: l.rotation,
                scaleX: l.scaleX, scaleY: l.scaleY,
                flipH: l.flipH, flipV: l.flipV,
            };

            if (l.type === 'image' && l.img) {
                base.imgSrc = l.img.src; // data URL
            } else if (l.type === 'text') {
                base.content = l.content;
                base.fontFamily = l.fontFamily;
                base.fontSize = l.fontSize;
                base.color = l.color;
                base.bold = l.bold;
                base.italic = l.italic;
                base.strokeColor = l.strokeColor;
                base.strokeWidth = l.strokeWidth;
            } else if (l.type === '3d') {
                base.rotX = l.rotX;
                base.rotY = l.rotY;
                base.rotZ = l.rotZ;
                base.wireframe = l.wireframe;
                base.meshColor = l.meshColor;
                base.animate = l.animate;
                // Note: STL binary is NOT serialized. 3D layers can't be restored from presets.
            }

            return base;
        });
    }
}
