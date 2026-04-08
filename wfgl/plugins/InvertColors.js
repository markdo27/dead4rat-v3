import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class InvertColors extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.invert',
        name: 'Invert Colors',
        description: 'RGB inversion with controllable mix',
        type: 'effect',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['color', 'basic'],
    };

    static params = [
        { name: 'mix', type: 'float', min: 0, max: 1, default: 1.0, displayName: 'MIX' },
    ];

    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform float u_mix;
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;
void main() {
    vec4 c = texture(u_input, v_uv);
    vec4 inv = vec4(1.0 - c.rgb, c.a);
    fragColor = mix(c, inv, u_mix);
}`;
}
