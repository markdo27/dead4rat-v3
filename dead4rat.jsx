const initialEffectSettings = {
    rgbShift:        { name: "RGB Shift",        enabled: false, audioReactive: false, audioBand: 'HIGH', params: { amount: { value: 5,    min: 0,    max: 50,   step: 1    }, angle:      { value: 0,    min: 0,    max: 360,  step: 1    }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    scanLines:       { name: "Scan Lines",       enabled: true,  audioReactive: false, audioBand: 'MID',  params: { density: { value: 0.7, min: 0,    max: 1,    step: 0.01 }, opacity:    { value: 0.1, min: 0,    max: 1,    step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    noise:           { name: "Signal Noise",     enabled: false, audioReactive: false, audioBand: 'MID',  params: { amount:  { value: 0.1, min: 0,    max: 1,    step: 0.01 }, chromatic:  { value: 0,   min: 0,    max: 1,    step: 1    }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    colorDistortion: { name: "LUT Corrupt",      enabled: false, audioReactive: false, audioBand: 'MID',  params: { hue:     { value: 0,   min: 0,    max: 360,  step: 1    }, saturation: { value: 1,   min: 0,    max: 5,    step: 0.1  }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    blockiness:      { name: "Data Moshing",     enabled: false, audioReactive: false, audioBand: 'BASS', params: { size:    { value: 4,   min: 1,    max: 32,   step: 1    }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    chromaGlitch:    { name: "Chroma Shift",     enabled: false, audioReactive: false, audioBand: 'HIGH', params: { shiftAmount: { value: 10, min: 0, max: 100, step: 1 }, bleedIntensity: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    vhsJitter:       { name: "VHS Jitter",       enabled: false, audioReactive: false, audioBand: 'BASS', params: { vertical: { value: 1, min: 0, max: 10, step: 0.1 }, horizontal: { value: 1, min: 0, max: 10, step: 0.1 }, tear: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    videoFeedback:   { name: "FeedbackPro Loop", enabled: false, audioReactive: false, audioBand: 'BASS', params: { amount: { value: 0.8, min: 0, max: 0.99, step: 0.01 }, zoom: { value: 1.005, min: 0.8, max: 1.5, step: 0.001 }, rotation: { value: 0.0, min: -5, max: 5, step: 0.1 }, moveX: { value: 0.0, min: -0.1, max: 0.1, step: 0.001 }, moveY: { value: 0.0, min: -0.1, max: 0.1, step: 0.001 }, hueShift: { value: 2.0, min: 0.0, max: 50.0, step: 0.1 }, lumaThresh: { value: 1.0, min: 0.0, max: 1.0, step: 0.01 }, mirror: { value: 0, min: 0, max: 1, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    acidMelt:        { name: "Substrate Melt",   enabled: false, audioReactive: false, audioBand: 'BASS', params: { amount: { value: 0.9, min: 0, max: 0.99, step: 0.01 }, gravity: { value: 0.01, min: -0.05, max: 0.05, step: 0.001 }, turbulence: { value: 0.05, min: 0, max: 0.5, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    chromaDelay:     { name: "Chroma Ghost",     enabled: false, audioReactive: false, audioBand: 'HIGH', params: { amount: { value: 0.8, min: 0, max: 0.99, step: 0.01 }, scaleR: { value: 1.01, min: 0.8, max: 1.2, step: 0.001 }, scaleG: { value: 1.0, min: 0.8, max: 1.2, step: 0.001 }, scaleB: { value: 0.99, min: 0.8, max: 1.2, step: 0.001 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    edgeDetection:   { name: "Edge Detection",   enabled: false, audioReactive: false, audioBand: 'HIGH', params: { threshold: { value: 50, min: 1, max: 255, step: 1 }, invert: { value: 0, min: 0, max: 1, step: 1 }, colorMode: { value: 0, min: 0, max: 1, step: 1 }, glow: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    colorize:        { name: "Screen Colorize",  enabled: false, audioReactive: false, audioBand: 'MID',  params: { hue: { value: 200, min: 0, max: 360, step: 1 }, strength: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    dataPointCloud:  { name: "Bag of Grains",    enabled: false, audioReactive: false, audioBand: 'MID',  params: { density: { value: 0.2, min: 0.01, max: 1, step: 0.01 }, size: { value: 1, min: 1, max: 10, step: 1 }, depth: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    motionDetection: { name: "Motion Slit",      enabled: false, audioReactive: false, audioBand: 'BASS', params: { threshold: { value: 25, min: 1, max: 255, step: 1 }, decay: { value: 0.95, min: 0.8, max: 0.99, step: 0.01 }, tint: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    kaleidoscope:    { name: "Kaleidoscope",     enabled: false, audioReactive: false, audioBand: 'MID',  params: { segments: { value: 6, min: 2, max: 12, step: 1 }, rotation: { value: 0, min: -180, max: 180, step: 1 }, zoom: { value: 1.0, min: 0.2, max: 3.0, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    barrelDistortion:{ name: "Barrel / Fisheye", enabled: false, audioReactive: false, audioBand: 'BASS', params: { amount: { value: 0.5, min: -2, max: 2, step: 0.01 }, centerX: { value: 0.5, min: 0, max: 1, step: 0.01 }, centerY: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    pixelSort:       { name: "Pixel Sort",       enabled: false, audioReactive: false, audioBand: 'HIGH', params: { threshold: { value: 0.5, min: 0, max: 1, step: 0.01 }, direction: { value: 0, min: 0, max: 1, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    posterize:       { name: "Posterize",        enabled: false, audioReactive: false, audioBand: 'BASS', params: { levels: { value: 8, min: 2, max: 32, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    glitchSlicer:    { name: "Glitch Slicer",    enabled: false, audioReactive: false, audioBand: 'BASS', params: { slices: { value: 8, min: 2, max: 32, step: 1 }, offset: { value: 30, min: 0, max: 200, step: 1 }, speed: { value: 5, min: 1, max: 30, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    vortexWarp:      { name: "Vortex Warp",      enabled: false, audioReactive: false, audioBand: 'MID',  params: { strength: { value: 2, min: -10, max: 10, step: 0.1 }, radius: { value: 0.5, min: 0.05, max: 1, step: 0.01 }, centerX: { value: 0.5, min: 0, max: 1, step: 0.01 }, centerY: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    ditherMatrix:    { name: "Dither Matrix",    enabled: false, audioReactive: false, audioBand: 'MID',  params: { scale: { value: 4, min: 2, max: 32, step: 1 }, contrast: { value: 1, min: 0, max: 2, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    thermalVision:   { name: "Thermal Vision",   enabled: false, audioReactive: false, audioBand: 'HIGH', params: { intensity: { value: 1, min: 0, max: 1, step: 0.01 }, bias: { value: 0, min: -0.5, max: 0.5, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    mirrorTile:      { name: "Mirror Tile",      enabled: false, audioReactive: false, audioBand: 'MID',  params: { tilesX: { value: 2, min: 1, max: 8, step: 1 }, tilesY: { value: 2, min: 1, max: 8, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    stroboscope:     { name: "Stroboscope",      enabled: false, audioReactive: false, audioBand: 'BASS', params: { rate: { value: 4, min: 1, max: 30, step: 1 }, hold: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    particleDisp:    { name: "Particle Scatter", enabled: false, audioReactive: false, audioBand: 'HIGH', params: { amount: { value: 0.5, min: 0, max: 1, step: 0.01 }, spread: { value: 50, min: 0, max: 200, step: 1 }, direction: { value: 0, min: 0, max: 360, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    splitScan:       { name: "Split Scan",       enabled: false, audioReactive: false, audioBand: 'MID',  params: { bands: { value: 8, min: 2, max: 32, step: 1 }, shift: { value: 50, min: 0, max: 400, step: 1 }, warp: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } }
};

// Frozen factory defaults — never mutated
const FACTORY_DEFAULTS = JSON.parse(JSON.stringify(initialEffectSettings));

// ── Effect Category Grouping ─────────────────────────────────────────
const EFFECT_CATEGORIES = [
    { name: 'COLOR', keys: ['rgbShift', 'colorDistortion', 'chromaGlitch', 'chromaDelay', 'colorize', 'thermalVision'] },
    { name: 'DISTORT', keys: ['barrelDistortion', 'vortexWarp', 'kaleidoscope', 'mirrorTile'] },
    { name: 'TEXTURE', keys: ['scanLines', 'noise', 'blockiness', 'posterize', 'ditherMatrix', 'dataPointCloud', 'particleDisp'] },
    { name: 'GLITCH', keys: ['vhsJitter', 'glitchSlicer', 'pixelSort', 'stroboscope', 'splitScan'] },
    { name: 'FEEDBACK', keys: ['videoFeedback', 'acidMelt', 'motionDetection'] },
    { name: 'DETECT', keys: ['edgeDetection'] },
];

// ── Blend Mode Names ─────────────────────────────────────────────────
const BLEND_MODE_NAMES = ['NORMAL', 'ADD', 'MULTIPLY', 'SCREEN', 'OVERLAY', 'DIFFER'];

// ── Built-In Starter Presets ─────────────────────────────────────────
const STARTER_PRESETS = [
    {
        id: 'starter_vhs', name: 'VHS RETRO', isStarter: true,
        settings: (() => {
            const s = JSON.parse(JSON.stringify(FACTORY_DEFAULTS));
            s.scanLines.enabled = true; s.scanLines.params.density.value = 0.85; s.scanLines.params.opacity.value = 0.25;
            s.vhsJitter.enabled = true; s.vhsJitter.params.vertical.value = 2.5; s.vhsJitter.params.horizontal.value = 1.8;
            s.noise.enabled = true; s.noise.params.amount.value = 0.15;
            s.colorDistortion.enabled = true; s.colorDistortion.params.saturation.value = 0.7;
            return s;
        })(),
    },
    {
        id: 'starter_acid', name: 'ACID DREAM', isStarter: true,
        settings: (() => {
            const s = JSON.parse(JSON.stringify(FACTORY_DEFAULTS));
            s.videoFeedback.enabled = true; s.videoFeedback.params.amount.value = 0.88; s.videoFeedback.params.zoom.value = 1.01; s.videoFeedback.params.rotation.value = 0.5; s.videoFeedback.params.hueShift.value = 8;
            s.acidMelt.enabled = true; s.acidMelt.params.amount.value = 0.85; s.acidMelt.params.turbulence.value = 0.12;
            s.chromaDelay.enabled = true; s.chromaDelay.params.amount.value = 0.7;
            return s;
        })(),
    },
    {
        id: 'starter_clean', name: 'CLEAN EDGES', isStarter: true,
        settings: (() => {
            const s = JSON.parse(JSON.stringify(FACTORY_DEFAULTS));
            s.edgeDetection.enabled = true; s.edgeDetection.params.threshold.value = 40; s.edgeDetection.params.glow.value = 0.6;
            s.scanLines.enabled = true; s.scanLines.params.density.value = 0.5; s.scanLines.params.opacity.value = 0.08;
            s.colorize.enabled = true; s.colorize.params.hue.value = 180; s.colorize.params.strength.value = 0.3;
            return s;
        })(),
    },
    {
        id: 'starter_cyber', name: 'CYBER PUNK', isStarter: true,
        settings: (() => {
            const s = JSON.parse(JSON.stringify(FACTORY_DEFAULTS));
            s.rgbShift.enabled = true; s.rgbShift.params.amount.value = 12;
            s.glitchSlicer.enabled = true; s.glitchSlicer.params.slices.value = 12; s.glitchSlicer.params.offset.value = 60;
            s.posterize.enabled = true; s.posterize.params.levels.value = 6;
            s.scanLines.enabled = true; s.scanLines.params.density.value = 0.9; s.scanLines.params.opacity.value = 0.2;
            return s;
        })(),
    },
];

const GEN_DEFAULTS = {
    speed:      { name: 'SPEED',      value: 1.0, min: 0,   max: 3,   step: 0.01 },
    zoom:       { name: 'ZOOM',       value: 1.0, min: 0.1, max: 3,   step: 0.01 },
    warp:       { name: 'WARP',       value: 1.0, min: 0,   max: 2,   step: 0.01 },
    density:    { name: 'DENSITY',    value: 1.0, min: 0.1, max: 3.0, step: 0.01 },
    iterations: { name: 'ITERATIONS', value: 0.5, min: 0.0, max: 1.0, step: 0.01 },
    colorA:     { name: 'PALETTE_A',  value: 0.0, min: 0.0, max: 1.0, step: 0.01 },
    colorB:     { name: 'CHROMA_B',   value: 0.5, min: 0.0, max: 1.0, step: 0.01 },
    rotateX:    { name: 'ROTATION_X', value: 0.0, min: 0,   max: 6.28, step: 0.01 },
    rotateY:    { name: 'ROTATION_Y', value: 0.0, min: 0,   max: 6.28, step: 0.01 },
    rotateZ:    { name: 'ROTATION_Z', value: 0.0, min: 0,   max: 6.28, step: 0.01 }
};

// Global Mutation State (bypasses React for 60fps)
const globalState = {
    timeSpeed: 1.0,
    audioGain: 1.0,
    lfoSpeed: 1.0,
    lfoDepth: 0.5,
    spectralCentroid: 0.0,
    bass: 0.0, mid: 0.0, high: 0.0,
    transient: false,
    isolatePerson: false,
    glitchez: JSON.parse(JSON.stringify(FACTORY_DEFAULTS)),
    genMode: 'OFF',
    genAudioBand: 'MID',
    genParams: JSON.parse(JSON.stringify(GEN_DEFAULTS)),
    videoElement: null,
    compositeSource: null,
    mouse3d: { x: 0.0, y: 0.0, z: 0.0 },
    fluidParams: {
        enabled:        false,
        viscosity:      0.995,
        dissipation:    0.97,
        opticalGain:    3.0,
        audioDrive:     1.0,
        gain:           2.0,
        mix:            0.75,
        // Bloom post-pass
        bloomEnabled:   false,
        bloomThreshold: 0.35,
        bloomIntensity: 1.5,
        bloomRadius:    5.0,
        bloomMix:       0.6,
    }
};

let audioEngine = null;
let canvasEngine = null;
let mediaManager = null;
let presetManager = null;
let maskEngine = null;
let blobTracker = null;
let humanEngine = null;
let fluidEngine = null;

// ═══════════════════════════════════════════
// TERMINAL WINDOW — Uses component library
// ═══════════════════════════════════════════

// TerminalWindow is now provided by ui_components.jsx
// Keep a local reference for convenience
const TerminalWindow = window.TerminalWindow;

// ═══════════════════════════════════════════
// SIGNAL MONITOR — Live spectrum + band meters
// ═══════════════════════════════════════════

function SignalMonitor({ audioEngine, audioGain, onGainChange, audioFile, onFileChange, onMicToggle, onAudioOff, useMic, lfoSpeed, onLfoSpeedChange, lfoDepth, onLfoDepthChange, bassGain, onBassGainChange, midGain, onMidGainChange, highGain, onHighGainChange }) {
    const canvasRef = React.useRef(null);
    const [bass, setBass] = React.useState(0);
    const [mid, setMid] = React.useState(0);
    const [high, setHigh] = React.useState(0);
    const [transient, setTransient] = React.useState(false);

    React.useEffect(() => {
        let frameId;
        const draw = () => {
            frameId = requestAnimationFrame(draw);
            const canvas = canvasRef.current;
            if (!canvas || !audioEngine) return;
            const ctx = canvas.getContext('2d');
            const W = canvas.width;
            const H = canvas.height;

            const data = audioEngine.getFrequencyData();
            if (!data || data.length === 0) {
                ctx.fillStyle = '#050505';
                ctx.fillRect(0, 0, W, H);
                return;
            }

            // Background
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, W, H);

            // Draw spectrum bars
            const binCount = Math.min(data.length, 256);
            const barW = W / binCount;
            for (let i = 0; i < binCount; i++) {
                const v = data[i] / 255.0;
                const barH = v * H;
                let color;
                if (i < 8) color = '#FF5500';
                else if (i < 60) color = '#FF8800';
                else color = `rgba(255,${Math.floor(200 + v * 55)},${Math.floor(v * 80)},${0.7 + v * 0.3})`;
                ctx.fillStyle = color;
                ctx.fillRect(i * barW, H - barH, Math.max(1, barW - 0.5), barH);
            }

            // Grid lines
            ctx.strokeStyle = 'rgba(255,85,0,0.08)';
            ctx.lineWidth = 0.5;
            for (let y = 0; y < H; y += H / 4) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
            }

            // Update band values (apply master gain so meters reflect what the shader sees)
            const g = audioGain || 1.0;
            setBass(audioEngine.bass * g);
            setMid(audioEngine.mid * g);
            setHigh(audioEngine.high * g);
            setTransient(audioEngine.transientDetected);
        };
        draw();
        return () => cancelAnimationFrame(frameId);
    }, [audioEngine, audioGain]);

    const BandMeter = ({ label, value, color }) => (
        <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px'}}>
            <span style={{fontSize: '0.6rem', color: 'var(--text-dim)', width: '30px'}}>{label}</span>
            <div className="band-meter-track">
                <div className="band-meter-fill" style={{ width: `${Math.min(100, value * 100 * 4)}%`, background: color }} />
            </div>
            <span style={{fontSize: '0.55rem', color, width: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>
                {(value * 100).toFixed(0)}%
            </span>
        </div>
    );

    const handleFileInput = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file && onFileChange) onFileChange(file);
        };
        input.click();
    };

    return (
        <div>
            {/* Spectrum Visualizer */}
            <canvas
                ref={canvasRef}
                width={292}
                height={60}
                className="signal-canvas"
            />

            {/* Beat flash */}
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: '4px'}}>
                <div className={`transient-dot ${transient ? 'active' : ''}`} />
                <span style={{fontSize: '0.6rem', color: transient ? 'var(--accent)' : 'var(--text-muted)'}}>
                    {transient ? 'TRANSIENT DETECTED' : 'MONITORING...'}
                </span>
            </div>

            {/* Band Meters */}
            <BandMeter label="BASS" value={bass} color="#FF5500" />
            <BandMeter label="MID"  value={mid}  color="#FF9900" />
            <BandMeter label="HIGH" value={high} color="#FFDD00" />

            <div className="hud-divider" style={{marginTop: '10px'}} />

            {/* Master Volume */}
            <div className="signal-control-row">
                <span className="status-label">MASTER</span>
                <input type="range" className="brutalist-slider" min="0" max="300" step="1"
                    value={Math.round(audioGain * 100)}
                    onChange={(e) => onGainChange(parseFloat(e.target.value) / 100.0)}
                />
                <span style={{fontSize: '0.6rem', color: audioGain > 1.0 ? 'var(--accent)' : 'var(--text-bright)', width: '38px', textAlign: 'right'}}>
                    {Math.round(audioGain * 100)}%
                </span>
            </div>

            <div className="hud-divider" style={{marginTop: '8px'}} />

            {/* Band EQ — simple horizontal sliders */}
            <div style={{fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '1px'}}>BAND EQ // GAIN</div>
            <div className="signal-control-row">
                <span className="status-label" style={{color: '#FF5500'}}>BASS</span>
                <input type="range" className="brutalist-slider" min="0" max="400" step="5"
                    value={Math.round(bassGain * 100)}
                    onChange={(e) => { const v = parseFloat(e.target.value) / 100; onBassGainChange(v); if (audioEngine) audioEngine.bassGain = v; }}
                />
                <span style={{fontSize: '0.6rem', color: '#FF5500', width: '38px', textAlign: 'right'}}>{Math.round(bassGain * 100)}%</span>
            </div>
            <div className="signal-control-row">
                <span className="status-label" style={{color: '#FF9900'}}>MID</span>
                <input type="range" className="brutalist-slider" min="0" max="400" step="5"
                    value={Math.round(midGain * 100)}
                    onChange={(e) => { const v = parseFloat(e.target.value) / 100; onMidGainChange(v); if (audioEngine) audioEngine.midGain = v; }}
                />
                <span style={{fontSize: '0.6rem', color: '#FF9900', width: '38px', textAlign: 'right'}}>{Math.round(midGain * 100)}%</span>
            </div>
            <div className="signal-control-row">
                <span className="status-label" style={{color: '#FFDD00'}}>HIGH</span>
                <input type="range" className="brutalist-slider" min="0" max="400" step="5"
                    value={Math.round(highGain * 100)}
                    onChange={(e) => { const v = parseFloat(e.target.value) / 100; onHighGainChange(v); if (audioEngine) audioEngine.highGain = v; }}
                />
                <span style={{fontSize: '0.6rem', color: '#FFDD00', width: '38px', textAlign: 'right'}}>{Math.round(highGain * 100)}%</span>
            </div>
            <div className="signal-control-row">
                <span className="status-label">SMOOTH</span>
                <input type="range" className="brutalist-slider" min="0" max="99" step="1"
                    value={Math.round((audioEngine?.smoothing || 0.7) * 100)}
                    onChange={(e) => { if (audioEngine) audioEngine.smoothing = parseFloat(e.target.value) / 100.0; }}
                />
                <span style={{fontSize: '0.6rem', color: 'var(--text-bright)', width: '32px', textAlign: 'right'}}>
                    {Math.round((audioEngine?.smoothing || 0.7) * 100)}%
                </span>
            </div>

            <div className="hud-divider" />

            {/* LFO Global Controls */}
            <div style={{fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '6px'}}>LFO AUTOMATION</div>
            <div className="signal-control-row">
                <span className="status-label">SPEED</span>
                <input type="range" className="brutalist-slider" min="1" max="100" step="1"
                    value={Math.round(lfoSpeed * 10)}
                    onChange={(e) => onLfoSpeedChange(parseFloat(e.target.value) / 10.0)}
                />
                <span style={{fontSize: '0.6rem', color: 'var(--text-bright)', width: '36px', textAlign: 'right'}}>
                    {lfoSpeed.toFixed(1)}Hz
                </span>
            </div>
            <div className="signal-control-row">
                <span className="status-label">DEPTH</span>
                <input type="range" className="brutalist-slider" min="0" max="100" step="1"
                    value={Math.round(lfoDepth * 100)}
                    onChange={(e) => onLfoDepthChange(parseFloat(e.target.value) / 100.0)}
                />
                <span style={{fontSize: '0.6rem', color: 'var(--text-bright)', width: '32px', textAlign: 'right'}}>
                    {Math.round(lfoDepth * 100)}%
                </span>
            </div>

            <div className="hud-divider" />

            {/* Source selection */}
            <div style={{fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '6px'}}>AUDIO SOURCE</div>
            <div style={{display: 'flex', gap: '4px'}}>
                <button
                    className={`brutalist-button ${useMic ? 'primary' : ''}`}
                    style={{flex: 1, fontSize: '0.6rem', padding: '5px 4px'}}
                    onClick={() => onMicToggle(true)}
                >
                    🎙 MIC
                </button>
                <button
                    className={`brutalist-button ${audioFile ? 'primary' : ''}`}
                    style={{flex: 1, fontSize: '0.6rem', padding: '5px 4px'}}
                    onClick={handleFileInput}
                >
                    🎵 FILE
                </button>
            </div>
            {audioFile && (
                <div style={{marginTop: '5px', fontSize: '0.55rem', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    ▶ {audioFile.name}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════

function Dead4RatApp() {
    const [fps, setFps] = React.useState('0.0');
    const [started, setStarted] = React.useState(false);
    const [layers, setLayers] = React.useState([]);
    const [selectedLayerId, setSelectedLayerId] = React.useState(null);
    const [presets, setPresets] = React.useState([]);
    const [isRecording, setIsRecording] = React.useState(false);
    const [uiRefresh, setUiRefresh] = React.useState(0);
    const [uiVisible, setUiVisible] = React.useState(true);
    const [useMic, setUseMic] = React.useState(false);
    const [audioGain, setAudioGain] = React.useState(1.0);
    const [audioFile, setAudioFile] = React.useState(null);
    const [lfoSpeed, setLfoSpeed] = React.useState(1.0);
    const [lfoDepth, setLfoDepth] = React.useState(0.5);

    const [isolatePerson, setIsolatePerson] = React.useState(false);
    const [maskLoading, setMaskLoading] = React.useState(false);
    const [camOn, setCamOn] = React.useState(true);
    const [canvasTransform, setCanvasTransform] = React.useState({ flipH: false, flipV: false, rotation: 0 });
    const [canvasScale, setCanvasScale] = React.useState('FIT');
    const [blobEnabled, setBlobEnabled] = React.useState(false);
    const [blobOverlay, setBlobOverlay] = React.useState(true);
    const [blobThreshold, setBlobThreshold] = React.useState(30);
    const [blobMinArea, setBlobMinArea] = React.useState(15);
    const [blobLifespan, setBlobLifespan] = React.useState(45);
    const [blobCount, setBlobCount] = React.useState(0);
    // Per-band EQ gain (0–4× multiplier, 1.0 = unity)
    const [bassGain, setBassGain] = React.useState(1.0);
    const [midGain,  setMidGain]  = React.useState(1.0);
    const [highGain, setHighGain] = React.useState(1.0);

    // ── Human AI Engine state ─────────────────────────────────────────
    const [humanEnabled, setHumanEnabled] = React.useState(false);
    const [humanLoading, setHumanLoading] = React.useState(false);
    const [humanData, setHumanData] = React.useState(null);   // live display
    // AI-drive: which shader params respond to face tracking
    const [aiDriveEnabled, setAiDriveEnabled] = React.useState(false);
    const [aiDriveMapping, setAiDriveMapping] = React.useState({
        yawTo:         'vortexWarp.params.centerX',
        pitchTo:       'barrelDistortion.params.centerY',
        rollTo:        'videoFeedback.params.rotation',
        gazeToCX:      '',
        gazeToCY:      '',
        emotionToHue:  true,
    });

    const [genMode, setGenMode] = React.useState('OFF');
    const [genAudioBand, setGenAudioBand] = React.useState('MID');
    const [genAudioReactive, setGenAudioReactive] = React.useState(true);

    const [openCategories, setOpenCategories] = React.useState({ COLOR: true, DISTORT: false, TEXTURE: true, GLITCH: false, FEEDBACK: false, DETECT: false });
    const toggleCategory = (name) => setOpenCategories(s => ({...s, [name]: !s[name]}));

    // Live band values for effect card glow (updated from render loop)
    const liveAudio = React.useRef({ bass: 0, mid: 0, high: 0 });

    const [panels, setPanels] = React.useState({
        terminal: true,
        command: true,
        effects: true,
        signal: true,
        generators: true,
        human: false,
        fluid: false,
    });

    const togglePanel = (key) => setPanels(p => ({...p, [key]: !p[key]}));

    React.useEffect(() => {
        if (!canvasEngine)  canvasEngine  = new CanvasEngine('main-canvas');
        if (!audioEngine)   audioEngine   = new AudioEngine();
        if (!mediaManager)  mediaManager  = new MediaManager(window.innerWidth, window.innerHeight);
        if (!maskEngine)    maskEngine    = new MaskEngine(640, 480);
        if (!blobTracker)   blobTracker   = new BlobTracker();
        if (!humanEngine)   humanEngine   = new HumanEngine();
        if (!presetManager) {
            presetManager = new PresetManager();
            setPresets(presetManager.presets);
        }
        // Init canvas transform in globalState
        globalState.canvasTransform = { flipH: false, flipV: false, rotation: 0 };

        // === Fluid Engine Init ===
        if (canvasEngine && canvasEngine.gl && !fluidEngine && window.FluidEngine) {
            fluidEngine = new window.FluidEngine(canvasEngine.gl);
            canvasEngine.fluidEngine = fluidEngine;
        }

        // Mouse Tracker for GPGPU Interactions
        const updateMouse = (clientX, clientY) => {
            globalState.mouse3d.x = (clientX / window.innerWidth) * 2.0 - 1.0;
            globalState.mouse3d.y = -(clientY / window.innerHeight) * 2.0 + 1.0;
        };
        const onMouseMove = (e) => updateMouse(e.clientX, e.clientY);
        const onTouchMove = (e) => {
            if (e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchstart', onTouchMove);
        
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchstart', onTouchMove);
        };
    }, []);

    const resetSystem = () => {
        // Deep clone defaults to restore all effects
        globalState.glitchez = JSON.parse(JSON.stringify(FACTORY_DEFAULTS));
        // Clear any active LFO state
        Object.keys(globalState.glitchez).forEach(k => {
            const effect = globalState.glitchez[k];
            Object.keys(effect.params).forEach(pk => {
                delete effect.params[pk].lfo;
                delete effect.params[pk]._lfoBase;
            });
        });
        globalState.genParams = JSON.parse(JSON.stringify(GEN_DEFAULTS));
        Object.keys(globalState.genParams).forEach(pk => {
            delete globalState.genParams[pk].lfo;
            delete globalState.genParams[pk]._lfoBase;
        });
        // Reset LFO globals
        setLfoSpeed(1.0);
        setLfoDepth(0.5);
        globalState.lfoSpeed = 1.0;
        globalState.lfoDepth = 0.5;
        setUiRefresh(r => r + 1);
    };

    const handleMicToggle = async (enable) => {
        setUseMic(enable);
        if (!started) return;
        audioEngine.stop();
        setAudioFile(null);
        if (enable) {
            await audioEngine.start();
            setUseMic(true);
        }
        setUiRefresh(r => r + 1);
    };

    const handleAudioOff = () => {
        if (audioEngine) audioEngine.stop();
        setUseMic(false);
        setAudioFile(null);
        setUiRefresh(r => r + 1);
    };

    const handleFileSource = async (file) => {
        setAudioFile(file);
        setUseMic(false);
        if (started) {
            await audioEngine.startFromFile(file);
        }
        setUiRefresh(r => r + 1);
    };

    const scrambleParams = () => {
        Object.keys(globalState.glitchez).forEach(key => {
            const effect = globalState.glitchez[key];
            Object.keys(effect.params).forEach(paramKey => {
                const param = effect.params[paramKey];
                const range = param.max - param.min;
                if (param.max === 1 && param.step === 1) param.value = Math.random() > 0.5 ? 1 : 0;
                else param.value = (Math.random() * range) + param.min;
                const el = document.getElementById(`slider-${key}-${paramKey}`);
                if (el) el.value = param.value;
            });
        });
    };

    const scrambleEngines = () => {
        Object.keys(globalState.glitchez).forEach(key => {
            let chance = 0.3; // Default 30% chance for most modules
            
            // Tone down heavy geometric and feedback effects to keep it usable
            if (key === 'kaleidoscope') chance = 0.05; // 5% chance (rare)
            else if (['mirrorTile', 'vortexWarp', 'videoFeedback', 'acidMelt', 'splitScan'].includes(key)) chance = 0.15;
            // Higher chance for more pleasant baseline effects
            else if (['rgbShift', 'scanLines', 'noise', 'colorDistortion', 'chromaGlitch'].includes(key)) chance = 0.5;
            
            globalState.glitchez[key].enabled = Math.random() < chance;
        });
        setUiRefresh(r => r + 1);
    };

    const handleIsolateToggle = async () => {
        const nextState = !isolatePerson;
        setIsolatePerson(nextState);
        globalState.isolatePerson = nextState;
        if (nextState && maskEngine && !maskEngine.initialized) {
            setMaskLoading(true);
            await maskEngine.init();
            setMaskLoading(false);
        }
        if (maskEngine) maskEngine.enabled = nextState;
    };

    const toggleCam = async () => {
        const videoElement = document.getElementById('webcam-feed');
        if (!videoElement) return;
        if (camOn) {
            // Stop all camera tracks
            const stream = videoElement.srcObject;
            if (stream) stream.getTracks().forEach(t => t.stop());
            videoElement.srcObject = null;
            globalState.videoElement = null;
            setCamOn(false);
        } else {
            // Restart camera
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                videoElement.srcObject = stream;
                globalState.videoElement = videoElement;
                setCamOn(true);
            } catch (err) { console.error('Camera access denied', err); }
        }
    };

    const toggleStart = async () => {
        const videoElement = document.getElementById('webcam-feed');
        if (!videoElement) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoElement.srcObject = stream;
            globalState.videoElement = videoElement;
        } catch (err) { console.error('Camera access denied', err); }

        // Start audio source if selected
        if (useMic) {
            await audioEngine.start();
        } else if (audioFile) {
            await audioEngine.startFromFile(audioFile);
        }

        setStarted(true);
        setUiRefresh(r => r + 1);

        let lastTime = performance.now();
        let frames = 0;
        // Stable refs so render loop closure always sees latest value
        const aiDriveEnabledRef = { current: false };
        const aiDriveMappingRef  = { current: {} };
        // Keep refs in sync — we'll update them via a useEffect below
        Object.defineProperty(aiDriveEnabledRef, 'current', { get: () => globalState._aiDriveEnabled || false, set: v => {} });
        Object.defineProperty(aiDriveMappingRef,  'current', { get: () => globalState._aiDriveMapping  || {}, set: v => {} });
        const renderLoop = (time) => {
            requestAnimationFrame(renderLoop);
            frames++;
            if (time - lastTime >= 1000) {
                setFps(Math.round((frames * 1000) / (time - lastTime)));
                lastTime = time;
                frames = 0;
            }
            // Sync audio → globalState
            const gain = globalState.audioGain;
            globalState.spectralCentroid = audioEngine.spectralCentroid * gain;
            globalState.bass = audioEngine.bass * gain;
            globalState.mid  = audioEngine.mid * gain;
            globalState.high = audioEngine.high * gain;
            globalState.transient = audioEngine.transientDetected;

            // Also store in ref for effect card glow (avoids React re-render cost)
            liveAudio.current.bass = globalState.bass;
            liveAudio.current.mid  = globalState.mid;
            liveAudio.current.high = globalState.high;

            // ── Human AI → globalState ────────────────────────────────
            if (humanEngine && humanEngine.isRunning) {
                const hd = humanEngine.getData();
                globalState.human = hd;
                // AI-drive: let face/hand data override shader params
                if (aiDriveEnabledRef.current && hd.faceDetected) {
                    humanEngine.applyToGlobalState(globalState, aiDriveMappingRef.current);
                }
                // Feed data + raw landmarks into blobTracker overlay
                if (blobTracker) {
                    blobTracker.setHumanData(hd, humanEngine._lastResult);
                    // Ensure overlay canvas is visible whenever human AI is on
                    if (blobTracker.showHuman && blobTracker.showOverlay) {
                        blobTracker.overlayCanvas.style.display = 'block';
                        // If blob detection is off, still redraw human layer each frame
                        if (!blobTracker.enabled) {
                            blobTracker.overlayCtx.clearRect(0, 0, blobTracker.overlayCanvas.width, blobTracker.overlayCanvas.height);
                            blobTracker._drawHumanOverlay();
                        }
                    }
                }
                // Throttle React UI update to ~8fps to avoid excess re-renders
                if (frames % 8 === 0) setHumanData({...hd});
            } else if (humanEngine && !humanEngine.isRunning && blobTracker) {
                // Human stopped — clear its data from overlay
                blobTracker.setHumanData(null, null);
            }

            // ── LFO Automation Pass ──────────────────────────────────
            const now = performance.now() * 0.001;
            const spd = globalState.lfoSpeed;
            const dep = globalState.lfoDepth;
            Object.keys(globalState.glitchez).forEach(ek => {
                const eff = globalState.glitchez[ek];
                Object.keys(eff.params).forEach(pk => {
                    const p = eff.params[pk];
                    if (!p.lfo) return;
                    const base = (p._lfoBase !== undefined) ? p._lfoBase : p.value;
                    const range = p.max - p.min;
                    let mod = 0;
                    const t = now * spd;
                    switch (p.lfo) {
                        case 'sin': mod = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; break;
                        case 'tri': mod = Math.abs(((t % 1) * 2) - 1); break;
                        case 'saw': mod = t % 1; break;
                        case 'rnd': mod = (Math.sin(t * 127.1) * 43758.5453) % 1; mod = Math.abs(mod); break;
                    }
                    // Swing around base: base ± (depth * range/2)
                    const offset = (mod - 0.5) * dep * range;
                    p.value = Math.min(p.max, Math.max(p.min, base + offset));
                });
            });

            // LFO for Generator Params
            Object.values(globalState.genParams).forEach(p => {
                if (!p.lfo) return;
                const base = (p._lfoBase !== undefined) ? p._lfoBase : p.value;
                const range = p.max - p.min;
                let mod = 0;
                const t = now * spd;
                switch (p.lfo) {
                    case 'sin': mod = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; break;
                    case 'tri': mod = Math.abs(((t % 1) * 2) - 1); break;
                    case 'saw': mod = t % 1; break;
                    case 'rnd': mod = (Math.sin(t * 127.1) * 43758.5453) % 1; mod = Math.abs(mod); break;
                }
                const offset = (mod - 0.5) * dep * range;
                p.value = Math.min(p.max, Math.max(p.min, base + offset));
            });

            if (globalState.isolatePerson && maskEngine && maskEngine.isReady) {
                maskEngine.process(globalState.videoElement);
                globalState.maskCanvas = maskEngine.getMask();
            } else {
                globalState.maskCanvas = null;
            }

            // Composite first so blob tracker sees everything (webcam + video layers)
            globalState.compositeSource = mediaManager.composite(globalState.videoElement);

            // Blob Tracker — analyse composite canvas so video layers are included
            if (blobTracker && blobTracker.enabled) {
                blobTracker.process(globalState.compositeSource);
                // Update live blob count display (throttled to avoid excess re-renders)
                if (frames % 6 === 0) setBlobCount(blobTracker.blobCount);
            }

            // ── Fluid Splat Sources → globalState ────────────────────────
            // Aggregate all external splat sources so canvasEngine can forward
            // them to fluidEngine.splatPoints() after the physics step.
            if (globalState.fluidParams && globalState.fluidParams.enabled) {
                const splats = [];

                // 1. BlobTracker blobs → velocity splats at centroid of each blob
                if (blobTracker && blobTracker.enabled && blobTracker.blobs.length > 0) {
                    blobTracker.blobs.slice(0, 4).forEach((blob, i) => {
                        const area = Math.min(1, blob.area / 400);
                        splats.push({
                            x: blob.cx,
                            y: 1.0 - blob.cy, // flip Y: blob coords are top-down
                            fx: (blob.cx - 0.5) * 0.1,
                            fy: -(blob.cy - 0.5) * 0.1,
                            dye: area * 0.5,
                            radius: 0.04 + area * 0.06,
                        });
                    });
                }

                // 2. HumanEngine hand tip → precision splat at index finger tip
                if (humanEngine && humanEngine.isRunning && humanEngine.handLeft || humanEngine && humanEngine.isRunning && humanEngine.handRight) {
                    const hd = globalState.human;
                    if (hd) {
                        splats.push({
                            x: hd.handTipX,
                            y: 1.0 - hd.handTipY,
                            fx: 0, fy: 0,
                            dye: 0.6,
                            radius: 0.035,
                        });
                    }
                }

                // 3. Audio transient → explosive radial burst at screen center
                if (globalState.transient) {
                    const bass = globalState.bass || 0;
                    const drive = (globalState.fluidParams.audioDrive || 1.0);
                    // Random burst angle for visual variety
                    const angle = (Math.random() * Math.PI * 2);
                    splats.push({
                        x: 0.4 + Math.random() * 0.2,
                        y: 0.4 + Math.random() * 0.2,
                        fx: Math.cos(angle) * bass * drive * 0.3,
                        fy: Math.sin(angle) * bass * drive * 0.3,
                        dye: Math.min(1, bass * drive * 0.8 + 0.2),
                        radius: 0.06 + bass * drive * 0.08,
                    });
                }

                globalState._fluidSplats = splats;
            } else {
                globalState._fluidSplats = null;
            }

            canvasEngine.render(globalState);
        };
        requestAnimationFrame(renderLoop);
    };

    // ── keep globalState.audioGain in sync with React state ──────────────
    React.useEffect(() => {
        globalState.audioGain = audioGain;
    }, [audioGain]);

    React.useEffect(() => {
        globalState.genMode = genMode;
        globalState.genAudioBand = genAudioReactive ? genAudioBand : 'OFF';
    }, [genMode, genAudioBand, genAudioReactive]);

    React.useEffect(() => {
        globalState.lfoSpeed = lfoSpeed;
    }, [lfoSpeed]);

    React.useEffect(() => {
        globalState.lfoDepth = lfoDepth;
    }, [lfoDepth]);

    // ── Sync AI Drive state into globalState for render loop ──────────────
    React.useEffect(() => {
        globalState._aiDriveEnabled = aiDriveEnabled;
    }, [aiDriveEnabled]);

    React.useEffect(() => {
        globalState._aiDriveMapping = aiDriveMapping;
    }, [aiDriveMapping]);

    // ── Human Engine toggle ───────────────────────────────────────────────
    const handleHumanToggle = async () => {
        if (!humanEngine) return;
        if (humanEnabled) {
            humanEngine.stop();
            setHumanEnabled(false);
            setHumanData(null);
        } else {
            setHumanLoading(true);
            const videoElement = document.getElementById('webcam-feed');
            await humanEngine.start(videoElement);
            setHumanLoading(false);
            setHumanEnabled(true);
        }
    };

    // ── Media layers ──────────────────────────────────────────────────────
    const addImage = () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    const layer = mediaManager.addLayer('image', { img, width: img.width/2, height: img.height/2 });
                    setLayers([...mediaManager.layers]);
                    setSelectedLayerId(layer.id);
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const addText = () => {
        const layer = mediaManager.addLayer('text', { text: 'TERMINAL DECAY', fontSize: 80, width: 400, height: 100, fontFamily: 'Share Tech Mono' });
        setLayers([...mediaManager.layers]);
        setSelectedLayerId(layer.id);
    };

    const addVideo = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            const vid = document.createElement('video');
            vid.src = url;
            vid.loop = true;
            vid.muted = true;
            vid.playsInline = true;
            vid.autoplay = true;
            vid.style.display = 'none';
            document.body.appendChild(vid);
            vid.onloadedmetadata = () => {
                const maxDim = 800;
                const ratio = Math.min(maxDim / vid.videoWidth, maxDim / vid.videoHeight, 1);
                const w = vid.videoWidth  * ratio;
                const h = vid.videoHeight * ratio;
                const layer = mediaManager.addLayer('video', {
                    name: file.name.replace(/\.[^.]+$/, ''),
                    vid, objectUrl: url,
                    width: w, height: h,
                    isPlaying: true, loop: true, speed: 1.0,
                });
                vid.play().catch(() => {});
                setLayers([...mediaManager.layers]);
                setSelectedLayerId(layer.id);
            };
            if (vid.readyState >= 1) vid.onloadedmetadata();
        };
        input.click();
    };

    const updateLayer = (id, key, val) => {
        const l = mediaManager.layers.find(l => l.id === id);
        if (l) { l[key] = val; setLayers([...mediaManager.layers]); }
    };

    const recordToggle = () => {
        if (isRecording) canvasEngine.stopRecording();
        else canvasEngine.startRecording(blobTracker);
        setIsRecording(!isRecording);
    };

    const savePreset = () => {
        const name = prompt('Enter Preset Name:');
        if (name) { presetManager.savePreset(name, globalState.glitchez, canvasEngine.canvas); setPresets([...presetManager.presets]); }
    };

    const loadPreset = (p) => {
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;inset:0;background:var(--accent);z-index:9999;pointer-events:none;';
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.transition = 'opacity 0.4s'; flash.style.opacity = 0; setTimeout(() => flash.remove(), 400); }, 30);
        globalState.glitchez = JSON.parse(JSON.stringify(p.settings));
        setUiRefresh(r => r + 1);
    };

    const selectedLayer = mediaManager?.layers.find(l => l.id === selectedLayerId);
    const effectKeys = Object.keys(globalState.glitchez);

    // ── Effect card renderer ──────────────────────────────────────────────
    const BAND_CYCLE = ['BASS', 'MID', 'HIGH'];
    const renderEffect = (key) => {
        const effect = globalState.glitchez[key];
        const band = effect.audioBand || 'MID';
        const bandVal = band === 'BASS' ? liveAudio.current.bass : band === 'HIGH' ? liveAudio.current.high : liveAudio.current.mid;
        const isAudioActive = effect.audioReactive && effect.enabled && audioEngine.isRunning;
        const glowIntensity = isAudioActive ? Math.min(1, bandVal * 4) : 0;

        const bandColor = band === 'BASS' ? '#FF5500' : band === 'MID' ? '#FF9900' : '#FFDD00';

        const selectBand = (newBand) => {
            const eff = globalState.glitchez[key];
            if (eff.audioReactive && eff.audioBand === newBand) {
                // Clicking same band turns off audio reactive
                eff.audioReactive = false;
            } else {
                eff.audioReactive = true;
                eff.audioBand = newBand;
            }
            setUiRefresh(r => r + 1);
        };

        return (
            <div
                className={`glitch-item ${effect.enabled ? 'effect-active' : ''}`}
                key={key}
                style={{
                    boxShadow: glowIntensity > 0.05
                        ? `0 0 ${Math.round(glowIntensity * 16)}px ${bandColor}55, inset 0 0 ${Math.round(glowIntensity * 8)}px ${bandColor}22`
                        : 'none',
                    borderLeftColor: effect.audioReactive ? bandColor : undefined,
                    transition: 'box-shadow 0.08s ease',
                }}
            >
                {/* Header row: dot + name + BAND selectors + ON/OFF toggle */}
                <div className="glitch-header">
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0}}>
                        <span className={`effect-dot ${effect.enabled ? 'on' : ''}`} />
                        <span style={{
                            color: effect.enabled ? 'var(--accent)' : 'var(--text-dim)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontSize: '0.7rem',
                        }}>
                            {effect.name.toUpperCase()}
                        </span>
                    </span>
                    <span style={{display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0}}>
                        {/* BAND selector buttons — BASS / MID / HIGH */}
                        {[
                            { id: 'BASS', label: 'B', color: '#FF5500' },
                            { id: 'MID',  label: 'M', color: '#FF9900' },
                            { id: 'HIGH', label: 'H', color: '#FFDD00' },
                        ].map(b => {
                            const isActive = effect.audioReactive && band === b.id;
                            return (
                                <button
                                    key={b.id}
                                    className={`audio-band-btn ${isActive ? 'active' : ''}`}
                                    title={`${b.id} band reactive${isActive ? ' (click to turn off)' : ''}`}
                                    onClick={() => selectBand(b.id)}
                                    style={{
                                        borderColor: isActive ? b.color : undefined,
                                        color: isActive ? b.color : undefined,
                                        background: isActive ? `${b.color}15` : undefined,
                                        minWidth: '18px',
                                        padding: '2px 4px',
                                    }}
                                >
                                    {b.label}
                                </button>
                            );
                        })}
                        {/* Enable toggle */}
                        <input
                            type="checkbox"
                            className="brutalist-toggle"
                            checked={effect.enabled}
                            onChange={(e) => { globalState.glitchez[key].enabled = e.target.checked; setUiRefresh(r => r + 1); }}
                        />
                    </span>
                </div>
                {/* Params (only when enabled) */}
                {effect.enabled && Object.keys(effect.params).map(pk => {
                    const param = globalState.glitchez[key].params[pk];

                    // ── BlendMode: cycle button instead of slider ──
                    if (pk === 'blendMode') {
                        const modeIdx = Math.round(param.value);
                        const modeName = BLEND_MODE_NAMES[modeIdx] || 'NORMAL';
                        return (
                            <div className="param-row" key={pk} style={{justifyContent: 'flex-end'}}>
                                <button
                                    className={`blend-mode-btn ${modeIdx > 0 ? 'mode-active' : ''}`}
                                    onClick={() => {
                                        param.value = (modeIdx + 1) % BLEND_MODE_NAMES.length;
                                        setUiRefresh(r => r + 1);
                                    }}
                                    title="Click to cycle blend mode"
                                >MIX: {modeName}</button>
                            </div>
                        );
                    }

                    // ── Regular param: slider + LFO ──
                    const waves = [null, 'sin', 'tri', 'saw', 'rnd'];
                    const waveLabels = { sin: '∿', tri: '△', saw: '⧸', rnd: '?' };
                    const cycleWave = () => {
                        const curIdx = waves.indexOf(param.lfo || null);
                        const nextIdx = (curIdx + 1) % waves.length;
                        const nextWave = waves[nextIdx];
                        if (nextWave) {
                            param._lfoBase = param.value;
                            param.lfo = nextWave;
                        } else {
                            if (param._lfoBase !== undefined) param.value = param._lfoBase;
                            delete param._lfoBase;
                            param.lfo = null;
                        }
                        setUiRefresh(r => r + 1);
                    };
                    return (
                        <div className="param-row" key={pk}>
                            <label>{pk.toUpperCase()}</label>
                            <input type="range" className="brutalist-slider"
                                min={param.min} max={param.max}
                                step={param.step}
                                value={param._lfoBase !== undefined ? param._lfoBase : param.value}
                                onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    if (param.lfo) { param._lfoBase = v; }
                                    else { param.value = v; }
                                    setUiRefresh(r => r + 1);
                                }}
                            />
                            <button
                                className={`lfo-btn ${param.lfo ? 'active' : ''}`}
                                onClick={cycleWave}
                                title={param.lfo ? `LFO: ${param.lfo.toUpperCase()}` : 'LFO Off'}
                            >
                                {param.lfo ? waveLabels[param.lfo] : '~'}
                            </button>
                            <span style={{textAlign: 'right', color: 'var(--text-bright)', fontSize: '0.65rem', width: '36px'}}>
                                {param.value.toFixed(2)}
                            </span>
                        </div>
                    );
                })}
                {/* Audio modulation info bar — shown when audioReactive is on */}
                {effect.audioReactive && (
                    <div className="audio-info-bar">
                        <span style={{color: bandColor}}>⚡ {band}</span>
                        <div className="audio-mini-meter">
                            <div style={{width: `${Math.min(100, bandVal * 400)}%`, background: bandColor, height: '100%', transition: 'width 0.05s'}} />
                        </div>
                        <span style={{color: 'var(--text-muted)', fontSize: '0.5rem'}}>{(bandVal * 100).toFixed(0)}%</span>
                    </div>
                )}
            </div>
        );
    };

    const audioOnline = useMic || !!audioFile;

    return (
        <React.Fragment>

            {/* ═══════════════ PRE-BOOT TERMINAL ═══════════════ */}
            {uiVisible && !started && (
                <TerminalWindow
                    id="win-terminal"
                    title="DEAD4RAT Terminal"
                    tag="v3.0"
                    initialX={16}
                    initialY={16}
                    width="320px"
                    onClose={() => togglePanel('terminal')}
                    minimized={!panels.terminal}
                >
                    <div className="section-header">SYST_DIAG // STATUS</div>
                    <div className="status-row">
                        <span className="status-label">APP_STATE</span>
                        <span className="status-value highlight">STABLE_BOOT</span>
                    </div>
                    <div className="status-row">
                        <span className="status-label">FRAMERATE</span>
                        <span className="status-value">{fps}_FPS</span>
                    </div>

                    <div className="hud-divider" />

                    <div className="section-header">CORE_CMD // CONTROLS</div>

                    <button className="brutalist-button primary" style={{marginTop: '12px', width: '100%', fontSize: '1rem'}} onClick={toggleStart}>
                        BOOT_KERNEL
                    </button>

                    <div style={{marginTop: '12px', fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: '1.4', letterSpacing: '1px'}}>
                        <span>────────────────────────</span><br/>
                        <span className="blink-cursor">{'>'} AWAITING INPUT</span>
                    </div>
                </TerminalWindow>
            )}

            {/* ═══════════════ POST-BOOT HUD BAR ═══════════════ */}
            {uiVisible && started && (
                <div className="hud-bar">
                    <span style={{color: 'var(--accent)', fontWeight: 800, letterSpacing: '2px'}}>D4R</span>
                    <span className="hud-sep">│</span>
                    <span className="hud-label">FPS</span>
                    <span className="hud-value">{fps}</span>
                    <span className="hud-sep">│</span>
                    <span className="hud-label">CAM</span>
                    <span className="hud-value" style={{color: camOn ? 'var(--accent)' : 'var(--text-dim)'}}>{camOn ? 'ON' : 'OFF'}</span>
                    <span className="hud-sep">│</span>
                    <span className="hud-label">LYR</span>
                    <span className="hud-value">{layers.length}</span>
                    <span className="hud-sep">│</span>
                    <span className="hud-label">AUDIO</span>
                    <span className="hud-value" style={{color: audioEngine?.isRunning ? 'var(--accent)' : 'var(--text-dim)'}}>
                        {audioEngine?.isRunning ? (audioEngine?.sourceType === 'file' ? 'FILE' : 'MIC') : 'OFF'}
                    </span>
                    {audioEngine?.isRunning && (
                        <button
                            onClick={handleAudioOff}
                            title="Turn off audio"
                            style={{
                                background: 'none', border: '1px solid var(--accent)',
                                color: 'var(--accent)', cursor: 'pointer',
                                fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                                padding: '1px 5px', lineHeight: 1, borderRadius: 0,
                                marginLeft: '2px',
                            }}
                        >✕</button>
                    )}

                    <span style={{flex: 1}} />

                    {/* Transform controls — inline in header */}
                    <button
                        className={canvasTransform.flipH ? 'hud-active' : ''}
                        onClick={() => { const next = { ...canvasTransform, flipH: !canvasTransform.flipH }; setCanvasTransform(next); globalState.canvasTransform = next; }}
                        title="Horizontal flip"
                    >⇔H</button>
                    <button
                        className={canvasTransform.flipV ? 'hud-active' : ''}
                        onClick={() => { const next = { ...canvasTransform, flipV: !canvasTransform.flipV }; setCanvasTransform(next); globalState.canvasTransform = next; }}
                        title="Vertical flip"
                    >⇕V</button>
                    {[['0°', 0], ['90°', 1], ['180°', 2], ['270°', 3]].map(([label, val]) => (
                        <button
                            key={val}
                            className={canvasTransform.rotation === val ? 'hud-active' : ''}
                            onClick={() => { const next = { ...canvasTransform, rotation: val }; setCanvasTransform(next); globalState.canvasTransform = next; }}
                        >{label}</button>
                    ))}
                    <span className="hud-sep">│</span>
                    {/* Scale mode */}
                    {['FIT', 'FILL', '1:1', 'STRETCH'].map(mode => (
                        <button
                            key={mode}
                            className={canvasScale === mode ? 'hud-active' : ''}
                            onClick={() => { setCanvasScale(mode); if (canvasEngine) canvasEngine.setScaleMode(mode); }}
                        >{mode}</button>
                    ))}
                    <span className="hud-sep">│</span>

                    <button onClick={toggleCam}>{camOn ? 'CAM OFF' : 'CAM ON'}</button>
                    <button className={isRecording ? 'hud-active' : ''} onClick={recordToggle}>
                        {isRecording ? '⏹ REC' : '⏺ REC'}
                    </button>
                    <button onClick={() => canvasEngine.exportPNG(blobTracker)}>EXPORT</button>
                    <button className={panels.generators ? 'hud-active' : ''} onClick={() => togglePanel('generators')}>GENERATORS</button>
                    <button className={panels.fluid ? 'hud-active' : ''} onClick={() => togglePanel('fluid')} style={{color: globalState.fluidParams.enabled ? '#FF5500' : undefined}}>FLUID</button>
                    <button className={panels.human ? 'hud-active' : ''} onClick={() => togglePanel('human')} style={{color: humanEnabled ? '#00FF88' : undefined}}>HUMAN AI</button>
                    <button onClick={() => setUiVisible(false)}>HIDE UI</button>
                </div>
            )}

            {/* ═══════════════ SIGNAL MONITOR ═══════════════ */}
            {uiVisible && started && (
                <TerminalWindow
                    id="win-signal"
                    title="SIGNAL_MONITOR"
                    tag="AUDIO"
                    initialX={16}
                    initialY={40}
                    width="320px"
                    onClose={() => togglePanel('signal')}
                    minimized={!panels.signal}
                >
                    <SignalMonitor
                        audioEngine={audioEngine}
                        audioGain={audioGain}
                        onGainChange={setAudioGain}
                        audioFile={audioFile}
                        onFileChange={handleFileSource}
                        onMicToggle={handleMicToggle}
                        onAudioOff={handleAudioOff}
                        useMic={useMic}
                        lfoSpeed={lfoSpeed}
                        onLfoSpeedChange={setLfoSpeed}
                        lfoDepth={lfoDepth}
                        onLfoDepthChange={setLfoDepth}
                        bassGain={bassGain} onBassGainChange={setBassGain}
                        midGain={midGain}   onMidGainChange={setMidGain}
                        highGain={highGain} onHighGainChange={setHighGain}
                    />
                </TerminalWindow>
            )}

            {/* ═══════════════ COMMAND CENTER ═══════════════ */}
            {uiVisible && started && (
                <TerminalWindow
                    id="win-command"
                    title="COMMAND_CENTER"
                    initialX={16}
                    initialY={260}
                    width="320px"
                    maxHeight="calc(100vh - 300px)"
                    onClose={() => togglePanel('command')}
                    minimized={!panels.command}
                >
                    {/* OVERRIDES */}
                    <div className="section-header">// RANDOMIZE</div>
                    <div className="section-hint">ENGINES = random on/off · PARAMS = random values · RESET = factory defaults</div>
                    <div style={{display: 'flex', gap: '6px', marginBottom: '12px'}}>
                        <button className="brutalist-button cmd-btn" style={{flex: 1}} onClick={scrambleEngines}>ENGINES</button>
                        <button className="brutalist-button cmd-btn" style={{flex: 1}} onClick={scrambleParams}>PARAMS</button>
                        <button className="brutalist-button cmd-btn danger" style={{flex: '0 0 auto'}} onClick={resetSystem}>RESET</button>
                    </div>

                    <div className="section-header">// ML OVERLAY</div>
                    <div className="section-hint">Cut out person from background using AI mask</div>
                    <div style={{display: 'flex', gap: '6px', marginBottom: '12px'}}>
                        <button 
                            className={`brutalist-button cmd-btn ${isolatePerson ? 'primary' : ''}`} 
                            style={{flex: 1}} 
                            onClick={handleIsolateToggle}
                            disabled={maskLoading}
                        >
                            {maskLoading ? 'LOADING ML...' : (isolatePerson ? 'ISOLATE: ON' : 'ISOLATE PERSON')}
                        </button>
                    </div>




                    {/* BLOB TRACKER */}
                    <div className="section-header">BLOB_TRACKER // DETECT</div>
                    <div style={{display: 'flex', gap: '6px', marginBottom: '8px'}}>
                        <button
                            className={`brutalist-button cmd-btn ${blobEnabled ? 'primary' : ''}`}
                            style={{flex: 1}}
                            onClick={() => {
                                const next = !blobEnabled;
                                setBlobEnabled(next);
                                if (blobTracker) blobTracker.setEnabled(next);
                                if (!next) setBlobCount(0);
                            }}
                        >{blobEnabled ? 'DETECT: ON' : 'DETECT: OFF'}</button>
                        <button
                            className={`brutalist-button cmd-btn ${blobOverlay ? 'active' : ''}`}
                            style={{flex: '0 0 auto'}}
                            onClick={() => {
                                const next = !blobOverlay;
                                setBlobOverlay(next);
                                if (blobTracker) blobTracker.setShowOverlay(next);
                            }}
                        >OVERLAY</button>
                        <button
                            className={`brutalist-button cmd-btn ${humanEnabled ? 'active' : ''}`}
                            style={{
                                flex: '0 0 auto',
                                borderColor: humanEnabled ? '#00FF88' : undefined,
                                color: humanEnabled ? '#00FF88' : undefined,
                            }}
                            title={humanEnabled ? 'Toggle Human AI skeleton overlay' : 'Start Human AI first'}
                            disabled={!humanEnabled}
                            onClick={() => {
                                if (blobTracker) {
                                    blobTracker.setShowHuman(!blobTracker.showHuman);
                                    setUiRefresh(r => r + 1);
                                }
                            }}
                        >AI OVL</button>
                    </div>
                    {blobEnabled && (
                        <div style={{marginBottom: '8px'}}>
                            <div className="param-row">
                                <label>THRESHOLD</label>
                                <input type="range" className="brutalist-slider" min="5" max="120" step="1"
                                    value={blobThreshold}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        setBlobThreshold(v);
                                        if (blobTracker) blobTracker.threshold = v;
                                    }}
                                />
                                <span style={{color: 'var(--text-bright)', fontSize: '0.6rem', width: '28px', textAlign: 'right'}}>{blobThreshold}</span>
                            </div>
                            <div className="param-row">
                                <label>MIN AREA</label>
                                <input type="range" className="brutalist-slider" min="5" max="100" step="1"
                                    value={blobMinArea}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        setBlobMinArea(v);
                                        if (blobTracker) blobTracker.minArea = v;
                                    }}
                                />
                                <span style={{color: 'var(--text-bright)', fontSize: '0.6rem', width: '28px', textAlign: 'right'}}>{blobMinArea}</span>
                            </div>
                            <div className="param-row">
                                <label>LIFESPAN</label>
                                <input type="range" className="brutalist-slider" min="5" max="180" step="1"
                                    value={blobLifespan}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        setBlobLifespan(v);
                                        if (blobTracker) blobTracker.persistFrames = v;
                                    }}
                                />
                                <span style={{color: 'var(--text-bright)', fontSize: '0.6rem', width: '28px', textAlign: 'right'}}>{blobLifespan}f</span>
                            </div>
                            <div className="status-row" style={{marginTop: '6px'}}>
                                <span className="status-label">BLOB COUNT</span>
                                <span className="status-value" style={{color: blobCount > 0 ? 'var(--accent)' : 'var(--text-dim)'}}>{blobCount}</span>
                            </div>
                        </div>
                    )}

                    <div className="hud-divider" />

                    {/* MEDIA */}
                    <div className="section-header">COMM_LINK // MEDIA</div>
                    <div style={{display: 'flex', gap: '6px', marginBottom: '8px'}}>
                        <button className="brutalist-button cmd-btn" style={{flex: 1}} onClick={addImage}>+ IMAGE</button>
                        <button className="brutalist-button cmd-btn" style={{flex: 1}} onClick={addText}>+ TEXT</button>
                        <button className="brutalist-button cmd-btn" style={{flex: 1}} onClick={addVideo}>+ VIDEO</button>
                    </div>
                    {layers.length > 0 && (
                        <div className="layer-list" style={{marginBottom: '8px'}}>
                            {layers.map(l => (
                            <div key={l.id} className={`layer-item ${selectedLayerId === l.id ? 'selected' : ''}`}
                                style={{display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer'}}
                                onClick={() => setSelectedLayerId(l.id)}>
                                <span style={{fontSize: '0.65rem', color: selectedLayerId === l.id ? 'var(--accent)' : 'var(--text-dim)'}}>
                                    {l.type === 'video' ? '▶ ' : l.type === 'image' ? '◼ ' : 'T '}{l.name.toUpperCase()}
                                </span>
                                <button style={{background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.55rem', fontFamily: 'var(--font-mono)'}}
                                    onClick={(e) => { e.stopPropagation(); mediaManager.removeLayer(l.id); setLayers([...mediaManager.layers]); }}>[REM]</button>
                            </div>
                            ))}
                        </div>
                    )}
                    {selectedLayer && (
                        <div className="layer-controls" style={{marginBottom: '8px'}}>
                            {selectedLayer.type === 'text' && (
                                <React.Fragment>
                                    <input className="v3-input" value={selectedLayer.text} onChange={(e) => updateLayer(selectedLayer.id, 'text', e.target.value)} />
                                    <div className="param-row" style={{marginTop: '6px'}}>
                                        <label>Font</label>
                                        <select className="v3-input" value={selectedLayer.fontFamily || 'Share Tech Mono'} onChange={(e) => updateLayer(selectedLayer.id, 'fontFamily', e.target.value)}>
                                            <option value="Share Tech Mono">Share Tech Mono</option>
                                            <option value="Rubik Glitch">Rubik Glitch</option>
                                            <option value="VT323">VT323</option>
                                            <option value="Space Mono">Space Mono</option>
                                            <option value="Bungee">Bungee</option>
                                            <option value="Roboto Mono">Roboto Mono</option>
                                            <option value="Inter">Inter</option>
                                        </select>
                                    </div>
                                </React.Fragment>
                            )}
                            {selectedLayer.type === 'video' && (
                                <React.Fragment>
                                    <div style={{display: 'flex', gap: '4px', marginBottom: '6px'}}>
                                        <button
                                            className={`brutalist-button ${selectedLayer.isPlaying ? 'primary' : ''}`}
                                            style={{flex: 1, fontSize: '0.6rem'}}
                                            onClick={() => {
                                                if (selectedLayer.vid) {
                                                    if (selectedLayer.isPlaying) {
                                                        selectedLayer.vid.pause();
                                                        selectedLayer.isPlaying = false;
                                                    } else {
                                                        selectedLayer.vid.play();
                                                        selectedLayer.isPlaying = true;
                                                    }
                                                }
                                                setLayers([...mediaManager.layers]);
                                            }}
                                        >{selectedLayer.isPlaying ? '⏸ PAUSE' : '▶ PLAY'}</button>
                                        <button
                                            className={`brutalist-button ${selectedLayer.loop ? 'active' : ''}`}
                                            style={{flex: '0 0 auto', fontSize: '0.6rem', padding: '4px 8px'}}
                                            onClick={() => {
                                                selectedLayer.loop = !selectedLayer.loop;
                                                setLayers([...mediaManager.layers]);
                                            }}
                                        >LOOP</button>
                                    </div>
                                    <div className="param-row">
                                        <label>SPEED</label>
                                        <input type="range" min="0.25" max="4" step="0.05"
                                            value={selectedLayer.speed || 1.0}
                                            onChange={(e) => updateLayer(selectedLayer.id, 'speed', parseFloat(e.target.value))}
                                        />
                                        <span style={{color: 'var(--text-bright)', fontSize: '0.6rem', width: '32px', textAlign: 'right'}}>{(selectedLayer.speed || 1.0).toFixed(2)}x</span>
                                    </div>
                                    <div className="param-row">
                                        <label>OPACITY</label>
                                        <input type="range" min="0" max="1" step="0.01"
                                            value={selectedLayer.opacity || 1.0}
                                            onChange={(e) => updateLayer(selectedLayer.id, 'opacity', parseFloat(e.target.value))}
                                        />
                                        <span style={{color: 'var(--text-bright)', fontSize: '0.6rem', width: '32px', textAlign: 'right'}}>{Math.round((selectedLayer.opacity || 1.0) * 100)}%</span>
                                    </div>
                                </React.Fragment>
                            )}
                            <div className="param-row"><label>X</label> <input type="range" min="0" max={window.innerWidth} value={selectedLayer.x} onChange={(e) => updateLayer(selectedLayer.id, 'x', parseInt(e.target.value))} /></div>
                            <div className="param-row"><label>Y</label> <input type="range" min="0" max={window.innerHeight} value={selectedLayer.y} onChange={(e) => updateLayer(selectedLayer.id, 'y', parseInt(e.target.value))} /></div>
                            <div className="param-row"><label>Scale</label> <input type="range" min="0.1" max="5" step="0.1" value={selectedLayer.scale} onChange={(e) => updateLayer(selectedLayer.id, 'scale', parseFloat(e.target.value))} /></div>
                            <button className="brutalist-button secondary" style={{width: '100%', marginTop: '6px', fontSize: '0.6rem'}} onClick={() => {
                                selectedLayer.x = window.innerWidth / 2;
                                selectedLayer.y = window.innerHeight / 2;
                                selectedLayer.scale = 1.0;
                                selectedLayer.rotation = 0;
                                setLayers([...mediaManager.layers]);
                            }}>RESET ALL PARAMETERS</button>
                        </div>
                    )}

                    <div className="hud-divider" />

                    {/* PRESETS */}
                    <div className="section-header">// PRESETS</div>
                    <div className="section-hint">Click a preset to load it · SAVE stores current settings</div>
                    <button className="brutalist-button cmd-btn primary" style={{width: '100%', marginBottom: '8px'}} onClick={savePreset}>+ SAVE CURRENT STATE</button>
                    {/* Starter presets — always shown, non-deletable */}
                    <div style={{fontSize: '0.5rem', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px'}}>── BUILT-IN ──</div>
                    <div className="preset-grid">
                        {STARTER_PRESETS.map(p => (
                            <div key={p.id} className="preset-card starter" onClick={() => loadPreset(p)} title={`Load ${p.name}`}>
                                <div className="starter-badge">★</div>
                                <div className="preset-name" style={{paddingTop: '14px'}}>{p.name}</div>
                            </div>
                        ))}
                    </div>
                    {/* User presets */}
                    {presets.length > 0 && (
                        <React.Fragment>
                            <div style={{fontSize: '0.5rem', color: 'var(--text-muted)', margin: '6px 0 4px', letterSpacing: '1px'}}>── SAVED ──</div>
                            <div className="preset-grid">
                                {presets.map(p => (
                                    <div key={p.id} className="preset-card" onClick={() => loadPreset(p)}>
                                        <img src={p.thumbnail} alt={p.name} />
                                        <div className="preset-name">{p.name.toUpperCase()}</div>
                                        <button style={{position: 'absolute', top: 2, right: 2, padding: '2px 5px', background: 'var(--accent)', color: '#000', border: 'none', fontSize: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-mono)'}}
                                            onClick={(e) => { e.stopPropagation(); presetManager.deletePreset(p.id); setPresets([...presetManager.presets]); }}>DEL</button>
                                    </div>
                                ))}
                            </div>
                        </React.Fragment>
                    )}
                </TerminalWindow>
            )}

            {/* ═══════════════ EFFECTS MODULES ═══════════════ */}
            {uiVisible && started && (
                <TerminalWindow
                    id="win-fx"
                    title="SUBSTRATE_DECAY // MODULES"
                    initialX={window.innerWidth - 380}
                    initialY={16}
                    width="360px"
                    maxHeight="calc(100vh - 60px)"
                    onClose={() => togglePanel('effects')}
                    minimized={!panels.effects}
                >
                    {/* Audio-reactive summary bar */}
                    {audioEngine?.isRunning && (
                        <div className="audio-status-bar">
                            <span className="audio-status-dot" />
                            <span>AUDIO {audioEngine.sourceType === 'file' ? 'FILE' : 'MIC'} — REACTIVE: {effectKeys.filter(k => globalState.glitchez[k].audioReactive).length} · ON: {effectKeys.filter(k => globalState.glitchez[k].enabled).length}</span>
                        </div>
                    )}
                    {EFFECT_CATEGORIES.map(cat => {
                        const activeCount = cat.keys.filter(k => globalState.glitchez[k]?.enabled).length;
                        const isOpen = openCategories[cat.name];
                        return (
                            <div className="category-group" key={cat.name}>
                                <div className="category-header" onClick={() => toggleCategory(cat.name)}>
                                    <span className="cat-arrow" style={{transform: isOpen ? 'rotate(90deg)' : 'none'}}>▶</span>
                                    <span className="cat-name">{cat.name}</span>
                                    <span style={{flex:1}} />
                                    <span className="cat-count">{activeCount > 0 ? `${activeCount} ON` : `${cat.keys.length} FX`}</span>
                                </div>
                                <div style={{display: isOpen ? 'block' : 'none'}}>
                                    {cat.keys.map(k => globalState.glitchez[k] ? renderEffect(k) : null)}
                                </div>
                            </div>
                        );
                    })}
                </TerminalWindow>
            )}

            {/* ═══════════════ GENERATORS MODULES ═══════════════ */}
            {uiVisible && started && (
                <TerminalWindow
                    id="win-generators"
                    title="GENERATIVE_MATRIX"
                    tag="WEBGL"
                    initialX={window.innerWidth - 740}
                    initialY={16}
                    width="340px"
                    maxHeight="calc(100vh - 60px)"
                    onClose={() => togglePanel('generators')}
                    minimized={!panels.generators}
                >
                    <div className="section-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span>// ALGORITHM: <span style={{color: genMode !== 'OFF' ? 'var(--accent)' : 'inherit', marginLeft: '4px'}}>{genMode}</span></span>
                        <span style={{display: 'flex', alignItems: 'center', gap: '3px'}}>
                            {[
                                { id: 'BASS', label: 'B', color: '#FF5500' },
                                { id: 'MID',  label: 'M', color: '#FF9900' },
                                { id: 'HIGH', label: 'H', color: '#FFDD00' },
                            ].map(b => {
                                const isActive = genAudioReactive && genAudioBand === b.id;
                                return (
                                    <button
                                        key={b.id}
                                        className={`audio-band-btn ${isActive ? 'active' : ''}`}
                                        title={`${b.id} band reactive${isActive ? ' (click to turn off)' : ''}`}
                                        onClick={() => {
                                            if (genAudioReactive && genAudioBand === b.id) setGenAudioReactive(false);
                                            else { setGenAudioReactive(true); setGenAudioBand(b.id); }
                                        }}
                                        style={{
                                            borderColor: isActive ? b.color : undefined,
                                            color: isActive ? b.color : undefined,
                                            background: isActive ? `${b.color}15` : undefined,
                                            minWidth: '20px',
                                            padding: '2px 5px',
                                            fontSize: '0.65rem'
                                        }}
                                    >
                                        {b.label}
                                    </button>
                                );
                            })}
                        </span>
                    </div>
                    
                    <button 
                        className={`brutalist-button ${genMode === 'OFF' ? 'primary' : ''}`}
                        style={{width: '100%', marginBottom: '8px', fontSize: '0.65rem'}}
                        onClick={() => setGenMode('OFF')}
                    >{genMode === 'OFF' ? 'CORE STANDBY (CLICK MATRIX TO ACTIVATE)' : '[ SHUTDOWN CORE ]'}</button>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '16px'}}>
                        {[
                            'GRID TUNNEL', 'CUBE FIELD',
                            'SOLAR CORONA', 'MANDELBULB',
                            'BIO ABYSS',   'FLOW FIELD',
                            'WAVE COLLAPSE','MYCELIUM',
                            'VORONOI',     'QUAT JULIA',
                            'MANDELBOX'
                        ].map(m => (
                            <button 
                                key={m} 
                                className={`brutalist-button ${genMode === m ? 'active' : ''}`}
                                style={{
                                    fontSize: '0.52rem', padding: '6px 4px', 
                                    borderColor: genMode === m ? 'var(--accent)' : 'var(--border)'
                                }}
                                onClick={() => setGenMode(m)}
                            >{m}</button>
                        ))}
                    </div>

                    <div className="section-header">// KINEMATIC_CONTROLS</div>
                    <div style={{padding: '0 4px', opacity: genMode === 'OFF' ? 0.3 : 1.0, pointerEvents: genMode === 'OFF' ? 'none' : 'auto', transition: 'opacity 0.2s'}}>
                        {Object.keys(globalState.genParams).map(pk => {
                            const param = globalState.genParams[pk];
                            const waves = [null, 'sin', 'tri', 'saw', 'rnd'];
                            const waveLabels = { sin: '∿', tri: '△', saw: '⧸', rnd: '?' };
                            const cycleWave = () => {
                                const curIdx = waves.indexOf(param.lfo || null);
                                const nextIdx = (curIdx + 1) % waves.length;
                                const nextWave = waves[nextIdx];
                                if (nextWave) {
                                    param._lfoBase = param.value;
                                    param.lfo = nextWave;
                                } else {
                                    if (param._lfoBase !== undefined) param.value = param._lfoBase;
                                    delete param._lfoBase;
                                    param.lfo = null;
                                }
                                setUiRefresh(r => r + 1);
                            };
                            return (
                                <div className="param-row" key={pk} style={{display: 'flex', alignItems: 'center', marginBottom: '4px'}}>
                                    <span className="param-name" style={{flex: '1', fontSize: '0.6rem'}}>{param.name}</span>
                                    <input type="range" min={param.min} max={param.max} step={param.step}
                                           className="brutalist-slider"
                                           style={{flex: '2'}}
                                           value={param._lfoBase !== undefined ? param._lfoBase : param.value}
                                           onChange={(e) => {
                                                const v = parseFloat(e.target.value);
                                                if (param.lfo) { param._lfoBase = v; }
                                                else { param.value = v; }
                                                setUiRefresh(r => r+1);
                                           }} />
                                    <span className="param-value" style={{minWidth: '35px', textAlign: 'right', fontSize: '0.6rem'}}>
                                        {(param._lfoBase !== undefined ? param._lfoBase : param.value).toFixed(2)}
                                    </span>
                                    <button
                                        title="LFO Automate"
                                        style={{
                                            padding: '2px 4px', fontSize: '0.6rem', marginLeft: '4px',
                                            background: param.lfo ? 'var(--accent)' : 'var(--bg-mid)',
                                            color: param.lfo ? '#000' : 'var(--text-dim)',
                                            cursor: 'pointer', border: '1px solid var(--border)', flexShrink: 0, width: '20px', textAlign: 'center'
                                        }}
                                        onClick={cycleWave}
                                    >
                                        {param.lfo ? waveLabels[param.lfo] : '[]'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </TerminalWindow>
            )}



            {/* ═══════════════ FLUID ENGINE MATRIX ═══════════════ */}
            {uiVisible && started && (
                <TerminalWindow
                    id="win-fluid"
                    title="FLUID_MATRIX"
                    tag="GPGPU"
                    initialX={16}
                    initialY={window.innerHeight - 380}
                    width="320px"
                    maxHeight="320px"
                    onClose={() => togglePanel('fluid')}
                    minimized={!panels.fluid}
                >
                    <div style={{marginBottom: '10px'}}>
                        <button
                            className={`brutalist-button ${globalState.fluidParams.enabled ? 'primary' : ''}`}
                            style={{width: '100%', fontSize: '0.65rem', letterSpacing: '2px'}}
                            onClick={() => {
                                globalState.fluidParams.enabled = !globalState.fluidParams.enabled;
                                setUiRefresh(r => r + 1);
                            }}
                        >
                            {globalState.fluidParams.enabled ? '◉ FLUID CORE: ACTIVE' : '○ ENGAGE FLUID CORE'}
                        </button>
                    </div>

                    <div className="section-header">// PHYSICS_STABILITY</div>
                    {[
                        { key: 'viscosity',   label: 'VISCOSITY',   min: 0.9,  max: 0.999, step: 0.001 },
                        { key: 'dissipation', label: 'DISSIPATION', min: 0.9,  max: 0.999, step: 0.001 },
                        { key: 'opticalGain', label: 'MOTION_GAIN', min: 0.1,  max: 5.0,   step: 0.1 },
                    ].map(p => (
                        <div key={p.key} className="param-row">
                            <label>{p.label}</label>
                            <input type="range" className="brutalist-slider" 
                                min={p.min} max={p.max} step={p.step}
                                value={globalState.fluidParams[p.key]}
                                onChange={(e) => {
                                    globalState.fluidParams[p.key] = parseFloat(e.target.value);
                                    setUiRefresh(r => r + 1);
                                }}
                            />
                            <span className="param-value">{globalState.fluidParams[p.key].toFixed(3)}</span>
                        </div>
                    ))}

                    <div className="section-header">// VISUAL_DRIVE</div>
                    {[
                        { key: 'audioDrive', label: 'AUDIO_DRIVE', min: 0.0,  max: 2.0,   step: 0.1 },
                        { key: 'gain',       label: 'THERMAL_GAIN', min: 0.1,  max: 4.0,   step: 0.1 },
                        { key: 'mix',        label: 'FLUID_MIX',    min: 0.0,  max: 1.0,   step: 0.01 },
                    ].map(p => (
                        <div key={p.key} className="param-row">
                            <label>{p.label}</label>
                            <input type="range" className="brutalist-slider" 
                                min={p.min} max={p.max} step={p.step}
                                value={globalState.fluidParams[p.key]}
                                onChange={(e) => {
                                    globalState.fluidParams[p.key] = parseFloat(e.target.value);
                                    setUiRefresh(r => r + 1);
                                }}
                            />
                            <span className="param-value">{globalState.fluidParams[p.key].toFixed(2)}</span>
                        </div>
                    ))}

                    <div className="hud-divider" />

                    <div className="section-header">// BLOOM_GLOW</div>
                    <div style={{marginBottom: '8px'}}>
                        <button
                            className={`brutalist-button cmd-btn ${globalState.fluidParams.bloomEnabled ? 'primary' : ''}`}
                            style={{width: '100%', fontSize: '0.6rem'}}
                            onClick={() => {
                                globalState.fluidParams.bloomEnabled = !globalState.fluidParams.bloomEnabled;
                                setUiRefresh(r => r + 1);
                            }}
                        >
                            {globalState.fluidParams.bloomEnabled ? '◉ BLOOM: ON' : '○ BLOOM: OFF'}
                        </button>
                    </div>
                    {globalState.fluidParams.bloomEnabled && [
                        { key: 'bloomThreshold',  label: 'THRESHOLD', min: 0.0, max: 1.0, step: 0.01 },
                        { key: 'bloomIntensity',  label: 'INTENSITY',  min: 0.1, max: 3.0, step: 0.1 },
                        { key: 'bloomRadius',     label: 'RADIUS',     min: 1.0, max: 12.0, step: 0.5 },
                        { key: 'bloomMix',        label: 'BLOOM_MIX',  min: 0.0, max: 1.0, step: 0.01 },
                    ].map(p => (
                        <div key={p.key} className="param-row">
                            <label>{p.label}</label>
                            <input type="range" className="brutalist-slider"
                                min={p.min} max={p.max} step={p.step}
                                value={globalState.fluidParams[p.key] || 0}
                                onChange={(e) => {
                                    globalState.fluidParams[p.key] = parseFloat(e.target.value);
                                    setUiRefresh(r => r + 1);
                                }}
                            />
                            <span className="param-value">{(globalState.fluidParams[p.key] || 0).toFixed(2)}</span>
                        </div>
                    ))}
                </TerminalWindow>
            )}

            {uiVisible && started && (
                <TerminalWindow
                    id="win-human"
                    title="HUMAN_MATRIX"
                    tag="AI"
                    initialX={Math.max(16, window.innerWidth / 2 - 160)}
                    initialY={16}
                    width="320px"
                    maxHeight="calc(100vh - 60px)"
                    onClose={() => togglePanel('human')}
                    minimized={!panels.human}
                >
                    {/* ── Master Toggle ──────────────────────────── */}
                    <div style={{marginBottom: '10px'}}>
                        <button
                            className={`brutalist-button ${humanEnabled ? 'primary' : ''}`}
                            style={{width: '100%', fontSize: '0.65rem', letterSpacing: '2px'}}
                            onClick={handleHumanToggle}
                            disabled={humanLoading}
                        >
                            {humanLoading ? '⏳ LOADING MODELS...' : humanEnabled ? '◉ HUMAN AI: ACTIVE' : '○ ENGAGE HUMAN AI'}
                        </button>
                    </div>

                    {/* ── Detection Status ──────────────────────── */}
                    <div className="section-header">// DETECTION_STATUS</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px'}}>
                        {[
                            { label: 'FACE',   val: humanData?.faceDetected, extra: humanData?.faceDetected ? ` ${Math.round((humanData?.faceScore||0)*100)}%` : '' },
                            { label: 'HAND-L', val: humanData?.handLeft },
                            { label: 'HAND-R', val: humanData?.handRight },
                            { label: 'BODY',   val: humanData?.bodyDetected },
                        ].map(({label, val, extra}) => (
                            <div key={label} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '3px 6px',
                                background: val ? 'var(--accent)10' : '#0a0a0a',
                                border: `1px solid ${val ? 'var(--accent)' : 'var(--border)'}`,
                                fontSize: '0.6rem',
                            }}>
                                <span style={{color: val ? 'var(--accent)' : 'var(--text-dim)', fontSize: '0.55rem'}}>◉</span>
                                <span style={{color: 'var(--text-dim)', flex: 1}}>{label}</span>
                                <span style={{color: val ? 'var(--accent)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums'}}>
                                    {val ? `ON${extra||''}` : 'OFF'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* ── Emotion ──────────────────────────────── */}
                    {humanData?.faceDetected && (
                        <>
                            <div className="section-header">// EMOTION_DECODE</div>
                            <div style={{marginBottom: '8px'}}>
                                <div style={{
                                    padding: '4px 8px', marginBottom: '6px',
                                    background: 'var(--accent)10', border: '1px solid var(--accent)40',
                                    fontSize: '0.65rem', letterSpacing: '2px',
                                    color: 'var(--accent)', textAlign: 'center',
                                }}>
                                    ▶ {(humanData?.emotion || 'neutral').toUpperCase()}
                                </div>
                                {Object.entries(humanData?.emotions || {}).map(([emo, score]) => (
                                    <div key={emo} style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px'}}>
                                        <span style={{fontSize: '0.55rem', color: 'var(--text-dim)', width: '60px'}}>{emo.toUpperCase()}</span>
                                        <div style={{flex: 1, height: '4px', background: 'var(--bg-mid)', position: 'relative'}}>
                                            <div style={{
                                                position: 'absolute', left: 0, top: 0, height: '100%',
                                                width: `${Math.round((score||0) * 100)}%`,
                                                background: score > 0.5 ? 'var(--accent)' : 'var(--accent)88',
                                                transition: 'width 0.12s ease',
                                            }} />
                                        </div>
                                        <span style={{fontSize: '0.55rem', color: 'var(--text-bright)', width: '28px', textAlign: 'right'}}>
                                            {Math.round((score||0)*100)}%
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* ── Head Rotation ─────────────────────── */}
                            <div className="section-header">// HEAD_ROTATION</div>
                            <div style={{marginBottom: '8px'}}>
                                {[['YAW', humanData?.yaw], ['PITCH', humanData?.pitch], ['ROLL', humanData?.roll]].map(([label, val]) => {
                                    const pct = ((val||0) + 1) * 50;
                                    const deg = ((val||0) * 90).toFixed(0);
                                    return (
                                        <div key={label} style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px'}}>
                                            <span style={{fontSize: '0.55rem', color: 'var(--text-dim)', width: '36px'}}>{label}</span>
                                            <div style={{flex: 1, height: '6px', background: 'var(--bg-mid)', position: 'relative'}}>
                                                <div style={{position:'absolute',left:'50%',top:'-1px',width:'1px',height:'8px',background:'var(--border)'}} />
                                                <div style={{
                                                    position: 'absolute', top: 0, height: '100%',
                                                    left: `${Math.min(pct, 50)}%`,
                                                    width: `${Math.abs(pct - 50)}%`,
                                                    background: pct > 50 ? 'var(--accent)' : '#0088FF',
                                                    transition: 'left 0.08s linear, width 0.08s linear',
                                                }} />
                                            </div>
                                            <span style={{fontSize: '0.55rem', color: 'var(--text-bright)', width: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>
                                                {deg}°
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ── Gesture ──────────────────────────────── */}
                    {humanData?.handGesture && (
                        <>
                            <div className="section-header">// GESTURE</div>
                            <div style={{
                                padding: '4px 8px', marginBottom: '8px',
                                border: '1px solid var(--accent)60', background: 'var(--accent)08',
                                fontSize: '0.58rem', color: 'var(--accent)', letterSpacing: '1px',
                                lineHeight: '1.5',
                            }}>
                                {humanData.handGesture.toUpperCase()}
                            </div>
                        </>
                    )}

                    <div className="hud-divider" />

                    {/* ── Detection Modules ─────────────────────── */}
                    <div className="section-header">// DETECTION_MODULES</div>
                    <div style={{fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '6px'}}>
                        Toggle modules live
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px'}}>
                        {[['FACE', 'enableFace'], ['HANDS', 'enableHands'], ['BODY', 'enableBody'], ['EMOTION', 'enableEmotion']].map(([label, cfgKey]) => {
                            const active = humanEngine?.config[cfgKey] ?? true;
                            return (
                                <button
                                    key={cfgKey}
                                    className={`brutalist-button ${active ? 'active' : ''}`}
                                    style={{fontSize: '0.6rem', padding: '5px'}}
                                    onClick={() => {
                                        if (humanEngine) {
                                            humanEngine.setModule(cfgKey, !humanEngine.config[cfgKey]);
                                            setUiRefresh(r => r + 1);
                                        }
                                    }}
                                >
                                    {active ? '◉' : '○'} {label}
                                </button>
                            );
                        })}
                    </div>

                    {!humanEnabled && (
                        <div style={{marginTop: '8px', fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: '1.6'}}>
                            First run downloads ~15MB of model weights from CDN.<br/>
                            Subsequent loads are instant (cached in browser).
                        </div>
                    )}
                </TerminalWindow>
            )}

            {/* ═══════════════ COLLAPSED BUTTON ═══════════════ */}
            {!uiVisible && (
                <button className="brutalist-button show-ui-btn" onClick={() => setUiVisible(true)}>
                    DEAD4RAT
                </button>
            )}

            {/* ═══════════════ MARQUEE FOOTER ═══════════════ */}
            <div className="terminal-footer">
                <div className="marquee">
                    <span>DEAD4RAT@2026 BY MRKD | DEAD4RAT@2026 BY MRKD | DEAD4RAT@2026 BY MRKD | DEAD4RAT@2026 BY MRKD</span>
                </div>
            </div>

            <canvas id="main-canvas"></canvas>
        </React.Fragment>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Dead4RatApp />);
