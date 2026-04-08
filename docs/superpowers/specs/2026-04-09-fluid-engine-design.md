# Spec: Safety-Core Fluid Engine

**Date:** 2026-04-09
**Topic:** Generative Fluid Simulation Engine
**Status:** Draft

## Overview
A high-performance, GPGPU-accelerated Eulerian Fluid Simulation engine for the Dead4rat video synthesizer. The engine reacts to optical flow (webcam motion) and audio pressure (bass/mids), rendering a viscous, "thermal" aesthetic that adheres to the Safety-Core industrial design language.

## Goals
- **Real-time Performance:** Maintain 60FPS at full 1080p (or canvas size) using a multi-pass WebGL2 GPGPU solver.
- **Dynamic Interaction:** The fluid should be physically "pushed" by motion detected in the camera feed.
- **Modular Architecture:** The solver logic resides in a standalone `fluidEngine.js` module to maintain codebase clarity.
- **Visual Identity:** High-contrast "Thermal" palette (Black -> Red -> Orange -> White) based on fluid density and velocity.

## Architecture

### 1. GPGPU Solver Pipeline (`fluidEngine.js`)
The simulation will use a standard Navier-Stokes solver implemented via the following shader passes:
1.  **Optical Flow Pass:** Compares the current webcam frame with the previous frame to calculate a velocity vector field.
2.  **Advection Pass:** Moves the fluid's density and velocity along the current velocity field.
3.  **Divergence Pass:** Calculates the velocity field's divergence to identify areas of compression/expansion.
4.  **Pressure/Jacobi Pass:** Runs multiple iterations (10-20) of a Jacobi solver to compute a pressure field that counteracts divergence (ensuring incompressibility).
5.  **Project Pass:** Subtracts the pressure gradient from the velocity field to get the final incompressible flow.
6.  **Vorticity Confinement:** Adds energy back into Small-scale eddies to prevent the fluid from becoming too "thick" or losing detail.

### 2. UI & Controls (`FLUID_MATRIX`)
A new panel in `dead4rat.jsx` will provide real-time control over:
- **VISCOSITY:** How thick or liquid the fluid feels.
- **DISSIPATION:** How fast the fluid density fades away.
- **OPTICAL_GAIN:** Strength of the motion-to-fluid transfer.
- **AUDIO_DRIVE:** Amount of turbulence added by audio beats.
- **PALETTE_SHIFT:** Controls the color mapping of the thermal gradient.

### 3. Integration Hook
- **Initialization:** `canvasEngine` will initialize `FluidEngine` once the WebGL context is ready.
- **Render Loop:** 
    - `FluidEngine.update(camTex, audioData)` is called before the main generative pass.
    - The `FluidEngine.render()` output is blitted onto the main GPGPU feedback loop or rendered as a layer.

## Technical Details
- **FBOs:** Uses dual ping-pong FBOs for both velocity and density (RGBA_FLOAT or RGBA_HALF_FLOAT).
- **Format:** Supports WebGL2 exclusively for best performance and floating-point texture support.
- **Optimization:** Use a lower resolution (e.g., 512x512) for the physics simulation while rendering at full canvas resolution with linear interpolation to maintain performance on lower-end GPUs.

## Success Criteria
1.  Fluid reacts to hand movements in front of the camera.
2.  Gradients transition smoothly from black to orange without banding.
3.  FPS does not drop below 50 when the engine is active.
