document.addEventListener('DOMContentLoaded', () => {

    const initialEffectSettings = {
        rgbShift: { name: "RGB Shift", enabled: false, params: { amount: { value: 5, min: 0, max: 50, step: 1 } } },
        scanLines: { name: "Scan Lines", enabled: true, params: { density: { value: 0.7, min: 0, max: 1, step: 0.01 }, opacity: { value: 0.1, min: 0, max: 1, step: 0.01 } } },
        noise: { name: "Signal Noise", enabled: false, params: { amount: { value: 0.1, min: 0, max: 1, step: 0.01 } } },
        colorDistortion: { name: "Color Distortion", enabled: false, params: { hue: { value: 0, min: 0, max: 360, step: 1 }, saturation: { value: 1, min: 0, max: 5, step: 0.1 } } },
        blockiness: { name: "Data Moshing", enabled: false, params: { size: { value: 4, min: 1, max: 32, step: 1 } } },
        chromaGlitch: { name: "Chroma Glitch", enabled: false, params: { shiftAmount: { value: 10, min: 0, max: 100, step: 1 }, bleedIntensity: { value: 0.3, min: 0, max: 1, step: 0.01 } } },
        vhsJitter: { name: "VHS Jitter", enabled: false, params: { vertical: { value: 1, min: 0, max: 10, step: 0.1 }, horizontal: { value: 1, min: 0, max: 10, step: 0.1 } } },
        videoFeedback: { name: "FeedbackPro Loop", enabled: false, params: { amount: { value: 0.8, min: 0, max: 0.99, step: 0.01 }, zoom: { value: 1.005, min: 0.8, max: 1.5, step: 0.001 }, rotation: { value: 0.2, min: -5, max: 5, step: 0.1 }, moveX: { value: 0.0, min: -0.1, max: 0.1, step: 0.001 }, moveY: { value: 0.0, min: -0.1, max: 0.1, step: 0.001 }, hueShift: { value: 2.0, min: 0.0, max: 50.0, step: 0.1 }, lumaThresh: { value: 0.2, min: 0.0, max: 1.0, step: 0.01 } } },
        edgeDetection: { name: "Edge Detection", enabled: false, params: { threshold: { value: 50, min: 1, max: 255, step: 1 }, invert: { value: 0, min: 0, max: 1, step: 1 }, colorMode: { value: 0, min: 0, max: 1, step: 1 } } },
        colorize: { name: "Colorize", enabled: false, params: { hue: { value: 200, min: 0, max: 360, step: 1 }, strength: { value: 0.5, min: 0, max: 1, step: 0.01 } } },
        dataPointCloud: { name: "Data Point Cloud", enabled: false, params: { density: { value: 0.2, min: 0.01, max: 1, step: 0.01 }, size: { value: 1, min: 1, max: 10, step: 1 }, depth: { value: 0.5, min: 0, max: 1, step: 0.01 } } },
        motionDetection: { name: "Motion Detection", enabled: false, params: { threshold: { value: 25, min: 1, max: 255, step: 1 }, decay: { value: 0.95, min: 0.8, max: 0.99, step: 0.01 } } }
    };

    // Global Lock-Free State (Web-MayaFlux)
    const state = {
        timeSpeed: 1.0,
        cohesion: 0.5,
        midiTrailsEnabled: false,
        audioGain: 1.0,
        
        // Polled from AudioEngine
        spectralCentroid: 0.0,
        transient: false,

        glitchez: initialEffectSettings,
        videoElement: null
    };

    // UI Bindings
    const startBtn = document.getElementById('start-audio-btn');
    const threshInput = document.getElementById('audio-threshold');
    const gainInput = document.getElementById('audio-gain');
    const cohesionInput = document.getElementById('boid-cohesion');
    const timeSpeedInput = document.getElementById('time-speed');
    const trailsCheck = document.getElementById('midi-trails');
    const videoElement = document.getElementById('webcam-feed');
    
    // Display elements
    const fpsDisplay = document.getElementById('fps-display');
    const audioLevelDisplay = document.getElementById('audio-level');

    // Build Glitchez DOM dynamically
    const container = document.getElementById('glitchez-controls');
    Object.keys(initialEffectSettings).forEach(key => {
        const effect = initialEffectSettings[key];
        
        const section = document.createElement('div');
        section.className = 'panel-section';
        
        const headerRow = document.createElement('div');
        headerRow.className = 'panel-row';
        headerRow.style.borderBottom = '1px solid #333';
        headerRow.style.marginBottom = '5px';
        headerRow.style.paddingBottom = '2px';

        const title = document.createElement('div');
        title.className = 'panel-header';
        title.style.margin = '0';
        title.style.padding = '0';
        title.innerText = effect.name;
        
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = effect.enabled;
        toggle.addEventListener('change', (e) => {
            state.glitchez[key].enabled = e.target.checked;
        });

        headerRow.appendChild(title);
        headerRow.appendChild(toggle);
        section.appendChild(headerRow);

        Object.keys(effect.params).forEach(paramKey => {
            const param = effect.params[paramKey];
            const row = document.createElement('div');
            row.className = 'panel-row';
            
            const label = document.createElement('label');
            label.innerText = paramKey;
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = param.min;
            slider.max = param.max;
            slider.step = param.step;
            slider.value = param.value;
            
            slider.addEventListener('input', (e) => {
                state.glitchez[key].params[paramKey].value = parseFloat(e.target.value);
            });

            row.appendChild(label);
            row.appendChild(slider);
            section.appendChild(row);
        });

        container.appendChild(section);
    });

    const audioEngine = new AudioEngine();
    const canvasEngine = new CanvasEngine('main-canvas');

    // Attach listeners
    threshInput.addEventListener('input', (e) => {
        audioEngine.threshold = e.target.value / 100.0;
    });

    gainInput.addEventListener('input', (e) => {
        state.audioGain = e.target.value / 100.0;
    });

    cohesionInput.addEventListener('input', (e) => {
        state.cohesion = e.target.value / 100.0;
    });

    timeSpeedInput.addEventListener('input', (e) => {
        state.timeSpeed = e.target.value / 100.0;
    });

    trailsCheck.addEventListener('change', (e) => {
        state.midiTrailsEnabled = e.target.checked;
    });

    startBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoElement.srcObject = stream;
            state.videoElement = videoElement;
        } catch (err) {
            console.error("Camera access denied or unavailable", err);
        }

        await audioEngine.start();
        startBtn.style.display = 'none';
        
        // Start Render Loop
        let lastTime = performance.now();
        let frameCount = 0;
        let lastFpsTime = lastTime;

        function renderLoop() {
            requestAnimationFrame(renderLoop);
            
            const now = performance.now();
            frameCount++;
            
            if (now - lastFpsTime >= 500) {
                fpsDisplay.innerText = ((frameCount * 1000) / (now - lastFpsTime)).toFixed(1);
                frameCount = 0;
                lastFpsTime = now;
                audioLevelDisplay.innerText = audioEngine.spectralCentroid.toFixed(3);
            }

            // Sync state from audio engine
            state.spectralCentroid = audioEngine.spectralCentroid * state.audioGain;
            state.transient = audioEngine.transientDetected;

            canvasEngine.render(state);
        }

        renderLoop();
    });
});
