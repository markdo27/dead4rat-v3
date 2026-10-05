// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT UI — app shell: boot, HUD, dock, scene bar, help, SANDER
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
    ['gen', 'GEN', GenPanel],
    ['fx', 'FX', FxPanel],
    ['audio', 'AUDIO', AudioPanel],
    ['ai', 'TRACK', AiPanel],
    ['media', 'MEDIA', MediaPanel],
    ['out', 'OUTPUT', OutputPanel],
];

const SHORTCUTS = [
    ['1 – 8', 'Fire scene (morph)'], ['Shift + 1 – 8', 'Save / overwrite a scene with the current look'],
    ['R', 'Random look'], ['A', 'Autopilot on / off'], ['G / Shift + G', 'Next / previous generator'],
    ['H', 'Hide / show all controls'], ['D', 'Hide / show the side panel'], ['F', 'Fullscreen'],
    ['P', 'Snapshot (PNG)'], ['V', 'Record video'], ['?', 'This help'], ['Esc', 'Close overlays'],
];

function Boot({ onStart }) {
    const deck = useDeck();
    const [cam, setCam] = React.useState(true);
    const [mic, setMic] = React.useState(true);
    const [busy, setBusy] = React.useState(false);
    const [about, setAbout] = React.useState(false);
    const go = async (opts) => { setBusy(true); await onStart(opts); };
    return (
        <div className="boot">
            <div className="boot-card" role="dialog" aria-labelledby="boot-title">
                <h1 id="boot-title" className="brand">DEAD4RAT<span className="brand-sub">TERMINAL DECAY · LIVE VISUAL SYNTH</span></h1>
                {deck.sharedLook && <p className="notice">✦ A shared look is waiting — it loads when you start.</p>}
                <div className="boot-options">
                    <Switch on={cam} onChange={setCam} label="CAMERA" />
                    <Switch on={mic} onChange={setMic} label="MICROPHONE" />
                </div>
                <Btn kind="primary" className="boot-go" disabled={busy} onClick={() => go({ camera: cam, mic })}>
                    {busy ? 'STARTING…' : '◉ START'}
                </Btn>
                <Btn kind="ghost" className="boot-demo" disabled={busy} onClick={() => go({ demo: true })}>
                    ▶ DEMO — no camera or mic needed
                </Btn>
                <p className="hint center">Everything runs in your browser. Nothing is uploaded. Press <kbd>?</kbd> any time for shortcuts.</p>
                <button type="button" className="link-btn" aria-expanded={about} onClick={() => setAbout(!about)}>{about ? '▾' : '▸'} AUTHOR & LICENCE</button>
                {about && (
                    <div className="about">
                        <div className="kv"><span>AUTHOR</span><b>MARK DO</b></div>
                        <div className="kv"><span>CONTACT</span><a href="mailto:dtcmark@gmail.com">DTCMARK@GMAIL.COM</a></div>
                        <p className="hint">PERSONAL USE — FREE. Use this tool, and anything you make with it, for personal, study and other non commercial work. No permission needed.</p>
                        <p className="hint">COMMERCIAL USE — ASK FIRST. Client, brand, resale and any other paid work needs written permission: <a href="mailto:dtcmark@gmail.com?subject=Commercial%20use%20request">request a licence</a>.</p>
                        <p className="hint">© 2026 MARK DO — PROVIDED AS IS, NO WARRANTY</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function Hud({ dockOpen, setDockOpen, setHidden, setHelp, setSander, openTab }) {
    const deck = useDeck();
    const fpsRef = React.useRef(null);
    const lvlRef = React.useRef(null);
    const recRef = React.useRef(null);
    const lvlLast = React.useRef(-1);
    useFrame((d) => {
        const v = d.audio.running ? Math.round(Math.max(d.audio.level.BASS, d.audio.level.MID) * 50) / 50 : 0;
        if (v === lvlLast.current || !lvlRef.current) return; // no DOM write when nothing changed
        lvlLast.current = v;
        lvlRef.current.style.transform = `scaleX(${v})`;
    }, 3);
    useFrame((d) => {
        if (fpsRef.current) {
            fpsRef.current.textContent = `${d.fps} FPS · ${Math.round(d.renderScale * 100)}%`;
            fpsRef.current.dataset.health = d.fps >= 50 ? 'good' : d.fps >= 28 ? 'ok' : 'bad';
        }
        if (recRef.current && d.recording) {
            const s = Math.floor((performance.now() - d._recStart) / 1000);
            recRef.current.textContent = `● REC ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        }
    }, 15);
    const a = deck.audio;
    return (
        <header className="hud">
            <div className="hud-left">
                <span className="hud-brand">D4R</span>
                <span className="hud-dots" title={`Camera ${deck.camera.on ? 'on' : 'off'} · audio ${a.kind}`}>
                    <i className={cx(deck.camera.on && 'on')} /><i className={cx(a.running && 'on')} />
                </span>
                <span ref={fpsRef} className="hud-chip" title={`Frames per second · render resolution (quality: ${deck.view.quality})`} />
                <button type="button" className={cx('hud-chip', deck.camera.on && 'live')} onClick={() => deck.toggleCamera()} title="Camera on/off">CAM {deck.camera.on ? 'ON' : 'OFF'}</button>
                <button type="button" className={cx('hud-chip', a.running && 'live')} title="Audio input — open the AUDIO tab" onClick={() => openTab('audio')}>
                    {a.kind === 'off' ? 'AUDIO OFF' : a.kind === 'mic' ? 'MIC' : 'FILE'}
                    <span className="hud-level"><span ref={lvlRef} /></span>
                </button>
                {deck.demo && <span className="hud-chip dim">DEMO</span>}
                {deck.recording && <span ref={recRef} className="hud-chip rec">● REC</span>}
            </div>
            <div className="hud-right">
                <Btn small className="hud-opt" onClick={() => deck.randomize()} title="Random look (R)">⚄ RANDOM</Btn>
                <Btn small className="hud-opt" onClick={() => deck.snapshot()} title="Snapshot PNG (P)">◻ SNAP</Btn>
                <Btn small kind={deck.recording ? 'rec' : undefined} on={deck.recording} onClick={() => deck.toggleRecord()} title="Record video (V)">{deck.recording ? '■ STOP' : '● REC'}</Btn>
                <Btn small className="hud-opt" onClick={() => deck.toggleFullscreen()} title="Fullscreen (F)" aria-label="Fullscreen">⛶</Btn>
                <Btn small onClick={() => setSander(true)} title="Open SANDER — Chladni sand patterns" aria-label="Open SANDER">✦<span className="hud-txt"> SANDER</span></Btn>
                <Btn small onClick={() => setHelp(true)} title="Shortcuts (?)" aria-label="Help">?</Btn>
                <Btn small on={dockOpen} onClick={() => setDockOpen(!dockOpen)} title="Side panel (D)" aria-label="Side panel">☰<span className="hud-txt"> PANEL</span></Btn>
                <Btn small kind="ghost" onClick={() => setHidden(true)} title="Hide all controls (H)">HIDE</Btn>
            </div>
        </header>
    );
}

function Dock({ tab, setTab }) {
    const Panel = (TABS.find(t => t[0] === tab) || TABS[0])[2];
    const onKey = (e) => {
        const i = Math.max(0, TABS.findIndex(t => `tab-${t[0]}` === e.target.id));
        const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null;
        if (j === null) return;
        e.preventDefault(); e.stopPropagation();
        const next = TABS[(j + TABS.length) % TABS.length][0];
        setTab(next);
        const el = document.getElementById(`tab-${next}`);
        el && el.focus();
    };
    return (
        <aside className="dock" aria-label="Controls">
            <nav className="tabs" role="tablist" aria-label="Control panels" onKeyDown={onKey}>
                {TABS.map(([id, label]) => (
                    <button type="button" key={id} id={`tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="dock-panel"
                        tabIndex={tab === id ? 0 : -1} className={cx('tab', tab === id && 'on')} onClick={() => setTab(id)}>{label}</button>
                ))}
            </nav>
            <div className="dock-scroll" id="dock-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}><Panel /></div>
        </aside>
    );
}

function SceneBar() {
    const deck = useDeck();
    const slots = deck.scenes.slots;
    const [editing, setEditing] = React.useState(-1);
    const [menu, setMenu] = React.useState(-1);
    const cancelRename = React.useRef(false);
    const morphS = deck.morphMs / 1000;
    return (
        <footer className="scenebar" aria-label="Scenes">
            {slots[menu] ? (
                <div className="slot-bar" role="group" aria-label={`Scene ${menu + 1} options`}
                    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setMenu(-1); }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setMenu(-1); } }}>
                    <span className="slot-bar-name"><b>{menu + 1}</b> {slots[menu].name}</span>
                    <button type="button" className="btn btn-sm" autoFocus onClick={() => { setEditing(menu); setMenu(-1); }}>✎<span className="sb-txt"> RENAME</span></button>
                    <button type="button" className="btn btn-sm" title="Overwrite with the current look" onClick={() => { deck.storeScene(menu); setMenu(-1); }}>⤓<span className="sb-txt"> OVERWRITE</span></button>
                    <button type="button" className="btn btn-sm danger" title="Clear (can be undone)" onClick={() => { deck.clearScene(menu); setMenu(-1); }}>✕<span className="sb-txt"> CLEAR</span></button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setMenu(-1)} aria-label="Back to scenes">‹<span className="sb-txt"> BACK</span></button>
                </div>
            ) : (
            <div className="scene-slots">
                {slots.map((s, i) => (
                    <div key={i} className={cx('slot', s ? 'full' : 'empty', deck.activeScene === i && 'on')}>
                        {s ? (
                            editing === i ? (
                                <input className="slot-rename" autoFocus defaultValue={s.name} maxLength={18} aria-label={`Name for scene ${i + 1}`}
                                    onFocus={() => { cancelRename.current = false; }}
                                    onBlur={(e) => { if (!cancelRename.current) deck.renameScene(i, e.target.value || s.name); setEditing(-1); }}
                                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') cancelRename.current = true; if (e.key === 'Enter' || e.key === 'Escape') e.target.blur(); }} />
                            ) : (
                                <button type="button" className="slot-main" onClick={(e) => e.shiftKey ? deck.storeScene(i) : deck.fireScene(i)}
                                    title={`Scene ${i + 1}: ${s.name} — click to morph, Shift+click to overwrite with the current look`}>
                                    <span className="slot-n">{i + 1}</span><span className="slot-name">{s.name}</span>
                                </button>
                            )
                        ) : (
                            <button type="button" className="slot-main" onClick={() => deck.storeScene(i)} title={`Save the current look into scene ${i + 1}`}>
                                <span className="slot-n">{i + 1}</span><span className="slot-name">+ SAVE</span>
                            </button>
                        )}
                        {s && editing !== i && (
                            <button type="button" className="slot-more" aria-label={`Scene ${i + 1} options`} aria-haspopup="true"
                                title="Rename, overwrite or clear" onClick={() => setMenu(i)}>⋯</button>
                        )}
                    </div>
                ))}
            </div>
            )}
            <div className="scene-tools">
                <label className="morph" title="How long scenes take to blend into each other">
                    <span>MORPH</span>
                    <input type="range" className="slider" min="0" max="5000" step="100" value={deck.morphMs}
                        style={{ '--pct': `${deck.morphMs / 50}%` }} onChange={(e) => deck.setMorphMs(+e.target.value)} />
                    <b>{morphS === 0 ? 'CUT' : `${morphS.toFixed(1)}s`}</b>
                </label>
                <Btn small on={deck.auto.on} onClick={() => deck.setAuto(!deck.auto.on)} title="Autopilot: move through saved scenes on its own (A). With audio on it waits for a bass hit.">AUTO</Btn>
                <select className="select sm" value={deck.auto.every} onChange={(e) => deck.setAutoEvery(+e.target.value)} aria-label="Autopilot interval">
                    {[4, 8, 16, 32, 64].map(s => <option key={s} value={s}>{s}s</option>)}
                </select>
                <Btn small onClick={() => deck.shareLink()} title="Copy a link that opens this exact look">⇪ SHARE</Btn>
            </div>
        </footer>
    );
}

