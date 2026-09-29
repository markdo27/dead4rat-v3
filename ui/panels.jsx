// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT UI — dock panels
// ═══════════════════════════════════════════════════════════════════════════

// ── GENERATOR ──────────────────────────────────────────────────────────────
function GenPanel() {
    const deck = useDeck();
    const { GEN_DEFS, GEN_GROUPS, GEN_PARAMS } = D4R;
    const g = deck.look.gen;
    const on = g.mode !== 'OFF';
    return (
        <div className="panel-body">
            <Section title="GENERATOR" hint="A 3D scene drawn on the GPU. With the camera on, bright parts of the camera show through."
                right={<Btn small on={!on} onClick={() => deck.setGenMode('OFF')} title="Switch the generator off">OFF</Btn>}>
                {GEN_GROUPS.map((grp) => (
                    <div key={grp} className="gen-group">
                        <div className="gen-group-name">{grp}</div>
                        <div className="gen-grid">
                            {GEN_DEFS.filter(d => d.group === grp).map(d => (
                                <button type="button" key={d.key} className={cx('gen-tile', g.mode === d.key && 'on')}
                                    style={{ '--fog': `rgb(${d.fog.map(v => Math.round(Math.min(1, v * 6) * 255)).join(',')})` }}
                                    aria-pressed={g.mode === d.key}
                                    onClick={() => deck.setGenMode(d.key)}>{d.key}</button>
                            ))}
                        </div>
                    </div>
                ))}
            </Section>
            <Section title="MOTION & COLOUR" right={<BandPicker value={g.band} onChange={(b) => deck.setGenBand(b)} />}>
                {GEN_PARAMS.map(p => (
                    <Param key={p.k} spec={p} value={g.params[p.k]} disabled={!on}
                        onChange={(v) => deck.setGenParam(p.k, v)}
                        lfo={g.lfo[p.k]} onLfo={() => deck.cycleLfo('gen', null, p.k)}
                        onArm={() => deck.armMidi({ t: 'gen', k: p.k })} />
                ))}
                <Param spec={{ label: 'CAMERA MIX', min: 0, max: 1, step: 0.01 }} value={g.camKey} disabled={!on}
                    onChange={(v) => deck.setCamKey(v)} />
                <p className="hint">CAMERA MIX: 0 = generator only. Raise it to let the camera's bright areas (and text layers) show on top.</p>
            </Section>
        </div>
    );
}

// ── EFFECTS ────────────────────────────────────────────────────────────────
function FxRow({ def }) {
    const deck = useDeck();
    const s = deck.look.fx[def.key];
    const [open, setOpen] = React.useState(false);
    const expanded = s.on || open;
    const bandLive = React.useRef(null);
    useFrame((d) => {
        if (!bandLive.current) return;
        const v = s.band && d.audio.running ? d.audio.level[s.band] : 0;
        bandLive.current.style.opacity = s.band ? 0.25 + v * 0.75 : 0;
    }, 2);
    return (
        <div className={cx('fx', s.on && 'on')}>
            <div className="fx-head">
                <Switch on={s.on} onChange={() => deck.toggleFx(def.key)} title={`${s.on ? 'Switch off' : 'Switch on'} ${def.name}`} />
                <button type="button" className="fx-name" onClick={() => setOpen(!expanded)} title={def.desc} aria-expanded={expanded}>
                    {def.name}
                    <span ref={bandLive} className="fx-band-dot" style={{ background: s.band ? BAND_COLORS[s.band] : 'transparent' }} />
                </button>
                {def.audio && <BandPicker label="" value={s.band} onChange={(b) => deck.setFxBand(def.key, b)} />}
            </div>
            {expanded && (
                <div className="fx-params">
                    <p className="hint fx-desc">{def.desc}</p>
                    {def.params.map(p => p.opts ? (
                        <div className="param param-opts" key={p.k}>
                            <span className="param-label">{p.label}</span>
                            {p.k === 'blend'
                                ? <select className="select" value={s.params.blend} onChange={(e) => deck.setFxParam(def.key, 'blend', +e.target.value)} aria-label="Blend mode">
                                      {p.opts.map((o, i) => <option key={o} value={i}>{o}</option>)}
                                  </select>
                                : <Seg small value={s.params[p.k]} options={p.opts.map((o, i) => [i, o])} onChange={(v) => deck.setFxParam(def.key, p.k, v)} />}
                        </div>
                    ) : (
                        <Param key={p.k} spec={p} value={s.params[p.k]}
                            onChange={(v) => deck.setFxParam(def.key, p.k, v)}
                            lfo={s.lfo[p.k]} onLfo={() => deck.cycleLfo('fx', def.key, p.k)}
                            onArm={() => deck.armMidi({ t: 'fx', key: def.key, k: p.k })} />
                    ))}
                    <div className="row-end"><Btn small kind="ghost" onClick={() => deck.resetFx(def.key)}>RESET</Btn></div>
                </div>
            )}
        </div>
    );
}

