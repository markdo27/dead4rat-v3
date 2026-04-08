import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class PixelSort extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.pixelsort',
        name: 'Pixel Sort',
        description: 'Glitch pixel sorting by brightness threshold',
        type: 'effect',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['glitch', 'sort', 'datamosh'],
    };

    static params = [
        { name: 'threshold', type: 'float', min: 0, max: 1, default: 0.4, displayName: 'THRESHOLD' },
        { name: 'direction', type: 'float', min: 0, max: 1, default: 0.0, displayName: 'VERTICAL' },
        { name: 'length',    type: 'float', min: 1, max: 80, default: 20.0, displayName: 'SORT LENGTH' },
        { name: 'mix',       type: 'float', min: 0, max: 1, default: 0.7, displayName: 'MIX' },
    ];

    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_direction;
uniform float u_length;
uniform float u_mix;
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec4 orig = texture(u_input, v_uv);
    float origL = luma(orig.rgb);

    if (origL < u_threshold) {
        fragColor = orig;
        return;
    }

    vec2 px = 1.0 / u_resolution;
    // Sort direction
    vec2 dir = u_direction > 0.5 ? vec2(0.0, px.y) : vec2(px.x, 0.0);

    // Look ahead along sort direction, find darker pixels to swap with
    vec4 sorted = orig;
    float sortedL = origL;
    int len = int(u_length);
    for (int i = 1; i <= 80; i++) {
        if (i > len) break;
        vec2 sampleUV = v_uv + dir * float(i);
        if (sampleUV.x > 1.0 || sampleUV.y > 1.0 || sampleUV.x < 0.0 || sampleUV.y < 0.0) break;
        vec4 s = texture(u_input, sampleUV);
        float sL = luma(s.rgb);
        if (sL < u_threshold) break;
        if (sL > sortedL) {
            sorted = s;
            sortedL = sL;
        }
    }

    fragColor = mix(orig, sorted, u_mix);
}`;
}