function Help({ onClose }) {
    const close = React.useRef(null);
    React.useEffect(() => { const prev = document.activeElement; close.current && close.current.focus(); return () => prev && prev.focus && prev.focus(); }, []);
    return (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h2 id="help-title">SHORTCUTS</h2>
                <dl className="keys">
                    {SHORTCUTS.map(([k, v]) => <React.Fragment key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></React.Fragment>)}
                </dl>
                <p className="hint">Scenes: the bar at the bottom holds 8 saved looks. Click an empty slot to save, a full one to morph to it, Shift+click to overwrite. The ⋯ corner of a slot renames ✎, overwrites ⤓ or clears ✕ it. AUTO steps through them.</p>
                <button type="button" ref={close} className="btn" onClick={onClose}>CLOSE</button>
            </div>
        </div>
    );
}

function Toast() {
    const deck = useDeck();
    const [shown, setShown] = React.useState(null);
    React.useEffect(() => {
        if (!deck.toast) return;
        setShown(deck.toast);
        const id = setTimeout(() => setShown(null), deck.toast.action ? 6000 : deck.toast.kind === 'warn' ? 4500 : 2500);
        return () => clearTimeout(id);
    }, [deck.toast && deck.toast.id]);
    if (!shown) return null;
    return (
        <div className={cx('toast', shown.kind)} role="status" aria-live="polite">
            {shown.msg}
            {shown.action && <button type="button" className="toast-act" onClick={() => { shown.action.run(); setShown(null); }}>{shown.action.label}</button>}
        </div>
    );
}

