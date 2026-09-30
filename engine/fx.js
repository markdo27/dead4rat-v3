// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — EFFECT DEFINITIONS
//
// Each effect is a small GLSL chunk plus a parameter list. The renderer only
// compiles the chunks of effects that are switched on, so an idle effect
// costs nothing on the GPU.
//
// Stages (run in this order):
//   uv    — moves the sampling coordinate before the image is read   (pass A)
//   time  — reads the previous output frame (feedback family)        (pass A)
//   color — per-pixel colour work, may read neighbours of the image  (pass B)
//   final — full-frame overlays applied last                         (pass B)
//
// Chunk conventions:
//   uv chunks  read/write `uv` and must mix their result by `u_<key>_wet`.
//   other chunks read/write `c` (vec3). Neighbour reads use img(uv).
//   Parameters are uniforms named u_<key>_<param>.
//   Blend-capable chunks produce `e` and end with FX_MIX(key).
// Pattern sizes are in screen (CSS) pixels via u_disp so they do not change
// when the render resolution adapts.
// ═══════════════════════════════════════════════════════════════════════════

const BLEND_NAMES = ['NORMAL', 'ADD', 'MULTIPLY', 'SCREEN', 'DIFFERENCE', 'OVERLAY'];

const blendParam = { k: 'blend', label: 'MIX', min: 0, max: 5, step: 1, def: 0, opts: BLEND_NAMES };

