import sys
import psutil
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QLabel, QSlider, QCheckBox, QComboBox, QFormLayout, QFrame
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont, QColor, QPalette
from generative_canvas import GenerativeCanvas
from audio_engine import AudioEngine
from mayaflux_bridge import mayaflux_bridge

class FloatingPanel(QFrame):
    def __init__(self, title, parent=None):
        super().__init__(parent)
        self.setStyleSheet("""
            QFrame {
                background-color: rgba(20, 20, 20, 220);
                color: #FFFFFF;
                border: 1px solid #33aaaa;
            }
            QLabel { background-color: transparent; border: none; font-family: monospace; font-size: 10px; }
            QSlider::groove:horizontal { border: 1px solid #999999; height: 8px; background: #333333; margin: 2px 0; }
            QSlider::handle:horizontal { background: #33aaaa; border: 1px solid #5c5c5c; width: 18px; margin: -2px 0; border-radius: 3px; }
            QCheckBox { background-color: transparent; border: none; font-family: monospace; font-size: 10px; }
        """)
        self.setFixedWidth(250)
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(5, 5, 5, 5)
        self.layout.setSpacing(2)
        
        # Header
        header = QLabel(title)
        header.setStyleSheet("background-color: #33aaaa; color: black; font-weight: bold; padding: 2px;")
        self.layout.addWidget(header)
        
        self.form_layout = QFormLayout()
        self.form_layout.setContentsMargins(0, 0, 0, 0)
        self.layout.addLayout(self.form_layout)

    def add_slider(self, label, state_key, min_val, max_val, multiplier=100):
        slider = QSlider(Qt.Orientation.Horizontal)
        slider.setRange(int(min_val * multiplier), int(max_val * multiplier))
        
        # Set initial value based on mayaflux
        curr = mayaflux_bridge.pull_state().get(state_key, 0.0)
        slider.setValue(int(curr * multiplier))
        
        def on_change(val):
            mayaflux_bridge.push_state({state_key: val / multiplier})
            
        slider.valueChanged.connect(on_change)
        self.form_layout.addRow(label, slider)
        
    def add_checkbox(self, label, state_key):
        cb = QCheckBox(label)
        curr = mayaflux_bridge.pull_state().get(state_key, False)
        cb.setChecked(curr)
        
        def on_change(state):
            mayaflux_bridge.push_state({state_key: bool(state)})
            
        cb.stateChanged.connect(on_change)
        self.layout.addWidget(cb)

class TerminalOverlay(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("""
            QFrame { background-color: rgba(0, 0, 0, 240); }
            QLabel { color: #FFFFFF; font-family: 'Courier New', monospace; font-size: 11px; }
        """)
        self.layout = QVBoxLayout(self)
        self.label = QLabel()
        self.layout.addWidget(self.label)
        self.update_timer = QTimer(self)
        self.update_timer.timeout.connect(self.update_stats)
        self.update_timer.start(500)
        
    def update_stats(self):
        state = mayaflux_bridge.pull_state()
        mem = psutil.Process().memory_info().rss / (1024 * 1024)
        
        text = f"""<span style='color: #ffff00'>License: PRO</span>
<span style='color: #00ff00'>Library: 8 Bit Eyeball</span>
<span style='color: #00ff00'>Patch: 8</span>
<span style='color: #00ffff'>Type: Generative Python Native</span>
Memory Usage: {mem:.1f} MB
FPS: {state.get('fps', 60.0):.1f}
Resolution: 1024x768
Connected MIDI Devices:
  All Devices
  IAC Driver Bus 1
Audio Input Devices:
  System Default
Audio Input Level: {state.get('spectral_centroid', 0.0):.3f}
Press 'h' to toggle shortcuts
"""
        self.label.setText(text)

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Video Painter - Tactile Rebellion")
        self.resize(1024, 768)
        
        # Central widget is the OpenGL Canvas
        self.canvas = GenerativeCanvas(self)
        self.setCentralWidget(self.canvas)
        
        # Audio Engine
        self.audio_engine = AudioEngine()
        self.audio_engine.start()
        
        # Overlays container
        self.overlay_widget = QWidget(self)
        self.overlay_widget.resize(1024, 768)
        self.overlay_widget.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        
        # Overlay Layout
        self.overlay_layout = QHBoxLayout(self.overlay_widget)
        self.overlay_layout.setContentsMargins(10, 10, 10, 10)
        
        # Left Terminal
        self.terminal = TerminalOverlay(self)
        self.terminal.setFixedSize(300, 250)
        
        # Right Control Panel
        self.control_panel_container = QWidget(self)
        self.cp_layout = QVBoxLayout(self.control_panel_container)
        self.cp_layout.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignRight)
        self.cp_layout.setContentsMargins(0,0,0,0)
        
        # Building the sections
        input_panel = FloatingPanel("Input", self)
        input_panel.add_checkbox("Use Audio Input", "use_audio")
        input_panel.add_slider("Audio Threshold", "audio_threshold", 0.0, 0.5, 1000)
        
        gen_panel = FloatingPanel("Generative Controls", self)
        gen_panel.add_slider("Cohesion", "boids_cohesion", 0.0, 1.0)
        gen_panel.add_slider("Time Speed", "time_speed", 0.0, 5.0)
        gen_panel.add_checkbox("Visible Labor (Trails)", "midi_trails_enabled")
        
        self.cp_layout.addWidget(input_panel)
        self.cp_layout.addWidget(gen_panel)
        
        self.overlay_layout.addWidget(self.terminal, alignment=Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignLeft)
        self.overlay_layout.addWidget(self.control_panel_container, alignment=Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignRight)
        
    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.overlay_widget.resize(self.size())
        
    def closeEvent(self, event):
        self.audio_engine.stop()
        event.accept()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
