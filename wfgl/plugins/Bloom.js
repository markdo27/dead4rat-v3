import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class Bloom extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.bloom',
        name: 'Bloom',
        description: 'Gaussian glow with brightness threshold',
        type: 'effect',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['glow', 'bloom', 'post'],
    };

    static params = [
        { name: 'threshold', type: 'float', min: 0, max: 1,   default: 0.5,  displayName: 'THRESHOLD' },
        { name: 'intensity', type: 'float', min: 0, max: 3,   default: 1.0,  displayName: 'INTENSITY' },
        { name: 'radius',    type: 'float', min: 1, max: 12,  default: 4.0,  displayName: 'RADIUS' },
        { name: 'mix',       type: 'float', min: 0, max: 1,   default: 0.5,  displayName: 'MIX' },
    ];

    // Single-pass approximation using weighted samples (not a true multi-pass,
    // but very effective for a plugin system where each plugin is one pass)
    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_intensity;
uniform float u_radius;
uniform float u_mix;
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec4 orig = texture(u_input, v_uv);
    vec2 px = u_radius / u_resolution;

    // 13-tap star blur on bright pixels only
    vec3 bloom = vec3(0.0);
    float weights = 0.0;
    for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
            vec2 off = vec2(float(x), float(y)) * px;
            vec3 s = texture(u_input, v_uv + off).rgb;
            float l = luma(s);
            float bright = max(0.0, l - u_threshold);
            float w = bright * exp(-float(x*x + y*y) * 0.3);
            bloom += s * w;
            weights += w;
        }
    }
    if (weights > 0.001) bloom /= weights;
    bloom *= u_intensity;

    vec3 result = orig.rgb + bloom * u_mix;
    fragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}`;
}
