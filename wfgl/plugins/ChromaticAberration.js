import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class ChromaticAberration extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.chromatic',
        name: 'Chromatic Aberration',
        description: 'RGB channel offset with angle and distance',
        type: 'effect',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['glitch', 'distortion'],
    };

    static params = [
        { name: 'amount',   type: 'float', min: 0, max: 0.05, default: 0.008, displayName: 'AMOUNT' },
        { name: 'angle',    type: 'float', min: 0, max: 6.283, default: 0.0,  displayName: 'ANGLE' },
        { name: 'animate',  type: 'float', min: 0, max: 1, default: 0.0, displayName: 'ANIMATE' },
    ];

    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform float u_amount;
uniform float u_angle;
uniform float u_animate;
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;
void main() {
    float a = u_angle + u_animate * u_time * 2.0;
    vec2 dir = vec2(cos(a), sin(a)) * u_amount;
    float r = texture(u_input, v_uv + dir).r;
    float g = texture(u_input, v_uv).g;
    float b = texture(u_input, v_uv - dir).b;
    float alpha = texture(u_input, v_uv).a;
    fragColor = vec4(r, g, b, alpha);
}`;
}
