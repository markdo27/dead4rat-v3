// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT — GENERATIVE SCENES
//
// Every scene is a signed-distance function (the body of mapGen) that the
// renderer compiles into its own small ray-marching program and draws into a
// reduced-resolution texture. Only the active scene is ever compiled.
//
// Uniforms available to scene bodies:
//   u_time, u_transient (0-1 beat envelope), ABnd (selected audio band 0-1)
//   u_genSpeed u_genWarp u_genDensity u_genIter u_genColor1 u_genColor2
// ═══════════════════════════════════════════════════════════════════════════

const GEN_PARAMS = [
    { k: 'speed', label: 'SPEED', min: 0, max: 3, step: 0.01, def: 1.0 },
    { k: 'zoom', label: 'ZOOM', min: 0.1, max: 3, step: 0.01, def: 1.0 },
    { k: 'warp', label: 'WARP', min: 0, max: 2, step: 0.01, def: 1.0 },
    { k: 'density', label: 'DENSITY', min: 0.1, max: 3, step: 0.01, def: 1.0 },
    { k: 'iterations', label: 'DETAIL', min: 0, max: 1, step: 0.01, def: 0.5 },
    { k: 'colorA', label: 'PALETTE', min: 0, max: 1, step: 0.01, def: 0.0 },
    { k: 'colorB', label: 'CHROMA', min: 0, max: 1, step: 0.01, def: 0.5 },
    { k: 'rotateX', label: 'TILT X', min: 0, max: 6.28, step: 0.01, def: 0 },
    { k: 'rotateY', label: 'TILT Y', min: 0, max: 6.28, step: 0.01, def: 0 },
    { k: 'rotateZ', label: 'ROLL', min: 0, max: 6.28, step: 0.01, def: 0 },
];

const GEN_GROUPS = ['TUNNELS', 'FORMS', 'FIELDS'];