function FxPanel() {
    const deck = useDeck();
    const { FX_DEFS, FX_CATS } = D4R;
    const active = FX_DEFS.filter(d => deck.look.fx[d.key].on);
    return (
        <div className="panel-body">
            <div className="toolbar">
                <span className="count">{active.length} ON</span>
                <Btn small onClick={() => deck.randomize()} title="Morph to a random combination (R)">⚄ RANDOM</Btn>
                <Btn small kind="ghost" onClick={() => deck.reset()} title="Back to factory settings">RESET ALL</Btn>
            </div>
            <Section title="LFO" hint="The ~ button beside a slider makes it wobble. These set the speed and range for all of them.">
                <Param spec={{ label: 'RATE HZ', min: 0.1, max: 10, step: 0.1 }} value={deck.look.mod.rate} onChange={(v) => deck.setMod('rate', v)} />
                <Param spec={{ label: 'DEPTH', min: 0, max: 1, step: 0.01 }} value={deck.look.mod.depth} onChange={(v) => deck.setMod('depth', v)} />
            </Section>
            {FX_CATS.map(cat => (
                <Section key={cat} title={cat}>
                    {FX_DEFS.filter(d => d.cat === cat).map(d => <FxRow key={d.key} def={d} />)}
                </Section>
            ))}
        </div>
    );
}

// ── AUDIO ──────────────────────────────────────────────────────────────────
function Spectrum() {
    const ref = React.useRef(null);
    useFrame((d) => {
        const c = ref.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        const W = c.width, H = c.height;
        ctx.clearRect(0, 0, W, H);
        const data = d.audio.spectrum();
        if (!data) return;
        const n = 96;
        const bw = W / n;
        for (let i = 0; i < n; i++) {
            // log-spaced bins so bass is not squashed
            const idx = Math.min(data.length - 1, Math.floor(Math.pow(data.length, i / n)));
            const v = data[idx] / 255;
            ctx.fillStyle = i < n * 0.3 ? '#FF5500' : i < n * 0.75 ? '#FF9900' : '#FFDD00';
            ctx.fillRect(i * bw, H - v * H, Math.max(1, bw - 1), v * H);
        }
    }, 2);
    return <canvas ref={ref} className="spectrum" width={300} height={64} aria-label="Audio spectrum" />;
}

function BeatDot({ band }) {
    const ref = React.useRef(null);
    useFrame((d) => { if (ref.current) ref.current.style.opacity = 0.15 + d.audio.env[band] * 0.85; });
    return <span ref={ref} className="beat-dot" style={{ background: BAND_COLORS[band] }} />;
}

