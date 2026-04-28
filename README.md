# DEAD4RAT - TERMINAL DECAY

DEAD4RAT is a high-performance, browser-based Video Jockey (VJ) and audio-visualizer engine built for live performance. It combines real-time audio reactivity, webcam input, AI-powered body and gesture tracking, and complex shader-based visual effects within a brutalist "Terminal Decay" interface.

## Features

- **Real-time Audio Reactivity:** Built-in audio engine processing live microphone input or local audio files. Analyzes bass, mid, high frequencies, transients, and spectral centroid to drive visual parameters.
- **AI Human Tracking:** Utilizes `@vladmandic/human` and MediaPipe for face, hand, body, and emotion detection. Enables gesture-based control (pinch, palm tracking) and isolation masking.
- **Comprehensive Visual Effects Suite:** Offers an extensive collection of shader-based effects categorized into:
  - **Color:** RGB Shift, LUT Corrupt, Chroma Glitch, Thermal Vision, Screen Colorize.
  - **Distortion:** Barrel/Fisheye, Vortex Warp, Kaleidoscope, Mirror Tile.
  - **Texture:** Scan Lines, Signal Noise, Data Moshing, Dither Matrix.
  - **Glitch:** VHS Jitter, Glitch Slicer, Pixel Sort, Split Scan.
  - **Feedback:** FeedbackPro Loop, Substrate Melt, Motion Slit.
- **Interactive UI:** A React-based interface running directly in the browser via Babel standalone. Includes live signal monitors, LFO automation controls, and a brutalist design aesthetic.
- **WebMIDI Support:** Seamless integration with MIDI controllers for tactile parameter manipulation.

## Technical Stack

- **Frontend:** HTML5, CSS3, React 18 (standalone via CDN), Babel.
- **Audio:** Web Audio API (`audioEngine.js`).
- **Visuals:** WebGL via custom `canvasEngine.js`, fluid simulations (`fluidEngine.js`).
- **AI/ML:** `@vladmandic/human`, MediaPipe Selfie Segmentation (`humanEngine.js`, `maskEngine.js`).
- **Control:** WebMidi (`midiController.js`).

## Usage

Simply open `index.html` in a modern web browser. No complex build tools or Node.js environment are required; the application compiles JSX on the fly using Babel standalone.

- Allow microphone access for live audio reactivity.
- Allow camera access for AI tracking and video feedback effects.
- Toggle the UI panels to access generators, effects, fluid settings, and signal controls.