const GEN_DEFS = [
    {
        key: 'GRID TUNNEL', group: 'TUNNELS', fog: [0.02, 0.04, 0.12],
        glsl: `
            p.z -= u_time * u_genSpeed * 5.0 + ABnd * 4.0 * u_genWarp;
            vec3 warp = vec3(
                snoise(vec2(p.y * 0.4 + u_time * 0.11, p.z * 0.4)),
                snoise(vec2(p.z * 0.4 + u_time * 0.09, p.x * 0.4 + 5.3)),
                snoise(vec2(p.x * 0.4 + u_time * 0.13, p.y * 0.4 + 11.7))) * u_genWarp * 0.65;
            vec3 q = p + warp;
            q.xy *= rot(q.z * 0.07 * u_genWarp + ABnd * 0.4);
            q = mod(q + 2.0, 4.0) - 2.0;
            float noiseR = snoise(vec2(p.x * 0.7 + u_time * 0.2, p.y * 0.7)) * 0.5 + 0.5;
            float r = (0.045 + noiseR * 0.045) * u_genDensity + ABnd * 0.18 * u_genWarp;
            float bX = max(abs(q.y), abs(q.z)) - r;
            float bY = max(abs(q.x), abs(q.z)) - r;
            float bZ = max(abs(q.x), abs(q.y)) - r;
            return min(bX, min(bY, bZ));`,
    },
    {
        key: 'BIO ABYSS', group: 'TUNNELS', fog: [0.0, 0.06, 0.04],
        glsl: `
            p.z -= u_time * u_genSpeed * 4.5;
            float fbmD = fbm3(p * 0.45 + u_time * 0.07) * u_genWarp * 1.5;
            float detail = snoise(vec2(p.x * 2.0 + u_time * 0.2, p.y * 2.0)) * 0.28 * u_genWarp;
            float tunnelR = 2.1 + fbmD + ABnd * 0.9 * u_genWarp;
            float d = tunnelR - length(p.xy + vec2(detail));
            float bump = sin(p.x * 3.0 + u_time * 0.3) * sin(p.y * 2.7) * sin(p.z * 1.5 + u_time * 0.2);
            d -= bump * (0.35 + ABnd * u_genWarp * 0.55);
            vec3 qp = vec3(mod(p.x + 1.0, 2.0) - 1.0, mod(p.y + 1.0, 2.0) - 1.0, mod(p.z + 1.5, 3.0) - 1.5);
            float pockets = length(qp) - (0.14 + ABnd * 0.07) * u_genDensity;
            return smin(d, pockets, 0.25);`,
    },
    {
        key: 'NEON HELIX', group: 'TUNNELS', fog: [0.0, 0.08, 0.04],
        glsl: `
            p.z -= u_time * u_genSpeed * 5.5;
            p.xy *= rot(u_time * 0.04);
            float freq2 = 0.9 + u_genDensity * 0.7;
            float helixR = 0.55 + u_genWarp * ABnd * 0.25;
            float twist = p.z * freq2;
            vec2 h1 = vec2(cos(twist), sin(twist)) * helixR;
            float tubeR = (0.12 + ABnd * 0.1 * u_genWarp) * u_genDensity;
            float s1 = length(p.xy - h1) - tubeR;
            float s2 = length(p.xy + h1) - tubeR;
            float rungPhase = fract(p.z * freq2 / 3.14159);
            float rungWeight = 1.0 - abs(rungPhase - 0.5) * 4.0;
            float rungAngle = floor(p.z * freq2 / 3.14159) * 3.14159;
            vec2 rungMid = vec2(cos(rungAngle + 1.5708), sin(rungAngle + 1.5708)) * helixR * 0.5;
            float rung = length(p.xy - rungMid * clamp(rungWeight, 0.0, 1.0)) - tubeR * 0.5;
            return min(min(s1, s2), rungWeight > 0.0 ? rung : 10.0);`,
    },
    {
        key: 'CUBE FIELD', group: 'TUNNELS', fog: [0.08, 0.02, 0.02],
        glsl: `
            p.z -= u_time * u_genSpeed * 8.0 + ABnd * 6.0 * u_genWarp;
            p.x += (snoise(vec2(p.y * 0.25 + u_time * 0.09, p.z * 0.15)) - 0.5) * u_genWarp * 1.6;
            p.y += (snoise(vec2(p.z * 0.25 + u_time * 0.07, p.x * 0.15 + 7.1)) - 0.5) * u_genWarp * 1.6;
            p = mod(p + 3.0, 6.0) - 3.0;
            p.xy *= rot(u_time * 0.6 + ABnd * u_genWarp * 1.2);
            p.xz *= rot(u_time * 0.4 + u_transient * 0.8);
            vec3 qm = p; float msc = 1.0;
            for (int i = 0; i < 4; i++) {
                qm = abs(qm);
                qm = mengerSort(qm);
                qm.z -= 0.5 * (1.2 + u_genIter * 0.6) / msc;
                qm.xy *= rot(0.35 + u_time * 0.04 + u_transient * 0.3);
                qm *= 1.6 + u_transient * u_genWarp * 0.4;
                msc *= 1.6;
            }
            return max(sdBox(qm / msc, vec3(1.0)), -sdBox(qm / msc, vec3(0.82 + u_transient * 0.12)));`,
    },
    {
        key: 'MANDELBULB', group: 'FORMS', fog: [0.01, 0.02, 0.08],
        glsl: `
            p.xz *= rot(u_time * u_genSpeed * 0.25);
            p.yz *= rot(u_time * u_genSpeed * 0.15 + ABnd * u_genWarp * 0.4);
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
                mz = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta)) + p;
            }
            return max(0.5 * log(max(rr, 1.0)) * rr / max(dr, 0.001), 0.001);`,
    },
    {
        key: 'SIERPINSKI', group: 'FORMS', fog: [0.08, 0.04, 0.0],
        glsl: `
            p.xz *= rot(u_time * u_genSpeed * 0.15);
            p.yz *= rot(u_time * u_genSpeed * 0.09);
            float sc = 2.0 + ABnd * u_genWarp * 0.15;
            vec3 sp = p * 0.55;
            for (int i = 0; i < 8; i++) {
                if (sp.x + sp.y < 0.0) sp.xy = -sp.yx;
                if (sp.x + sp.z < 0.0) sp.xz = -sp.zx;
                if (sp.y + sp.z < 0.0) sp.yz = -sp.zy;
                sp = sp * sc - vec3(sc - 1.0);
            }
            return (length(sp) - 2.0) * pow(sc, -8.0) / 0.55;`,
    },
    {
        key: 'SOLAR CORONA', group: 'FORMS', fog: [0.12, 0.06, 0.01],
        glsl: `
            p.z -= u_time * u_genSpeed * 6.0;
            p.xy *= rot(u_time * 0.12 + ABnd * u_genWarp * 0.25);
            float numLines = 10.0 + u_genDensity * 8.0;
            float seg = 6.28318 / numLines;
            float fAng = mod(atan(p.y, p.x) + seg * 0.5, seg) - seg * 0.5;
            float r = length(p.xy);
            float potential = r - (1.5 + sin(fAng * 3.0 + u_time * 0.5) * 0.4 * u_genWarp
                                + fbm3(p * 0.3 + u_time * 0.06) * 0.5 * u_genWarp);
            float fieldLine = abs(potential) - (0.035 + ABnd * 0.13 * u_genWarp);
            float eruptR = r - (1.65 + cos(p.z * 1.1 + u_time * 0.9) * ABnd * 0.7 * u_genWarp);
            float plume = abs(eruptR) - (0.05 + ABnd * 0.22);
            return min(fieldLine, plume);`,
    },
    {
        key: 'BUBBLE BATH', group: 'FORMS', fog: [0.02, 0.04, 0.10],
        glsl: `
            p.z -= u_time * u_genSpeed * 2.0;
            p.xy *= rot(u_time * 0.05 + ABnd * u_genWarp * 0.1);
            float wall = (0.02 + ABnd * 0.04 * u_genWarp) * u_genDensity;
            vec3 q1 = mod(p * 1.6 + 0.5, 1.0) - 0.5;
            float b1 = abs(length(q1 / 1.6) - (0.4 + ABnd * 0.1 * u_genWarp)) - wall;
            vec3 q2 = mod(p * 0.9 + 0.55, 1.0) - 0.5;
            float b2 = abs(length(q2 / 0.9) - (0.38 + ABnd * 0.08 * u_genWarp)) - wall;
            return min(b1, b2);`,
    },
    {
        key: 'FLOW FIELD', group: 'FIELDS', fog: [0.02, 0.02, 0.08],
        glsl: `
            p.z -= u_time * u_genSpeed * 6.0;
            // Forward differences: 4 noise lookups instead of 6.
            float eps = 0.1;
            float n0 = snoise3(p);
            float nx = snoise3(p + vec3(eps, 0.0, 0.0)) - n0;
            float ny = snoise3(p + vec3(0.0, eps, 0.0)) - n0;
            float nz = snoise3(p + vec3(0.0, 0.0, eps)) - n0;
            vec3 curl = vec3(nz - ny, nx - nz, ny - nx) / eps * u_genWarp * 0.12;
            vec3 qf = p + curl * sin(p.z * 0.5 + u_time) * 0.3;
            qf.xy = mod(qf.xy + 1.5, 3.0) - 1.5;
            float flowR = (0.038 + ABnd * 0.09 * u_genWarp) * u_genDensity;
            float tube1 = length(qf.xy) - flowR;
            vec3 qf2 = p * 1.618 + curl * cos(p.z * 0.7 + u_time * 1.3) * 0.2;
            qf2.xy = mod(qf2.xy + 1.0, 2.0) - 1.0;
            float tube2 = length(qf2.xy) - flowR * 0.65;
            return min(tube1, tube2);`,
    },
    {
        key: 'WAVE COLLAPSE', group: 'FIELDS', fog: [0.05, 0.01, 0.08],
        glsl: `
            p.z -= u_time * u_genSpeed * 3.0;
            float f1 = 1.8 * u_genDensity;
            float f2 = f1 * 1.618;
            float f3 = f1 * 2.618;
            float w1 = sin(p.x * f1 + u_time * 1.2) * sin(p.y * f1 + u_time * 0.8);
            float w2 = sin((p.x * 0.866 + p.y * 0.5) * f2 + u_time * 0.95) * sin(p.z * f2 * 0.4);
            float w3 = sin((p.x * 0.5 - p.y * 0.866) * f3 + u_time * 1.1 + ABnd * u_genWarp * 2.0);
            float surface = abs((w1 + w2 + w3) / 3.0) - (0.09 + ABnd * 0.18 * u_genWarp);
            float nodal = abs(sin(length(p.xy) * f1 * 0.8 - u_time * u_genSpeed)) - 0.045;
            return min(surface, nodal) * 0.5;`,
    },
    {
        key: 'GYROID', group: 'FIELDS', fog: [0.0, 0.06, 0.08],
        glsl: `
            p.z -= u_time * u_genSpeed * 3.0;
            p.xy *= rot(u_time * 0.07 + ABnd * u_genWarp * 0.25);
            float freq = (0.9 + u_genDensity * 1.2) * 3.14159;
            vec3 gp = p * freq;
            float g1 = sin(gp.x) * cos(gp.y) + sin(gp.y) * cos(gp.z) + sin(gp.z) * cos(gp.x);
            float g2 = sin(gp.x * 2.0) * cos(gp.y * 2.0) + sin(gp.y * 2.0) * cos(gp.z * 2.0) + sin(gp.z * 2.0) * cos(gp.x * 2.0);
            float wall = (0.07 + ABnd * 0.18 * u_genWarp) * u_genDensity;
            return abs(g1 + g2 * 0.28) / (freq * 1.8) - wall / freq;`,
    },
];

