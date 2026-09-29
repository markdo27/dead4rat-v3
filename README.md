# DEAD4RAT — TERMINAL DECAY

A live, audio-reactive visual synth that runs in the browser. Point a camera at
something (or don't), play music, and mangle the picture with GPU effects,
ray-marched 3D scenes, hand and motion tracking, and scenes you can morph
between like a VJ deck.

Everything runs locally in your browser. Nothing is uploaded.

## Using it

Open the page, choose **START** (camera and microphone switches) or **DEMO**
(no permissions). The interface has three parts:

- **HUD (top)** — frame rate and resolution, camera and audio status, random,
  snapshot, record, fullscreen, SANDER, help, panel toggle, hide.
- **Panel (right; bottom sheet on phones)** — six tabs:
  - **SCENE**: 11 generative 3D scenes and their motion/colour controls. CAMERA
    MIX sets how much of the camera shows over the scene.
  - **FX**: 17 effects in four groups (distort, time, colour, texture). Each has
    a switch, sliders, an optional LFO (`~`) per slider, a blend mode, and
    B / M / H buttons to react to bass, mids or highs.
  - **AUDIO**: microphone or audio file, spectrum, beat detection and BPM, gain,
    EQ, smoothing, beat sensitivity.
  - **TRACK**: gesture effects that follow your hand (AI tracking) or, with no
    download at all, the biggest moving area; face/emotion/hand/body tracking;
    face drive; person cut-out; motion blobs.
  - **MEDIA**: image, text and video layers on top of the camera.
  - **OUTPUT**: camera and mirror, format (screen, 16:9, 9:16, 1:1), quality
    (AUTO adapts resolution to your GPU), flips and rotation, snapshot,
    recording (with sound), MIDI.
- **Scene bar (bottom)** — 8 slots. Click an empty slot to save the current look;
  click a full one to morph to it. Shift+click overwrites, double-click renames.
  AUTO steps through your scenes (on the beat when audio is on). SHARE copies a
  link that opens the exact look.

### Shortcuts

| Key | Action |
|---|---|
| 1 – 8 / Shift + 1 – 8 | Fire / save scene |
| R | Random look |
| A | Autopilot |
| G / Shift + G | Next / previous generator |
| H | Hide / show all controls |
| D | Hide / show the panel |
| F | Fullscreen |
| P | Snapshot (PNG) |
| V | Record video |
| ? | Help |

### MIDI

In OUTPUT → MIDI, press CONNECT. Pads on notes 36–43 or 60–67 fire scenes 1–8.
To map a knob: press LEARN, touch a slider, then turn the knob.

## Running it locally

The camera and microphone need `https://` or `http://localhost`, so serve the
folder rather than opening the file:

```sh
npx serve .            # or: python3 -m http.server
```

Then open the printed localhost address.

## Editing

- `engine/` — plain scripts, no build step:
  - `fx.js`, `gen.js`: effects and generators (GLSL plus parameters).
  - `renderer.js`: the WebGL pipeline.
  - `state.js`: looks, modulation, share links and migration of old presets.
  - `deck.js`: the app controller and its single animation loop.
  - Engines: `audio.js`, `camera.js`, `media.js`, `tracking.js`, `ai.js`, `scenes.js`.
- `ui/*.jsx` — the React interface. After editing, run `npm install` once and
  then `npm run build` to regenerate `ui.bundle.js`. While editing you can skip
  the build by adding `?dev` to the URL, which compiles the JSX in the browser.
- `sander.html` — the SANDER Chladni sand overlay, a standalone page.

GitHub Pages deploys from `main`: the workflow rebuilds the bundle and
publishes only the app files.

### How it stays fast

- Only the effects that are switched on are compiled into the shader. An
  unused effect costs nothing.
- The 3D scene ray-marches at reduced resolution, and only the active scene is
  compiled.
- **AUTO** quality lowers or raises the render resolution to hold the frame rate.
- There is one animation loop for everything. Live meters update the page
  directly instead of re-rendering React.
- The AI models (~15 MB) download only when tracking or cut-out is switched on.
- No blur or endlessly animating CSS runs over the live canvas.

## Author & licence

**Mark Do** — dtcmark@gmail.com

- **Personal use is free.** Use this tool, and anything you make with it, for
  personal, study and other non-commercial work. No permission needed.
- **Commercial use needs permission first.** Client, brand, resale and any other
  paid work needs written permission:
  [request a licence](mailto:dtcmark@gmail.com?subject=Commercial%20use%20request).

© 2026 Mark Do — provided as is, with no warranty.
