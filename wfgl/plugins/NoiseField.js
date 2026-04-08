import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class NoiseField extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.noisefield',
        name: 'Noise Field',
        description: 'FBM noise generator — source or overlay',
        type: 'source',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['noise', 'generator', 'source'],
    };

    static params = [
        { name: 'scale',    type: 'float', min: 0.5, max: 20,  default: 4.0, displayName: 'SCALE' },
        { name: 'speed',    type: 'float', min: 0,   max: 3,   default: 0.3, displayName: 'SPEED' },
        { name: 'octaves',  type: 'float', min: 1,   max: 8,   default: 4.0, displayName: 'OCTAVES' },
        { name: 'contrast', type: 'float', min: 0.5, max: 3,   default: 1.2, displayName: 'CONTRAST' },
        { name: 'hue',      type: 'float', min: 0,   max: 1,   default: 0.0, displayName: 'HUE' },
        { name: 'overlay',  type: 'float', min: 0,   max: 1,   default: 0.0, displayName: 'OVERLAY MIX' },
    ];

    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform float u_scale;
uniform float u_speed;
uniform float u_octaves;
uniform float u_contrast;
uniform float u_hue;
uniform float u_overlay;
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;

vec3 hsl2rgb(float h) {
    vec3 c = clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1., 0., 1.);
    return 0.5 + 0.5*(c-0.5);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float val = 0.0;
    float amp = 0.5;
    int oct = int(u_octaves);
    for (int i = 0; i < 8; i++) {
        if (i >= oct) break;
        val += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return val;
}

void main() {
    vec2 p = v_uv * u_scale;
    float n = fbm(p + u_time * u_speed);
    n = pow(n, 1.0 / u_contrast);

    vec3 col = hsl2rgb(u_hue + n * 0.3) * n * 1.5;

    if (u_overlay > 0.001) {
        vec4 input_c = texture(u_input, v_uv);
        col = mix(input_c.rgb, input_c.rgb + col, u_overlay);
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
}