const FX_DEFS = [
    // ── DISTORT ────────────────────────────────────────────────────────────
    {
        key: 'mirror', name: 'MIRROR', cat: 'DISTORT', stage: 'uv',
        desc: 'Kaleidoscope or mirrored tiles',
        params: [
            { k: 'mode', label: 'MODE', min: 0, max: 1, step: 1, def: 0, opts: ['KALEIDO', 'TILE'] },
            { k: 'count', label: 'COUNT', min: 2, max: 12, step: 1, def: 6 },
            { k: 'rotation', label: 'ROTATE', min: -180, max: 180, step: 1, def: 0 },
            { k: 'zoom', label: 'ZOOM', min: 0.2, max: 3, step: 0.01, def: 1 },
        ],
        audio: { p: 'rotation', op: 'add', k: 45 },
        glsl: `{
            vec2 p = uv - 0.5; p.x *= u_aspect;
            p = rot2(radians(u_mirror_rotation)) * p / max(0.05, u_mirror_zoom);
            vec2 m;
            if (u_mirror_mode < 0.5) {
                float seg = 6.2831853 / max(2.0, floor(u_mirror_count));
                float a = mod(atan(p.y, p.x), seg);
                a = min(a, seg - a);
                m = vec2(cos(a), sin(a)) * length(p);
                m.x /= u_aspect; m += 0.5;
            } else {
                p.x /= u_aspect; p += 0.5;
                m = 1.0 - abs(mod(p * floor(u_mirror_count), 2.0) - 1.0);
            }
            uv = mix(uv, m, u_mirror_wet);
        }`,
    },
    {
        key: 'warp', name: 'WARP', cat: 'DISTORT', stage: 'uv',
        desc: 'Fisheye lens and vortex twist around a centre',
        params: [
            { k: 'lens', label: 'LENS', min: -2, max: 2, step: 0.01, def: 0.5 },
            { k: 'twist', label: 'TWIST', min: -10, max: 10, step: 0.1, def: 0 },
            { k: 'radius', label: 'RADIUS', min: 0.05, max: 1, step: 0.01, def: 0.5 },
            { k: 'x', label: 'CENTER X', min: 0, max: 1, step: 0.01, def: 0.5 },
            { k: 'y', label: 'CENTER Y', min: 0, max: 1, step: 0.01, def: 0.5 },
        ],
        audio: { p: 'lens', op: 'mul', k: 3 },
        glsl: `{
            vec2 ctr = vec2(u_warp_x, u_warp_y);
            vec2 d = uv - ctr; d.x *= u_aspect;
            d *= 1.0 + u_warp_lens * dot(d, d);
            float f = 1.0 - smoothstep(0.0, max(0.01, u_warp_radius), length(d));
            d = rot2(u_warp_twist * f * f) * d;
            d.x /= u_aspect;
            uv = mix(uv, ctr + d, u_warp_wet);
        }`,
    },
    {
        key: 'slice', name: 'SLICE', cat: 'DISTORT', stage: 'uv',
        desc: 'Horizontal band displacement — random glitch or alternating scan',
        params: [
            { k: 'bands', label: 'BANDS', min: 2, max: 32, step: 1, def: 8 },
            { k: 'shift', label: 'SHIFT', min: 0, max: 400, step: 1, def: 40 },
            { k: 'speed', label: 'SPEED', min: 1, max: 30, step: 1, def: 5 },
            { k: 'order', label: 'ORDER', min: 0, max: 1, step: 0.01, def: 0 },
            { k: 'warp', label: 'BEND', min: 0, max: 1, step: 0.01, def: 0 },
        ],
        audio: { p: 'shift', op: 'mul', k: 6 },
        glsl: `{
            float n = max(2.0, floor(u_slice_bands));
            float bi = floor(uv.y * n);
            float bf = fract(uv.y * n);
            float tick = floor(u_time * u_slice_speed);
            float r = rand(vec2(bi, tick));
            float randomDir = (r - 0.5) * 2.0 * step(0.4, r);
            float altDir = (mod(bi, 2.0) > 0.5 ? 1.0 : -1.0) * (0.5 + 0.5 * rand(vec2(bi * 0.37, tick)));
            vec2 m = uv;
            m.x += mix(randomDir, altDir, u_slice_order) * u_slice_shift / u_disp.x;
            m.y = (bi + bf + sin(bf * 3.14159) * u_slice_warp * 0.3) / n;
            uv = mix(uv, m, u_slice_wet);
        }`,
    },
    {
        key: 'pixelate', name: 'PIXELATE', cat: 'DISTORT', stage: 'uv',
        desc: 'Chunky pixel blocks',
        params: [
            { k: 'size', label: 'SIZE', min: 1, max: 64, step: 1, def: 6 },
        ],
        audio: { p: 'size', op: 'mul', k: 4 },
        glsl: `{
            vec2 cells = u_disp / max(1.0, u_pixelate_size);
            vec2 m = (floor(uv * cells) + 0.5) / cells;
            uv = mix(uv, m, step(0.5, u_pixelate_wet));
        }`,
    },
    {
        key: 'vhs', name: 'VHS', cat: 'DISTORT', stage: 'uv',
        desc: 'Tape tearing, jitter and vertical roll',
        params: [
            { k: 'vertical', label: 'ROLL', min: 0, max: 10, step: 0.1, def: 1 },
            { k: 'horizontal', label: 'JITTER', min: 0, max: 10, step: 0.1, def: 2 },
            { k: 'tear', label: 'TEAR', min: 0, max: 1, step: 0.01, def: 0.5 },
        ],
        audio: { p: 'horizontal', op: 'mul', k: 3 },
        glsl: `{
            vec2 m = uv;
            float lineY = floor(uv.y * u_disp.y * 0.5);
            float band = floor(uv.y * u_disp.y / 12.0);
            float tear = step(1.0 - u_vhs_tear * 0.35, rand(vec2(band, floor(u_time * 15.0))));
            m.x += tear * (rand(vec2(u_time, lineY)) - 0.5) * u_vhs_horizontal * 0.02;
            m.y += sin(u_time * 0.7) * u_vhs_vertical * 0.003;
            m.x += (rand(vec2(u_time * 7.0, lineY)) - 0.5) * u_vhs_horizontal * 0.003;
            uv = mix(uv, m, u_vhs_wet);
        }`,
    },

    // ── TIME (reads the previous frame) ───────────────────────────────────
    {
        key: 'feedback', name: 'FEEDBACK', cat: 'TIME', stage: 'time',
        desc: 'Video feedback tunnel: zoom, spin and drift the last frame',
        params: [
            { k: 'amount', label: 'AMOUNT', min: 0, max: 0.99, step: 0.01, def: 0.85 },
            { k: 'zoom', label: 'ZOOM', min: 0.8, max: 1.5, step: 0.001, def: 1.01 },
            { k: 'rotation', label: 'SPIN', min: -5, max: 5, step: 0.1, def: 0.2 },
            { k: 'x', label: 'DRIFT X', min: -0.1, max: 0.1, step: 0.001, def: 0 },
            { k: 'y', label: 'DRIFT Y', min: -0.1, max: 0.1, step: 0.001, def: 0 },
            { k: 'hue', label: 'HUE', min: 0, max: 50, step: 0.1, def: 2 },
            { k: 'spread', label: 'RGB GHOST', min: 0, max: 0.05, step: 0.001, def: 0 },
            { k: 'key', label: 'LUMA KEY', min: 0, max: 1, step: 0.01, def: 1 },
            blendParam,
        ],
        audio: { p: 'zoom', op: 'add', k: 0.3 },
        glsl: `{
            vec2 p = uv - 0.5; p.x *= u_aspect;
            p = rot2(radians(u_feedback_rotation)) * p / max(0.05, u_feedback_zoom);
            p.x /= u_aspect;
            vec2 fu = p + 0.5 - vec2(u_feedback_x, u_feedback_y);
            vec3 f;
            if (u_feedback_spread > 0.0001) {
                vec2 d = (fu - 0.5) * u_feedback_spread * 4.0;
                f = vec3(prev(fu + d).r, prev(fu).g, prev(fu - d).b);
            } else {
                f = prev(fu);
            }
            if (u_feedback_hue > 0.05) f = hueShift(f, u_feedback_hue / 360.0);
            float gate = 1.0 - smoothstep(u_feedback_key - 0.05, u_feedback_key + 0.001, luma(c));
            vec3 e = mix(c, f, u_feedback_amount * gate);
            FX_MIX(feedback)
        }`,
    },
    {
        key: 'melt', name: 'MELT', cat: 'TIME', stage: 'time',
        desc: 'Bright areas drip and smear over time',
        params: [
            { k: 'amount', label: 'AMOUNT', min: 0, max: 0.99, step: 0.01, def: 0.9 },
            { k: 'gravity', label: 'GRAVITY', min: -0.05, max: 0.05, step: 0.001, def: 0.01 },
            { k: 'turbulence', label: 'TURBULENCE', min: 0, max: 0.5, step: 0.01, def: 0.1 },
            blendParam,
        ],
        audio: { p: 'gravity', op: 'mul', k: 8 },
        glsl: `{
            vec2 m = uv;
            m.y -= u_melt_gravity * luma(c);
            m.x += sin(uv.y * 10.0 + u_time * 2.0) * u_melt_turbulence * 0.04;
            m.x += (snoise(uv * 8.0 + u_time) - 0.5) * u_melt_turbulence * 0.04;
            vec3 e = mix(c, prev(m), u_melt_amount);
            FX_MIX(melt)
        }`,
    },
    {
        key: 'motion', name: 'MOTION', cat: 'TIME', stage: 'color', prevBase: true,
        desc: 'Only what moved lights up (difference from the last frame)',
        params: [
            { k: 'threshold', label: 'THRESHOLD', min: 1, max: 255, step: 1, def: 25 },
            { k: 'tint', label: 'HEAT', min: 0, max: 1, step: 0.01, def: 0.5 },
            { k: 'boost', label: 'BOOST', min: 1, max: 6, step: 0.1, def: 2.5 },
            blendParam,
        ],
        audio: { p: 'threshold', op: 'sub', k: 0.8 },
        glsl: `{
            vec3 d = abs(c - prevBase(uv));
            float th = u_motion_threshold / 255.0;
            float k = smoothstep(th * 0.7, th * 1.3, dot(d, vec3(0.333)));
            vec3 e = mix(c * (1.0 - k), mix(d, d * vec3(1.0, 0.3, 0.1), u_motion_tint) * u_motion_boost, k);
            FX_MIX(motion)
        }`,
    },

    // ── COLOR ─────────────────────────────────────────────────────────────
    {
        key: 'rgbsplit', name: 'RGB SPLIT', cat: 'COLOR', stage: 'color', taps: true,
        desc: 'Pull the red and blue channels apart; WOBBLE adds noisy chroma drift',
        params: [
            { k: 'amount', label: 'AMOUNT', min: 0, max: 50, step: 0.5, def: 6 },
            { k: 'angle', label: 'ANGLE', min: 0, max: 360, step: 1, def: 0 },
            { k: 'wobble', label: 'WOBBLE', min: 0, max: 1, step: 0.01, def: 0 },
            blendParam,
        ],
        audio: { p: 'amount', op: 'mul', k: 8 },
        glsl: `{
            float s = u_rgbsplit_amount * 0.004;
            float a = radians(u_rgbsplit_angle);
            vec2 dir = vec2(cos(a), sin(a) * u_aspect) * s;
            if (u_rgbsplit_wobble > 0.001) {
                vec2 n = vec2(snoise(uv * 5.0 + u_time * 0.5), snoise(uv * 5.0 + u_time * 0.5 + 100.0)) - 0.5;
                dir += n * s * 6.0 * u_rgbsplit_wobble;
            }
            vec3 e = vec3(img(uv + dir).r, c.g, img(uv - dir).b);
            FX_MIX(rgbsplit)
        }`,
    },
    {
        key: 'grade', name: 'COLOR GRADE', cat: 'COLOR', stage: 'color',
        desc: 'Hue rotate, saturation, contrast and a monochrome tint',
        params: [
            { k: 'hue', label: 'HUE', min: 0, max: 360, step: 1, def: 0 },
            { k: 'saturation', label: 'SATURATION', min: 0, max: 3, step: 0.01, def: 1.4 },
            { k: 'contrast', label: 'CONTRAST', min: 0, max: 2, step: 0.01, def: 1.15 },
            { k: 'tint', label: 'TINT HUE', min: 0, max: 360, step: 1, def: 200 },
            { k: 'tintAmt', label: 'TINT', min: 0, max: 1, step: 0.01, def: 0 },
            blendParam,
        ],
        audio: { p: 'hue', op: 'add', k: 180 },
        glsl: `{
            vec3 e = hueShift(c, u_grade_hue / 360.0);
            e = mix(vec3(luma(e)), e, u_grade_saturation);
            e = (e - 0.5) * u_grade_contrast + 0.5;
            vec3 tintCol = hsl2rgb(vec3(u_grade_tint / 360.0, 1.0, clamp(luma(e), 0.0, 1.0)));
            e = mix(e, tintCol, u_grade_tintAmt);
            FX_MIX(grade)
        }`,
    },
    {
        key: 'thermal', name: 'THERMAL', cat: 'COLOR', stage: 'color',
        desc: 'False-colour heat camera',
        params: [
            { k: 'intensity', label: 'INTENSITY', min: 0, max: 1, step: 0.01, def: 1 },
            { k: 'bias', label: 'BIAS', min: -0.5, max: 0.5, step: 0.01, def: 0 },
            blendParam,
        ],
        audio: { p: 'bias', op: 'add', k: 0.3 },
        glsl: `{
            float l = clamp(luma(c) + u_thermal_bias, 0.0, 1.0);
            vec3 t = mix(vec3(0.0), vec3(0.0, 0.0, 0.8), smoothstep(0.0, 0.2, l));
            t = mix(t, vec3(0.8, 0.0, 0.6), smoothstep(0.2, 0.4, l));
            t = mix(t, vec3(1.0, 0.2, 0.0), smoothstep(0.4, 0.6, l));
            t = mix(t, vec3(1.0, 1.0, 0.0), smoothstep(0.6, 0.8, l));
            t = mix(t, vec3(1.0), smoothstep(0.8, 1.0, l));
            vec3 e = mix(c, t, u_thermal_intensity);
            FX_MIX(thermal)
        }`,
    },
    {
        key: 'bitcrush', name: 'BIT CRUSH', cat: 'COLOR', stage: 'color',
        desc: 'Posterize to a few levels with ordered (Bayer) dithering',
        params: [
            { k: 'levels', label: 'LEVELS', min: 2, max: 32, step: 1, def: 6 },
            { k: 'dither', label: 'DITHER', min: 0, max: 1, step: 0.01, def: 0.5 },
            { k: 'scale', label: 'DOT SIZE', min: 1, max: 16, step: 1, def: 2 },
            blendParam,
        ],
        audio: { p: 'levels', op: 'sub', k: 0.7 },
        glsl: `{
            float n = max(2.0, floor(u_bitcrush_levels)) - 1.0;
            float b = bayer4(floor(uv * u_disp / max(1.0, floor(u_bitcrush_scale))));
            vec3 e = floor(c * n + (b - 0.5) * u_bitcrush_dither + 0.5) / n;
            FX_MIX(bitcrush)
        }`,
    },

    // ── TEXTURE ───────────────────────────────────────────────────────────
    {
        key: 'halftone', name: 'HALFTONE', cat: 'TEXTURE', stage: 'color', taps: true,
        desc: 'Image rebuilt from a grid of dots sized by brightness',
        params: [
            { k: 'cell', label: 'CELL', min: 3, max: 40, step: 1, def: 10 },
            { k: 'size', label: 'DOT', min: 0.1, max: 1.5, step: 0.01, def: 1 },
            { k: 'depth', label: 'DEPTH', min: 0, max: 1, step: 0.01, def: 0.6 },
            blendParam,
        ],
        audio: { p: 'size', op: 'mul', k: 1.5 },
        glsl: `{
            float cs = max(3.0, u_halftone_cell);
            vec2 px = uv * u_disp;
            vec2 cc = (floor(px / cs) + 0.5) * cs;
            vec3 s = img(cc / u_disp);
            float r = cs * 0.5 * u_halftone_size * mix(1.0, luma(s) * 1.4, u_halftone_depth);
            float m = 1.0 - smoothstep(r - 1.0, r, length(px - cc));
            vec3 e = mix(c * 0.25, s, m);
            FX_MIX(halftone)
        }`,
    },
    {
        key: 'pixelsort', name: 'PIXEL SORT', cat: 'TEXTURE', stage: 'color', taps: true,
        desc: 'Bright pixels smear into streaks; SCATTER sprays them like particles',
        params: [
            { k: 'threshold', label: 'THRESHOLD', min: 0, max: 1, step: 0.01, def: 0.5 },
            { k: 'length', label: 'LENGTH', min: 0, max: 1, step: 0.01, def: 0.6 },
            { k: 'angle', label: 'ANGLE', min: 0, max: 360, step: 1, def: 0 },
            { k: 'scatter', label: 'SCATTER', min: 0, max: 1, step: 0.01, def: 0 },
            blendParam,
        ],
        audio: { p: 'threshold', op: 'sub', k: 0.5 },
        glsl: `{
            float th = u_pixelsort_threshold;
            float h = rand(floor(uv * u_disp * 0.5));
            float a = radians(u_pixelsort_angle) + (h - 0.5) * 3.14159 * u_pixelsort_scatter;
            float len = u_pixelsort_length * 0.25 * mix(1.0, fract(u_time * 0.3 + h), u_pixelsort_scatter);
            vec2 dir = vec2(cos(a), sin(a) * u_aspect) * len;
            // Look back along the streak: any pixel brighter than THRESHOLD is dragged forward, fading with distance.
            vec3 acc = c;
            for (int i = 1; i <= 6; i++) {
                float t = float(i) / 6.0;
                vec3 s = img(uv - dir * t);
                acc = max(acc, s * smoothstep(th, th + 0.06, luma(s)) * (1.0 - t * 0.5));
            }
            vec3 e = acc;
            FX_MIX(pixelsort)
        }`,
    },
    {
        key: 'edges', name: 'EDGES', cat: 'TEXTURE', stage: 'color', taps: true,
        desc: 'Sobel outline — mono, coloured or inverted',
        params: [
            { k: 'threshold', label: 'THRESHOLD', min: 1, max: 255, step: 1, def: 50 },
            { k: 'glow', label: 'GLOW', min: 0, max: 1, step: 0.01, def: 0.3 },
            { k: 'mode', label: 'STYLE', min: 0, max: 2, step: 1, def: 0, opts: ['MONO', 'COLOR', 'INVERT'] },
            blendParam,
        ],
        audio: { p: 'threshold', op: 'sub', k: 0.8 },
        glsl: `{
            vec2 t = 1.0 / u_res;
            float tl = luma(img(uv + vec2(-t.x, -t.y))), tc = luma(img(uv + vec2(0.0, -t.y))), tr = luma(img(uv + vec2(t.x, -t.y)));
            float ml = luma(img(uv + vec2(-t.x, 0.0))),                                       mr = luma(img(uv + vec2(t.x, 0.0)));
            float bl = luma(img(uv + vec2(-t.x, t.y))),  bc = luma(img(uv + vec2(0.0, t.y))),  br = luma(img(uv + vec2(t.x, t.y)));
            float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
            float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
            float th = u_edges_threshold / 255.0;
            float ed = smoothstep(th * 0.5, th * (1.0 + u_edges_glow * 2.0), length(vec2(gx, gy)));
            vec3 e = u_edges_mode < 0.5 ? vec3(ed) : (u_edges_mode < 1.5 ? c * ed : vec3(1.0 - ed));
            FX_MIX(edges)
        }`,
    },
    {
        key: 'crt', name: 'CRT', cat: 'TEXTURE', stage: 'final',
        desc: 'Scan lines, film grain and vignette',
        params: [
            { k: 'lines', label: 'SCANLINES', min: 0, max: 1, step: 0.01, def: 0.12 },
            { k: 'density', label: 'DENSITY', min: 0.05, max: 1, step: 0.01, def: 0.7 },
            { k: 'grain', label: 'GRAIN', min: 0, max: 1, step: 0.01, def: 0 },
            { k: 'chroma', label: 'GRAIN TYPE', min: 0, max: 1, step: 1, def: 0, opts: ['MONO', 'COLOR'] },
            { k: 'vignette', label: 'VIGNETTE', min: 0, max: 1, step: 0.01, def: 0.25 },
            blendParam,
        ],
        audio: { p: 'grain', op: 'add', k: 0.4 },
        glsl: `{
            float line = sin(uv.y * u_crt_density * u_disp.y * 0.5) * 0.5 + 0.5;
            vec3 e = c * mix(1.0, line, u_crt_lines);
            if (u_crt_grain > 0.001) {
                vec2 gp = floor(uv * u_disp) + fract(u_time) * 91.7;
                vec3 n = u_crt_chroma > 0.5
                    ? vec3(rand(gp), rand(gp + 7.0), rand(gp + 13.0)) - 0.5
                    : vec3(rand(gp) - 0.5);
                e += n * u_crt_grain * 0.5;
            }
            vec2 v = uv - 0.5;
            e *= 1.0 - u_crt_vignette * smoothstep(0.25, 0.8, length(v) * 1.15);
            FX_MIX(crt)
        }`,
    },
    {
        key: 'strobe', name: 'STROBE', cat: 'TEXTURE', stage: 'final',
        desc: 'Flashes at a fixed rate, or on the beat when an audio band is picked. Contains flashing light.',
        params: [
            { k: 'rate', label: 'RATE HZ', min: 1, max: 20, step: 0.5, def: 6 },
            { k: 'hold', label: 'HOLD', min: 0.05, max: 0.95, step: 0.01, def: 0.3 },
            { k: 'style', label: 'STYLE', min: 0, max: 2, step: 1, def: 0, opts: ['WHITE', 'BLACK', 'INVERT'] },
            { k: 'power', label: 'POWER', min: 0, max: 1, step: 0.01, def: 0.8 },
        ],
        audio: { trigger: true },
        glsl: `{
            vec3 target = u_strobe_style < 0.5 ? vec3(1.0) : (u_strobe_style < 1.5 ? vec3(0.0) : 1.0 - c);
            c = mix(c, target, u_strobe_level * u_strobe_power * u_strobe_wet);
        }`,
    },
];

