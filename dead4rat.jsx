const initialEffectSettings = {
    rgbShift:        { name: "RGB Shift",        enabled: false, audioReactive: false, params: { amount: { value: 5,    min: 0,    max: 50,   step: 1    }, angle:      { value: 0,    min: 0,    max: 360,  step: 1    }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    scanLines:       { name: "Scan Lines",       enabled: true,  audioReactive: false, params: { density: { value: 0.7, min: 0,    max: 1,    step: 0.01 }, opacity:    { value: 0.1, min: 0,    max: 1,    step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    noise:           { name: "Signal Noise",     enabled: false, audioReactive: false, params: { amount:  { value: 0.1, min: 0,    max: 1,    step: 0.01 }, chromatic:  { value: 0,   min: 0,    max: 1,    step: 1    }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    colorDistortion: { name: "LUT Corrupt",      enabled: false, audioReactive: false, params: { hue:     { value: 0,   min: 0,    max: 360,  step: 1    }, saturation: { value: 1,   min: 0,    max: 5,    step: 0.1  }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    blockiness:      { name: "Data Moshing",     enabled: false, audioReactive: false, params: { size:    { value: 4,   min: 1,    max: 32,   step: 1    }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    chromaGlitch:    { name: "Chroma Shift",     enabled: false, audioReactive: false, params: { shiftAmount: { value: 10, min: 0, max: 100, step: 1 }, bleedIntensity: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    vhsJitter:       { name: "VHS Jitter",       enabled: false, audioReactive: false, params: { vertical: { value: 1, min: 0, max: 10, step: 0.1 }, horizontal: { value: 1, min: 0, max: 10, step: 0.1 }, tear: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    videoFeedback:   { name: "FeedbackPro Loop", enabled: false, audioReactive: false, params: { amount: { value: 0.8, min: 0, max: 0.99, step: 0.01 }, zoom: { value: 1.005, min: 0.8, max: 1.5, step: 0.001 }, rotation: { value: 0.0, min: -5, max: 5, step: 0.1 }, moveX: { value: 0.0, min: -0.1, max: 0.1, step: 0.001 }, moveY: { value: 0.0, min: -0.1, max: 0.1, step: 0.001 }, hueShift: { value: 2.0, min: 0.0, max: 50.0, step: 0.1 }, lumaThresh: { value: 1.0, min: 0.0, max: 1.0, step: 0.01 }, mirror: { value: 0, min: 0, max: 1, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    acidMelt:        { name: "Substrate Melt",   enabled: false, audioReactive: false, params: { amount: { value: 0.9, min: 0, max: 0.99, step: 0.01 }, gravity: { value: 0.01, min: -0.05, max: 0.05, step: 0.001 }, turbulence: { value: 0.05, min: 0, max: 0.5, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    chromaDelay:     { name: "Chroma Ghost",     enabled: false, audioReactive: false, params: { amount: { value: 0.8, min: 0, max: 0.99, step: 0.01 }, scaleR: { value: 1.01, min: 0.8, max: 1.2, step: 0.001 }, scaleG: { value: 1.0, min: 0.8, max: 1.2, step: 0.001 }, scaleB: { value: 0.99, min: 0.8, max: 1.2, step: 0.001 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    edgeDetection:   { name: "Edge Detection",   enabled: false, audioReactive: false, params: { threshold: { value: 50, min: 1, max: 255, step: 1 }, invert: { value: 0, min: 0, max: 1, step: 1 }, colorMode: { value: 0, min: 0, max: 1, step: 1 }, glow: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    colorize:        { name: "Screen Colorize",  enabled: false, audioReactive: false, params: { hue: { value: 200, min: 0, max: 360, step: 1 }, strength: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    dataPointCloud:  { name: "Bag of Grains",    enabled: false, audioReactive: false, params: { density: { value: 0.2, min: 0.01, max: 1, step: 0.01 }, size: { value: 1, min: 1, max: 10, step: 1 }, depth: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    motionDetection: { name: "Motion Slit",      enabled: false, audioReactive: false, params: { threshold: { value: 25, min: 1, max: 255, step: 1 }, decay: { value: 0.95, min: 0.8, max: 0.99, step: 0.01 }, tint: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    kaleidoscope:    { name: "Kaleidoscope",     enabled: false, audioReactive: false, params: { segments: { value: 6, min: 2, max: 12, step: 1 }, rotation: { value: 0, min: -180, max: 180, step: 1 }, zoom: { value: 1.0, min: 0.2, max: 3.0, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    barrelDistortion:{ name: "Barrel / Fisheye", enabled: false, audioReactive: false, params: { amount: { value: 0.5, min: -2, max: 2, step: 0.01 }, centerX: { value: 0.5, min: 0, max: 1, step: 0.01 }, centerY: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    pixelSort:       { name: "Pixel Sort",       enabled: false, audioReactive: false, params: { threshold: { value: 0.5, min: 0, max: 1, step: 0.01 }, direction: { value: 0, min: 0, max: 1, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    posterize:       { name: "Posterize",        enabled: false, audioReactive: false, params: { levels: { value: 8, min: 2, max: 32, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } }
};

// Which band modulates each effect (for display + glow feedback)
const AUDIO_BAND_MAP = {
    rgbShift:        'HIGH',
    scanLines:       'MID',
    noise:           'MID',
    colorDistortion: 'MID',
    blockiness:      'BASS',
    chromaGlitch:    'HIGH',
    vhsJitter:       'BASS',
    videoFeedback:   'BASS',
    acidMelt:        'BASS',
    chromaDelay:     'HIGH',
    edgeDetection:   'HIGH',
    colorize:        'MID',
    dataPointCloud:  'MID',
    motionDetection: 'BASS',
    kaleidoscope:    'MID',
    barrelDistortion:'BASS',
    pixelSort:       'HIGH',
    posterize:       'BASS',
};

// Global Mutation State (bypasses React for 60fps)
const globalState = {
    timeSpeed: 1.0,
    audioGain: 1.0,
    spectralCentroid: 0.0,
    bass: 0.0, mid: 0.0, high: 0.0,
    transient: false,
    glitchez: initialEffectSettings,
    videoElement: null,
    compositeSource: null
};

let audioEngine = null;
let canvasEngine = null;
let mediaManager = null;
let presetManager = null;

// ═══════════════════════════════════════════
// DRAGGABLE TERMINAL WINDOW
// ═══════════════════════════════════════════

function TerminalWindow({ id, title, tag, initialX, initialY, width, children, maxHeight, onClose, minimized }) {
    const ref = React.useRef(null);
    const [pos, setPos] = React.useState({ x: initialX || 20, y: initialY || 20 });
    const [isDragging, setIsDragging] = React.useState(false);
    const dragOffset = React.useRef({ x: 0, y: 0 });
    const zRef = React.useRef(10);

    const bringToFront = () => {
        TerminalWindow._globalZ = (TerminalWindow._globalZ || 10) + 1;
        zRef.current = TerminalWindow._globalZ;
        if (ref.current) ref.current.style.zIndex = zRef.current;
    };

    const handleMouseDown = (e) => {
        if (e.target.closest('.sticker-body')) return;
        if (e.target.closest('.win-close')) return;
        e.preventDefault();
        setIsDragging(true);
        bringToFront();
        const rect = ref.current.getBoundingClientRect();
        dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    React.useEffect(() => {
        if (!isDragging) return;
        const move = (e) => setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
        const up = () => setIsDragging(false);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, [isDragging]);

    if (minimized) {
        return (
            <div className="minimized-indicator" style={{ left: pos.x + 'px', top: pos.y + 'px' }} onClick={onClose}>
                {title}
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className={`sticker ${isDragging ? 'dragging' : ''}`}
            style={{ left: pos.x + 'px', top: pos.y + 'px', width: width || '300px', zIndex: zRef.current }}
            onMouseDown={handleMouseDown}
            id={id}
        >
            <div className="sticker-header">
                <span className="sticker-header-title">{title}</span>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    {tag && <span className="sticker-header-tag">{tag}</span>}
                    {onClose && <button className="win-close" onClick={onClose} title="minimize">×</button>}
                </div>
            </div>
            <div className="sticker-body" style={{ maxHeight: maxHeight || 'none', overflowY: maxHeight ? 'auto' : 'visible' }}>
                {children}
            </div>
        </div>
    );
}
TerminalWindow._globalZ = 10;

// ═══════════════════════════════════════════
// SIGNAL MONITOR — Live spectrum + band meters
// ═══════════════════════════════════════════

function SignalMonitor({ audioEngine, audioGain, onGainChange, audioFile, onFileChange, onMicToggle, useMic }) {
    const canvasRef = React.useRef(null);
    const animRef = React.useRef(null);
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

            // Get fresh data
            const data = audioEngine.getFrequencyData();
            if (!data || data.length === 0) {
                ctx.fillStyle = '#050505';
                ctx.fillRect(0, 0, W, H);
                return;
            }

            // Background
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, W, H);

            // Draw spectrum bars (use first 256 bins for clarity)
            const binCount = Math.min(data.length, 256);
            const barW = W / binCount;
            for (let i = 0; i < binCount; i++) {
                const v = data[i] / 255.0;
                const barH = v * H;
                // Color by band: bass=orange, mid=yellow, high=white
                let hue;
                if (i < 8) hue = '#FF5500';
                else if (i < 60) hue = '#FF8800';
                else hue = `rgba(255,${Math.floor(200 + v * 55)},${Math.floor(v * 80)},${0.7 + v * 0.3})`;
                ctx.fillStyle = hue;
                ctx.fillRect(i * barW, H - barH, Math.max(1, barW - 0.5), barH);
            }

            // Grid lines
            ctx.strokeStyle = 'rgba(255,85,0,0.08)';
            ctx.lineWidth = 0.5;
            for (let y = 0; y < H; y += H / 4) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
            }

            // Update band values for meters (directly from engine, not waiting for React setState)
            setBass(audioEngine.bass);
            setMid(audioEngine.mid);
            setHigh(audioEngine.high);
            setTransient(audioEngine.transientDetected);
        };
        draw();
        return () => cancelAnimationFrame(frameId);
    }, [audioEngine]);

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

            {/* Controls */}
            <div className="signal-control-row">
                <span className="status-label">GAIN</span>
                <input type="range" className="brutalist-slider" min="0" max="300" step="1"
                    value={Math.round(audioGain * 100)}
                    onChange={(e) => onGainChange(parseFloat(e.target.value) / 100.0)}
                />
                <span style={{fontSize: '0.6rem', color: 'var(--text-bright)', width: '32px', textAlign: 'right'}}>
                    {Math.round(audioGain * 100)}%
                </span>
            </div>
            <div className="signal-control-row">
                <span className="status-label">THRESH</span>
                <input type="range" className="brutalist-slider" min="0" max="30" step="1"
                    value={Math.round((audioEngine?.threshold || 0.04) * 100)}
                    onChange={(e) => { if (audioEngine) audioEngine.threshold = parseFloat(e.target.value) / 100.0; }}
                />
                <span style={{fontSize: '0.6rem', color: 'var(--text-bright)', width: '32px', textAlign: 'right'}}>
                    {Math.round((audioEngine?.threshold || 0.04) * 100)}%
                </span>
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

    // Live band values for effect card glow (updated from render loop)
    const liveAudio = React.useRef({ bass: 0, mid: 0, high: 0 });

    const [panels, setPanels] = React.useState({
        terminal: true,
        command: true,
        effects: true,
        signal: true,
    });

    const togglePanel = (key) => setPanels(p => ({...p, [key]: !p[key]}));

    React.useEffect(() => {
        if (!canvasEngine) canvasEngine = new CanvasEngine('main-canvas');
        if (!audioEngine) audioEngine = new AudioEngine();
        if (!mediaManager) mediaManager = new MediaManager(window.innerWidth, window.innerHeight);
        if (!presetManager) {
            presetManager = new PresetManager();
            setPresets(presetManager.presets);
        }
    }, []);

    const resetSystem = () => {
        globalState.glitchez = JSON.parse(JSON.stringify(initialEffectSettings));
        Object.keys(globalState.glitchez).forEach(k => {
            const effect = globalState.glitchez[k];
            const toggleEl = document.getElementById(`toggle-${k}`);
            if (toggleEl) toggleEl.checked = effect.enabled;
            Object.keys(effect.params).forEach(pk => {
                const sliderEl = document.getElementById(`slider-${k}-${pk}`);
                if (sliderEl) sliderEl.value = effect.params[pk].value;
            });
        });
        mediaManager.layers = [];
        setLayers([]);
        setSelectedLayerId(null);
        setUseMic(false);
        setAudioFile(null);
        setAudioGain(1.0);
        audioEngine.stop();
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
    };

    const handleFileSource = async (file) => {
        setAudioFile(file);
        setUseMic(false);
        if (started) {
            await audioEngine.startFromFile(file);
        }
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
            globalState.glitchez[key].enabled = Math.random() > 0.5;
            const el = document.getElementById(`toggle-${key}`);
            if (el) el.checked = globalState.glitchez[key].enabled;
        });
        setUiRefresh(r => r + 1);
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

        let lastTime = performance.now();
        let frames = 0;
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

            globalState.compositeSource = mediaManager.composite(globalState.videoElement);
            canvasEngine.render(globalState);
        };
        requestAnimationFrame(renderLoop);
    };

    // ── keep globalState.audioGain in sync with React state ──────────────
    React.useEffect(() => {
        globalState.audioGain = audioGain;
    }, [audioGain]);

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

    const updateLayer = (id, key, val) => {
        const l = mediaManager.layers.find(l => l.id === id);
        if (l) { l[key] = val; setLayers([...mediaManager.layers]); }
    };

    const recordToggle = () => {
        if (isRecording) canvasEngine.stopRecording();
        else canvasEngine.startRecording();
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
    const renderEffect = (key) => {
        const effect = globalState.glitchez[key];
        const band = AUDIO_BAND_MAP[key] || 'MID';
        const bandVal = band === 'BASS' ? liveAudio.current.bass : band === 'HIGH' ? liveAudio.current.high : liveAudio.current.mid;
        const isAudioActive = effect.audioReactive && effect.enabled && audioEngine.isRunning;
        const glowIntensity = isAudioActive ? Math.min(1, bandVal * 4) : 0;

        const bandColor = band === 'BASS' ? '#FF5500' : band === 'MID' ? '#FF9900' : '#FFDD00';

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
                {/* Header row: dot + name + AUDIO toggle + ON/OFF toggle */}
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
                    <span style={{display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0}}>
                        {/* AUDIO reactive toggle */}
                        <button
                            className={`audio-band-btn ${effect.audioReactive ? 'active' : ''}`}
                            title={`Audio reactive: ${band} band`}
                            onClick={() => { globalState.glitchez[key].audioReactive = !effect.audioReactive; setUiRefresh(r => r + 1); }}
                            style={{ borderColor: effect.audioReactive ? bandColor : undefined, color: effect.audioReactive ? bandColor : undefined }}
                        >
                            ⚡{effect.audioReactive ? ` ${band}` : ''}
                        </button>
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
                {effect.enabled && Object.keys(effect.params).map(pk => (
                    <div className="param-row" key={pk}>
                        <label>{pk.toUpperCase()}</label>
                        <input type="range" className="brutalist-slider"
                            min={effect.params[pk].min} max={effect.params[pk].max}
                            step={effect.params[pk].step} value={globalState.glitchez[key].params[pk].value}
                            onChange={(e) => { globalState.glitchez[key].params[pk].value = parseFloat(e.target.value); setUiRefresh(r => r + 1); }}
                        />
                        <span style={{textAlign: 'right', color: 'var(--text-bright)', fontSize: '0.65rem'}}>
                            {globalState.glitchez[key].params[pk].value.toFixed(2)}
                        </span>
                    </div>
                ))}
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

            {/* ═══════════════ TERMINAL ═══════════════ */}
            {uiVisible && (
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
                    <div className="status-row">
                        <span className="status-label">SYST_LOAD</span>
                        <span className="status-value">{layers.length}_LYR</span>
                    </div>
                    <div className="status-row">
                        <span className="status-label">AUDIO</span>
                        <span className="status-value" style={{color: audioEngine?.isRunning ? 'var(--accent)' : 'var(--text-dim)'}}>
                            {audioEngine?.isRunning ? (audioEngine?.sourceType === 'file' ? 'FILE_SRC' : 'MIC_SRC') : 'OFFLINE'}
                        </span>
                    </div>

                    <div className="hud-divider" />

                    <div className="section-header">CORE_CMD // CONTROLS</div>

                    {!started && (
                        <button className="brutalist-button primary" style={{marginTop: '12px', width: '100%', fontSize: '1rem'}} onClick={toggleStart}>
                            BOOT_KERNEL
                        </button>
                    )}

                    {started && (
                        <div style={{marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px'}}>
                            <button className={`brutalist-button ${isRecording ? 'active' : ''}`} onClick={recordToggle}>
                                {isRecording ? 'STP_REC' : 'STR_REC'}
                            </button>
                            <button className="brutalist-button" onClick={() => canvasEngine.exportPNG()}>EXPORT_SNAPSHOT</button>
                            <button className="brutalist-button secondary" style={{fontSize: '0.65rem'}} onClick={() => setUiVisible(false)}>COLLAPSE_UI</button>
                        </div>
                    )}

                    <div style={{marginTop: '12px', fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: '1.4', letterSpacing: '1px'}}>
                        <span>────────────────────────</span><br/>
                        <span className="blink-cursor">{'>'} AWAITING INPUT</span>
                    </div>
                </TerminalWindow>
            )}

            {/* ═══════════════ SIGNAL MONITOR ═══════════════ */}
            {uiVisible && started && (
                <TerminalWindow
                    id="win-signal"
                    title="SIGNAL_MONITOR"
                    tag="AUDIO"
                    initialX={16}
                    initialY={340}
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
                        useMic={useMic}
                    />
                </TerminalWindow>
            )}

            {/* ═══════════════ COMMAND CENTER ═══════════════ */}
            {uiVisible && started && (
                <TerminalWindow
                    id="win-command"
                    title="COMMAND_CENTER"
                    initialX={16}
                    initialY={660}
                    width="320px"
                    maxHeight="calc(100vh - 700px)"
                    onClose={() => togglePanel('command')}
                    minimized={!panels.command}
                >
                    {/* OVERRIDES */}
                    <div className="section-header">CORE_KERNEL // OVERRIDES</div>
                    <div style={{display: 'flex', gap: '4px', marginBottom: '12px'}}>
                        <button className="brutalist-button" style={{fontSize: '0.65rem', flex: 1}} onClick={scrambleEngines}>ENGINES</button>
                        <button className="brutalist-button" style={{fontSize: '0.65rem', flex: 1}} onClick={scrambleParams}>PARAMS</button>
                        <button className="brutalist-button primary" style={{fontSize: '0.65rem', flex: 1}} onClick={resetSystem}>RESET</button>
                    </div>

                    <div className="hud-divider" />

                    {/* MEDIA */}
                    <div className="section-header">COMM_LINK // MEDIA</div>
                    <div style={{display: 'flex', gap: '4px', marginBottom: '8px'}}>
                        <button className="brutalist-button" style={{flex: 1, fontSize: '0.6rem', padding: '6px 4px'}} onClick={addImage}>+ IMAGE</button>
                        <button className="brutalist-button" style={{flex: 1, fontSize: '0.6rem', padding: '6px 4px'}} onClick={addText}>+ TEXT</button>
                    </div>
                    {layers.length > 0 && (
                        <div className="layer-list" style={{marginBottom: '8px'}}>
                            {layers.map(l => (
                                <div key={l.id} className={`layer-item ${selectedLayerId === l.id ? 'selected' : ''}`}
                                    style={{display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer'}}
                                    onClick={() => setSelectedLayerId(l.id)}>
                                    <span style={{fontSize: '0.65rem', color: selectedLayerId === l.id ? 'var(--accent)' : 'var(--text-dim)'}}>{l.name.toUpperCase()}</span>
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
                    <div className="section-header">DATA_STASH // PRESETS</div>
                    <button className="brutalist-button primary" style={{width: '100%', marginBottom: '8px', fontSize: '0.7rem'}} onClick={savePreset}>COMMIT CURRENT STATE</button>
                    {presets.length > 0 && (
                        <div className="preset-grid">
                            {presets.map(p => (
                                <div key={p.id} className="preset-card" onClick={() => loadPreset(p)}>
                                    <img src={p.thumbnail} alt={p.name} />
                                    <div className="preset-name">{p.name.toUpperCase()}</div>
                                    <button style={{position: 'absolute', top: 2, right: 2, padding: '2px 5px', background: 'var(--accent)', color: '#000', border: 'none', fontSize: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-mono)'}}
                                        onClick={(e) => { e.stopPropagation(); presetManager.deletePreset(p.id); setPresets([...presetManager.presets]); }}>DELETE</button>
                                </div>
                            ))}
                        </div>
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
                            <span>AUDIO {audioEngine.sourceType === 'file' ? 'FILE' : 'MIC'} — REACTIVE EFFECTS: {effectKeys.filter(k => globalState.glitchez[k].audioReactive).length}</span>
                        </div>
                    )}
                    {effectKeys.map(renderEffect)}
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
