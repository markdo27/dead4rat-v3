class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        // FBOs handle the feedback persistence, but we still need preserveDrawingBuffer
        // enabled so that asynchronous calls like canvas.toDataURL() (for PNG exports
        // and Preset Thumbnails) can read the final rendered image.
        this.gl = this.canvas.getContext('webgl2', { 
            preserveDrawingBuffer: true,
            alpha: false,
            antialias: false,
            premultipliedAlpha: false
        }) || this.canvas.getContext('webgl', { 
            preserveDrawingBuffer: true,
            alpha: false,
            antialias: false,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            console.error("WebGL not supported");
            return;
        }

        // Setup float extensions explicitly for both WebGL1/2
        this.gl.getExtension('EXT_color_buffer_float'); 

        this.fboA = null;
        this.fboB = null;
        this.renderTarget = null; // These will hold { fbo, tex }
        this.feedbackSource = null;
        this.scaleMode = 'FIT'; // 'FIT' | 'FILL' | '1:1' | 'STRETCH'

        this.initShaders();
        this.initBuffers();
        this.initTextures();
        this.resizeCanvas(); // This will call initFBOs

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initFBOs(width, height) {
        const gl = this.gl;

        const createFBO = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

            return { fbo, tex };
        };
        
        this.particleFBOs = () => {
            const size = 512; // 262,144 particles
            const createFloatFBO = () => {
                const tex = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, tex);
                
                // Initialize default physics payload (center origin)
                const data = new Float32Array(size * size * 4);
                for(let i=0; i<data.length; i+=4){
                    data[i] = (Math.random() - 0.5) * 10.0;
                    data[i+1] = (Math.random() - 0.5) * 10.0;
                    data[i+2] = (Math.random() - 0.5) * 10.0;
                    data[i+3] = Math.random(); // Life
                }

                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.FLOAT, data);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                const fbo = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
                return { fbo, tex };
            }
            if (this.fboPartA) {
                gl.deleteFramebuffer(this.fboPartA.fbo);
                gl.deleteTexture(this.fboPartA.tex);
                gl.deleteFramebuffer(this.fboPartB.fbo);
                gl.deleteTexture(this.fboPartB.tex);
            }
            this.fboPartA = createFloatFBO();
            this.fboPartB = createFloatFBO();
            this.particleSource = this.fboPartA;
            this.particleTarget = this.fboPartB;
        };

        // Cleanup old if resize
        if (this.fboA) {
            gl.deleteFramebuffer(this.fboA.fbo);
            gl.deleteTexture(this.fboA.tex);
            gl.deleteFramebuffer(this.fboB.fbo);
            gl.deleteTexture(this.fboB.tex);
        }

        this.fboA = createFBO();
        this.fboB = createFBO();
        this.renderTarget = this.fboA;
        this.feedbackSource = this.fboB;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    initParticleFBOs() {
        const gl = this.gl;
        const size = 512;
        
        let floatType = gl.FLOAT;
        let internalFormat = gl.RGBA;
        
        // WebGL2 specific settings
        const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        if (isWebGL2) {
            internalFormat = gl.RGBA16F;
            floatType = gl.HALF_FLOAT;
        } else {
            const extHalf = gl.getExtension('OES_texture_half_float');
            if (extHalf) {
                floatType = extHalf.HALF_FLOAT_OES;
            }
        }
        
        const createParticleFBO = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            // Pass null to let WebGL allocate VRAM. Compute Shader handles initialization on first frame when life=0.
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, size, size, 0, gl.RGBA, floatType, null);

            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            
            return { fbo, tex, width: size, height: size };
        };

        this.particleSource = createParticleFBO();
        this.particleTarget = createParticleFBO();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    resizeCanvas() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (this.scaleMode === '1:1') {
            // Fixed 1920×1080 render resolution, CSS-letterboxed
            this.canvas.width  = 1920;
            this.canvas.height = 1080;
        } else if (this.scaleMode === 'FILL') {
            // Render at 16:9 — crop to fill viewport
            const aspect = 16 / 9;
            if (vw / vh > aspect) {
                this.canvas.width  = vw;
                this.canvas.height = Math.round(vw / aspect);
            } else {
                this.canvas.height = vh;
                this.canvas.width  = Math.round(vh * aspect);
            }
        } else {
            // FIT / STRETCH — render at exact viewport size
            this.canvas.width  = vw;
            this.canvas.height = vh;
        }

        this._applyCanvasStyle();
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.initFBOs(this.canvas.width, this.canvas.height);
    }

    _applyCanvasStyle() {
        const c  = this.canvas;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Reset any leftover inline styles cleanly
        c.style.position = 'fixed';
        c.style.margin   = '0';
        c.style.padding  = '0';

        if (this.scaleMode === 'STRETCH') {
            // Fill 100% of viewport, aspect ratio distorted
            c.style.width  = vw + 'px';
            c.style.height = vh + 'px';
            c.style.left   = '0';
            c.style.top    = '0';

        } else if (this.scaleMode === 'FILL') {
            // Cover — render canvas is already 16:9; scale up to cover viewport
            const scaleX = vw / cw;
            const scaleY = vh / ch;
            const scale  = Math.max(scaleX, scaleY);
            const dw = Math.round(cw * scale);
            const dh = Math.round(ch * scale);
            c.style.width  = dw + 'px';
            c.style.height = dh + 'px';
            c.style.left   = Math.round((vw - dw) / 2) + 'px';
            c.style.top    = Math.round((vh - dh) / 2) + 'px';

        } else if (this.scaleMode === '1:1') {
            // 1920×1080 canvas letterboxed inside viewport
            const scale = Math.min(vw / 1920, vh / 1080);
            const dw = Math.round(1920 * scale);
            const dh = Math.round(1080 * scale);
            c.style.width  = dw + 'px';
            c.style.height = dh + 'px';
            c.style.left   = Math.round((vw - dw) / 2) + 'px';
            c.style.top    = Math.round((vh - dh) / 2) + 'px';

        } else {
            // FIT (default) — canvas matches viewport; display 1:1
            c.style.width  = vw + 'px';
            c.style.height = vh + 'px';
            c.style.left   = '0';
            c.style.top    = '0';
        }
    }

    setScaleMode(mode) {
        this.scaleMode = mode;
        this.resizeCanvas();
    }

    initShaders() {
        const vsSource = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                v_uv.y = 1.0 - v_uv.y; 
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        const fsSource = `
            precision mediump float;
            varying vec2 v_uv;
            
            uniform sampler2D u_videoTex;
            uniform sampler2D u_feedbackTex;
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform float u_centroid;
            uniform float u_bass;
            uniform float u_mid;
            uniform float u_high;
            uniform float u_transient;

            // Masking
            uniform sampler2D u_maskTex;
            uniform float u_maskEnabled;

            // --- Effect Enable/Param Uniforms ---
            uniform float u_rgbShift; uniform float u_rgbShiftAmt; uniform float u_rgbAngle; uniform float u_rgbBlend;
            uniform float u_scanLines; uniform float u_scanDen; uniform float u_scanOpac; uniform float u_scanBlend;
            uniform float u_noise; uniform float u_noiseAmt; uniform float u_noiseChroma; uniform float u_noiseBlend;
            uniform float u_colDist; uniform float u_colHue; uniform float u_colSat; uniform float u_colDistBlend;
            uniform float u_block; uniform float u_blockSize; uniform float u_blockBlend;
            uniform float u_chroma; uniform float u_chromaShift; uniform float u_chromaBleed; uniform float u_chromaBlend;
            uniform float u_vhs; uniform float u_vhsVert; uniform float u_vhsHorz; uniform float u_vhsTear; uniform float u_vhsBlend;
            uniform float u_feedback; uniform float u_fbAmt; uniform float u_fbZoom; uniform float u_fbRot;
            uniform float u_fbMoveX; uniform float u_fbMoveY; uniform float u_fbHueShift; uniform float u_fbLumaThresh; uniform float u_fbMirror; uniform float u_fbBlend;
            uniform float u_melt; uniform float u_meltAmt; uniform float u_meltGravity; uniform float u_meltTurb; uniform float u_meltBlend;
            uniform float u_cdelay; uniform float u_cdelayAmt; uniform float u_cdelayScaleR; uniform float u_cdelayScaleG; uniform float u_cdelayScaleB; uniform float u_cdelayBlend;
            uniform float u_edge; uniform float u_edgeThresh; uniform float u_edgeInv; uniform float u_edgeColor; uniform float u_edgeGlow; uniform float u_edgeBlend;
            uniform float u_colorize; uniform float u_colzHue; uniform float u_colzStr; uniform float u_colzBlend;
            uniform float u_point; uniform float u_pointDen; uniform float u_pointSize; uniform float u_pointDepth; uniform float u_pointBlend;
            uniform float u_motion; uniform float u_moThresh; uniform float u_moDecay; uniform float u_moTint; uniform float u_moBlend;
            uniform float u_kaleido; uniform float u_kaleidoSeg; uniform float u_kaleidoRot; uniform float u_kaleidoZoom; uniform float u_kaleidoBlend;
            uniform float u_barrel; uniform float u_barrelAmt; uniform float u_barrelCX; uniform float u_barrelCY; uniform float u_barrelBlend;
            uniform float u_pixSort; uniform float u_pixSortThresh; uniform float u_pixSortDir; uniform float u_pixSortBlend;
            uniform float u_poster; uniform float u_posterLevels; uniform float u_posterBlend;

            // New Effects
            uniform float u_slicer; uniform float u_slicerSlices; uniform float u_slicerOffset; uniform float u_slicerSpeed; uniform float u_slicerBlend;
            uniform float u_vortex; uniform float u_vortexStr; uniform float u_vortexRad; uniform float u_vortexCX; uniform float u_vortexCY; uniform float u_vortexBlend;
            uniform float u_mirrorT; uniform float u_mirrorTX; uniform float u_mirrorTY; uniform float u_mirrorBlend;
            uniform float u_strobe; uniform float u_strobeRate; uniform float u_strobeHold; uniform float u_strobeBlend;
            uniform float u_dither; uniform float u_ditherScale; uniform float u_ditherContrast; uniform float u_ditherBlend;
            uniform float u_thermal; uniform float u_thermalInt; uniform float u_thermalBias; uniform float u_thermalBlend;

            // Particle Dispersion
            uniform float u_particleDisp; uniform float u_particleAmt; uniform float u_particleSpread; uniform float u_particleDir; uniform float u_particleBlend;
            // Split Scan
            uniform float u_splitScan; uniform float u_splitBands; uniform float u_splitShift; uniform float u_splitWarp; uniform float u_splitBlend;

            // Generative Art
            uniform float u_genMode; // 0=OFF, 1=Grid, 2=Cubes, 3=Radiant, 4=Fractal, 5=Caves
            uniform float u_genSpeed;
            uniform float u_genScale;
            uniform float u_genWarp;
            uniform float u_genRotX;
            uniform float u_genRotY;
            uniform float u_genRotZ;
            uniform float u_genAudioBand;
            uniform float u_genColor1;  // palette hue offset (0-1)
            uniform float u_genColor2;  // palette saturation / secondary offset
            uniform float u_genDensity; // tube/branch density multiplier
            uniform float u_genIter;    // iteration intensity (0-1)

            // --- Canvas Transform ---
            uniform float u_flipH;       // 0 or 1
            uniform float u_flipV;       // 0 or 1
            uniform float u_rotation;    // 0=0deg 1=90deg 2=180deg 3=270deg

            // --- Utility Functions ---
            float rand(vec2 co) {
                return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }

            // Smooth 2D noise based on sine interpolation
            float snoise(vec2 p) {
                vec2 ip = floor(p);
                vec2 fp = fract(p);
                fp = fp * fp * (3.0 - 2.0 * fp);
                float a = rand(ip);
                float b = rand(ip + vec2(1.0, 0.0));
                float c = rand(ip + vec2(0.0, 1.0));
                float d = rand(ip + vec2(1.0, 1.0));
                return mix(mix(a, b, fp.x), mix(c, d, fp.x), fp.y);
            }

            vec3 hue2rgb(float hue) {
                float R = abs(hue * 6.0 - 3.0) - 1.0;
                float G = 2.0 - abs(hue * 6.0 - 2.0);
                float B = 2.0 - abs(hue * 6.0 - 4.0);
                return clamp(vec3(R, G, B), 0.0, 1.0);
            }
            
            vec3 rgb2hsl(vec3 c) {
                float cMin = min(min(c.r, c.g), c.b);
                float cMax = max(max(c.r, c.g), c.b);
                float l = (cMax + cMin) / 2.0;
                if (cMax == cMin) { return vec3(0.0, 0.0, l); }
                float d = cMax - cMin;
                float s = l > 0.5 ? d / (2.0 - cMax - cMin) : d / (cMax + cMin);
                float h = 0.0;
                if (cMax == c.r) { h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0); }
                else if (cMax == c.g) { h = (c.b - c.r) / d + 2.0; }
                else if (cMax == c.b) { h = (c.r - c.g) / d + 4.0; }
                return vec3(h / 6.0, s, l);
            }

            vec3 hsl2rgb(vec3 c) {
                vec3 rgb = hue2rgb(c.x);
                float C = (1.0 - abs(2.0 * c.z - 1.0)) * c.y;
                return (rgb - 0.5) * C + c.z;
            }

            // --- Blend Engine ---
            vec3 applyBlend(vec3 base, vec3 blend, float mode) {
                vec3 result = blend;
                if (mode < 0.5) {
                    result = blend;
                } else if (mode < 1.5) {
                    result = base + blend;
                } else if (mode < 2.5) {
                    result = base * blend;
                } else if (mode < 3.5) {
                    result = 1.0 - (1.0 - base) * (1.0 - blend);
                } else if (mode < 4.5) {
                    result = abs(base - blend);
                } else {
                    vec3 lum = vec3(0.299, 0.587, 0.114);
                    float l = dot(base, lum);
                    if (l < 0.5) result = 2.0 * base * blend;
                    else result = 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
                }
                return clamp(result, 0.0, 1.0);
            }

            // ═══════════════════════════════════════════════════════════
            // GENERATIVE MATRIX — 8 Modes (Algorithmic Art Enhanced)
            // ═══════════════════════════════════════════════════════════
            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }

            float sdBox(vec3 p, vec3 b) {
                vec3 q = abs(p) - b;
                return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
            }
            float sdOctahedron(vec3 p, float s) {
                p = abs(p);
                return (p.x + p.y + p.z - s) * 0.57735027;
            }
            float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
                vec3 pa = p - a, ba = b - a;
                float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
                return length(pa - ba*h) - r;
            }
            float smin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
                return mix(b, a, h) - k*h*(1.0-h);
            }

            // 3D noise from 2D slices
            float snoise3(vec3 p) {
                return snoise(vec2(p.x + p.z*0.47, p.y))      * 0.55
                     + snoise(vec2(p.x, p.z + p.y*0.31))      * 0.30
                     + snoise(vec2(p.y + p.x*0.59, p.z))      * 0.15;
            }
            // 4-octave FBM
            float fbm3(vec3 p) {
                float v = 0.0; float amp = 0.5;
                vec3 s = vec3(1.7, 9.2, 5.4);
                for (int i = 0; i < 4; i++) { v += amp * snoise3(p); p = p*2.02+s; amp *= 0.5; }
                return v;
            }
            // Cosine palette (Inigo Quilez)
            vec3 cospal(float t, float off) {
                vec3 d = vec3(off, off+0.33, off+0.67);
                return vec3(0.5) + vec3(0.5)*cos(6.28318*(vec3(1.0,0.75,0.5)*t + d));
            }

            float getGenBand() {
                if (u_genAudioBand < 0.5) return u_bass;
                if (u_genAudioBand > 1.5) return u_high;
                return u_mid;
            }

            float mapGen(vec3 p) {
                float ABnd = getGenBand();
                float tmp;
                p.yz *= rot(u_genRotX);
                p.xz *= rot(u_genRotY);
                p.xy *= rot(u_genRotZ);

                if (u_genMode < 1.5) {
                    // ── MODE 1: PLASMA LATTICE ─────────────────────────
                    // FBM domain-warped wireframe grid, noise-breathing tube radii
                    p.z -= u_time * u_genSpeed * 5.0 + ABnd * 4.0 * u_genWarp;
                    vec3 warp = vec3(
                        snoise(vec2(p.y*0.4+u_time*0.11, p.z*0.4)),
                        snoise(vec2(p.z*0.4+u_time*0.09, p.x*0.4+5.3)),
                        snoise(vec2(p.x*0.4+u_time*0.13, p.y*0.4+11.7))
                    ) * u_genWarp * 0.65;
                    vec3 q = p + warp;
                    q.xy *= rot(q.z * 0.07 * u_genWarp + ABnd * 0.4);
                    q.x = mod(q.x + 2.0, 4.0) - 2.0;
                    q.y = mod(q.y + 2.0, 4.0) - 2.0;
                    q.z = mod(q.z + 2.0, 4.0) - 2.0;
                    float noiseR = snoise(vec2(p.x*0.7+u_time*0.2, p.y*0.7)) * 0.5 + 0.5;
                    float r = (0.022 + noiseR*0.03) * u_genDensity + ABnd * 0.18 * u_genWarp;
                    float bX = max(abs(q.y), abs(q.z)) - r;
                    float bY = max(abs(q.x), abs(q.z)) - r;
                    float bZ = max(abs(q.x), abs(q.y)) - r;
                    return min(bX, min(bY, bZ));
                }
                else if (u_genMode < 2.5) {
                    // ── MODE 2: CRYSTAL STORM ──────────────────────────
                    // Menger-fold IFS cubes — shatters on transients
                    p.z -= u_time * u_genSpeed * 8.0 + ABnd * 6.0 * u_genWarp;
                    p.x = mod(p.x + 3.0, 6.0) - 3.0;
                    p.y = mod(p.y + 3.0, 6.0) - 3.0;
                    p.z = mod(p.z + 3.0, 6.0) - 3.0;
                    p.xy *= rot(u_time * 0.6 + ABnd * u_genWarp * 1.2);
                    p.xz *= rot(u_time * 0.4 + u_transient * 0.8);
                    vec3 qm = p; float msc = 1.0;
                    for (int i = 0; i < 4; i++) {
                        qm = abs(qm);
                        tmp = qm.x; qm.x = max(qm.x, qm.y); qm.y = min(tmp, qm.y);
                        tmp = qm.x; qm.x = max(qm.x, qm.z); qm.z = min(tmp, qm.z);
                        tmp = qm.y; qm.y = max(qm.y, qm.z); qm.z = min(tmp, qm.y);
                        qm.z -= 0.5 * (1.2 + u_genIter * 0.6) / msc;
                        qm.xy *= rot(0.35 + u_time*0.04 + u_transient*0.3);
                        qm *= 1.6 + u_transient * u_genWarp * 0.4;
                        msc *= 1.6;
                    }
                    float dOuter = sdBox(qm / msc, vec3(1.0));
                    float dInner = -sdBox(qm / msc, vec3(0.82 + u_transient * 0.12));
                    return max(dOuter, dInner);
                }
                else if (u_genMode < 3.5) {
                    // ── MODE 3: SOLAR CORONA ───────────────────────────
                    // Magnetic dipole field lines + audio eruption plumes
                    p.z -= u_time * u_genSpeed * 6.0;
                    p.xy *= rot(u_time * 0.12 + ABnd * u_genWarp * 0.25);
                    float numLines = 10.0 + u_genDensity * 8.0;
                    float ang = atan(p.y, p.x);
                    float seg = 6.28318 / numLines;
                    float fAng = mod(ang + seg*0.5, seg) - seg*0.5;
                    float r = length(p.xy);
                    // Field line shape: dipole potential surface
                    float potential = r - (1.5 + sin(fAng * 3.0 + u_time*0.5)*0.4*u_genWarp
                                        + fbm3(p*0.3+u_time*0.06)*0.5*u_genWarp);
                    float fieldLine = abs(potential) - (0.035 + ABnd * 0.13 * u_genWarp);
                    // Eruption plumes along z
                    float eruptR = r - (1.65 + cos(p.z*1.1 + u_time*0.9) * ABnd * 0.7 * u_genWarp);
                    float plume = abs(eruptR) - (0.05 + ABnd * 0.22);
                    return min(fieldLine, plume);
                }
                else if (u_genMode < 4.5) {
                    // ── MODE 4: MANDELBULB DRIFT ───────────────────────
                    // 3D Mandelbulb viewed from orbiting camera (no z-drift)
                    // Slow rotation so the object stays visible
                    p.xz *= rot(u_time * u_genSpeed * 0.25);
                    p.yz *= rot(u_time * u_genSpeed * 0.15 + ABnd * u_genWarp * 0.4);
                    // Scale so bulb fills view (radius ~1.2 world units)
                    p *= 0.8;
                    float power = 3.0 + u_genIter * 5.0 + ABnd * 2.0 * u_genWarp;
                    vec3 mz = p; float dr = 1.0; float rr = 1.0;
                    for (int i = 0; i < 7; i++) {
                        rr = length(mz);
                        if (rr > 2.0) break;
                        float theta = acos(clamp(mz.z / max(rr, 0.0001), -1.0, 1.0));
                        float phi = atan(mz.y, mz.x);
                        dr = pow(max(rr, 0.0001), power - 1.0) * power * dr + 1.0;
                        float zr = pow(max(rr, 0.0001), power);
                        theta *= power; phi *= power;
                        mz = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta)) + p;
                    }
                    // DE: log(max(rr,1)) guarantees >= 0 so ray never steps backward
                    return max(0.5 * log(max(rr, 1.0)) * rr / max(dr, 0.001), 0.001);
                }
                else if (u_genMode < 5.5) {
                    // ── MODE 5: BIOLUMINESCENT ABYSS ──────────────────
                    // FBM-displaced organic cave with bioluminescent pockets
                    p.z -= u_time * u_genSpeed * 4.5;
                    float fbmD = fbm3(p*0.45 + u_time*0.07) * u_genWarp * 1.5;
                    float detail = snoise(vec2(p.x*2.0+u_time*0.2, p.y*2.0)) * 0.28 * u_genWarp;
                    float tunnelR = 2.1 + fbmD + ABnd * 0.9 * u_genWarp;
                    float d = tunnelR - length(p.xy + vec2(detail));
                    float bump = sin(p.x*3.0+u_time*0.3)*sin(p.y*2.7)*sin(p.z*1.5+u_time*0.2);
                    d -= bump * (0.35 + ABnd * u_genWarp * 0.55);
                    // Glowing nodule clusters on walls
                    vec3 qp = vec3(mod(p.x+1.0,2.0)-1.0, mod(p.y+1.0,2.0)-1.0, mod(p.z+1.5,3.0)-1.5);
                    float pockets = length(qp) - (0.14 + ABnd * 0.07) * u_genDensity;
                    return smin(d, pockets, 0.25);
                }
                else if (u_genMode < 6.5) {
                    // ── MODE 6: FLOW FIELD ─────────────────────────────
                    // Curl-noise streamlines as luminous tubes
                    p.z -= u_time * u_genSpeed * 6.0;
                    float eps = 0.05;
                    float nx = snoise3(p + vec3(eps, 0.0, 0.0)) - snoise3(p - vec3(eps, 0.0, 0.0));
                    float ny = snoise3(p + vec3(0.0, eps, 0.0)) - snoise3(p - vec3(0.0, eps, 0.0));
                    float nz = snoise3(p + vec3(0.0, 0.0, eps)) - snoise3(p - vec3(0.0, 0.0, eps));
                    vec3 curl = vec3(nz - ny, nx - nz, ny - nx) * u_genWarp;
                    vec3 qf = p + curl * sin(p.z*0.5 + u_time) * 0.3;
                    qf.x = mod(qf.x + 1.5, 3.0) - 1.5;
                    qf.y = mod(qf.y + 1.5, 3.0) - 1.5;
                    float flowR = (0.038 + ABnd * 0.09 * u_genWarp) * u_genDensity;
                    float tube1 = length(qf.xy) - flowR;
                    vec3 qf2 = p * 1.618 + curl*cos(p.z*0.7+u_time*1.3)*0.2;
                    qf2.x = mod(qf2.x + 1.0, 2.0) - 1.0;
                    qf2.y = mod(qf2.y + 1.0, 2.0) - 1.0;
                    float tube2 = length(qf2.xy) - flowR * 0.65;
                    return min(tube1, tube2);
                }
                else if (u_genMode < 7.5) {
                    // ── MODE 7: WAVE COLLAPSE ──────────────────────────
                    // Multi-frequency standing wave interference patterns
                    p.z -= u_time * u_genSpeed * 3.0;
                    float f1 = 1.8 * u_genDensity;
                    float f2 = f1 * 1.618;
                    float f3 = f1 * 2.618;
                    float w1 = sin(p.x*f1 + u_time*1.2) * sin(p.y*f1 + u_time*0.8);
                    float w2 = sin((p.x*0.866+p.y*0.5)*f2 + u_time*0.95) * sin(p.z*f2*0.4);
                    float w3 = sin((p.x*0.5-p.y*0.866)*f3 + u_time*1.1 + ABnd*u_genWarp*2.0);
                    float interference = (w1 + w2 + w3) / 3.0;
                    float surface = abs(interference) - (0.09 + ABnd * 0.18 * u_genWarp);
                    float nodal = abs(sin(length(p.xy)*f1*0.8 - u_time*u_genSpeed)) - 0.045;
                    return min(surface, nodal);
                }
                else {
                    // ── MODE 8: MYCELIUM ───────────────────────────────
                    // Organic branching network — z-repeated for infinite tunnel
                    p.z -= u_time * u_genSpeed * 2.5;
                    // Tile branches every 6 units along z
                    float period = 6.0;
                    p.z = mod(p.z + period * 0.5, period) - period * 0.5;
                    p.xy *= rot(u_time * 0.06);
                    float myc = 20.0;
                    float branchR = (0.06 + ABnd * 0.06) * u_genDensity;
                    for (int b = 0; b < 6; b++) {
                        float bf = float(b);
                        float angle = bf * 1.0472 + u_time * 0.08;
                        vec3 warpB = vec3(
                            snoise(vec2(bf*17.3, p.z*0.3)) * 0.6,
                            snoise(vec2(bf*41.7, p.z*0.25)) * 0.6,
                            snoise(vec2(bf*23.1, u_time*0.04)) * 0.4
                        ) * u_genWarp * 0.5;
                        vec3 pa = warpB;
                        vec3 pb = vec3(cos(angle), sin(angle)*0.8, snoise(vec2(bf, u_time*0.05))*0.4)
                                  * (0.9 + ABnd * 0.4 * u_genWarp) + warpB;
                        myc = smin(myc, sdCapsule(p, pa, pb, branchR), 0.15);
                        // Sub-branch at midpoint
                        vec3 mid = (pa + pb) * 0.5;
                        float subAng = angle + 1.5707 + snoise(vec2(bf*5.1, u_time*0.07)) * 0.9;
                        vec3 subEnd = mid + vec3(cos(subAng), sin(subAng)*0.55, sin(subAng)*0.35)
                                      * (0.5 + ABnd * 0.2);
                        myc = smin(myc, sdCapsule(p, mid, subEnd, branchR * 0.6), 0.08);
                    }
                    return myc;
                }
            }

            vec3 renderGenerativeArt(vec2 uv) {
                vec2 p = uv * 2.0 - 1.0;
                p.x *= u_resolution.x / max(1.0, u_resolution.y); // aspect correct
                vec3 ro = vec3(0.0, 0.0, -3.0);
                vec3 rd = normalize(vec3(p, 1.0 / max(0.1, u_genScale)));
                float rJitter = rand(uv + u_time) * 0.012;
                float t = 0.01; float maxD = 30.0;
                float colAccum = 0.0;
                vec3 colorAccum = vec3(0.0);
                for (int i = 0; i < 80; i++) {
                    vec3 pos = ro + rd * t;
                    float d = mapGen(pos) + rJitter;
                    if (d < 0.018) {
                        float contrib = 0.065 * (1.0 - t / maxD);
                        colAccum += contrib;
                        float tVal = fract(t*0.18 + length(pos.xy)*0.14 + u_time*0.04 + u_genColor1);
                        colorAccum += contrib * cospal(tVal, u_genColor1);
                        d = 0.018;
                    } else {
                        d = max(d, 0.005);
                    }
                    t += d;
                    if (t > maxD || colAccum > 1.8) break;
                }
                colAccum = clamp(colAccum, 0.0, 1.0);
                if (colAccum < 0.001) return vec3(0.0);
                vec3 baseCol = colorAccum / max(0.001, colAccum);
                vec3 col = baseCol * colAccum;
                // Chromatic fringe on bright hits
                col.r *= 1.0 + u_genColor2 * 0.3;
                col.b *= 1.0 + (1.0 - u_genColor2) * 0.3;
                if (u_transient > 0.5) col += 0.12 * u_genWarp * vec3(1.0, 0.45, 0.1);
                return clamp(col, 0.0, 1.0);
            }

            void main() {
                vec2 uv = v_uv;

                // =============================================================
                // CANVAS TRANSFORM — runs FIRST, before every effect
                // =============================================================
                if (u_flipH > 0.5) uv.x = 1.0 - uv.x;
                if (u_flipV > 0.5) uv.y = 1.0 - uv.y;
                if (u_rotation > 0.5 && u_rotation < 1.5) {
                    // 90 degrees CW
                    vec2 c = uv - 0.5;
                    uv = vec2(c.y, -c.x) + 0.5;
                } else if (u_rotation > 1.5 && u_rotation < 2.5) {
                    // 180 degrees
                    uv = 1.0 - uv;
                } else if (u_rotation > 2.5) {
                    // 270 degrees CW
                    vec2 c = uv - 0.5;
                    uv = vec2(-c.y, c.x) + 0.5;
                }

                // =============================================================
                // STAGE 0: UV-SPACE DISTORTIONS (modify coordinates before sampling)
                // =============================================================

                // Kaleidoscope
                if (u_kaleido > 0.5) {
                    vec2 centered = uv - vec2(0.5);
                    centered /= max(0.01, u_kaleidoZoom);
                    float angle = atan(centered.y, centered.x) + u_kaleidoRot * 0.0174533;
                    float r = length(centered);
                    float seg = 3.14159265 * 2.0 / max(2.0, u_kaleidoSeg);
                    angle = mod(angle, seg);
                    // Mirror fold
                    if (angle > seg * 0.5) angle = seg - angle;
                    uv = vec2(cos(angle), sin(angle)) * r + vec2(0.5);
                }

                // Barrel Distortion / Fisheye
                if (u_barrel > 0.5) {
                    vec2 center = vec2(u_barrelCX, u_barrelCY);
                    vec2 diff = uv - center;
                    float r2 = dot(diff, diff);
                    float distort = 1.0 + u_barrelAmt * r2;
                    uv = center + diff * distort;
                }

                // Glitch Slicer (horizontal strip displacement)
                if (u_slicer > 0.5) {
                    float sliceCount = max(2.0, floor(u_slicerSlices));
                    float sliceIndex = floor(uv.y * sliceCount);
                    float sliceRand = rand(vec2(sliceIndex, floor(u_time * u_slicerSpeed)));
                    float shouldOffset = step(0.4, sliceRand);
                    float offsetAmt = (sliceRand - 0.5) * 2.0 * u_slicerOffset / u_resolution.x;
                    uv.x += offsetAmt * shouldOffset;
                }

                // Vortex Warp (spiral/twirl distortion)
                if (u_vortex > 0.5) {
                    vec2 center = vec2(u_vortexCX, u_vortexCY);
                    vec2 d = uv - center;
                    float r = length(d);
                    float maxR = max(0.01, u_vortexRad);
                    float falloff = 1.0 - smoothstep(0.0, maxR, r);
                    float angle = u_vortexStr * falloff * falloff;
                    float sa = sin(angle); float ca = cos(angle);
                    uv = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca) + center;
                }

                // Mirror Tile (grid-based mirror repetition)
                if (u_mirrorT > 0.5) {
                    float tx = max(1.0, floor(u_mirrorTX));
                    float ty = max(1.0, floor(u_mirrorTY));
                    vec2 cell = vec2(uv.x * tx, uv.y * ty);
                    vec2 cellIndex = floor(cell);
                    vec2 cellFrac = fract(cell);
                    // Mirror on odd cells
                    if (mod(cellIndex.x, 2.0) > 0.5) cellFrac.x = 1.0 - cellFrac.x;
                    if (mod(cellIndex.y, 2.0) > 0.5) cellFrac.y = 1.0 - cellFrac.y;
                    uv = cellFrac;
                }

                // Split Scan (horizontal band offset distortion)
                if (u_splitScan > 0.5) {
                    float bands = max(2.0, floor(u_splitBands));
                    float bandIdx = floor(uv.y * bands);
                    float bandFrac = fract(uv.y * bands);
                    // Alternating direction: odd bands go right, even go left
                    float dir = mod(bandIdx, 2.0) > 0.5 ? 1.0 : -1.0;
                    // Use noise for organic variation per band
                    float noiseFactor = rand(vec2(bandIdx * 0.37, floor(u_time * 2.0))) * 2.0 - 1.0;
                    float shiftPx = u_splitShift * (dir * 0.5 + noiseFactor * 0.5) / u_resolution.x;
                    // Warp: non-linear distortion within each band
                    float warpedFrac = bandFrac;
                    if (u_splitWarp > 0.01) {
                        warpedFrac = bandFrac + sin(bandFrac * 3.14159) * u_splitWarp * 0.3;
                    }
                    uv.x += shiftPx * smoothstep(0.0, 0.15, bandFrac) * smoothstep(1.0, 0.85, bandFrac);
                    // Slight Y offset for warp
                    uv.y = (bandIdx + warpedFrac) / bands;
                }

                // Data Moshing (pixelation + temporal I-frame ghost)
                if (u_block > 0.5) {
                    float pixelsX = u_resolution.x / max(1.0, u_blockSize);
                    float pixelsY = u_resolution.y / max(1.0, u_blockSize);
                    uv = vec2(floor(uv.x * pixelsX) / pixelsX, floor(uv.y * pixelsY) / pixelsY);
                }

                // VHS Jitter (scanline-coherent tearing + vertical drift)
                if (u_vhs > 0.5) {
                    // Per-scanline horizontal tear
                    float lineY = floor(uv.y * u_resolution.y);
                    float tearNoise = rand(vec2(lineY, floor(u_time * 15.0)));
                    float tearMask = step(1.0 - u_vhsTear * 0.1, tearNoise);
                    uv.x += tearMask * (rand(vec2(u_time, lineY)) - 0.5) * u_vhsHorz * 0.02;
                    // Smooth vertical roll
                    uv.y += sin(u_time * 0.7) * u_vhsVert * 0.003;
                    // Fine jitter
                    uv.x += (rand(vec2(u_time * 7.0, uv.y)) - 0.5) * u_vhsHorz * 0.003;
                }

                // =============================================================
                // STAGE 1: BASE COLOR SAMPLING
                // =============================================================
                vec4 baseColor = texture2D(u_videoTex, clamp(uv, 0.0, 1.0));
                
                if (u_genMode > 0.5) {
                    baseColor.rgb = renderGenerativeArt(uv);
                }

                // Block blend after UV warp
                if (u_block > 0.5) {
                    vec3 bCol = texture2D(u_videoTex, clamp(uv, 0.0, 1.0)).rgb;
                    baseColor.rgb = applyBlend(baseColor.rgb, bCol, u_blockBlend);
                }
                if (u_vhs > 0.5) {
                    vec3 vCol = texture2D(u_videoTex, clamp(uv, 0.0, 1.0)).rgb;
                    baseColor.rgb = applyBlend(baseColor.rgb, vCol, u_vhsBlend);
                }

                // =============================================================
                // STAGE 2: TEMPORAL / FEEDBACK EFFECTS
                // =============================================================

                // Motion Slit (shows actual difference pixels, not flat red)
                if (u_motion > 0.5) {
                    vec4 oldTex = texture2D(u_feedbackTex, uv);
                    vec3 diff = abs(baseColor.rgb - oldTex.rgb);
                    float mag = dot(diff, vec3(0.333));
                    if (mag > (u_moThresh / 255.0)) {
                        // Tint: 0 = raw diff, 0.5 = warm amber, 1.0 = hot red
                        vec3 tintColor = mix(diff, diff * vec3(1.0, 0.3, 0.1), u_moTint);
                        baseColor.rgb = applyBlend(baseColor.rgb, tintColor, u_moBlend);
                    }
                }

                // FeedbackPro Loop (zoom/rotate/pan tunnel)
                if (u_feedback > 0.5) {
                    // DEBUG: Simple feedback — just mix previous frame at amount
                    vec2 fbUv = uv;
                    
                    // Apply zoom transform
                    fbUv = (fbUv - vec2(0.5)) / u_fbZoom + vec2(0.5);
                    
                    // Apply rotation
                    float s = sin(u_fbRot * 0.0174533);
                    float c = cos(u_fbRot * 0.0174533);
                    vec2 centered = fbUv - vec2(0.5);
                    fbUv = vec2(centered.x * c - centered.y * s, centered.x * s + centered.y * c) + vec2(0.5);
                    
                    // Pan offset
                    fbUv += vec2(u_fbMoveX, u_fbMoveY);
                    
                    // Mirror
                    if (u_fbMirror > 0.5) {
                        fbUv.y = 1.0 - fbUv.y;
                    }
                    
                    vec4 fbSample = texture2D(u_feedbackTex, clamp(fbUv, 0.0, 1.0));
                    
                    // Hue shift
                    if (u_fbHueShift > 0.1) {
                        vec3 hsl = rgb2hsl(fbSample.rgb);
                        hsl.x = fract(hsl.x + (u_fbHueShift / 360.0));
                        fbSample.rgb = hsl2rgb(hsl);
                    }
                    
                    // Luma key
                    float luma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
                    if (luma < u_fbLumaThresh) {
                        baseColor.rgb = mix(baseColor.rgb, fbSample.rgb, u_fbAmt);
                    }
                }

                // Stroboscope (temporal flash/freeze)
                if (u_strobe > 0.5) {
                    float phase = fract(u_time * u_strobeRate);
                    if (phase > u_strobeHold) {
                        // Show frozen feedback frame
                        vec3 frozenCol = texture2D(u_feedbackTex, uv).rgb;
                        baseColor.rgb = applyBlend(baseColor.rgb, frozenCol, u_strobeBlend);
                    }
                }

                // Substrate Melt (gravity drip feedback)
                if (u_melt > 0.5) {
                    float luma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
                    vec2 meltUv = uv;
                    meltUv.y += u_meltGravity * luma;
                    meltUv.x += sin(uv.y * 10.0 + u_time * 2.0) * u_meltTurb;
                    meltUv.x += snoise(uv * 8.0 + u_time) * u_meltTurb * 0.5;
                    vec4 oldCol = texture2D(u_feedbackTex, clamp(meltUv, 0.0, 1.0));
                    vec3 effectLayer = mix(baseColor.rgb, oldCol.rgb, u_meltAmt);
                    baseColor.rgb = applyBlend(baseColor.rgb, effectLayer, u_meltBlend);
                }

                // Chroma Ghost (RGB channel-separated feedback)
                if (u_cdelay > 0.5) {
                    vec2 center = vec2(0.5);
                    vec2 cdUvR = (uv - center) / u_cdelayScaleR + center;
                    vec2 cdUvG = (uv - center) / u_cdelayScaleG + center;
                    vec2 cdUvB = (uv - center) / u_cdelayScaleB + center;
                    float ghostR = texture2D(u_feedbackTex, cdUvR).r;
                    float ghostG = texture2D(u_feedbackTex, cdUvG).g;
                    float ghostB = texture2D(u_feedbackTex, cdUvB).b;
                    vec3 cdCol = vec3(ghostR, ghostG, ghostB);
                    vec3 effectLayer = mix(baseColor.rgb, cdCol, u_cdelayAmt);
                    baseColor.rgb = applyBlend(baseColor.rgb, effectLayer, u_cdelayBlend);
                }

                // =============================================================
                // STAGE 3: PIXEL COLOR OPERATIONS
                // =============================================================

                // RGB Shift (diagonal angle support, reads accumulated buffer)
                if (u_rgbShift > 0.5) {
                    float shift = u_rgbShiftAmt * 0.01;
                    float a = u_rgbAngle * 0.0174533;
                    vec2 dir = vec2(cos(a), sin(a)) * shift;
                    vec3 eCol = baseColor.rgb;
                    eCol.r = texture2D(u_videoTex, clamp(uv + dir, 0.0, 1.0)).r;
                    eCol.b = texture2D(u_videoTex, clamp(uv - dir, 0.0, 1.0)).b;
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_rgbBlend);
                }

                // Chroma Shift (smooth spatial displacement, all 3 channels)
                if (u_chroma > 0.5) {
                    float n1 = snoise(uv * 5.0 + u_time * 0.5);
                    float n2 = snoise(uv * 5.0 + u_time * 0.5 + 100.0);
                    float mask = step(1.0 - u_chromaBleed, snoise(uv * 3.0 + u_time * 0.3));
                    if (mask > 0.0) {
                        vec2 offset = vec2(n1, n2) * u_chromaShift * 0.005;
                        vec3 eCol;
                        eCol.r = texture2D(u_videoTex, clamp(uv + offset, 0.0, 1.0)).r;
                        eCol.g = texture2D(u_videoTex, clamp(uv - offset * 0.5, 0.0, 1.0)).g;
                        eCol.b = texture2D(u_videoTex, clamp(uv - offset, 0.0, 1.0)).b;
                        baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_chromaBlend);
                    }
                }

                // LUT Corrupt (Hue Rotate + Saturation)
                if (u_colDist > 0.5) {
                    vec3 hsl = rgb2hsl(baseColor.rgb);
                    hsl.x = fract(hsl.x + (u_colHue / 360.0));
                    hsl.y *= u_colSat;
                    vec3 eCol = hsl2rgb(hsl);
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_colDistBlend);
                }

                // Screen Colorize (monochrome tint)
                if (u_colorize > 0.5) {
                    float luma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
                    vec3 targetCol = hsl2rgb(vec3(u_colzHue / 360.0, 1.0, luma));
                    vec3 eCol = mix(baseColor.rgb, targetCol, u_colzStr);
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_colzBlend);
                }

                // Posterize / Bit Crush
                if (u_poster > 0.5) {
                    float levels = max(2.0, floor(u_posterLevels));
                    vec3 eCol = floor(baseColor.rgb * levels) / (levels - 1.0);
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_posterBlend);
                }

                // Dither Matrix (ordered dithering / halftone)
                if (u_dither > 0.5) {
                    float gridSize = max(2.0, floor(u_ditherScale));
                    vec2 pixelPos = floor(uv * u_resolution / gridSize);
                    float ditherVal = rand(mod(pixelPos, vec2(8.0))) * u_ditherContrast;
                    float luma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
                    float threshold = step(ditherVal, luma);
                    vec3 eCol = baseColor.rgb * threshold;
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_ditherBlend);
                }

                // Thermal Vision (false-color thermal mapping)
                if (u_thermal > 0.5) {
                    float luma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
                    luma = clamp(luma + u_thermalBias, 0.0, 1.0);
                    // Thermal gradient: black -> blue -> magenta -> red -> yellow -> white
                    vec3 thermalCol;
                    if (luma < 0.2) {
                        thermalCol = mix(vec3(0.0), vec3(0.0, 0.0, 0.8), luma * 5.0);
                    } else if (luma < 0.4) {
                        thermalCol = mix(vec3(0.0, 0.0, 0.8), vec3(0.8, 0.0, 0.6), (luma - 0.2) * 5.0);
                    } else if (luma < 0.6) {
                        thermalCol = mix(vec3(0.8, 0.0, 0.6), vec3(1.0, 0.2, 0.0), (luma - 0.4) * 5.0);
                    } else if (luma < 0.8) {
                        thermalCol = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 1.0, 0.0), (luma - 0.6) * 5.0);
                    } else {
                        thermalCol = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (luma - 0.8) * 5.0);
                    }
                    vec3 eCol = mix(baseColor.rgb, thermalCol, u_thermalInt);
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_thermalBlend);
                }

                // Particle Dispersion (luminance-driven pixel scatter)
                if (u_particleDisp > 0.5) {
                    float luma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
                    // Hash per pixel for scatter direction
                    float h1 = rand(floor(uv * u_resolution / 2.0) * 2.0 / u_resolution);
                    float h2 = rand(floor(uv * u_resolution / 2.0) * 2.0 / u_resolution + vec2(7.31, 3.17));
                    // Threshold: only scatter pixels above luminance threshold
                    float thresh = 1.0 - u_particleAmt;
                    float scatter = smoothstep(thresh - 0.1, thresh + 0.1, luma);
                    // Direction from control + per-pixel randomness
                    float dirRad = u_particleDir * 0.0174533; // degrees to rad
                    float angle = dirRad + (h1 - 0.5) * 3.14159;
                    float dist = h2 * u_particleSpread * scatter / u_resolution.x;
                    // Time-based animation
                    float timeAnim = fract(u_time * 0.3 + h1);
                    dist *= timeAnim;
                    vec2 offset = vec2(cos(angle), sin(angle)) * dist;
                    vec2 srcUv = uv - offset;
                    vec3 srcCol = texture2D(u_videoTex, clamp(srcUv, 0.0, 1.0)).rgb;
                    // Fade particles based on distance
                    float fade = 1.0 - smoothstep(0.0, u_particleSpread * 0.8 / u_resolution.x, length(offset));
                    vec3 eCol = mix(baseColor.rgb * (1.0 - scatter * 0.5), srcCol, scatter * fade);
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_particleBlend);
                }

                // =============================================================
                // STAGE 4: STRUCTURAL / GENERATIVE EFFECTS
                // =============================================================

                // Edge Detection (Sobel + glow)
                if (u_edge > 0.5) {
                    float dx = 1.0 / u_resolution.x;
                    float dy = 1.0 / u_resolution.y;
                    // Sobel kernel
                    float tl = dot(texture2D(u_videoTex, uv + vec2(-dx, -dy)).rgb, vec3(0.333));
                    float tc = dot(texture2D(u_videoTex, uv + vec2(0.0, -dy)).rgb, vec3(0.333));
                    float tr = dot(texture2D(u_videoTex, uv + vec2( dx, -dy)).rgb, vec3(0.333));
                    float ml = dot(texture2D(u_videoTex, uv + vec2(-dx, 0.0)).rgb, vec3(0.333));
                    float mr = dot(texture2D(u_videoTex, uv + vec2( dx, 0.0)).rgb, vec3(0.333));
                    float bl = dot(texture2D(u_videoTex, uv + vec2(-dx,  dy)).rgb, vec3(0.333));
                    float bc = dot(texture2D(u_videoTex, uv + vec2(0.0,  dy)).rgb, vec3(0.333));
                    float br = dot(texture2D(u_videoTex, uv + vec2( dx,  dy)).rgb, vec3(0.333));
                    float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
                    float gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;
                    float mag = length(vec2(gx, gy));
                    float thresh = u_edgeThresh / 255.0;
                    // Soft glow instead of hard binary
                    float edgeAmt = smoothstep(thresh * 0.5, thresh * (1.0 + u_edgeGlow * 2.0), mag);
                    vec3 eCol;
                    if (u_edgeColor > 0.5) {
                        eCol = mix(vec3(0.0), baseColor.rgb, edgeAmt);
                    } else {
                        float ev = (u_edgeInv > 0.5) ? 1.0 - edgeAmt : edgeAmt;
                        eCol = vec3(ev);
                    }
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_edgeBlend);
                }

                // Bag of Grains (point cloud with proper background)
                if (u_point > 0.5) {
                    float gridSize = max(1.0, u_pointDen * 50.0);
                    vec2 pUv = floor(uv * u_resolution / gridSize) * gridSize / u_resolution;
                    vec4 sampleTex = texture2D(u_videoTex, pUv);
                    float luma = dot(sampleTex.rgb, vec3(0.299, 0.587, 0.114));
                    float ps = u_pointSize + luma * u_pointDepth * 10.0;
                    float dPoint = length((uv - pUv) * u_resolution);
                    // Smooth edge instead of hard cutoff
                    float pointMask = 1.0 - smoothstep(ps * 0.8, ps, dPoint);
                    vec3 eCol = mix(baseColor.rgb * 0.15, sampleTex.rgb, pointMask);
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_pointBlend);
                }

                // Pixel Sort (simulated luminance sorting streaks)
                if (u_pixSort > 0.5) {
                    float luma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
                    float sortThresh = u_pixSortThresh;
                    if (luma > sortThresh) {
                        // Streak in sort direction
                        float streakLen = (luma - sortThresh) * 0.1;
                        vec2 sortDir = (u_pixSortDir < 0.5) ? vec2(streakLen, 0.0) : vec2(0.0, streakLen);
                        vec3 streakCol = texture2D(u_videoTex, clamp(uv + sortDir, 0.0, 1.0)).rgb;
                        // Blend streak based on luminance intensity
                        float streakBlend = smoothstep(sortThresh, 1.0, luma);
                        vec3 eCol = mix(baseColor.rgb, streakCol, streakBlend * 0.7);
                        baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_pixSortBlend);
                    }
                }

                // =============================================================
                // STAGE 5: TOP-LAYER EFFECTS (applied last)
                // =============================================================

                // Scan Lines (CRT emulation)
                if (u_scanLines > 0.5) {
                    float line = sin(uv.y * u_scanDen * u_resolution.y * 0.5) * 0.5 + 0.5;
                    vec3 eCol = baseColor.rgb * mix(1.0, line, u_scanOpac);
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_scanBlend);
                }

                // Signal Noise (mono or chromatic)
                if (u_noise > 0.5) {
                    vec3 n;
                    if (u_noiseChroma > 0.5) {
                        // Chromatic noise — each channel gets different random
                        n = vec3(
                            rand(uv * u_time) - 0.5,
                            rand(uv * u_time * 1.1 + 7.0) - 0.5,
                            rand(uv * u_time * 1.2 + 13.0) - 0.5
                        );
                    } else {
                        // Mono grain
                        float g = rand(uv * u_time) - 0.5;
                        n = vec3(g);
                    }
                    vec3 eCol = baseColor.rgb + n * u_noiseAmt;
                    baseColor.rgb = applyBlend(baseColor.rgb, eCol, u_noiseBlend);
                }

                // =============================================================
                // STAGE 6: ML PERSON MASK (Background Removal)
                // =============================================================
                if (u_maskEnabled > 0.5) {
                    // Sample the BW mask canvas. Using original v_uv maps correctly to screen space.
                    vec4 maskColor = texture2D(u_maskTex, v_uv);
                    // Multiply base color by mask r channel (white=person, black=bg)
                    baseColor.rgb = baseColor.rgb * maskColor.r;
                }

                gl_FragColor = vec4(clamp(baseColor.rgb, 0.0, 1.0), 1.0);
            }
        `;

        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error("Program failed to link: " + this.gl.getProgramInfoLog(this.program));
        }

        // --- Blit Program (Draws FBO texture to screen) ---
        const blitVs = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        const blitFs = `
            precision mediump float;
            varying vec2 v_uv;
            uniform sampler2D u_tex;
            void main() {
                gl_FragColor = texture2D(u_tex, v_uv);
            }
        `;
        
        const bvs = this.compileShader(this.gl.VERTEX_SHADER, blitVs);
        const bfs = this.compileShader(this.gl.FRAGMENT_SHADER, blitFs);
        this.blitProgram = this.gl.createProgram();
        this.gl.attachShader(this.blitProgram, bvs);
        this.gl.attachShader(this.blitProgram, bfs);
        this.gl.linkProgram(this.blitProgram);

        this.gl.useProgram(this.program);
        this.getUniformLocations();
        this.blitTexLoc = this.gl.getUniformLocation(this.blitProgram, "u_tex");
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error("An error occurred compiling the shaders: " + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    getUniformLocations() {
        const loc = (name) => this.gl.getUniformLocation(this.program, name);
        this.locTime = loc("u_time");
        this.locCentroid = loc("u_centroid");
        this.locBass = loc("u_bass");
        this.locMid = loc("u_mid");
        this.locHigh = loc("u_high");
        this.locTransient = loc("u_transient");
        this.uResolution = loc("u_resolution");
        this.locMaskEnabled = loc("u_maskEnabled");

        // RGB Shift
        this.locRgb = loc("u_rgbShift"); this.locRgbAmt = loc("u_rgbShiftAmt"); this.locRgbAngle = loc("u_rgbAngle"); this.locRgbBlend = loc("u_rgbBlend");
        // Scan Lines
        this.locScan = loc("u_scanLines"); this.locScanDen = loc("u_scanDen"); this.locScanOpac = loc("u_scanOpac"); this.locScanBlend = loc("u_scanBlend");
        // Noise
        this.locNoise = loc("u_noise"); this.locNoiseAmt = loc("u_noiseAmt"); this.locNoiseChroma = loc("u_noiseChroma"); this.locNoiseBlend = loc("u_noiseBlend");
        // Color Distortion
        this.locColDist = loc("u_colDist"); this.locColHue = loc("u_colHue"); this.locColSat = loc("u_colSat"); this.locColDistBlend = loc("u_colDistBlend");
        // Blockiness
        this.locBlock = loc("u_block"); this.locBlockSize = loc("u_blockSize"); this.locBlockBlend = loc("u_blockBlend");
        // Chroma
        this.locChroma = loc("u_chroma"); this.locChromaShift = loc("u_chromaShift"); this.locChromaBleed = loc("u_chromaBleed"); this.locChromaBlend = loc("u_chromaBlend");
        // VHS
        this.locVhs = loc("u_vhs"); this.locVhsVert = loc("u_vhsVert"); this.locVhsHorz = loc("u_vhsHorz"); this.locVhsTear = loc("u_vhsTear"); this.locVhsBlend = loc("u_vhsBlend");
        // FeedbackPro
        this.locFb = loc("u_feedback"); this.locFbAmt = loc("u_fbAmt"); this.locFbZoom = loc("u_fbZoom"); this.locFbRot = loc("u_fbRot");
        this.locFbMoveX = loc("u_fbMoveX"); this.locFbMoveY = loc("u_fbMoveY"); this.locFbHueShift = loc("u_fbHueShift");
        this.locFbLumaThresh = loc("u_fbLumaThresh"); this.locFbMirror = loc("u_fbMirror"); this.locFbBlend = loc("u_fbBlend");
        // Melt
        this.locMelt = loc("u_melt"); this.locMeltAmt = loc("u_meltAmt"); this.locMeltGravity = loc("u_meltGravity"); this.locMeltTurb = loc("u_meltTurb"); this.locMeltBlend = loc("u_meltBlend");
        // Chroma Delay
        this.locCDelay = loc("u_cdelay"); this.locCDelayAmt = loc("u_cdelayAmt");
        this.locCDelayScaleR = loc("u_cdelayScaleR"); this.locCDelayScaleG = loc("u_cdelayScaleG"); this.locCDelayScaleB = loc("u_cdelayScaleB"); this.locCDelayBlend = loc("u_cdelayBlend");
        // Edge
        this.locEdge = loc("u_edge"); this.locEdgeThresh = loc("u_edgeThresh"); this.locEdgeInv = loc("u_edgeInv");
        this.locEdgeColor = loc("u_edgeColor"); this.locEdgeGlow = loc("u_edgeGlow"); this.locEdgeBlend = loc("u_edgeBlend");
        // Colorize
        this.locColz = loc("u_colorize"); this.locColzHue = loc("u_colzHue"); this.locColzStr = loc("u_colzStr"); this.locColzBlend = loc("u_colzBlend");
        // Point Cloud
        this.locPoint = loc("u_point"); this.locPointDen = loc("u_pointDen"); this.locPointSize = loc("u_pointSize"); this.locPointDepth = loc("u_pointDepth"); this.locPointBlend = loc("u_pointBlend");
        // Motion
        this.locMotion = loc("u_motion"); this.locMoThresh = loc("u_moThresh"); this.locMoDecay = loc("u_moDecay"); this.locMoTint = loc("u_moTint"); this.locMoBlend = loc("u_moBlend");
        // Kaleidoscope
        this.locKaleido = loc("u_kaleido"); this.locKaleidoSeg = loc("u_kaleidoSeg"); this.locKaleidoRot = loc("u_kaleidoRot"); this.locKaleidoZoom = loc("u_kaleidoZoom"); this.locKaleidoBlend = loc("u_kaleidoBlend");
        // Barrel
        this.locBarrel = loc("u_barrel"); this.locBarrelAmt = loc("u_barrelAmt"); this.locBarrelCX = loc("u_barrelCX"); this.locBarrelCY = loc("u_barrelCY"); this.locBarrelBlend = loc("u_barrelBlend");
        // Pixel Sort
        this.locPixSort = loc("u_pixSort"); this.locPixSortThresh = loc("u_pixSortThresh"); this.locPixSortDir = loc("u_pixSortDir"); this.locPixSortBlend = loc("u_pixSortBlend");
        // Posterize
        this.locPoster = loc("u_poster"); this.locPosterLevels = loc("u_posterLevels"); this.locPosterBlend = loc("u_posterBlend");
        // Glitch Slicer
        this.locSlicer = loc("u_slicer"); this.locSlicerSlices = loc("u_slicerSlices"); this.locSlicerOffset = loc("u_slicerOffset"); this.locSlicerSpeed = loc("u_slicerSpeed"); this.locSlicerBlend = loc("u_slicerBlend");
        // Vortex Warp
        this.locVortex = loc("u_vortex"); this.locVortexStr = loc("u_vortexStr"); this.locVortexRad = loc("u_vortexRad"); this.locVortexCX = loc("u_vortexCX"); this.locVortexCY = loc("u_vortexCY"); this.locVortexBlend = loc("u_vortexBlend");
        // Mirror Tile
        this.locMirrorT = loc("u_mirrorT"); this.locMirrorTX = loc("u_mirrorTX"); this.locMirrorTY = loc("u_mirrorTY"); this.locMirrorBlend = loc("u_mirrorBlend");
        // Stroboscope
        this.locStrobe = loc("u_strobe"); this.locStrobeRate = loc("u_strobeRate"); this.locStrobeHold = loc("u_strobeHold"); this.locStrobeBlend = loc("u_strobeBlend");
        // Dither Matrix
        this.locDither = loc("u_dither"); this.locDitherScale = loc("u_ditherScale"); this.locDitherContrast = loc("u_ditherContrast"); this.locDitherBlend = loc("u_ditherBlend");
        // Thermal Vision
        this.locThermal = loc("u_thermal"); this.locThermalInt = loc("u_thermalInt"); this.locThermalBias = loc("u_thermalBias"); this.locThermalBlend = loc("u_thermalBlend");
        // Particle Dispersion
        this.locParticleDisp = loc("u_particleDisp"); this.locParticleAmt = loc("u_particleAmt"); this.locParticleSpread = loc("u_particleSpread"); this.locParticleDir = loc("u_particleDir"); this.locParticleBlend = loc("u_particleBlend");
        // Split Scan
        this.locSplitScan = loc("u_splitScan"); this.locSplitBands = loc("u_splitBands"); this.locSplitShift = loc("u_splitShift"); this.locSplitWarp = loc("u_splitWarp"); this.locSplitBlend = loc("u_splitBlend");
        
        // Generative Art
        this.locGenMode      = loc("u_genMode");
        this.locGenSpeed     = loc("u_genSpeed");
        this.locGenScale     = loc("u_genScale");
        this.locGenWarp      = loc("u_genWarp");
        this.locGenRotX      = loc("u_genRotX");
        this.locGenRotY      = loc("u_genRotY");
        this.locGenRotZ      = loc("u_genRotZ");
        this.locGenAudioBand = loc("u_genAudioBand");
        this.locGenColor1    = loc("u_genColor1");
        this.locGenColor2    = loc("u_genColor2");
        this.locGenDensity   = loc("u_genDensity");
        this.locGenIter      = loc("u_genIter");

        // Canvas Transform
        this.locFlipH    = loc("u_flipH");
        this.locFlipV    = loc("u_flipV");
        this.locRotation = loc("u_rotation");
    }

    initTextures() {
        const gl = this.gl;

        // Video input texture (TEXTURE0)
        this.videoTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Map samplers to units once
        gl.useProgram(this.program);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_videoTex"), 0);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_feedbackTex"), 1);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_maskTex"), 2);
    }

    initBuffers() {
        const positions = new Float32Array([
            -1.0,  1.0,
            -1.0, -1.0,
             1.0,  1.0,
             1.0, -1.0,
        ]);
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    }

    render(state) {
        if (!state.glitchez) return;
        const gl = this.gl;

        // --- Step 1: Prepare Textures ---
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
        
        // Use compositor source if provided (for PNG/Text overlays), else camera
        const source = state.compositeSource || state.videoElement;
        if (source && source.readyState >= 2) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        } else if (source instanceof HTMLCanvasElement) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        } else if (!this._videoInitialized) {
            const temp = new Uint8Array([0, 0, 0, 255]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, temp);
            this._videoInitialized = true;
        }

        // --- Step 2: Bind Feedback Source to TEXTURE1 ---
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.feedbackSource.tex);

        // --- Step 2.5: Bind Mask Source to TEXTURE2 ---
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.videoTex); // default fallback
        
        // Ensure state contains mask
        if (state.maskCanvas) {
            // Need a separate texture for mask? Yes.
            if (!this.maskTex) {
                this.maskTex = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            }
            gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, state.maskCanvas);
        }

        // --- Step 3: Draw to FBO ---
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderTarget.fbo);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(this.program);

        // Update uniforms
        this.gl.uniform1f(this.locTime, performance.now() * 0.001 * state.timeSpeed);
        this.gl.uniform1f(this.locCentroid, state.spectralCentroid);
        this.gl.uniform1f(this.locBass, state.bass || 0);
        this.gl.uniform1f(this.locMid, state.mid || 0);
        this.gl.uniform1f(this.locHigh, state.high || 0);
        this.gl.uniform1f(this.locTransient, state.transient ? 1.0 : 0.0);
        this.gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.locMaskEnabled, state.isolatePerson ? 1.0 : 0.0);

        const g = state.glitchez;
        const bass = state.bass || 0;
        const mid = state.mid || 0;
        const high = state.high || 0;

        // Universal band modulator: reads eff.audioBand to pick bass/mid/high
        const getBandVal = (eff) => {
            const b = eff.audioBand || 'MID';
            return b === 'BASS' ? bass : b === 'HIGH' ? high : mid;
        };
        const aBand = (eff, m) => eff.audioReactive ? (1.0 + getBandVal(eff) * m) : 1.0;
        const aBandAdd = (eff, m) => eff.audioReactive ? (getBandVal(eff) * m) : 0;
        const aBandSub = (eff, m) => eff.audioReactive ? Math.max(0.1, 1.0 - getBandVal(eff) * m) : 1.0;

        // Apply all effect uniforms
        this.gl.uniform1f(this.locRgb, g.rgbShift.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locRgbAmt, g.rgbShift.params.amount.value * aBand(g.rgbShift, 8.0));
        this.gl.uniform1f(this.locRgbAngle, g.rgbShift.params.angle.value);
        this.gl.uniform1f(this.locRgbBlend, g.rgbShift.params.blendMode.value);

        this.gl.uniform1f(this.locScan, g.scanLines.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locScanDen, g.scanLines.params.density.value);
        this.gl.uniform1f(this.locScanOpac, g.scanLines.params.opacity.value * aBand(g.scanLines, 2.0));
        this.gl.uniform1f(this.locScanBlend, g.scanLines.params.blendMode.value);

        this.gl.uniform1f(this.locNoise, g.noise.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locNoiseAmt, g.noise.params.amount.value * aBand(g.noise, 3.0));
        this.gl.uniform1f(this.locNoiseChroma, g.noise.params.chromatic.value);
        this.gl.uniform1f(this.locNoiseBlend, g.noise.params.blendMode.value);

        this.gl.uniform1f(this.locColDist, g.colorDistortion.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locColHue, g.colorDistortion.params.hue.value + aBandAdd(g.colorDistortion, 180.0));
        this.gl.uniform1f(this.locColSat, g.colorDistortion.params.saturation.value);
        this.gl.uniform1f(this.locColDistBlend, g.colorDistortion.params.blendMode.value);

        this.gl.uniform1f(this.locBlock, g.blockiness.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locBlockSize, g.blockiness.params.size.value * aBand(g.blockiness, 5.0));
        this.gl.uniform1f(this.locBlockBlend, g.blockiness.params.blendMode.value);

        this.gl.uniform1f(this.locChroma, g.chromaGlitch.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locChromaShift, g.chromaGlitch.params.shiftAmount.value * aBand(g.chromaGlitch, 5.0));
        this.gl.uniform1f(this.locChromaBleed, g.chromaGlitch.params.bleedIntensity.value);
        this.gl.uniform1f(this.locChromaBlend, g.chromaGlitch.params.blendMode.value);

        this.gl.uniform1f(this.locVhs, g.vhsJitter.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locVhsVert, g.vhsJitter.params.vertical.value * aBand(g.vhsJitter, 3.0));
        this.gl.uniform1f(this.locVhsHorz, g.vhsJitter.params.horizontal.value * aBand(g.vhsJitter, 3.0));
        this.gl.uniform1f(this.locVhsTear, g.vhsJitter.params.tear.value);
        this.gl.uniform1f(this.locVhsBlend, g.vhsJitter.params.blendMode.value);

        this.gl.uniform1f(this.locFb, g.videoFeedback.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locFbAmt, g.videoFeedback.params.amount.value);
        this.gl.uniform1f(this.locFbZoom, g.videoFeedback.params.zoom.value + aBandAdd(g.videoFeedback, 0.3));
        this.gl.uniform1f(this.locFbRot, g.videoFeedback.params.rotation.value);
        this.gl.uniform1f(this.locFbMoveX, g.videoFeedback.params.moveX.value);
        this.gl.uniform1f(this.locFbMoveY, g.videoFeedback.params.moveY.value);
        this.gl.uniform1f(this.locFbHueShift, g.videoFeedback.params.hueShift.value);
        this.gl.uniform1f(this.locFbLumaThresh, g.videoFeedback.params.lumaThresh.value);
        this.gl.uniform1f(this.locFbMirror, g.videoFeedback.params.mirror.value);
        this.gl.uniform1f(this.locFbBlend, g.videoFeedback.params.blendMode.value);

        this.gl.uniform1f(this.locMelt, g.acidMelt.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locMeltAmt, g.acidMelt.params.amount.value);
        this.gl.uniform1f(this.locMeltGravity, g.acidMelt.params.gravity.value * aBand(g.acidMelt, 8.0));
        this.gl.uniform1f(this.locMeltTurb, g.acidMelt.params.turbulence.value * aBand(g.acidMelt, 3.0));
        this.gl.uniform1f(this.locMeltBlend, g.acidMelt.params.blendMode.value);

        this.gl.uniform1f(this.locCDelay, g.chromaDelay.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locCDelayAmt, g.chromaDelay.params.amount.value);
        this.gl.uniform1f(this.locCDelayScaleR, g.chromaDelay.params.scaleR.value * aBand(g.chromaDelay, 0.05));
        this.gl.uniform1f(this.locCDelayScaleG, g.chromaDelay.params.scaleG.value);
        this.gl.uniform1f(this.locCDelayScaleB, g.chromaDelay.params.scaleB.value * aBand(g.chromaDelay, 0.05));
        this.gl.uniform1f(this.locCDelayBlend, g.chromaDelay.params.blendMode.value);

        this.gl.uniform1f(this.locEdge, g.edgeDetection.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locEdgeThresh, g.edgeDetection.params.threshold.value * aBandSub(g.edgeDetection, 0.8));
        this.gl.uniform1f(this.locEdgeInv, g.edgeDetection.params.invert.value);
        this.gl.uniform1f(this.locEdgeColor, g.edgeDetection.params.colorMode.value);
        this.gl.uniform1f(this.locEdgeGlow, g.edgeDetection.params.glow.value);
        this.gl.uniform1f(this.locEdgeBlend, g.edgeDetection.params.blendMode.value);

        this.gl.uniform1f(this.locColz, g.colorize.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locColzHue, g.colorize.params.hue.value + aBandAdd(g.colorize, 90.0));
        this.gl.uniform1f(this.locColzStr, g.colorize.params.strength.value * aBand(g.colorize, 2.0));
        this.gl.uniform1f(this.locColzBlend, g.colorize.params.blendMode.value);

        this.gl.uniform1f(this.locPoint, g.dataPointCloud.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locPointDen, g.dataPointCloud.params.density.value);
        this.gl.uniform1f(this.locPointSize, g.dataPointCloud.params.size.value * aBand(g.dataPointCloud, 3.0));
        this.gl.uniform1f(this.locPointDepth, g.dataPointCloud.params.depth.value);
        this.gl.uniform1f(this.locPointBlend, g.dataPointCloud.params.blendMode.value);

        this.gl.uniform1f(this.locMotion, g.motionDetection.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locMoThresh, g.motionDetection.params.threshold.value * aBandSub(g.motionDetection, 0.8));
        this.gl.uniform1f(this.locMoDecay, g.motionDetection.params.decay.value);
        this.gl.uniform1f(this.locMoTint, g.motionDetection.params.tint.value);
        this.gl.uniform1f(this.locMoBlend, g.motionDetection.params.blendMode.value);

        this.gl.uniform1f(this.locKaleido, g.kaleidoscope.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locKaleidoSeg, g.kaleidoscope.params.segments.value);
        this.gl.uniform1f(this.locKaleidoRot, g.kaleidoscope.params.rotation.value + aBandAdd(g.kaleidoscope, 45.0));
        this.gl.uniform1f(this.locKaleidoZoom, g.kaleidoscope.params.zoom.value);
        this.gl.uniform1f(this.locKaleidoBlend, g.kaleidoscope.params.blendMode.value);

        this.gl.uniform1f(this.locBarrel, g.barrelDistortion.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locBarrelAmt, g.barrelDistortion.params.amount.value * aBand(g.barrelDistortion, 3.0));
        this.gl.uniform1f(this.locBarrelCX, g.barrelDistortion.params.centerX.value);
        this.gl.uniform1f(this.locBarrelCY, g.barrelDistortion.params.centerY.value);
        this.gl.uniform1f(this.locBarrelBlend, g.barrelDistortion.params.blendMode.value);

        this.gl.uniform1f(this.locPixSort, g.pixelSort.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locPixSortThresh, g.pixelSort.params.threshold.value * aBandSub(g.pixelSort, 0.5));
        this.gl.uniform1f(this.locPixSortDir, g.pixelSort.params.direction.value);
        this.gl.uniform1f(this.locPixSortBlend, g.pixelSort.params.blendMode.value);

        this.gl.uniform1f(this.locPoster, g.posterize.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locPosterLevels, g.posterize.params.levels.value * aBandSub(g.posterize, 0.7));
        this.gl.uniform1f(this.locPosterBlend, g.posterize.params.blendMode.value);

        // --- New Effects ---
        this.gl.uniform1f(this.locSlicer, g.glitchSlicer.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locSlicerSlices, g.glitchSlicer.params.slices.value);
        this.gl.uniform1f(this.locSlicerOffset, g.glitchSlicer.params.offset.value * aBand(g.glitchSlicer, 6.0));
        this.gl.uniform1f(this.locSlicerSpeed, g.glitchSlicer.params.speed.value);
        this.gl.uniform1f(this.locSlicerBlend, g.glitchSlicer.params.blendMode.value);

        this.gl.uniform1f(this.locVortex, g.vortexWarp.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locVortexStr, g.vortexWarp.params.strength.value * aBand(g.vortexWarp, 4.0));
        this.gl.uniform1f(this.locVortexRad, g.vortexWarp.params.radius.value);
        this.gl.uniform1f(this.locVortexCX, g.vortexWarp.params.centerX.value);
        this.gl.uniform1f(this.locVortexCY, g.vortexWarp.params.centerY.value);
        this.gl.uniform1f(this.locVortexBlend, g.vortexWarp.params.blendMode.value);

        this.gl.uniform1f(this.locMirrorT, g.mirrorTile.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locMirrorTX, g.mirrorTile.params.tilesX.value * aBand(g.mirrorTile, 2.0));
        this.gl.uniform1f(this.locMirrorTY, g.mirrorTile.params.tilesY.value);
        this.gl.uniform1f(this.locMirrorBlend, g.mirrorTile.params.blendMode.value);

        this.gl.uniform1f(this.locStrobe, g.stroboscope.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locStrobeRate, g.stroboscope.params.rate.value * aBand(g.stroboscope, 3.0));
        this.gl.uniform1f(this.locStrobeHold, g.stroboscope.params.hold.value);
        this.gl.uniform1f(this.locStrobeBlend, g.stroboscope.params.blendMode.value);

        this.gl.uniform1f(this.locDither, g.ditherMatrix.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locDitherScale, g.ditherMatrix.params.scale.value * aBand(g.ditherMatrix, 3.0));
        this.gl.uniform1f(this.locDitherContrast, g.ditherMatrix.params.contrast.value);
        this.gl.uniform1f(this.locDitherBlend, g.ditherMatrix.params.blendMode.value);

        this.gl.uniform1f(this.locThermal, g.thermalVision.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locThermalInt, g.thermalVision.params.intensity.value * aBand(g.thermalVision, 2.0));
        this.gl.uniform1f(this.locThermalBias, g.thermalVision.params.bias.value);
        this.gl.uniform1f(this.locThermalBlend, g.thermalVision.params.blendMode.value);

        // Particle Dispersion
        this.gl.uniform1f(this.locParticleDisp, g.particleDisp.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locParticleAmt, g.particleDisp.params.amount.value * aBand(g.particleDisp, 2.0));
        this.gl.uniform1f(this.locParticleSpread, g.particleDisp.params.spread.value * aBand(g.particleDisp, 4.0));
        this.gl.uniform1f(this.locParticleDir, g.particleDisp.params.direction.value);
        this.gl.uniform1f(this.locParticleBlend, g.particleDisp.params.blendMode.value);

        // Split Scan
        this.gl.uniform1f(this.locSplitScan, g.splitScan.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locSplitBands, g.splitScan.params.bands.value * aBand(g.splitScan, 2.0));
        this.gl.uniform1f(this.locSplitShift, g.splitScan.params.shift.value * aBand(g.splitScan, 5.0));
        this.gl.uniform1f(this.locSplitWarp, g.splitScan.params.warp.value);
        this.gl.uniform1f(this.locSplitBlend, g.splitScan.params.blendMode.value);

        // Generative Art
        let genModeNum = 0.0;
        if (state.genMode === 'GRID TUNNEL')    genModeNum = 1.0;
        else if (state.genMode === 'CUBE FIELD')      genModeNum = 2.0;
        else if (state.genMode === 'SOLAR CORONA')    genModeNum = 3.0;
        else if (state.genMode === 'MANDELBULB')      genModeNum = 4.0;
        else if (state.genMode === 'BIO ABYSS')       genModeNum = 5.0;
        else if (state.genMode === 'FLOW FIELD')      genModeNum = 6.0;
        else if (state.genMode === 'WAVE COLLAPSE')   genModeNum = 7.0;
        else if (state.genMode === 'MYCELIUM')        genModeNum = 8.0;
        // Legacy name compat
        else if (state.genMode === 'RADIANT HORIZON') genModeNum = 3.0;
        else if (state.genMode === 'FRACTAL PYRAMID') genModeNum = 4.0;
        else if (state.genMode === 'NEON CAVES')      genModeNum = 5.0;

        let bNum = 1.0; // MID
        if (state.genAudioBand === 'BASS') bNum = 0.0;
        else if (state.genAudioBand === 'HIGH') bNum = 2.0;

        this.gl.uniform1f(this.locGenMode, genModeNum);
        if (state.genParams) {
            this.gl.uniform1f(this.locGenSpeed,   state.genParams.speed.value);
            this.gl.uniform1f(this.locGenScale,   state.genParams.zoom.value);
            this.gl.uniform1f(this.locGenWarp,    state.genParams.warp.value);
            this.gl.uniform1f(this.locGenRotX,    state.genParams.rotateX.value);
            this.gl.uniform1f(this.locGenRotY,    state.genParams.rotateY.value);
            this.gl.uniform1f(this.locGenRotZ,    state.genParams.rotateZ.value);
            this.gl.uniform1f(this.locGenColor1,  state.genParams.colorA  ? state.genParams.colorA.value  : 0.0);
            this.gl.uniform1f(this.locGenColor2,  state.genParams.colorB  ? state.genParams.colorB.value  : 0.5);
            this.gl.uniform1f(this.locGenDensity, state.genParams.density ? state.genParams.density.value : 1.0);
            this.gl.uniform1f(this.locGenIter,    state.genParams.iterations ? state.genParams.iterations.value : 0.5);
        } else {
            this.gl.uniform1f(this.locGenSpeed, 1.0);
            this.gl.uniform1f(this.locGenScale, 1.0);
            this.gl.uniform1f(this.locGenWarp, 1.0);
            this.gl.uniform1f(this.locGenRotX, 0.0);
            this.gl.uniform1f(this.locGenRotY, 0.0);
            this.gl.uniform1f(this.locGenRotZ, 0.0);
        }
        this.gl.uniform1f(this.locGenAudioBand, bNum);

        // --- Canvas Transform ---
        const ct = state.canvasTransform || {};
        this.gl.uniform1f(this.locFlipH,    ct.flipH    ? 1.0 : 0.0);
        this.gl.uniform1f(this.locFlipV,    ct.flipV    ? 1.0 : 0.0);
        this.gl.uniform1f(this.locRotation, ct.rotation || 0.0);

        // Draw main quad to FBO
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        const posLoc = gl.getAttribLocation(this.program, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --- GPGPU Particles Pass (THE SPIRIT) ---
        if (state.genMode === 'THE SPIRIT' && this.hasFloatTexture) {
            const time = performance.now() * 0.001;
            const speed = (state.genParams ? state.genParams.speed.value : 1.0) * 1.5;
            const curlSize = (state.genParams ? state.genParams.warp.value : 1.0) * 0.01;
            const mx = state.mouse3d ? state.mouse3d.x : 0.0;
            const my = state.mouse3d ? state.mouse3d.y : 0.0;

            // 1. Compute Physics
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleTarget.fbo);
            gl.viewport(0, 0, 512, 512);
            gl.useProgram(this.progParticleCompute);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.particleSource.tex);
            gl.uniform1i(this.locCompPos, 0);

            gl.uniform1f(this.locCompTime, time);
            gl.uniform1f(this.locCompSpeed, speed);
            gl.uniform1f(this.locCompCurl, curlSize);
            gl.uniform3f(this.locCompMouse, mx, my, 0.0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            const cpLoc = gl.getAttribLocation(this.progParticleCompute, "a_position");
            gl.enableVertexAttribArray(cpLoc);
            gl.vertexAttribPointer(cpLoc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            // 2. Swap Particle Ping-Pong
            const ptTmp = this.particleSource;
            this.particleSource = this.particleTarget;
            this.particleTarget = ptTmp;

            // 3. Draw Particles over main renderTarget
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderTarget.fbo);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.useProgram(this.progParticleDraw);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.particleSource.tex);
            gl.uniform1i(this.locDrawPos, 0);

            const zoom = state.genParams ? state.genParams.zoom.value : 1.5;
            gl.uniform1f(this.locDrawZoom, zoom * 3.0);
            gl.uniform1f(this.locDrawRotX, state.genParams ? state.genParams.rotateX.value : 0.0);
            gl.uniform1f(this.locDrawRotY, state.genParams ? state.genParams.rotateY.value : 0.0);
            gl.uniform1f(this.locDrawRotZ, state.genParams ? state.genParams.rotateZ.value : 0.0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.particleUVBuffer);
            const dpLoc = gl.getAttribLocation(this.progParticleDraw, "a_uv");
            gl.enableVertexAttribArray(dpLoc);
            gl.vertexAttribPointer(dpLoc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.POINTS, 0, 512 * 512);

            gl.disable(gl.BLEND);
        }

        // --- Step 4: Blit to Screen ---
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.useProgram(this.blitProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.renderTarget.tex);
        gl.uniform1i(this.blitTexLoc, 0);
        
        const blitPosLoc = gl.getAttribLocation(this.blitProgram, "a_position");
        gl.enableVertexAttribArray(blitPosLoc);
        gl.vertexAttribPointer(blitPosLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --- Step 5: Recording (Capture current frame) ---
        if (this._isRecording && this._recorder && this._recorder.state === 'recording') {
            // MediaRecorder handles this automatically via stream.
        }

        // --- Step 6: Swap Ping-Pong ---
        const tmp = this.renderTarget;
        this.renderTarget = this.feedbackSource;
        this.feedbackSource = tmp;
    }

    // --- Recording & Export Tools ---
    exportPNG(blobTracker) {
        // Composite WebGL canvas + blob overlay into an offscreen canvas before saving
        const offscreen = document.createElement('canvas');
        offscreen.width  = this.canvas.width;
        offscreen.height = this.canvas.height;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(this.canvas, 0, 0);
        if (blobTracker && blobTracker.enabled && blobTracker.showOverlay) {
            ctx.drawImage(blobTracker.overlayCanvas, 0, 0, offscreen.width, offscreen.height);
        }
        const link = document.createElement('a');
        link.download = `dead4rat_${Date.now()}.png`;
        link.href = offscreen.toDataURL('image/png');
        link.click();
    }

    startRecording(blobTracker) {
        if (this._isRecording) return;

        let stream;
        if (blobTracker && blobTracker.enabled && blobTracker.showOverlay) {
            // Composite WebGL canvas + blob overlay into a dedicated recording canvas
            this._recCanvas = document.createElement('canvas');
            this._recCanvas.width  = this.canvas.width;
            this._recCanvas.height = this.canvas.height;
            this._recCtx = this._recCanvas.getContext('2d');

            // Drive compositing every frame
            const composeFrame = () => {
                if (!this._isRecording) return;
                this._recCtx.drawImage(this.canvas, 0, 0);
                this._recCtx.drawImage(blobTracker.overlayCanvas, 0, 0, this._recCanvas.width, this._recCanvas.height);
                requestAnimationFrame(composeFrame);
            };
            requestAnimationFrame(composeFrame);
            stream = this._recCanvas.captureStream(60);
        } else {
            stream = this.canvas.captureStream(60);
        }

        this._chunks = [];
        this._recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        this._recorder.ondataavailable = (e) => {
            if (e.data.size > 0) this._chunks.push(e.data);
        };

        this._recorder.onstop = () => {
            const blob = new Blob(this._chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dead4rat_${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            this._recCanvas = null;
            this._recCtx = null;
        };

        this._recorder.start();
        this._isRecording = true;
    }

    stopRecording() {
        if (!this._isRecording) return;
        this._recorder.stop();
        this._isRecording = false;
    }
}