const GEN_BY_KEY = Object.fromEntries(GEN_DEFS.map(d => [d.key, d]));

const GEN_COMMON = `
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
float snoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(rand(i), rand(i + vec2(1.0, 0.0)), f.x), mix(rand(i + vec2(0.0, 1.0)), rand(i + 1.0), f.x), f.y);
}
mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float snoise3(vec3 p) {
    return snoise(vec2(p.x + p.z * 0.47, p.y)) * 0.55 + snoise(vec2(p.x, p.z + p.y * 0.31)) * 0.30 + snoise(vec2(p.y + p.x * 0.59, p.z)) * 0.15;
}
float fbm3(vec3 p) {
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 4; i++) { v += amp * snoise3(p); p = p * 2.02 + vec3(1.7, 9.2, 5.4); amp *= 0.5; }
    return v;
}
// Sort components descending (x >= y >= z) — the Menger sponge fold.
vec3 mengerSort(vec3 q) {
    float t;
    if (q.x < q.y) { t = q.x; q.x = q.y; q.y = t; }
    if (q.x < q.z) { t = q.x; q.x = q.z; q.z = t; }
    if (q.y < q.z) { t = q.y; q.y = q.z; q.z = t; }
    return q;
}
vec3 cospal(float t, float off) { return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 0.75, 0.5) * t + vec3(off, off + 0.33, off + 0.67))); }
`;

