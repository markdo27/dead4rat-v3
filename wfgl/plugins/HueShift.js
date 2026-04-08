import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class HueShift extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.hueshift',
        name: 'Hue Shift',
        description: 'HSL hue rotation with audio-reactive speed',
        type: 'effect',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['color', 'shift', 'audio'],
    };

    static params = [
        { name: 'shift',     type: 'float', min: 0, max: 1,   default: 0.0,  displayName: 'HUE SHIFT' },
        { name: 'speed',     type: 'float', min: 0, max: 2,   default: 0.0,  displayName: 'SPEED' },
        { name: 'satBoost',  type: 'float', min: 0, max: 2,   default: 1.0,  displayName: 'SATURATION' },
        { name: 'audioReact',type: 'float', min: 0, max: 1,   default: 0.0,  displayName: 'AUDIO REACT' },
    ];

    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform float u_shift;
uniform float u_speed;
uniform float u_satBoost;
uniform float u_audioReact;
uniform float u_time;
uniform float u_audioBass;
in vec2 v_uv;
out vec4 fragColor;

vec3 rgb2hsl(vec3 c) {
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float l = (mx + mn) * 0.5;
    if (mx == mn) return vec3(0.0, 0.0, l);
    float d = mx - mn;
    float s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
    float h;
    if (mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    return vec3(h / 6.0, s, l);
}

float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q-p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q-p) * (2.0/3.0 - t) * 6.0;
    return p;
}

vec3 hsl2rgb(vec3 hsl) {
    if (hsl.y == 0.0) return vec3(hsl.z);
    float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
    float p = 2.0 * hsl.z - q;
    return vec3(
        hue2rgb(p, q, hsl.x + 1.0/3.0),
        hue2rgb(p, q, hsl.x),
        hue2rgb(p, q, hsl.x - 1.0/3.0)
    );
}

void main() {
    vec4 c = texture(u_input, v_uv);
    vec3 hsl = rgb2hsl(c.rgb);
    hsl.x = fract(hsl.x + u_shift + u_speed * u_time + u_audioReact * u_audioBass * 0.5);
    hsl.y = clamp(hsl.y * u_satBoost, 0.0, 1.0);
    fragColor = vec4(hsl2rgb(hsl), c.a);
}`;
}
