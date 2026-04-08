import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class EdgeGlow extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.edgeglow',
        name: 'Edge Glow',
        description: 'Sobel edge detection with glow overlay',
        type: 'effect',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['edge', 'detection', 'glow'],
    };

    static params = [
        { name: 'strength', type: 'float', min: 0, max: 5, default: 1.5, displayName: 'STRENGTH' },
        { name: 'hue',      type: 'float', min: 0, max: 1, default: 0.0, displayName: 'HUE' },
        { name: 'mix',      type: 'float', min: 0, max: 1, default: 0.5, displayName: 'MIX' },
        { name: 'bgDarken', type: 'float', min: 0, max: 1, default: 0.3, displayName: 'BG DARKEN' },
    ];

    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform vec2 u_resolution;
uniform float u_strength;
uniform float u_hue;
uniform float u_mix;
uniform float u_bgDarken;
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;

vec3 hsl2rgb(float h) {
    vec3 c = clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1., 0., 1.);
    return 0.5 + 0.5*(c-0.5);
}

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec2 px = 1.0 / u_resolution;
    // Sobel 3x3
    float tl = luminance(texture(u_input, v_uv + vec2(-px.x, px.y)).rgb);
    float t  = luminance(texture(u_input, v_uv + vec2(0.0,   px.y)).rgb);
    float tr = luminance(texture(u_input, v_uv + vec2(px.x,  px.y)).rgb);
    float l  = luminance(texture(u_input, v_uv + vec2(-px.x, 0.0)).rgb);
    float r  = luminance(texture(u_input, v_uv + vec2(px.x,  0.0)).rgb);
    float bl = luminance(texture(u_input, v_uv + vec2(-px.x,-px.y)).rgb);
    float b  = luminance(texture(u_input, v_uv + vec2(0.0,  -px.y)).rgb);
    float br = luminance(texture(u_input, v_uv + vec2(px.x, -px.y)).rgb);

    float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
    float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
    float edge = sqrt(gx*gx + gy*gy) * u_strength;

    vec3 edgeColor = hsl2rgb(u_hue + edge * 0.2) * edge;
    vec4 original = texture(u_input, v_uv);
    vec3 darkened = original.rgb * (1.0 - u_bgDarken);
    vec3 result = darkened + edgeColor * u_mix;

    fragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}`;
}
