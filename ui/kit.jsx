// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT UI — primitives and hooks
// ═══════════════════════════════════════════════════════════════════════════

const DeckContext = React.createContext(null);

// Re-render when the deck changes.
function useDeck() {
    const deck = React.useContext(DeckContext);
    const [, setV] = React.useState(0);
    React.useEffect(() => deck.subscribe(setV), [deck]);
    return deck;
}

// Run cb(deck) every frame while mounted (for live meters: write to refs,
// never set React state here).
function useFrame(cb, every = 1) {
    const deck = React.useContext(DeckContext);
    const ref = React.useRef(cb);
    ref.current = cb;
    React.useEffect(() => {
        let n = 0;
        return deck.onFrame((d) => { if (++n % every === 0) ref.current(d); });
    }, [deck, every]);
}

const cx = (...a) => a.filter(Boolean).join(' ');

function fmt(v, step) {
    if (step >= 1) return String(Math.round(v));
    if (step >= 0.1) return v.toFixed(1);
    if (step >= 0.01) return v.toFixed(2);
    return v.toFixed(3);
}

function Btn({ children, on, kind, small, className, title, ...rest }) {
    return (
        <button type="button" className={cx('btn', on && 'on', kind && `btn-${kind}`, small && 'btn-sm', className)} title={title} aria-pressed={on === undefined ? undefined : !!on} {...rest}>
            {children}
        </button>
    );
}

// Segmented single choice. options: [value] or [[value, label]]
function Seg({ value, options, onChange, small, title }) {
    return (
        <div className={cx('seg', small && 'seg-sm')} role="radiogroup" title={title}>
            {options.map((o) => {
                const [v, label] = Array.isArray(o) ? o : [o, o];
                return (
                    <button type="button" key={v} role="radio" aria-checked={value === v} className={cx('seg-btn', value === v && 'on')} onClick={() => onChange(v)}>
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

function Switch({ on, onChange, label, title, disabled }) {
    return (
        <button type="button" role="switch" aria-checked={!!on} className={cx('switch', on && 'on')} onClick={() => onChange(!on)} title={title} disabled={disabled}>
            <span className="switch-track"><span className="switch-knob" /></span>
            {label && <span className="switch-label">{label}</span>}
        </button>
    );
}

const LFO_GLYPH = { sin: '∿', tri: '⋀', saw: '⩘', rnd: '⁝' };
const LFO_NAME = { sin: 'sine', tri: 'triangle', saw: 'saw', rnd: 'random steps' };

// Slider row: LABEL [——o——] value [LFO]
function Param({ spec, value, onChange, lfo, onLfo, onArm, disabled }) {
    const id = React.useId();
    const pct = ((value - spec.min) / (spec.max - spec.min)) * 100;
    return (
        <div className={cx('param', disabled && 'disabled')}>
            <label htmlFor={id} className="param-label">{spec.label}</label>
            <input
                id={id} type="range" className="slider" min={spec.min} max={spec.max} step={spec.step} value={value}
                style={{ '--pct': `${pct}%` }}
                disabled={disabled}
                onPointerDown={onArm}
                onChange={(e) => onChange(parseFloat(e.target.value))}
            />
            <span className="param-value">{fmt(value, spec.step)}</span>
            {onLfo && (
                <button type="button" className={cx('lfo', lfo && 'on')} onClick={onLfo}
                    title={lfo ? `LFO: ${LFO_NAME[lfo]} — click for next wave` : 'Add LFO wobble to this setting'}
                    aria-label={lfo ? `LFO ${LFO_NAME[lfo]}` : 'LFO off'}>
                    {lfo ? LFO_GLYPH[lfo] : '~'}
                </button>
            )}
        </div>
    );
}

function Section({ title, right, children, hint }) {
    return (
        <section className="section">
            <header className="section-head">
                <h3>{title}</h3>
                {right && <div className="section-right">{right}</div>}
            </header>
            {hint && <p className="hint">{hint}</p>}
            {children}
        </section>
    );
}

const BAND_COLORS = { BASS: '#FF5500', MID: '#FF9900', HIGH: '#FFDD00' };

// B / M / H audio-band picker. Clicking the active band switches it off.
function BandPicker({ value, onChange, label = 'AUDIO' }) {
    return (
        <div className="bands" title="Make this react to an audio band (click again to switch off)">
            {label && <span className="bands-label">{label}</span>}
            {['BASS', 'MID', 'HIGH'].map((b) => (
                <button type="button" key={b} className={cx('band', value === b && 'on')} style={{ '--band': BAND_COLORS[b] }}
                    aria-pressed={value === b} aria-label={`${b} band`} onClick={() => onChange(b)}>
                    {b[0]}
                </button>
            ))}
        </div>
    );
}

// Horizontal live meter; read(deck) → 0..1
function LiveMeter({ read, color = 'var(--accent)', label, every = 1 }) {
    const bar = React.useRef(null);
    const txt = React.useRef(null);
    const last = React.useRef(-1);
    useFrame((d) => {
        const v = Math.round(Math.max(0, Math.min(1, read(d) || 0)) * 200) / 200;
        if (v === last.current) return; // no DOM write when nothing changed
        last.current = v;
        if (bar.current) bar.current.style.transform = `scaleX(${v})`;
        if (txt.current) txt.current.textContent = Math.round(v * 100);
    }, every);
    return (
        <div className="meter">
            {label && <span className="meter-label">{label}</span>}
            <div className="meter-track"><div ref={bar} className="meter-fill" style={{ background: color }} /></div>
            <span ref={txt} className="meter-value">0</span>
        </div>
    );
}

// Text that updates live (e.g. fps); read(deck) → string
function LiveText({ read, every = 10, className }) {
    const ref = React.useRef(null);
    useFrame((d) => { if (ref.current) { const s = read(d); if (ref.current.textContent !== s) ref.current.textContent = s; } }, every);
    return <span ref={ref} className={className} />;
}

function FilePick({ accept, onFile, children, kind, small, title, on }) {
    const ref = React.useRef(null);
    return (
        <React.Fragment>
            <Btn kind={kind} on={on} small={small} title={title} onClick={() => ref.current.click()}>{children}</Btn>
            <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ''; }} />
        </React.Fragment>
    );
}

Object.assign(window, { DeckContext, useDeck, useFrame, cx, fmt, Btn, Seg, Switch, Param, Section, BandPicker, BAND_COLORS, LiveMeter, LiveText, FilePick });