const FX_CATS = ['DISTORT', 'TIME', 'COLOR', 'TEXTURE'];
const FX_BY_KEY = Object.fromEntries(FX_DEFS.map(d => [d.key, d]));

// ─── Gesture effects ────────────────────────────────────────────────────────
// Driven by a "palm" point in screen UV (from hand tracking, or from the
// biggest motion blob when AI is off), a 0-1 pinch strength and a two-hand
// span. warp chunks displace `puv` before the image is read; overlay chunks
// draw on `c` at the end.
const GESTURE_DEFS = [
    { key: 'lens', name: 'LENS', kind: 'warp', desc: 'Swirling magnifier under the palm',
      glsl: `{
        vec2 d = puv - u_palm; d.x *= u_aspect;
        float radius = 0.15 + u_pinch * 0.25;
        float f = 1.0 - smoothstep(0.0, radius, length(d));
        vec2 q = rot2(f * f * u_pinch * 2.5) * (puv - u_palm);
        puv = u_palm + q * (1.0 - f * u_pinch * 0.5);
      }` },
    { key: 'shock', name: 'SHOCK', kind: 'warp', desc: 'Pinch fires an expanding shockwave',
      glsl: `{
        if (u_shockT > 0.01 && u_shockT < 1.0) {
            vec2 d = puv - u_palm; d.x *= u_aspect;
            float rr = u_shockT * 1.2, w = 0.04 + u_shockT * 0.06, dist = length(d);
            float ring = smoothstep(rr - w, rr - w * 0.3, dist) * smoothstep(rr + w * 0.3, rr - w * 0.3, dist);
            puv += normalize(d + 0.0001) * ring * (1.0 - u_shockT) * 0.08;
        }
      }` },
    { key: 'wave', name: 'WAVE', kind: 'warp', desc: 'Sine waves radiate from the palm',
      glsl: `{
        vec2 d = puv - u_palm; d.x *= u_aspect;
        float dist = length(d);
        float amp = 0.03 * u_pinch * (1.0 - smoothstep(0.0, 0.5, dist));
        puv += normalize(d + 0.0001) * sin(dist * (15.0 + u_pinch * 25.0) - u_time * 5.0) * amp;
      }` },
    { key: 'ripple', name: 'RIPPLE', kind: 'warp', desc: 'Water ripples around the palm',
      glsl: `{
        vec2 d = puv - u_palm; d.x *= u_aspect;
        float dist = length(d);
        float rp = sin(dist * (12.0 + u_pinch * 20.0) - u_time * (4.0 + u_pinch * 6.0)) * 0.5 + 0.5;
        puv += normalize(d + 0.0001) * 0.02 * u_pinch * (1.0 - smoothstep(0.0, 0.6, dist)) * rp;
      }` },
    { key: 'gravity', name: 'GRAVITY', kind: 'warp', desc: 'A black hole that bends the image',
      glsl: `{
        vec2 d = puv - u_palm; d.x *= u_aspect;
        float dist = length(d);
        float horizon = 0.08 + u_pinch * 0.12;
        if (dist < horizon) puv = u_palm + (puv - u_palm) * (1.0 - (1.0 - dist / horizon) * u_pinch * 0.5);
        else puv -= normalize(d) * u_pinch * 0.0075 / (dist * dist + 0.01) * (1.0 - smoothstep(0.3, 0.6, dist));
      }` },
    { key: 'freeze', name: 'FREEZE', kind: 'pre', desc: 'Radial motion blur pulled toward the palm',
      glsl: `{
        vec2 d = uv - u_palm; d.x *= u_aspect;
        float f = pow(max(0.0, 1.0 - smoothstep(0.0, 0.15 + u_pinch * 0.25, length(d))), 1.5) * u_pinch;
        if (f > 0.01) {
            vec2 dir = normalize(u_palm - uv + 0.0001);
            vec3 acc = vec3(0.0); float wsum = 0.0;
            for (int i = 0; i < 8; i++) {
                float t = float(i) / 8.0;
                acc += img(uv + dir * f * t * 0.1) * (1.0 - t); wsum += 1.0 - t;
            }
            c = mix(c, acc / wsum, f);
        }
      }` },
    { key: 'energy', name: 'ENERGY', kind: 'overlay', desc: 'A colour-cycling glow follows the palm',
      glsl: `{
        vec2 d = uv - u_palm; d.x *= u_aspect;
        float dist = length(d);
        float gr = 0.08 + u_pinch * 0.35;
        vec3 col = hue2rgb(fract(u_time * 0.1 + u_pinch * 0.5));
        c += col * exp(-dist * dist / (gr * gr * 0.5)) * (0.4 + u_pinch * 1.2);
        float ring = smoothstep(gr - 0.02, gr, dist) * smoothstep(gr + 0.04, gr, dist);
        c += col * ring * (0.5 + 0.5 * sin(u_time * 8.0)) * u_pinch;
      }` },
    { key: 'pulse', name: 'PULSE', kind: 'overlay', desc: 'Rings pulse outward from the palm',
      glsl: `{
        vec2 d = uv - u_palm; d.x *= u_aspect;
        float dist = length(d);
        float p = sin(dist * (8.0 + u_pinch * 12.0) - u_time * 8.0) * 0.5 + 0.5;
        float f = 1.0 - smoothstep(0.0, 0.1 + u_pinch * 0.3, dist);
        vec3 col = 0.5 + 0.5 * sin(u_time * 3.0 + vec3(0.0, 2.09, 4.19));
        c = mix(c, col, p * f * u_pinch * 1.05);
      }` },
    { key: 'theremin', name: 'THEREMIN', kind: 'overlay', desc: 'Two hands: interference rings around your hand whose pitch follows the distance between hands',
      glsl: `{
        if (u_span > 0.05) {
            vec2 d = uv - u_palm; d.x *= u_aspect;
            float dist = length(d);
            float fr = 10.0 + u_span * 60.0;
            float pt = (sin((d.x + d.y) * fr + u_time * 3.0) + sin((d.x - d.y) * fr * 0.7 - u_time * 2.3)
                      + sin(dist * fr * 1.3 - u_time * 1.7)) / 3.0;
            vec3 col = 0.5 + 0.5 * sin(pt * 3.14 + vec3(0.0, 2.09, 4.19));
            c = mix(c, col, u_span * 0.6 * abs(pt) * (1.0 - smoothstep(0.1, 0.25 + u_span * 0.6, dist)));
        }
      }` },
];
const GESTURE_BY_KEY = Object.fromEntries(GESTURE_DEFS.map(d => [d.key, d]));

