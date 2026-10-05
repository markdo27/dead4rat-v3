// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — LOOK STATE
//
// A "look" is everything a scene stores: which effects are on and their
// settings, the generator and its settings, and the global modulation rate.
// Output settings (format, quality, flips) are not part of a look.
//
//   look = {
//     fx:  { [key]: { on, band: null|'BASS'|'MID'|'HIGH', params: {k: v}, lfo: {k: wave} } },
//     gen: { mode: 'OFF'|<scene>, band, camKey, params: {k: v}, lfo: {k: wave} },
//     mod: { rate, depth },
//   }
//
// Parameter values in a look are always the user's base values; LFO and
// audio modulation are applied per frame by resolveFx/resolveGen and never
// written back, so saving a scene mid-wobble stores the real settings.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
const { FX_DEFS, FX_BY_KEY, GEN_PARAMS, GEN_BY_KEY } = window.D4R;

const LFO_WAVES = ['sin', 'tri', 'saw', 'rnd'];
// Scenes that were merged or retired → closest surviving scene (old presets / links).
const GEN_ALIASES = {
    'ACID TUNNEL': 'CUBE FIELD', 'QUAT JULIA': 'MANDELBULB', 'MANDELBOX': 'SIERPINSKI', 'VORONOI': 'GYROID',
    'MYCELIUM': 'FLOW FIELD', 'PORTAL STORM': 'NEON HELIX',
    'RADIANT HORIZON': 'SOLAR CORONA', 'FRACTAL PYRAMID': 'MANDELBULB', 'NEON CAVES': 'BIO ABYSS',
};
const BANDS = ['BASS', 'MID', 'HIGH'];