function AudioPanel() {
    const deck = useDeck();
    const a = deck.audio;
    return (
        <div className="panel-body">
            <Section title="SOURCE">
                <div className="btn-row">
                    <Btn on={a.kind === 'mic'} onClick={() => deck.useMic()}>🎙 MIC</Btn>
                    <FilePick accept="audio/*" onFile={(f) => deck.useFile(f)} on={a.kind === 'file'}>♫ FILE</FilePick>
                    <Btn on={a.kind === 'off'} kind="ghost" onClick={() => deck.audioOff()}>OFF</Btn>
                </div>
                {a.kind === 'file' && <p className="hint accent">▶ {a.fileName}</p>}
                {a.error && <p className="hint warn">{a.error}</p>}
            </Section>
            <Section title="SIGNAL" right={<LiveText className="bpm" read={(d) => d.audio.bpm ? `${d.audio.bpm} BPM` : '— BPM'} />}>
                <Spectrum />
                {['BASS', 'MID', 'HIGH'].map(b => (
                    <div className="band-line" key={b}>
                        <BeatDot band={b} />
                        <LiveMeter label={b} color={BAND_COLORS[b]} read={(d) => d.audio.level[b]} />
                    </div>
                ))}
                <p className="hint">Dots flash on detected beats (onsets) in each band.</p>
            </Section>
            <Section title="RESPONSE">
                <Param spec={{ label: 'MASTER', min: 0, max: 4, step: 0.05 }} value={a.gain} onChange={(v) => deck.setAudio({ gain: v })} />
                <Param spec={{ label: 'BASS EQ', min: 0, max: 4, step: 0.05 }} value={a.bandGain.BASS} onChange={(v) => deck.setAudio({ BASS: v })} />
                <Param spec={{ label: 'MID EQ', min: 0, max: 4, step: 0.05 }} value={a.bandGain.MID} onChange={(v) => deck.setAudio({ MID: v })} />
                <Param spec={{ label: 'HIGH EQ', min: 0, max: 4, step: 0.05 }} value={a.bandGain.HIGH} onChange={(v) => deck.setAudio({ HIGH: v })} />
                <Param spec={{ label: 'SMOOTH', min: 0, max: 0.98, step: 0.01 }} value={a.smoothing} onChange={(v) => deck.setAudio({ smoothing: v })} />
                <Param spec={{ label: 'BEAT SENS', min: 0, max: 1, step: 0.01 }} value={a.sensitivity} onChange={(v) => deck.setAudio({ sensitivity: v })} />
                <p className="hint">Pick B / M / H on any effect or on the generator to make it react to that band.</p>
            </Section>
        </div>
    );
}

// ── AI ─────────────────────────────────────────────────────────────────────
function HeadBars() {
    const refs = { yaw: React.useRef(null), pitch: React.useRef(null), roll: React.useRef(null) };
    const txt = { yaw: React.useRef(null), pitch: React.useRef(null), roll: React.useRef(null) };
    useFrame((d) => {
        for (const k of ['yaw', 'pitch', 'roll']) {
            const v = d.human[k] || 0;
            if (refs[k].current) { refs[k].current.style.left = `${50 + Math.min(0, v) * 50}%`; refs[k].current.style.width = `${Math.abs(v) * 50}%`; }
            if (txt[k].current) txt[k].current.textContent = `${Math.round(d.human[k + 'Deg'] || 0)}°`;
        }
    }, 3);
    return ['yaw', 'pitch', 'roll'].map(k => (
        <div className="meter" key={k}>
            <span className="meter-label">{k.toUpperCase()}</span>
            <div className="meter-track centered"><div ref={refs[k]} className="meter-fill abs" /></div>
            <span ref={txt[k]} className="meter-value">0°</span>
        </div>
    ));
}

