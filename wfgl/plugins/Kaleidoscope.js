import { WFGLShaderPlugin } from '../WFGLShaderPlugin.js';

export class Kaleidoscope extends WFGLShaderPlugin {
    static info = {
        id: 'com.dead4rat.kaleidoscope',
        name: 'Kaleidoscope',
        description: 'Radial mirror with adjustable segments and rotation',
        type: 'effect',
        author: 'Dead4rat',
        version: '1.0.0',
        tags: ['distortion', 'mirror', 'pattern'],
    };

    static params = [
        { name: 'segments', type: 'float', min: 2, max: 24, default: 6.0, displayName: 'SEGMENTS' },
        { name: 'rotation', type: 'float', min: 0, max: 6.283, default: 0.0, displayName: 'ROTATION' },
        { name: 'spin',     type: 'float', min: 0, max: 2, default: 0.0, displayName: 'SPIN SPEED' },
        { name: 'zoom',     type: 'float', min: 0.2, max: 3, default: 1.0, displayName: 'ZOOM' },
    ];

    static fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform float u_segments;
uniform float u_rotation;
uniform float u_spin;
uniform float u_zoom;
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;

void main() {
    vec2 c = v_uv - 0.5;
    c /= max(0.01, u_zoom);
    float angle = atan(c.y, c.x) + u_rotation + u_time * u_spin;
    float r = length(c);

    float segAngle = 3.14159265 * 2.0 / max(2.0, floor(u_segments));
    angle = mod(angle, segAngle);
    if (angle > segAngle * 0.5) angle = segAngle - angle; // mirror

    vec2 uv2 = vec2(cos(angle), sin(angle)) * r + 0.5;
    uv2 = clamp(uv2, 0.0, 1.0);

    fragColor = texture(u_input, uv2);
}`;
}
