/**
 * GenerativeEngine
 * Wraps a p5.js instance in instance mode, rendering a 1920x1080 WEBGL canvas.
 * This canvas is intended to be pipelined into canvasEngine as a base texture source.
 */
class GenerativeEngine {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.left = '-9999px';
        this.container.style.top = '0';
        document.body.appendChild(this.container);

        this.canvas = null; // Will point to the p5 HTMLCanvasElement
        this.p5 = null;
        
        // Settings mapped from UI
        this.params = {
            mode: 'GRID TUNNEL', // 'GRID TUNNEL', 'CUBE FIELD', 'RADIANT HORIZON'
            speed: 1.0,
            zoom: 1.0,
            audioWarp: 1.0
        };

        // Realtime audio inputs
        this.audio = {
            bass: 0,
            mid: 0,
            high: 0,
            transient: 0
        };

        this.initP5();
    }

    setParam(key, value) {
        if (this.params[key] !== undefined) {
            this.params[key] = value;
        }
    }

    updateAudio(bass, mid, high, transient) {
        this.audio.bass = bass;
        this.audio.mid = mid;
        this.audio.high = high;
        this.audio.transient = transient;
    }

    initP5() {
        const sketch = (p) => {
            
            // Local state for the sketch
            let time = 0;
            this.starfield = [];

            p.setup = () => {
                // Initialize canvas as WEBGL for 3D primitive support
                const p5canvas = p.createCanvas(1920, 1080, p.WEBGL);
                this.canvas = p5canvas.elt; // Expose the raw HTML element for WebGL binding
                
                p.noFill();
                p.strokeWeight(2);
                
                // Initialize starfield for cube field
                for(let i=0; i<150; i++){
                    this.starfield.push({
                        x: p.random(-2000, 2000),
                        y: p.random(-2000, 2000),
                        z: p.random(-4000, 0),
                        size: p.random(10, 50),
                        rotX: p.random(p.TWO_PI),
                        rotY: p.random(p.TWO_PI),
                        speed: p.random(5, 20)
                    });
                }
            };

            p.draw = () => {
                // Advance time based on basic speed + bass drive
                const speedMult = this.params.speed + (this.audio.bass * this.params.audioWarp * 0.5);
                time += 0.01 * speedMult;

                p.clear();
                p.background(0); // Black background
                p.stroke(255); // White wireframe

                // Apply global zoom
                p.scale(this.params.zoom);

                if (this.params.mode === 'GRID TUNNEL') {
                    this.drawGridTunnel(p, time);
                } else if (this.params.mode === 'CUBE FIELD') {
                    this.drawCubeField(p, time);
                } else if (this.params.mode === 'RADIANT HORIZON') {
                    this.drawRadiantHorizon(p, time);
                }
            };

        };

        this.p5 = new p5(sketch, this.container);
    }

    drawGridTunnel(p, time) {
        const tunnelDepth = 40;
        const spacing = 150;
        const warpInt = this.params.audioWarp;
        
        // Drive camera twist with mid-frequencies
        const camRot = p.sin(time) * 0.5 + (this.audio.mid * 0.5 * warpInt);
        p.rotateZ(camRot);
        
        // Animate forward movement
        const zOffset = (time * 1000 % spacing); 
        
        p.push();
        // Shift start point so we seamlessly loop
        p.translate(0, 0, zOffset);
        
        for (let i = 0; i < tunnelDepth; i++) {
            const z = -i * spacing;
            
            p.push();
            p.translate(0, 0, z);
            
            // Warp XY based on audio depth and position
            const warpX = p.sin(time * 2 + i * 0.1) * (50 + this.audio.bass * 200 * warpInt);
            const warpY = p.cos(time * 1.5 + i * 0.1) * (50 + this.audio.bass * 200 * warpInt);
            p.translate(warpX, warpY, 0);
            
            // Stroke reacts to transient/high
            const strokeVal = 100 + (this.audio.high * 155) + (this.audio.transient * 255);
            p.stroke(p.min(255, strokeVal));
            
            // Scale geometry slightly inversely to depth
            const s = 1.0 - (i * 0.015);
            p.scale(s);
            
            // Draw nested square
            p.rectMode(p.CENTER);
            p.rect(0, 0, 800, 800);
            
            // Connect to previous frame (simplified tunnel lines)
            if (i > 0) {
                p.line(-400, -400, 0, -400, -400, spacing);
                p.line(400, -400, 0, 400, -400, spacing);
                p.line(-400, 400, 0, -400, 400, spacing);
                p.line(400, 400, 0, 400, 400, spacing);
            }
            
            p.pop();
        }
        p.pop();
    }

    drawCubeField(p, time) {
        const warpInt = this.params.audioWarp;
        
        p.push();
        p.rotateX(time * 0.2);
        p.rotateY(time * 0.3);
        
        for (let star of this.starfield) {
            // Move forward
            star.z += star.speed * (1.0 + this.audio.bass * 2.0 * warpInt);
            
            // Respawn deeply
            if (star.z > 500) {
                star.z = -4000;
                star.x = p.random(-2000, 2000);
                star.y = p.random(-2000, 2000);
            }
            
            p.push();
            p.translate(star.x, star.y, star.z);
            
            // Audio reactive rotation and pulsing
            p.rotateX(star.rotX + time + this.audio.mid * warpInt);
            p.rotateY(star.rotY + time * 1.2);
            
            // Scale bursts on transient
            const scalePunch = 1.0 + (this.audio.transient * warpInt * 0.5);
            p.scale(scalePunch);
            
            p.stroke(255 - p.map(star.z, -4000, 500, 200, 0));
            p.box(star.size);
            p.pop();
        }
        p.pop();
    }

    drawRadiantHorizon(p, time) {
        const warpInt = this.params.audioWarp;
        const lines = 32;
        
        p.push();
        // Audio drives horizon tilt
        p.rotateX(p.PI / 3 + p.sin(time) * 0.1);
        p.rotateY(this.audio.mid * 0.2 * warpInt);
        
        // Moving grid floor
        const yOffset = (time * 300) % 200;
        p.translate(0, -yOffset, 0);
        
        for (let i = 0; i < lines; i++) {
            const angle = p.map(i, 0, lines, 0, p.TWO_PI);
            p.push();
            p.rotateZ(angle);
            
            // Lines radiating outward
            p.stroke(180 + this.audio.high * 75);
            p.line(100, 0, 0, 3000, 0, 0);
            
            // Audio reactive pulsing blobs along lines
            const blobD = 500 + p.sin(time * 5 + i) * 200 + (this.audio.bass * 400 * warpInt);
            p.translate(blobD, 0, 0);
            p.ellipse(0, 0, 20 + this.audio.transient * 50);
            p.pop();
        }
        
        // Concentric expanding rings
        for (let r = 1; r < 10; r++) {
            const radius = (r * 200 + time * 500) % 2000;
            p.strokeWeight(3 - r*0.2);
            p.stroke(200);
            p.ellipse(0, 0, radius, radius);
        }
        p.pop();
    }

    destroy() {
        if (this.p5) {
            this.p5.remove();
        }
        if (this.container) {
            this.container.remove();
        }
    }
}
