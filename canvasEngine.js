class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        // FBOs handle the feedback persistence, but we still need preserveDrawingBuffer
        // enabled so that asynchronous calls like canvas.toDataURL() (for PNG exports
        // and Preset Thumbnails) can read the final rendered image.
        this.gl = this.canvas.getContext('webgl', { 
            preserveDrawingBuffer: true,
            alpha: false,
            antialias: false,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            console.error("WebGL not supported");
            return;
        }

        this.fboA = null;
        this.fboB = null;
        this.renderTarget = null; // These will hold { fbo, tex }
        this.feedbackSource = null;

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

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.initFBOs(this.canvas.width, this.canvas.height);
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

            void main() {
                vec2 uv = v_uv;

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

        const g = state.glitchez;
        const bass = state.bass || 0;
        const mid = state.mid || 0;
        const high = state.high || 0;
        const aMod = (eff, m) => eff.audioReactive ? (1.0 + state.spectralCentroid * m) : 1.0;
        const aBass = (eff, m) => eff.audioReactive ? (1.0 + bass * m) : 1.0;
        const aMid = (eff, m) => eff.audioReactive ? (1.0 + mid * m) : 1.0;
        const aHigh = (eff, m) => eff.audioReactive ? (1.0 + high * m) : 1.0;

        // Apply all effect uniforms
        this.gl.uniform1f(this.locRgb, g.rgbShift.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locRgbAmt, g.rgbShift.params.amount.value * aHigh(g.rgbShift, 8.0));
        this.gl.uniform1f(this.locRgbAngle, g.rgbShift.params.angle.value);
        this.gl.uniform1f(this.locRgbBlend, g.rgbShift.params.blendMode.value);

        this.gl.uniform1f(this.locScan, g.scanLines.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locScanDen, g.scanLines.params.density.value);
        this.gl.uniform1f(this.locScanOpac, g.scanLines.params.opacity.value * aMid(g.scanLines, 2.0));
        this.gl.uniform1f(this.locScanBlend, g.scanLines.params.blendMode.value);

        this.gl.uniform1f(this.locNoise, g.noise.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locNoiseAmt, g.noise.params.amount.value * aMid(g.noise, 3.0));
        this.gl.uniform1f(this.locNoiseChroma, g.noise.params.chromatic.value);
        this.gl.uniform1f(this.locNoiseBlend, g.noise.params.blendMode.value);

        this.gl.uniform1f(this.locColDist, g.colorDistortion.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locColHue, g.colorDistortion.params.hue.value + (g.colorDistortion.audioReactive ? mid * 180.0 : 0));
        this.gl.uniform1f(this.locColSat, g.colorDistortion.params.saturation.value);
        this.gl.uniform1f(this.locColDistBlend, g.colorDistortion.params.blendMode.value);

        this.gl.uniform1f(this.locBlock, g.blockiness.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locBlockSize, g.blockiness.params.size.value * aBass(g.blockiness, 5.0));
        this.gl.uniform1f(this.locBlockBlend, g.blockiness.params.blendMode.value);

        this.gl.uniform1f(this.locChroma, g.chromaGlitch.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locChromaShift, g.chromaGlitch.params.shiftAmount.value * aHigh(g.chromaGlitch, 5.0));
        this.gl.uniform1f(this.locChromaBleed, g.chromaGlitch.params.bleedIntensity.value);
        this.gl.uniform1f(this.locChromaBlend, g.chromaGlitch.params.blendMode.value);

        this.gl.uniform1f(this.locVhs, g.vhsJitter.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locVhsVert, g.vhsJitter.params.vertical.value * aBass(g.vhsJitter, 3.0));
        this.gl.uniform1f(this.locVhsHorz, g.vhsJitter.params.horizontal.value * aBass(g.vhsJitter, 3.0));
        this.gl.uniform1f(this.locVhsTear, g.vhsJitter.params.tear.value);
        this.gl.uniform1f(this.locVhsBlend, g.vhsJitter.params.blendMode.value);

        this.gl.uniform1f(this.locFb, g.videoFeedback.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locFbAmt, g.videoFeedback.params.amount.value);
        this.gl.uniform1f(this.locFbZoom, g.videoFeedback.params.zoom.value + (g.videoFeedback.audioReactive ? bass * 0.3 : 0));
        this.gl.uniform1f(this.locFbRot, g.videoFeedback.params.rotation.value);
        this.gl.uniform1f(this.locFbMoveX, g.videoFeedback.params.moveX.value);
        this.gl.uniform1f(this.locFbMoveY, g.videoFeedback.params.moveY.value);
        this.gl.uniform1f(this.locFbHueShift, g.videoFeedback.params.hueShift.value);
        this.gl.uniform1f(this.locFbLumaThresh, g.videoFeedback.params.lumaThresh.value);
        this.gl.uniform1f(this.locFbMirror, g.videoFeedback.params.mirror.value);
        this.gl.uniform1f(this.locFbBlend, g.videoFeedback.params.blendMode.value);

        this.gl.uniform1f(this.locMelt, g.acidMelt.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locMeltAmt, g.acidMelt.params.amount.value);
        this.gl.uniform1f(this.locMeltGravity, g.acidMelt.params.gravity.value * aBass(g.acidMelt, 8.0));
        this.gl.uniform1f(this.locMeltTurb, g.acidMelt.params.turbulence.value * aMid(g.acidMelt, 3.0));
        this.gl.uniform1f(this.locMeltBlend, g.acidMelt.params.blendMode.value);

        this.gl.uniform1f(this.locCDelay, g.chromaDelay.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locCDelayAmt, g.chromaDelay.params.amount.value);
        this.gl.uniform1f(this.locCDelayScaleR, g.chromaDelay.params.scaleR.value * aHigh(g.chromaDelay, 0.05));
        this.gl.uniform1f(this.locCDelayScaleG, g.chromaDelay.params.scaleG.value);
        this.gl.uniform1f(this.locCDelayScaleB, g.chromaDelay.params.scaleB.value * aHigh(g.chromaDelay, 0.05));
        this.gl.uniform1f(this.locCDelayBlend, g.chromaDelay.params.blendMode.value);

        this.gl.uniform1f(this.locEdge, g.edgeDetection.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locEdgeThresh, g.edgeDetection.params.threshold.value * (g.edgeDetection.audioReactive ? Math.max(0.1, 1.0 - high * 0.8) : 1.0));
        this.gl.uniform1f(this.locEdgeInv, g.edgeDetection.params.invert.value);
        this.gl.uniform1f(this.locEdgeColor, g.edgeDetection.params.colorMode.value);
        this.gl.uniform1f(this.locEdgeGlow, g.edgeDetection.params.glow.value);
        this.gl.uniform1f(this.locEdgeBlend, g.edgeDetection.params.blendMode.value);

        this.gl.uniform1f(this.locColz, g.colorize.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locColzHue, g.colorize.params.hue.value + (g.colorize.audioReactive ? mid * 90.0 : 0));
        this.gl.uniform1f(this.locColzStr, g.colorize.params.strength.value * aMod(g.colorize, 2.0));
        this.gl.uniform1f(this.locColzBlend, g.colorize.params.blendMode.value);

        this.gl.uniform1f(this.locPoint, g.dataPointCloud.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locPointDen, g.dataPointCloud.params.density.value);
        this.gl.uniform1f(this.locPointSize, g.dataPointCloud.params.size.value * aMid(g.dataPointCloud, 3.0));
        this.gl.uniform1f(this.locPointDepth, g.dataPointCloud.params.depth.value);
        this.gl.uniform1f(this.locPointBlend, g.dataPointCloud.params.blendMode.value);

        this.gl.uniform1f(this.locMotion, g.motionDetection.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locMoThresh, g.motionDetection.params.threshold.value * (g.motionDetection.audioReactive ? Math.max(0.1, 1.0 - bass * 0.8) : 1.0));
        this.gl.uniform1f(this.locMoDecay, g.motionDetection.params.decay.value);
        this.gl.uniform1f(this.locMoTint, g.motionDetection.params.tint.value);
        this.gl.uniform1f(this.locMoBlend, g.motionDetection.params.blendMode.value);

        this.gl.uniform1f(this.locKaleido, g.kaleidoscope.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locKaleidoSeg, g.kaleidoscope.params.segments.value);
        this.gl.uniform1f(this.locKaleidoRot, g.kaleidoscope.params.rotation.value + (g.kaleidoscope.audioReactive ? mid * 45.0 : 0));
        this.gl.uniform1f(this.locKaleidoZoom, g.kaleidoscope.params.zoom.value);
        this.gl.uniform1f(this.locKaleidoBlend, g.kaleidoscope.params.blendMode.value);

        this.gl.uniform1f(this.locBarrel, g.barrelDistortion.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locBarrelAmt, g.barrelDistortion.params.amount.value * aBass(g.barrelDistortion, 3.0));
        this.gl.uniform1f(this.locBarrelCX, g.barrelDistortion.params.centerX.value);
        this.gl.uniform1f(this.locBarrelCY, g.barrelDistortion.params.centerY.value);
        this.gl.uniform1f(this.locBarrelBlend, g.barrelDistortion.params.blendMode.value);

        this.gl.uniform1f(this.locPixSort, g.pixelSort.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locPixSortThresh, g.pixelSort.params.threshold.value * (g.pixelSort.audioReactive ? Math.max(0.1, 1.0 - high * 0.5) : 1.0));
        this.gl.uniform1f(this.locPixSortDir, g.pixelSort.params.direction.value);
        this.gl.uniform1f(this.locPixSortBlend, g.pixelSort.params.blendMode.value);

        this.gl.uniform1f(this.locPoster, g.posterize.enabled ? 1.0 : 0.0);
        this.gl.uniform1f(this.locPosterLevels, g.posterize.params.levels.value * (g.posterize.audioReactive ? Math.max(0.3, 1.0 - bass * 0.7) : 1.0));
        this.gl.uniform1f(this.locPosterBlend, g.posterize.params.blendMode.value);

        // Draw main quad to FBO
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        const posLoc = gl.getAttribLocation(this.program, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

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
    exportPNG() {
        const link = document.createElement('a');
        link.download = `dead4rat_${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    startRecording() {
        if (this._isRecording) return;
        
        const stream = this.canvas.captureStream(60);
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