function AiPanel() {
    const deck = useDeck();
    const h = deck.human, g = deck.gesture;
    const { GESTURE_DEFS } = D4R;
    const camOff = !deck.camera.on;
    const loading = h.state === 'loading';
    return (
        <div className="panel-body">
            {camOff && <p className="notice">The camera is off. Turn it on in OUTPUT to use tracking.</p>}
            <Section title="GESTURE FX" right={<Switch on={g.on} onChange={() => deck.toggleGesture()} label={g.on ? 'ON' : 'OFF'} />}
                hint="Effects that follow your hand. Without AI tracking, the biggest moving area acts as the hand — no download needed.">
                <div className="param param-opts">
                    <span className="param-label">FOLLOW</span>
                    <Seg small value={g.source} options={[['AUTO', 'AUTO'], ['HAND', 'HAND (AI)'], ['MOTION', 'MOTION']]} onChange={(v) => deck.setGestureSource(v)} />
                </div>
                <div className="chip-grid">
                    {GESTURE_DEFS.map(d => (
                        <button type="button" key={d.key} className={cx('chip', g.fx.includes(d.key) && 'on')} title={d.desc}
                            aria-pressed={g.fx.includes(d.key)} onClick={() => deck.toggleGestureFx(d.key)}>{d.name}</button>
                    ))}
                </div>
                <LiveMeter label="PINCH" read={(d) => d.gesture.present ? d.gesture.pinch : 0} />
                <LiveText className="hint" read={(d) => !d.gesture.on ? 'Switch on to start.' : d.gesture.present ? `Tracking via ${d.gesture.via}. Pinch (or move more) to push harder; two hands drive THEREMIN.` : 'Waiting for a hand or movement…'} />
            </Section>

            <Section title="AI TRACKING" right={<Switch on={h.state === 'on' || loading} disabled={camOff} onChange={() => deck.toggleHuman()} label={loading ? 'LOADING' : h.state === 'on' ? 'ON' : 'OFF'} />}
                hint="Face, emotion, hands and body. First use downloads about 15 MB of models (cached after that).">
                {h.state === 'error' && <p className="hint warn">{h.error} <Btn small onClick={() => deck.toggleHuman()}>RETRY</Btn></p>}
                <div className="chip-grid">
                    {[['face', 'FACE'], ['emotion', 'EMOTION'], ['hands', 'HANDS'], ['body', 'BODY']].map(([k, label]) => (
                        <button type="button" key={k} className={cx('chip', h.modules[k] && 'on')} aria-pressed={h.modules[k]} onClick={() => deck.setHumanModule(k, !h.modules[k])}>{label}</button>
                    ))}
                </div>
                {h.state === 'on' && (
                    <React.Fragment>
                        <LiveText className="readout" read={(d) => `FACE ${d.human.faceDetected ? Math.round(d.human.faceScore * 100) + '%' : '—'} · ${d.human.emotion.toUpperCase()} · HANDS ${d.human.hands} · BODY ${d.human.bodyDetected ? 'YES' : '—'}`} />
                        <HeadBars />
                        <LiveText className="hint" read={(d) => d.human.gesture ? `Gesture: ${d.human.gesture}` : ''} />
                    </React.Fragment>
                )}
                <div className="param param-opts">
                    <span className="param-label">FACE DRIVE</span>
                    <Switch on={deck.faceDrive} onChange={() => deck.toggleFaceDrive()} title="Head turn steers the generator camera; your expression tints its palette" />
                </div>
                <div className="param param-opts">
                    <span className="param-label">OVERLAY</span>
                    <Switch on={deck.showOverlay} onChange={() => deck.toggleOverlay()} title="Draw tracking boxes and skeleton on screen" />
                </div>
            </Section>

            <Section title="PERSON CUT-OUT" right={<Switch on={deck.isolate} disabled={camOff} onChange={() => deck.toggleIsolate()} label={deck.isolate && deck.mask.state === 'loading' ? 'LOADING' : deck.isolate ? 'ON' : 'OFF'} />}
                hint="Removes the background behind you. With a generator running you appear inside the scene.">
            </Section>

            <Section title="MOTION BLOBS" right={<Switch on={deck.blobTrack} disabled={camOff} onChange={() => deck.toggleBlobs()} label={deck.blobTrack ? 'ON' : 'OFF'} />}
                hint="Boxes around anything that moves.">
                {deck.blobTrack && (
                    <React.Fragment>
                        <Param spec={{ label: 'THRESHOLD', min: 5, max: 120, step: 1 }} value={deck.blobs.threshold} onChange={(v) => deck.setBlob({ threshold: v })} />
                        <Param spec={{ label: 'MIN SIZE', min: 5, max: 200, step: 1 }} value={deck.blobs.minArea} onChange={(v) => deck.setBlob({ minArea: v })} />
                        <Param spec={{ label: 'LINGER', min: 5, max: 180, step: 1 }} value={deck.blobs.persist} onChange={(v) => deck.setBlob({ persist: v })} />
                        <LiveText className="readout" read={(d) => `${d.blobs.count} MOVING`} />
                    </React.Fragment>
                )}
            </Section>
        </div>
    );
}