function defaultLook() {
    const fx = {};
    for (const d of FX_DEFS) {
        fx[d.key] = { on: false, band: null, params: Object.fromEntries(d.params.map(p => [p.k, p.def])), lfo: {} };
    }
    fx.crt.on = true; // the signature scan-line look, as before
    return {
        fx,
        gen: { mode: 'OFF', band: 'MID', camKey: 0.55, params: Object.fromEntries(GEN_PARAMS.map(p => [p.k, p.def])), lfo: {} },
        mod: { rate: 1.0, depth: 0.5 },
    };
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Make any partial / older look safe to use: fill missing keys with defaults
// and clamp values into range.
function normalizeLook(look) {
    const base = defaultLook();
    if (!look || typeof look !== 'object') return base;
    for (const d of FX_DEFS) {
        const src = look.fx && look.fx[d.key];
        if (!src) { base.fx[d.key].on = false; continue; }
        const dst = base.fx[d.key];
        dst.on = !!src.on;
        dst.band = BANDS.includes(src.band) ? src.band : null;
        for (const p of d.params) {
            const v = src.params && src.params[p.k];
            if (typeof v === 'number' && isFinite(v)) dst.params[p.k] = clamp(v, p.min, p.max);
            const w = src.lfo && src.lfo[p.k];
            if (LFO_WAVES.includes(w)) dst.lfo[p.k] = w;
        }
    }
    if (look.gen) {
        const g = look.gen;
        const mode = GEN_ALIASES[g.mode] || g.mode;
        base.gen.mode = (mode === 'OFF' || GEN_BY_KEY[mode]) ? mode : 'OFF';
        base.gen.band = BANDS.includes(g.band) ? g.band : null;
        if (typeof g.camKey === 'number') base.gen.camKey = clamp(g.camKey, 0, 1);
        for (const p of GEN_PARAMS) {
            const v = g.params && g.params[p.k];
            if (typeof v === 'number' && isFinite(v)) base.gen.params[p.k] = clamp(v, p.min, p.max);
            const w = g.lfo && g.lfo[p.k];
            if (LFO_WAVES.includes(w)) base.gen.lfo[p.k] = w;
        }
    }
    if (look.mod) {
        if (typeof look.mod.rate === 'number') base.mod.rate = clamp(look.mod.rate, 0.1, 10);
        if (typeof look.mod.depth === 'number') base.mod.depth = clamp(look.mod.depth, 0, 1);
    }
    return base;
}

// ── Modulation ─────────────────────────────────────────────────────────────
function hash1(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

function lfoValue(wave, t) {
    switch (wave) {
        case 'sin': return Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
        case 'tri': return Math.abs(((t % 1) * 2) - 1);
        case 'saw': return t - Math.floor(t);
        case 'rnd': return hash1(Math.floor(t)); // sample & hold, one step per cycle
        default: return 0.5;
    }
}

function modulate(spec, base, wave, band, audioSpec, t, mod) {
    let v = base;
    const range = spec.max - spec.min;
    if (wave) v += (lfoValue(wave, t * mod.rate) - 0.5) * mod.depth * range;
    if (band !== null && audioSpec && audioSpec.p === spec.k) {
        if (audioSpec.op === 'mul') v *= 1 + band * audioSpec.k;
        else if (audioSpec.op === 'add') v += band * audioSpec.k;
        else if (audioSpec.op === 'sub') v *= Math.max(0.1, 1 - band * audioSpec.k);
    }
    return clamp(v, spec.min, spec.max);
}

// Per-frame effect values. `bands` = { BASS, MID, HIGH } levels 0-1.
function resolveFxValues(def, fxState, t, mod, bands) {
    const out = {};
    const band = fxState.band ? bands[fxState.band] || 0 : null;
    for (const p of def.params) {
        const base = fxState.params[p.k];
        const wave = fxState.lfo[p.k];
        out[p.k] = (wave || band !== null) ? modulate(p, base, wave, band, def.audio, t, mod) : base;
    }
    return out;
}

function resolveGenValues(gen, t, mod) {
    const out = {};
    for (const p of GEN_PARAMS) {
        const wave = gen.lfo[p.k];
        out[p.k] = wave ? modulate(p, gen.params[p.k], wave, null, null, t, mod) : gen.params[p.k];
    }
    return out;
}

// ── Share links ────────────────────────────────────────────────────────────
// Only non-default values are written, so links stay short.
function encodeLook(look) {
    const def = defaultLook();
    const f = {};
    for (const d of FX_DEFS) {
        const s = look.fx[d.key], ds = def.fx[d.key];
        const params = {};
        for (const p of d.params) if (s.params[p.k] !== ds.params[p.k]) params[p.k] = +s.params[p.k].toFixed(4);
        const lfo = Object.keys(s.lfo).length ? s.lfo : undefined;
        if (s.on || Object.keys(params).length || lfo || s.band) {
            f[d.key] = { o: s.on ? 1 : 0, ...(s.band ? { b: s.band } : {}), ...(Object.keys(params).length ? { p: params } : {}), ...(lfo ? { l: lfo } : {}) };
        }
    }
    const gp = {};
    for (const p of GEN_PARAMS) if (look.gen.params[p.k] !== def.gen.params[p.k]) gp[p.k] = +look.gen.params[p.k].toFixed(4);
    const payload = {
        v: 2, f,
        g: { m: look.gen.mode, b: look.gen.band, k: look.gen.camKey, ...(Object.keys(gp).length ? { p: gp } : {}), ...(Object.keys(look.gen.lfo).length ? { l: look.gen.lfo } : {}) },
        r: [look.mod.rate, look.mod.depth],
    };
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeLook(str) {
    try {
        let b64 = str.trim().replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const raw = atob(b64);
        // v1 links were btoa(encodeURIComponent(json)) → starts with '%'; v2 is UTF-8 bytes.
        const json = raw.startsWith('%') ? decodeURIComponent(raw) : decodeURIComponent(escape(raw));
        const d = JSON.parse(json);
        if (d.v === 2) {
            const look = { fx: {}, gen: {}, mod: { rate: d.r?.[0], depth: d.r?.[1] } };
            for (const [k, s] of Object.entries(d.f || {})) look.fx[k] = { on: !!s.o, band: s.b || null, params: s.p || {}, lfo: s.l || {} };
            look.gen = { mode: d.g?.m, band: d.g?.b ?? null, camKey: d.g?.k, params: d.g?.p || {}, lfo: d.g?.l || {} };
            // Fill params with defaults before normalising (missing = default)
            return normalizeLook(look);
        }
        if (d.g) return migrateLegacy(d.g, d.m, d.p); // v1 link from the old app
    } catch (e) { console.warn('[D4R] could not read shared look', e); }
    return null;
}

// ── Legacy (v1) presets / share links → merged effect set ─────────────────
// v1 had 28 effects; several were merged here. Map each old effect onto its
// new home so saved presets keep working.
function migrateLegacy(g, genMode, genParams) {
    const look = defaultLook();
    const F = look.fx;
    const val = (k, p, dflt) => (g[k] && g[k].params && g[k].params[p] && typeof g[k].params[p].value === 'number') ? g[k].params[p].value : dflt;
    const on = (k) => !!(g[k] && g[k].enabled);
    const band = (k) => (g[k] && g[k].audioReactive) ? (g[k].audioBand || 'MID') : null;
    const blend = (k) => Math.round(val(k, 'blendMode', 0));
    // v1 blend indices 4/5 were labelled OVERLAY/DIFFER but rendered DIFFERENCE/OVERLAY; indices match the shader here.
    const set = (key, isOn, params, fromKey) => {
        const f = F[key];
        f.on = f.on || isOn;
        if (isOn || !f.touched) {
            Object.assign(f.params, params);
            if (fromKey) { f.band = f.band || band(fromKey); }
            f.touched = isOn;
        }
    };
    F.crt.on = false;
    set('crt', on('scanLines') || on('noise'), {
        lines: val('scanLines', 'opacity', 0.12), density: val('scanLines', 'density', 0.7),
        grain: on('noise') ? val('noise', 'amount', 0.1) : 0, chroma: val('noise', 'chromatic', 0), vignette: 0,
        blend: blend('scanLines'),
    }, on('scanLines') ? 'scanLines' : 'noise');
    set('rgbsplit', on('rgbShift') || on('chromaGlitch'), {
        amount: on('rgbShift') ? val('rgbShift', 'amount', 5) * 2.5 : val('chromaGlitch', 'shiftAmount', 10) * 0.25,
        angle: val('rgbShift', 'angle', 0), wobble: on('chromaGlitch') ? 0.6 : 0, blend: blend(on('rgbShift') ? 'rgbShift' : 'chromaGlitch'),
    }, on('rgbShift') ? 'rgbShift' : 'chromaGlitch');
    set('grade', on('colorDistortion') || on('colorize'), {
        hue: on('colorDistortion') ? val('colorDistortion', 'hue', 0) : 0,
        saturation: on('colorDistortion') ? Math.min(3, val('colorDistortion', 'saturation', 1)) : 1,
        tint: val('colorize', 'hue', 200), tintAmt: on('colorize') ? val('colorize', 'strength', 0.5) : 0,
        blend: blend(on('colorDistortion') ? 'colorDistortion' : 'colorize'),
    }, on('colorDistortion') ? 'colorDistortion' : 'colorize');
    set('pixelate', on('blockiness'), { size: val('blockiness', 'size', 4) }, 'blockiness');
    set('vhs', on('vhsJitter'), { vertical: val('vhsJitter', 'vertical', 1), horizontal: val('vhsJitter', 'horizontal', 1), tear: val('vhsJitter', 'tear', 0.3) }, 'vhsJitter');
    set('feedback', on('videoFeedback') || on('chromaDelay'), {
        amount: on('videoFeedback') ? val('videoFeedback', 'amount', 0.8) : val('chromaDelay', 'amount', 0.8),
        zoom: on('videoFeedback') ? val('videoFeedback', 'zoom', 1.005) : 1.0,
        rotation: on('videoFeedback') ? val('videoFeedback', 'rotation', 0) : 0,
        x: val('videoFeedback', 'moveX', 0), y: val('videoFeedback', 'moveY', 0),
        hue: on('videoFeedback') ? val('videoFeedback', 'hueShift', 2) : 0,
        key: val('videoFeedback', 'lumaThresh', 1),
        spread: on('chromaDelay') ? Math.min(0.05, Math.abs(val('chromaDelay', 'scaleR', 1.01) - val('chromaDelay', 'scaleB', 0.99)) / 8) : 0,
        blend: blend('videoFeedback'),
    }, on('videoFeedback') ? 'videoFeedback' : 'chromaDelay');
    set('melt', on('acidMelt'), { amount: val('acidMelt', 'amount', 0.9), gravity: val('acidMelt', 'gravity', 0.01), turbulence: val('acidMelt', 'turbulence', 0.05), blend: blend('acidMelt') }, 'acidMelt');
    set('edges', on('edgeDetection'), {
        threshold: val('edgeDetection', 'threshold', 50), glow: val('edgeDetection', 'glow', 0.3),
        mode: val('edgeDetection', 'colorMode', 0) > 0.5 ? 1 : (val('edgeDetection', 'invert', 0) > 0.5 ? 2 : 0),
        blend: blend('edgeDetection'),
    }, 'edgeDetection');
    set('halftone', on('dataPointCloud'), { cell: Math.max(3, val('dataPointCloud', 'density', 0.2) * 50), size: 1, depth: val('dataPointCloud', 'depth', 0.5), blend: blend('dataPointCloud') }, 'dataPointCloud');
    set('motion', on('motionDetection'), { threshold: val('motionDetection', 'threshold', 25), tint: val('motionDetection', 'tint', 0.5), blend: blend('motionDetection') }, 'motionDetection');
    set('mirror', on('kaleidoscope') || on('mirrorTile'), on('kaleidoscope')
        ? { mode: 0, count: val('kaleidoscope', 'segments', 6), rotation: val('kaleidoscope', 'rotation', 0), zoom: val('kaleidoscope', 'zoom', 1) }
        : { mode: 1, count: Math.max(2, val('mirrorTile', 'tilesX', 2)), rotation: 0, zoom: 1 }, on('kaleidoscope') ? 'kaleidoscope' : 'mirrorTile');
    set('warp', on('barrelDistortion') || on('vortexWarp'), {
        lens: on('barrelDistortion') ? val('barrelDistortion', 'amount', 0.5) : 0,
        twist: on('vortexWarp') ? val('vortexWarp', 'strength', 2) : 0,
        radius: val('vortexWarp', 'radius', 0.5),
        x: on('barrelDistortion') ? val('barrelDistortion', 'centerX', 0.5) : val('vortexWarp', 'centerX', 0.5),
        y: on('barrelDistortion') ? val('barrelDistortion', 'centerY', 0.5) : val('vortexWarp', 'centerY', 0.5),
    }, on('barrelDistortion') ? 'barrelDistortion' : 'vortexWarp');
    set('pixelsort', on('pixelSort') || on('particleDisp'), {
        threshold: on('pixelSort') ? val('pixelSort', 'threshold', 0.5) : 1 - val('particleDisp', 'amount', 0.5),
        angle: on('pixelSort') ? (val('pixelSort', 'direction', 0) > 0.5 ? 90 : 0) : val('particleDisp', 'direction', 0),
        scatter: on('particleDisp') ? 0.8 : 0, length: 0.4, blend: blend(on('pixelSort') ? 'pixelSort' : 'particleDisp'),
    }, on('pixelSort') ? 'pixelSort' : 'particleDisp');
    set('bitcrush', on('posterize') || on('ditherMatrix'), {
        levels: on('posterize') ? val('posterize', 'levels', 8) : 2,
        dither: on('ditherMatrix') ? Math.min(1, val('ditherMatrix', 'contrast', 1)) : 0,
        scale: Math.min(16, val('ditherMatrix', 'scale', 4)), blend: blend(on('posterize') ? 'posterize' : 'ditherMatrix'),
    }, on('posterize') ? 'posterize' : 'ditherMatrix');
    set('slice', on('glitchSlicer') || on('splitScan'), on('glitchSlicer')
        ? { bands: val('glitchSlicer', 'slices', 8), shift: val('glitchSlicer', 'offset', 30), speed: val('glitchSlicer', 'speed', 5), order: 0, warp: 0 }
        : { bands: val('splitScan', 'bands', 8), shift: val('splitScan', 'shift', 50), speed: 2, order: 1, warp: val('splitScan', 'warp', 0.3) },
        on('glitchSlicer') ? 'glitchSlicer' : 'splitScan');
    set('thermal', on('thermalVision'), { intensity: val('thermalVision', 'intensity', 1), bias: val('thermalVision', 'bias', 0), blend: blend('thermalVision') }, 'thermalVision');
    set('strobe', false, { rate: Math.min(20, val('stroboscope', 'rate', 4)), hold: Math.max(0.05, Math.min(0.95, 1 - val('stroboscope', 'hold', 0.5))) }, 'stroboscope');
    for (const k of Object.keys(F)) delete F[k].touched;

    const mode = GEN_ALIASES[genMode] || genMode;
    if (mode && GEN_BY_KEY[mode]) look.gen.mode = mode;
    if (genParams) for (const p of GEN_PARAMS) {
        const v = genParams[p.k] && genParams[p.k].value;
        if (typeof v === 'number') look.gen.params[p.k] = clamp(v, p.min, p.max);
    }
    return normalizeLook(look);
}

window.D4R = Object.assign(window.D4R, {
    LFO_WAVES, BANDS, defaultLook, normalizeLook, clone, clamp, lfoValue,
    resolveFxValues, resolveGenValues, encodeLook, decodeLook, migrateLegacy,
});
})();