// Shared GLSL helpers (GLSL ES 1.00 so it runs on WebGL1 and WebGL2).
const GLSL_COMMON = `
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
float snoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(rand(i), rand(i + vec2(1.0, 0.0)), f.x), mix(rand(i + vec2(0.0, 1.0)), rand(i + 1.0), f.x), f.y);
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
mat2 rot2(float a) { float s = sin(a), c = cos(a); return mat2(c, s, -s, c); }
vec3 hue2rgb(float h) { return clamp(vec3(abs(h * 6.0 - 3.0) - 1.0, 2.0 - abs(h * 6.0 - 2.0), 2.0 - abs(h * 6.0 - 4.0)), 0.0, 1.0); }
vec3 hsl2rgb(vec3 c) { return (hue2rgb(c.x) - 0.5) * (1.0 - abs(2.0 * c.z - 1.0)) * c.y + c.z; }
vec3 hueShift(vec3 c, float turns) {
    const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
    const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
    vec3 yiq = toYIQ * c;
    yiq.yz = rot2(turns * 6.2831853) * yiq.yz;
    return toRGB * yiq;
}
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
vec3 applyBlend(vec3 b, vec3 e, float mode) {
    vec3 r = e;
    if (mode > 0.5) {
        if (mode < 1.5) r = b + e;
        else if (mode < 2.5) r = b * e;
        else if (mode < 3.5) r = 1.0 - (1.0 - b) * (1.0 - e);
        else if (mode < 4.5) r = abs(b - e);
        else r = mix(2.0 * b * e, 1.0 - 2.0 * (1.0 - b) * (1.0 - e), step(0.5, luma(b)));
    }
    return clamp(r, 0.0, 1.0);
}
`;

// Expand FX_MIX(key) → blend + wet mix. Effects without a blend param mix directly.
function fxChunk(def) {
    const hasBlend = def.params.some(p => p.k === 'blend');
    return def.glsl.replace(/FX_MIX\((\w+)\)/g, (_, k) => hasBlend
        ? `c = mix(c, applyBlend(c, e, u_${k}_blend), u_${k}_wet);`
        : `c = mix(c, e, u_${k}_wet);`);
}

function fxUniformDecls(def) {
    return def.params.map(p => `uniform float u_${def.key}_${p.k};`).join('\n') + `\nuniform float u_${def.key}_wet;` +
        (def.key === 'strobe' ? '\nuniform float u_strobe_level;' : '');
}

window.D4R = Object.assign(window.D4R || {}, {
    BLEND_NAMES, FX_DEFS, FX_CATS, FX_BY_KEY, GESTURE_DEFS, GESTURE_BY_KEY, GLSL_COMMON, fxChunk, fxUniformDecls,
});