// ── MEDIA ──────────────────────────────────────────────────────────────────
function MediaPanel() {
    const deck = useDeck();
    const layers = deck.media.layers;
    const [sel, setSel] = React.useState(null);
    const l = layers.find(x => x.id === sel) || layers[layers.length - 1];
    const up = (patch) => deck.updateLayer(l.id, patch);
    return (
        <div className="panel-body">
            <Section title="ADD LAYER" hint="Layers sit on top of the camera and go through every effect. Over a generator, bright layers show through (see CAMERA MIX in SCENE).">
                <div className="btn-row">
                    <FilePick accept="image/*" onFile={(f) => deck.addImage(f)}>+ IMAGE</FilePick>
                    <Btn onClick={() => deck.addText()}>+ TEXT</Btn>
                    <FilePick accept="video/*" onFile={(f) => deck.addVideo(f)}>+ VIDEO</FilePick>
                </div>
            </Section>
            {layers.length > 0 && (
                <Section title={`LAYERS (${layers.length})`}>
                    <ul className="layer-list">
                        {layers.map(x => (
                            <li key={x.id} className={cx('layer', l && x.id === l.id && 'on')}>
                                <button type="button" className="layer-name" onClick={() => setSel(x.id)}>
                                    {x.type === 'video' ? '▶' : x.type === 'image' ? '■' : 'T'} {x.type === 'text' ? x.text.slice(0, 22) || 'TEXT' : x.name}
                                </button>
                                <button type="button" className="icon-btn" aria-label={x.visible ? 'Hide layer' : 'Show layer'} title={x.visible ? 'Hide' : 'Show'} onClick={() => deck.updateLayer(x.id, { visible: !x.visible })}>{x.visible ? '◉' : '○'}</button>
                                <button type="button" className="icon-btn" aria-label="Remove layer" title="Remove" onClick={() => deck.removeLayer(x.id)}>✕</button>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
            {l && (
                <Section title="SELECTED LAYER">
                    {l.type === 'text' && (
                        <React.Fragment>
                            <input className="text-input" value={l.text} maxLength={60} onChange={(e) => up({ text: e.target.value })} aria-label="Layer text" />
                            <div className="param param-opts">
                                <span className="param-label">FONT</span>
                                <select className="select" value={l.font} onChange={(e) => up({ font: e.target.value })}>
                                    {D4R.TEXT_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <input type="color" className="color" value={l.color} onChange={(e) => up({ color: e.target.value })} aria-label="Text colour" />
                            </div>
                        </React.Fragment>
                    )}
                    {l.type === 'video' && (
                        <div className="btn-row">
                            <Btn small on={l.playing} onClick={() => up({ playing: !l.playing })}>{l.playing ? '❚❚ PAUSE' : '▶ PLAY'}</Btn>
                        </div>
                    )}
                    <Param spec={{ label: 'X', min: 0, max: 1, step: 0.005 }} value={l.x} onChange={(v) => up({ x: v })} />
                    <Param spec={{ label: 'Y', min: 0, max: 1, step: 0.005 }} value={l.y} onChange={(v) => up({ y: v })} />
                    <Param spec={{ label: 'SIZE', min: 0.02, max: 2, step: 0.01 }} value={l.scale} onChange={(v) => up({ scale: v })} />
                    <Param spec={{ label: 'ROTATE', min: -180, max: 180, step: 1 }} value={l.rotation} onChange={(v) => up({ rotation: v })} />
                    <Param spec={{ label: 'OPACITY', min: 0, max: 1, step: 0.01 }} value={l.opacity} onChange={(v) => up({ opacity: v })} />
                    {l.type === 'video' && <Param spec={{ label: 'SPEED', min: 0.25, max: 4, step: 0.05 }} value={l.speed} onChange={(v) => up({ speed: v })} />}
                    <div className="row-end"><Btn small kind="ghost" onClick={() => up({ x: 0.5, y: 0.5, scale: l.type === 'text' ? 0.12 : 0.5, rotation: 0, opacity: 1 })}>CENTRE & RESET</Btn></div>
                </Section>
            )}
        </div>
    );
}

// ── OUTPUT ─────────────────────────────────────────────────────────────────
function OutputPanel() {
    const deck = useDeck();
    const v = deck.view;
    const m = deck.midi;
    return (
        <div className="panel-body">
            <Section title="CAMERA" right={<Switch on={deck.camera.on} onChange={() => deck.toggleCamera()} label={deck.camera.on ? 'ON' : 'OFF'} />}>
                <div className="param param-opts">
                    <span className="param-label">MIRROR</span>
                    <Switch on={deck.camera.mirror} onChange={(on) => deck.setMirror(on)} title="Selfie view: move left, image moves left" />
                </div>
            </Section>
            <Section title="FORMAT" hint="Shape of the picture. 9:16 for phone video, 1:1 for square posts.">
                <Seg value={v.format} options={['SCREEN', '16:9', '9:16', '1:1']} onChange={(f) => deck.setView({ format: f })} />
            </Section>
            <Section title="QUALITY" right={<LiveText className="readout" read={(d) => `${d.fps} FPS · ${Math.round(d.renderScale * 100)}%`} />}
                hint="AUTO lowers the resolution when the GPU struggles and raises it when there is headroom.">
                <Seg value={v.quality} options={['AUTO', 'LOW', 'MED', 'HIGH']} onChange={(q) => deck.setView({ quality: q })} />
            </Section>
            <Section title="ORIENTATION" hint="For projectors mounted sideways or behind a screen.">
                <div className="btn-row">
                    <Btn small on={v.flipH} onClick={() => deck.setView({ flipH: !v.flipH })}>⇔ FLIP H</Btn>
                    <Btn small on={v.flipV} onClick={() => deck.setView({ flipV: !v.flipV })}>⇕ FLIP V</Btn>
                </div>
                <Seg small value={v.rotation} options={[[0, '0°'], [1, '90°'], [2, '180°'], [3, '270°']]} onChange={(r) => deck.setView({ rotation: r })} />
            </Section>
            <Section title="CAPTURE">
                <div className="btn-row">
                    <Btn onClick={() => deck.snapshot()} title="Save a PNG (P)">◻ SNAPSHOT</Btn>
                    <Btn kind={deck.recording ? 'rec' : undefined} on={deck.recording} onClick={() => deck.toggleRecord()} title="Record video with sound (V)">{deck.recording ? '■ STOP' : '● RECORD'}</Btn>
                    <Btn onClick={() => deck.toggleFullscreen()} title="Fullscreen (F)">⛶ FULL</Btn>
                </div>
            </Section>
            <Section title="MIDI" right={m.state === 'on' ? <span className="readout">{m.inputs} DEVICE{m.inputs === 1 ? '' : 'S'}</span> : <Btn small onClick={() => deck.enableMidi()}>CONNECT</Btn>}
                hint="Pads (notes 36–43 or 60–67) fire scenes 1–8. LEARN: switch on, touch a slider, turn a knob.">
                {m.state === 'on' && (
                    <div className="btn-row">
                        <Btn small on={m.learn} onClick={() => deck.setMidiLearn(!m.learn)}>{m.learn ? (m.armed ? 'TURN A KNOB…' : 'TOUCH A SLIDER…') : 'LEARN'}</Btn>
                        <Btn small kind="ghost" onClick={() => { m.forget(); deck.emit(); }}>FORGET ({Object.keys(m.map).length})</Btn>
                        <span className="readout">{m.last}</span>
                    </div>
                )}
            </Section>
        </div>
    );
}

Object.assign(window, { GenPanel, FxPanel, AudioPanel, AiPanel, MediaPanel, OutputPanel });