// Assemble the fragment shader for one scene.
function genFragmentSource(def) {
    return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time, u_transient, u_genBand, u_level;
uniform float u_genSpeed, u_genScale, u_genWarp, u_genDensity, u_genIter, u_genColor1, u_genColor2;
uniform float u_genRotX, u_genRotY, u_genRotZ;
uniform vec3 u_fog;
${GEN_COMMON}
float mapGen(vec3 p) {
    float ABnd = u_genBand;
    p.yz *= rot(u_genRotX);
    p.xz *= rot(u_genRotY);
    p.xy *= rot(u_genRotZ);
    ${def.glsl}
}
void main() {
    vec2 p = v_uv * 2.0 - 1.0;
    p.x *= u_res.x / max(1.0, u_res.y);
    vec3 ro = vec3(0.0, 0.0, -3.0);
    vec3 rd = normalize(vec3(p, max(0.1, u_genScale)));  // higher ZOOM = narrower view
    const float MAX_DIST = 25.0;
    const int MAX_STEPS = 40;
    float t = 0.01 + rand(v_uv + fract(u_time * 0.1)) * 0.008;
    float colAccum = 0.0;
    vec3 colorAccum = vec3(0.0);
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 pos = ro + rd * t;
        float d = mapGen(pos);
        if (d < 0.015) {
            float depthFog = 1.0 - clamp(t / MAX_DIST, 0.0, 1.0);
            depthFog *= depthFog;
            float tVal = fract(t * 0.18 + length(pos.xy) * 0.14 + u_time * 0.04 + u_genColor1);
            vec3 albedo = cospal(tVal, u_genColor1);
            float light = 0.2 + clamp(0.4 + 0.6 * (1.0 - t / MAX_DIST), 0.0, 1.0) * (0.7 + u_genWarp * 0.2) + u_transient * 0.4 * u_genWarp;
            float ao = 1.0 - clamp(float(i) / float(MAX_STEPS) * 1.5, 0.0, 0.5);
            float contrib = 0.08 * depthFog * ao;
            colAccum += contrib;
            colorAccum += contrib * mix(albedo * light, u_fog, 1.0 - depthFog * 0.8);
            d = 0.015;
        } else {
            d = max(d * (d > 0.08 ? 1.25 : 1.0), 0.004);
        }
        t += d;
        if (t > MAX_DIST || colAccum > 1.8) break;
    }
    colAccum = clamp(colAccum, 0.0, 1.0);
    vec3 col = u_fog * 0.3;
    if (colAccum >= 0.001) {
        col = mix(u_fog * 0.4, colorAccum, colAccum);
        col.r *= 1.0 + u_genColor2 * 0.35;
        col.b *= 1.0 + (1.0 - u_genColor2) * 0.35;
        col += 0.18 * u_genWarp * vec3(1.0, 0.5, 0.15) * colAccum * u_transient;
    }
    gl_FragColor = vec4(clamp(col, 0.0, 1.0) * u_level, 1.0);
}`;
}

window.D4R = Object.assign(window.D4R || {}, {
    GEN_PARAMS, GEN_GROUPS, GEN_DEFS, GEN_BY_KEY, genFragmentSource,
});
