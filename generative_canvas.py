import moderngl
from PyQt6.QtOpenGLWidgets import QOpenGLWidget
from PyQt6.QtCore import Qt, QTimer
import numpy as np
from mayaflux_bridge import mayaflux_bridge

class GenerativeCanvas(QOpenGLWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.ctx = None
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update)
        # Attempt to run at 60 FPS
        self.timer.start(int(1000 / 60))
        self.time = 0.0

    def initializeGL(self):
        # We access the standard moderngl context for the active QOpenGLWidget
        self.ctx = moderngl.create_context()
        
        # Shader programs for "8-Bit Eyeball" boids and Cellular Automata
        self.prog = self.ctx.program(
            vertex_shader="""
                #version 330
                in vec2 in_vert;
                in vec2 in_uv;
                out vec2 v_uv;
                void main() {
                    gl_Position = vec4(in_vert, 0.0, 1.0);
                    v_uv = in_uv;
                }
            """,
            fragment_shader="""
                #version 330
                in vec2 v_uv;
                out vec4 f_color;
                uniform float u_time;
                uniform float u_centroid;
                uniform float u_cohesion;
                uniform float u_transient;
                
                void main() {
                    vec2 uv = v_uv * 2.0 - 1.0;
                    
                    // Simple "8-bit" aliased boid rendering simulation
                    // Pixelate UV
                    float pixels = 64.0;
                    vec2 puv = floor(uv * pixels) / pixels;
                    
                    float d = length(puv);
                    // Pulsating based on time and audio brightness (centroid)
                    float radius = 0.4 + (sin(u_time * 5.0) * 0.1) + (u_centroid * 0.3);
                    
                    // Add transient bursts
                    if (u_transient > 0.5) {
                        radius += 0.2;
                    }
                    
                    // Draw alien boid shape
                    if (d < radius) {
                        // Cyan/Yellow palette based on cohesion and brightness
                        float g = mix(0.8, 1.0, u_cohesion);
                        f_color = vec4(0.0, g, 0.5 + u_centroid * 0.5, 1.0);
                    } else {
                        // Background tactile yellow
                        f_color = vec4(1.0, 1.0, 0.0, 1.0);
                    }
                }
            """
        )
        
        # A simple full-screen quad
        vertices = np.array([
            # x, y, u, v
            -1.0, -1.0,  0.0, 0.0,
             1.0, -1.0,  1.0, 0.0,
            -1.0,  1.0,  0.0, 1.0,
             1.0,  1.0,  1.0, 1.0,
        ], dtype='f4')
        
        self.vbo = self.ctx.buffer(vertices)
        self.vao = self.ctx.simple_vertex_array(self.prog, self.vbo, 'in_vert', 'in_uv')

    def paintGL(self):
        # Read the latest state from the lock-free bridge
        state = mayaflux_bridge.pull_state()
        
        # Process parameters
        self.time += 0.016 * state.get("time_speed", 1.0)
        
        # Update shader uniforms
        self.prog['u_time'].value = self.time
        self.prog['u_centroid'].value = state.get("spectral_centroid", 0.0)
        self.prog['u_cohesion'].value = state.get("boids_cohesion", 0.5)
        self.prog['u_transient'].value = 1.0 if state.get("transient_detected", False) else 0.0
        
        # Without `ctx.clear`, we can achieve a "Visible Labor" trail effect, 
        # but to keep the 8-bit eyes solid we'll clear right now.
        if not state.get("midi_trails_enabled", False):
           self.ctx.clear(1.0, 1.0, 0.0, 1.0) # Yellow background
        
        self.vao.render(moderngl.TRIANGLE_STRIP)

    def resizeGL(self, w, h):
        self.ctx.viewport = (0, 0, w, h)