function Sander({ onClose }) {
    return (
        <div className="sander">
            <iframe src="sander.html" title="SANDER — Chladni sand patterns" allow="microphone; camera" />
        </div>
    );
}

function App() {
    const deck = useDeck();
    const [started, setStarted] = React.useState(false);
    const [hidden, setHidden] = React.useState(false);
    const [dockOpen, setDockOpen] = React.useState(() => window.innerWidth > 720);
    const [tab, setTab] = React.useState(() => { try { return localStorage.getItem('d4r_tab') || 'fx'; } catch (e) { return 'fx'; } });
    const [help, setHelp] = React.useState(false);
    const [sander, setSander] = React.useState(false);

    React.useEffect(() => { try { localStorage.setItem('d4r_tab', tab); } catch (e) {} }, [tab]);

    // Fit the picture into the part of the screen the controls don't cover.
    React.useEffect(() => {
        const apply = () => {
            if (!started || hidden) { deck.setInsets({}); return; }
            const phone = window.innerWidth <= 720;
            deck.setInsets({
                top: 40,
                bottom: 58 + (phone && dockOpen ? Math.round(window.innerHeight * 0.46) : 0),
                right: !phone && dockOpen ? 344 : 0,
            });
        };
        apply();
        window.addEventListener('resize', apply);
        return () => window.removeEventListener('resize', apply);
    }, [started, hidden, dockOpen]);
    React.useEffect(() => { deck.setPaused(sander); }, [sander]);

    // Hidden mode: fade the cursor out when idle.
    React.useEffect(() => {
        if (!hidden) { document.body.classList.remove('idle'); return; }
        let id;
        const wake = () => { document.body.classList.remove('idle'); clearTimeout(id); id = setTimeout(() => document.body.classList.add('idle'), 2000); };
        wake();
        window.addEventListener('pointermove', wake);
        return () => { clearTimeout(id); window.removeEventListener('pointermove', wake); document.body.classList.remove('idle'); };
    }, [hidden]);

    React.useEffect(() => {
        const onMsg = (e) => { if (e.origin === location.origin && e.data && (e.data.type === 'CHLADNI_CLOSE' || e.data.type === 'SANDER_CLOSE')) setSander(false); };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, []);

    React.useEffect(() => {
        const onKey = (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            if (e.key === 'Escape') { setHelp(false); setSander(false); setHidden(false); return; }
            if (!started || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
            if (help && e.key !== '?' && e.key !== '/') return;
            if (tag === 'input' && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
            if (tag === 'textarea' || tag === 'select') return;
            const digit = e.code && e.code.startsWith('Digit') ? parseInt(e.code.slice(5), 10) : NaN;
            if (digit >= 1 && digit <= 8) { e.preventDefault(); if (e.shiftKey) deck.storeScene(digit - 1); else deck.fireScene(digit - 1); return; }
            switch (e.key.toLowerCase()) {
                case 'r': deck.randomize(); break;
                case 'a': deck.setAuto(!deck.auto.on); break;
                case 'g': deck.stepGen(e.shiftKey ? -1 : 1); break;
                case 'h': setHidden(h => !h); break;
                case 'd': setDockOpen(o => !o); break;
                case 'f': deck.toggleFullscreen(); break;
                case 'p': deck.snapshot(); break;
                case 'v': deck.toggleRecord(); break;
                case '?': case '/': setHelp(h => !h); break;
                default: return;
            }
            e.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [started, deck, help]);

    const start = async (opts) => { await deck.start(opts); setStarted(true); };

    return (
        <React.Fragment>
            {!started && <Boot onStart={start} />}
            {started && !hidden && (
                <React.Fragment>
                    <Hud dockOpen={dockOpen} setDockOpen={setDockOpen} setHidden={setHidden} setHelp={setHelp} setSander={setSander} openTab={(t) => { setTab(t); setDockOpen(true); }} />
                    {dockOpen && <Dock tab={tab} setTab={setTab} />}
                    <SceneBar />
                </React.Fragment>
            )}
            {started && hidden && (
                <button type="button" className="unhide" onClick={() => setHidden(false)} title="Show controls (H or Esc)">D4R</button>
            )}
            {help && <Help onClose={() => setHelp(false)} />}
            {sander && <Sander />}
            <Toast />
        </React.Fragment>
    );
}

function mount() {
    const canvas = document.getElementById('stage');
    const video = document.getElementById('camera');
    const deck = new D4R.Deck(canvas, video);
    window.__deck = deck; // handy for debugging from the console
    if (!deck.renderer.ok) {
        document.getElementById('root').innerHTML = '<div class="boot"><div class="boot-card"><h1 class="brand">DEAD4RAT</h1><p class="notice">This browser or device has WebGL switched off, so the visuals cannot run. Try a recent Chrome, Edge, Firefox or Safari.</p></div></div>';
        return;
    }
    ReactDOM.createRoot(document.getElementById('root')).render(
        <DeckContext.Provider value={deck}><App /></DeckContext.Provider>
    );
}

mount();
