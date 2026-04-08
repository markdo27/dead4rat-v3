import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class VHS extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.vhs',
        name: 'VHS',
        description: 'Scanlines, noise, color bleed, tracking distortion',
        type: 'effect',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['retro', 'glitch', 'distortion'],
    };

    static params = [
        { name: 'scanlines',   type: 'float', min: 0, max: 1, default: 0.4, displayName: 'SCANLINES' },
        { name: 'noise',       type: 'float', min: 0, max: 1, default: 0.15, displayName: 'NOISE' },
        { name: 'colorBleed',  type: 'float', min: 0, max: 1, default: 0.3, displayName: 'COLOR BLEED' },
        { name: 'tracking',    type: 'float', min: 0, max: 1, default: 0.2, displayName: 'TRACKING' },
        { name: 'jitter',      type: 'float', min: 0, max: 1, default: 0.1, displayName: 'JITTER' },
    ];

    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_scanlines;
uniform float u_noise;
uniform float u_colorBleed;
uniform float u_tracking;
uniform float u_jitter;
in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = v_uv;

    // Tracking distortion — horizontal offset that rolls
    float trackPhase = fract(u_time * 0.15);
    float trackBand = smoothstep(trackPhase - 0.02, trackPhase, uv.y)
                    - smoothstep(trackPhase, trackPhase + 0.02, uv.y);
    uv.x += trackBand * u_tracking * 0.08 * sin(u_time * 37.0);

    // Per-line jitter
    float lineJitter = (hash(vec2(floor(uv.y * u_resolution.y), floor(u_time * 60.0))) - 0.5)
                       * u_jitter * 0.01;
    uv.x += lineJitter;

    // Color bleed — offset R channel horizontally
    float bleedOff = u_colorBleed * 0.004;
    float r = texture(u_input, vec2(uv.x + bleedOff, uv.y)).r;
    float g = texture(u_input, uv).g;
    float b = texture(u_input, vec2(uv.x - bleedOff, uv.y)).b;
    vec3 col = vec3(r, g, b);

    // Scanlines
    float sl = sin(uv.y * u_resolution.y * 3.14159) * 0.5 + 0.5;
    col *= 1.0 - u_scanlines * (1.0 - sl) * 0.6;

    // Noise grain
    float n = hash(uv * u_resolution + u_time * 1000.0);
    col += (n - 0.5) * u_noise * 0.3;

    // Slight vignette
    float vig = 1.0 - length((uv - 0.5) * 1.3) * 0.4;
    col *= vig;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
}
