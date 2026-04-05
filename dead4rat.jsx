const initialEffectSettings = {
    rgbShift: { name: "RGB Shift", enabled: false, audioReactive: false, params: { amount: { value: 5, min: 0, max: 50, step: 1 }, angle: { value: 0, min: 0, max: 360, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    scanLines: { name: "Scan Lines", enabled: true, audioReactive: false, params: { density: { value: 0.7, min: 0, max: 1, step: 0.01 }, opacity: { value: 0.1, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    noise: { name: "Signal Noise", enabled: false, audioReactive: false, params: { amount: { value: 0.1, min: 0, max: 1, step: 0.01 }, chromatic: { value: 0, min: 0, max: 1, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    colorDistortion: { name: "LUT Corrupt (Hue)", enabled: false, audioReactive: false, params: { hue: { value: 0, min: 0, max: 360, step: 1 }, saturation: { value: 1, min: 0, max: 5, step: 0.1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    blockiness: { name: "Data Moshing", enabled: false, audioReactive: false, params: { size: { value: 4, min: 1, max: 32, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    chromaGlitch: { name: "Chroma Shift", enabled: false, audioReactive: false, params: { shiftAmount: { value: 10, min: 0, max: 100, step: 1 }, bleedIntensity: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    vhsJitter: { name: "VHS Jitter", enabled: false, audioReactive: false, params: { vertical: { value: 1, min: 0, max: 10, step: 0.1 }, horizontal: { value: 1, min: 0, max: 10, step: 0.1 }, tear: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    videoFeedback: { name: "FeedbackPro Loop", enabled: false, audioReactive: false, params: { amount: { value: 0.8, min: 0, max: 0.99, step: 0.01 }, zoom: { value: 1.005, min: 0.8, max: 1.5, step: 0.001 }, rotation: { value: 0.0, min: -5, max: 5, step: 0.1 }, moveX: { value: 0.0, min: -0.1, max: 0.1, step: 0.001 }, moveY: { value: 0.0, min: -0.1, max: 0.1, step: 0.001 }, hueShift: { value: 2.0, min: 0.0, max: 50.0, step: 0.1 }, lumaThresh: { value: 1.0, min: 0.0, max: 1.0, step: 0.01 }, mirror: { value: 0, min: 0, max: 1, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    acidMelt: { name: "Substrate Melt", enabled: false, audioReactive: false, params: { amount: { value: 0.9, min: 0, max: 0.99, step: 0.01 }, gravity: { value: 0.01, min: -0.05, max: 0.05, step: 0.001 }, turbulence: { value: 0.05, min: 0, max: 0.5, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    chromaDelay: { name: "Chroma Ghost", enabled: false, audioReactive: false, params: { amount: { value: 0.8, min: 0, max: 0.99, step: 0.01 }, scaleR: { value: 1.01, min: 0.8, max: 1.2, step: 0.001 }, scaleG: { value: 1.0, min: 0.8, max: 1.2, step: 0.001 }, scaleB: { value: 0.99, min: 0.8, max: 1.2, step: 0.001 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    edgeDetection: { name: "Edge Detection", enabled: false, audioReactive: false, params: { threshold: { value: 50, min: 1, max: 255, step: 1 }, invert: { value: 0, min: 0, max: 1, step: 1 }, colorMode: { value: 0, min: 0, max: 1, step: 1 }, glow: { value: 0.3, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    colorize: { name: "Screen Colorize", enabled: false, audioReactive: false, params: { hue: { value: 200, min: 0, max: 360, step: 1 }, strength: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    dataPointCloud: { name: "Bag of Grains", enabled: false, audioReactive: false, params: { density: { value: 0.2, min: 0.01, max: 1, step: 0.01 }, size: { value: 1, min: 1, max: 10, step: 1 }, depth: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    motionDetection: { name: "Motion Slit", enabled: false, audioReactive: false, params: { threshold: { value: 25, min: 1, max: 255, step: 1 }, decay: { value: 0.95, min: 0.8, max: 0.99, step: 0.01 }, tint: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    kaleidoscope: { name: "Kaleidoscope", enabled: false, audioReactive: false, params: { segments: { value: 6, min: 2, max: 12, step: 1 }, rotation: { value: 0, min: -180, max: 180, step: 1 }, zoom: { value: 1.0, min: 0.2, max: 3.0, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    barrelDistortion: { name: "Barrel / Fisheye", enabled: false, audioReactive: false, params: { amount: { value: 0.5, min: -2, max: 2, step: 0.01 }, centerX: { value: 0.5, min: 0, max: 1, step: 0.01 }, centerY: { value: 0.5, min: 0, max: 1, step: 0.01 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    pixelSort: { name: "Pixel Sort", enabled: false, audioReactive: false, params: { threshold: { value: 0.5, min: 0, max: 1, step: 0.01 }, direction: { value: 0, min: 0, max: 1, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } },
    posterize: { name: "Posterize", enabled: false, audioReactive: false, params: { levels: { value: 8, min: 2, max: 32, step: 1 }, blendMode: { value: 0, min: 0, max: 5, step: 1 } } }
};

// Global Mutation State (Bypasses React DOM diffing for 60fps)
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

// Start Engines
let audioEngine = null;
let canvasEngine = null;
let mediaManager = null;
let presetManager = null;
let midiController = null;

function Dead4RatApp() {
    const [fps, setFps] = React.useState("0.0");
    const [started, setStarted] = React.useState(false);
    const [layers, setLayers] = React.useState([]);
    const [selectedLayerId, setSelectedLayerId] = React.useState(null);
    const [presets, setPresets] = React.useState([]);
    const [isRecording, setIsRecording] = React.useState(false);
    const [uiRefresh, setUiRefresh] = React.useState(0); // Trigger structural UI updates
    const [uiVisible, setUiVisible] = React.useState(true);
    const [useMic, setUseMic] = React.useState(false);

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
        // Full deep clone to restore initial settings
        globalState.glitchez = JSON.parse(JSON.stringify(initialEffectSettings));
        
        // Manual DOM sync for uncontrolled inputs
        Object.keys(globalState.glitchez).forEach(k => {
            const effect = globalState.glitchez[k];
            const toggleEl = document.getElementById(`toggle-${k}`);
            if (toggleEl) toggleEl.checked = effect.enabled;
            
            Object.keys(effect.params).forEach(pk => {
                const sliderEl = document.getElementById(`slider-${k}-${pk}`);
                if (sliderEl) sliderEl.value = effect.params[pk].value;
            });
        });

        // Clear media and audio state
        mediaManager.layers = [];
        setLayers([]);
        setSelectedLayerId(null);
        setUseMic(false);
        audioEngine.stop();
        
        // Force React to redraw the whole control panel structure
        setUiRefresh(r => r + 1);
    };

    const handleMicToggle = async (enabled) => {
        setUseMic(enabled);
        if (!started) return; 

        if (enabled) {
            await audioEngine.start();
        } else {
            audioEngine.stop();
        }
    };

    const scrambleParams = () => {
        Object.keys(globalState.glitchez).forEach(key => {
            const effect = globalState.glitchez[key];
            Object.keys(effect.params).forEach(paramKey => {
                const param = effect.params[paramKey];
                const range = param.max - param.min;
                if (param.max === 1 && param.step === 1) {
                     param.value = Math.random() > 0.5 ? 1 : 0;
                } else {
                     param.value = (Math.random() * range) + param.min;
                }
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
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: useMic 
            });
            videoElement.srcObject = stream;
            globalState.videoElement = videoElement;
        } catch (err) { console.error("Camera access denied", err); }

        if (useMic) await audioEngine.start();
        setStarted(true);

        let lastTime = performance.now();
        let frames = 0;

        const renderLoop = (time) => {
            requestAnimationFrame(renderLoop);
            
            // Calculate FPS
            frames++;
            if (time - lastTime >= 1000) {
                setFps(Math.round((frames * 1000) / (time - lastTime)));
                lastTime = time;
                frames = 0;
            }

            // Update audio data
            globalState.spectralCentroid = audioEngine.spectralCentroid * globalState.audioGain;
            globalState.bass = audioEngine.bass * globalState.audioGain;
            globalState.mid = audioEngine.mid * globalState.audioGain;
            globalState.high = audioEngine.high * globalState.audioGain;
            globalState.transient = audioEngine.transientDetected;

            // Composite Media
            globalState.compositeSource = mediaManager.composite(globalState.videoElement);
            
            // WebGL Render
            canvasEngine.render(globalState);
        };
        requestAnimationFrame(renderLoop);
    };

    // --- Media Layer Actions ---
    const addImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    const layer = mediaManager.addLayer('image', { 
                        img, 
                        width: img.width/2, 
                        height: img.height/2 
                    });
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
        const layer = mediaManager.addLayer('text', { 
            text: 'TERMINAL DECAY', 
            fontSize: 80, 
            width: 400, 
            height: 100,
            fontFamily: 'Share Tech Mono'
        });
        setLayers([...mediaManager.layers]);
        setSelectedLayerId(layer.id);
    };

    const addSTL = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.stl';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (re) => {
                // Initialize a mini Three.js scene for this layer
                const size = 512;
                const canvas = document.createElement('canvas');
                canvas.width = size; canvas.height = size;
                const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
                renderer.setSize(size, size);
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
                camera.position.z = 5;
                const light = new THREE.DirectionalLight(0xffffff, 1);
                light.position.set(1, 1, 1);
                scene.add(light);
                scene.add(new THREE.AmbientLight(0x404040));

                const loader = new THREE.STLLoader();
                const geometry = loader.parse(re.target.result);
                const material = new THREE.MeshPhongMaterial({ color: 0x00ff41, wireframe: true });
                const mesh = new THREE.Mesh(geometry, material);
                
                // Center mesh
                geometry.computeBoundingBox();
                const center = new THREE.Vector3();
                geometry.boundingBox.getCenter(center);
                mesh.position.sub(center);
                scene.add(mesh);

                const layer = mediaManager.addLayer('3d', { 
                    renderCanvas: canvas, 
                    width: 400, height: 400,
                    update: () => {
                        mesh.rotation.y += 0.01;
                        mesh.rotation.x += 0.005;
                        renderer.render(scene, camera);
                    }
                });

                // Periodic render for the compositor
                const tick = () => {
                    if (mediaManager.layers.find(l => l.id === layer.id)) {
                        layer.update();
                        requestAnimationFrame(tick);
                    }
                };
                tick();

                setLayers([...mediaManager.layers]);
                setSelectedLayerId(layer.id);
            };
            reader.readAsArrayBuffer(file);
        };
        input.click();
    };

    const updateLayer = (id, key, val) => {
        const l = mediaManager.layers.find(l => l.id === id);
        if (l) {
            l[key] = val;
            setLayers([...mediaManager.layers]);
        }
    };

    // --- Recording & Presets ---
    const recordToggle = () => {
        if (isRecording) canvasEngine.stopRecording();
        else canvasEngine.startRecording();
        setIsRecording(!isRecording);
    };

    const savePreset = () => {
        const name = prompt("Enter Preset Name:");
        if (name) {
            presetManager.savePreset(name, globalState.glitchez, canvasEngine.canvas);
            setPresets([...presetManager.presets]);
        }
    };

    const loadPreset = (p) => {
        // Visual feedback for load
        const flash = document.createElement('div');
        flash.style.position = 'fixed'; flash.style.inset = 0; flash.style.background = '#fff'; flash.style.zIndex = 9999; flash.style.pointerEvents = 'none';
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.transition = 'opacity 0.5s'; flash.style.opacity = 0; setTimeout(() => flash.remove(), 500); }, 50);

        globalState.glitchez = JSON.parse(JSON.stringify(p.settings));
        // Force update UI
        setUiRefresh(r => r + 1);
    };

    const selectedLayer = mediaManager?.layers.find(l => l.id === selectedLayerId);

    return (
        <React.Fragment>
            {/* TERMINAL OVERLAY */}
            {uiVisible && (
            <div className="brutalist-panel terminal-overlay scanlines">
                <div className="panel-header">SYS_TRACK // ALPHA</div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem', marginBottom: '30px'}}>
                    <div style={{color: 'var(--text-secondary)'}}>APP_STATE</div>
                    <div style={{textAlign: 'right', color: 'var(--accent-red)'}}>STABLE_BOOT</div>
                    
                    <div style={{color: 'var(--text-secondary)'}}>FRAMERATE</div>
                    <div style={{textAlign: 'right'}}>{fps}_FPS</div>
                    
                    <div style={{color: 'var(--text-secondary)'}}>SYST_LOAD</div>
                    <div style={{textAlign: 'right'}}>{layers.length}_LYR</div>
                </div>

                <div className="hud-divider"></div>

                <div style={{margin: '20px 0', verticalAlign: 'middle', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>AUDIO_REACTIVE</span>
                    <label className="brutalist-toggle-label" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                        <input type="checkbox" className="brutalist-toggle" checked={useMic} onChange={(e) => handleMicToggle(e.target.checked)} />
                        <span style={{fontSize: '0.8rem', marginLeft: '10px', color: useMic ? 'var(--accent-red)' : 'var(--text-secondary)'}}>
                            {useMic ? "ONLINE" : "OFFLINE"}
                        </span>
                    </label>
                </div>

                <div className="hud-divider"></div>
                
                {!started && (
                    <button className="brutalist-button" style={{marginTop: '30px', width: '100%', fontSize: '1.2rem'}} onClick={toggleStart}>
                        BOOT_KERNEL
                    </button>
                )}
                
                {started && (
                    <div style={{marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
                        <button className={`brutalist-button ${isRecording ? 'active' : ''}`} onClick={recordToggle}>
                            {isRecording ? "STP_REC" : "STR_REC"}
                        </button>
                        <button className="brutalist-button" style={{background: '#1a1a1a', color: '#fff'}} onClick={() => canvasEngine.exportPNG()}>EXPORT_SNAPSHOT</button>
                        <button className="brutalist-button" style={{background: 'transparent', color: 'var(--text-secondary)', border: '1px solid #222', fontSize: '0.7rem'}} onClick={() => setUiVisible(false)}>COLLAPSE_UI</button>
                    </div>
                )}
            </div>
            )}

            {uiVisible && started && (
                <div className="brutalist-panel control-panel">
                    {/* MEDIA LAYERS PANEL */}
                    <div className="v3-panel">
                        <div className="section-header">COMM_LINK // MEDIA</div>
                        <div style={{display: 'flex', gap: '8px', marginBottom: '15px'}}>
                            <button className="brutalist-button" style={{flex: 1, fontSize: '0.75rem'}} onClick={addImage}>+ IMAGE</button>
                            <button className="brutalist-button" style={{flex: 1, fontSize: '0.75rem'}} onClick={addText}>+ TEXT</button>
                            <button className="brutalist-button" style={{flex: 1, fontSize: '0.75rem'}} onClick={addSTL}>+ 3D_STL</button>
                        </div>
                        <div className="layer-list" style={{background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px', overflow: 'hidden'}}>
                            {layers.map(l => (
                                <div key={l.id} className={`layer-item ${selectedLayerId === l.id ? 'selected' : ''}`} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid #1a1a1a', cursor: 'pointer'}} onClick={() => setSelectedLayerId(l.id)}>
                                    <span style={{fontSize: '0.8rem', color: selectedLayerId === l.id ? 'var(--accent-red)' : '#fff'}}>{l.name.toUpperCase()}</span>
                                    <button style={{background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem'}} onClick={(e) => { e.stopPropagation(); mediaManager.removeLayer(l.id); setLayers([...mediaManager.layers]); }}>[REM]</button>
                                </div>
                            ))}
                        </div>
                        {selectedLayer && (
                            <div className="layer-controls">
                                {selectedLayer.type === 'text' && (
                                    <React.Fragment>
                                        <input className="v3-input" value={selectedLayer.text} onChange={(e) => updateLayer(selectedLayer.id, 'text', e.target.value)} />
                                        <div className="param-row">
                                            <label>Font</label>
                                            <select className="v3-input" style={{background: '#000', color: '#fff', border: '1px solid #fff'}} value={selectedLayer.fontFamily || 'Share Tech Mono'} onChange={(e) => updateLayer(selectedLayer.id, 'fontFamily', e.target.value)}>
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
                                <div className="param-row"><label>Rot</label> <input type="range" min="0" max="360" value={selectedLayer.rotation} onChange={(e) => updateLayer(selectedLayer.id, 'rotation', parseInt(e.target.value))} /></div>
                                <button className="brutalist-button" style={{width: '100%', marginTop: '10px', fontSize: '0.7rem', padding: '5px', borderColor: '#ff003c', color: '#ff003c'}} onClick={() => {
                                    selectedLayer.x = window.innerWidth / 2;
                                    selectedLayer.y = window.innerHeight / 2;
                                    selectedLayer.scale = 1.0;
                                    selectedLayer.rotation = 0;
                                    setLayers([...mediaManager.layers]);
                                }}>RESET PARAMETERS</button>
                            </div>
                        )}
                    </div>

                    {/* PRESET LIBRARY PANEL */}
                    <div className="v3-panel">
                        <div className="section-header">DATA_STASH // PRESETS</div>
                        <button className="brutalist-button" style={{width: '100%', marginBottom: '15px', color: 'var(--accent-yellow)', borderColor: 'var(--accent-yellow)'}} onClick={savePreset}>COMMIT CURRENT STATE</button>
                        <div className="preset-grid">
                            {presets.map(p => (
                                <div key={p.id} className="preset-card" onClick={() => loadPreset(p)}>
                                    <img src={p.thumbnail} alt={p.name} />
                                    <div className="preset-name" style={{fontSize: '0.7rem'}}>{p.name.toUpperCase()}</div>
                                    <button style={{position: 'absolute', top: 5, right: 5, padding: '2px 5px', background: 'var(--accent-red)', color: '#fff', border: 'none', fontSize: '9px', cursor: 'pointer', borderRadius: '2px'}} onClick={(e) => { e.stopPropagation(); presetManager.deletePreset(p.id); setPresets([...presetManager.presets]); }}>DELETE</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SETTINGS (Original) */}
                    <div className="section-header">CORE_KERNEL // OVERRIDES</div>
                    <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                        <button className="brutalist-button" style={{fontSize: '0.8rem', flex: 1, borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)'}} onClick={scrambleEngines}>ENGINES</button>
                        <button className="brutalist-button" style={{fontSize: '0.8rem', flex: 1, borderColor: 'var(--accent-yellow)', color: 'var(--accent-yellow)'}} onClick={scrambleParams}>PARAMS</button>
                        <button className="brutalist-button" style={{fontSize: '0.8rem', flex: 1, color: 'var(--accent-red)', borderColor: 'var(--accent-red)'}} onClick={resetSystem}>RESET</button>
                    </div>
                    
                    <div className="section-header">SUBSTRATE_DECAY // MODULES</div>
                    {Object.keys(globalState.glitchez).map(key => {
                        const effect = globalState.glitchez[key];
                        return (
                            <div className="glitch-item" key={key}>
                                <div className="glitch-header">
                                    <span style={{color: effect.enabled ? 'var(--accent-red)' : 'var(--text-secondary)'}}>{effect.name.toUpperCase()}</span>
                                    <input type="checkbox" className="brutalist-toggle" checked={globalState.glitchez[key].enabled} onChange={(e) => { globalState.glitchez[key].enabled = e.target.checked; setUiRefresh(r => r + 1); }} />
                                </div>
                                {effect.enabled && Object.keys(effect.params).map(pk => (
                                    <div className="param-row" key={pk}>
                                        <label>{pk.toUpperCase()}</label>
                                        <input type="range" className="brutalist-slider" min={effect.params[pk].min} max={effect.params[pk].max} step={effect.params[pk].step} value={globalState.glitchez[key].params[pk].value} onChange={(e) => { globalState.glitchez[key].params[pk].value = parseFloat(e.target.value); setUiRefresh(r => r + 1); }} />
                                        <span style={{textAlign: 'right', color: '#fff'}}>{globalState.glitchez[key].params[pk].value.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            )}

            {!uiVisible && (
                <button className="brutalist-button show-ui-btn" onClick={() => setUiVisible(true)}>
                    DEAD4RAT
                </button>
            )}

            {/* MARQUEE FOOTER */}
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
