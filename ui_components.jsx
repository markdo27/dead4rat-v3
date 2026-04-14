// ═══════════════════════════════════════════════════════════════════════════
// DEAD4RAT v3 — UI COMPONENT LIBRARY
// Reusable brutalist terminal primitives
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON — Brutalist terminal button
// ─────────────────────────────────────────────────────────────────────────────

function Button({ 
    children, 
    onClick, 
    variant = 'default', // 'default' | 'primary' | 'secondary' | 'active' | 'danger'
    disabled = false,
    className = '',
    style = {},
    title = '',
    ...props 
}) {
    const variantClass = variant === 'primary' ? 'primary' : 
                         variant === 'secondary' ? 'secondary' :
                         variant === 'active' ? 'active' : '';
    return (
        <button
            className={`brutalist-button ${variantClass} ${className}`}
            onClick={onClick}
            disabled={disabled}
            style={style}
            title={title}
            {...props}
        >
            {children}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE — Brutalist switch toggle
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ 
    checked = false, 
    onChange, 
    disabled = false,
    id,
    name,
    ...props 
}) {
    return (
        <input
            type="checkbox"
            className="brutalist-toggle"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            id={id}
            name={name}
            {...props}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDER — Brutalist range slider
// ─────────────────────────────────────────────────────────────────────────────

function Slider({ 
    value, 
    min = 0, 
    max = 100, 
    step = 1,
    onChange, 
    disabled = false,
    className = '',
    showValue = false,
    valueFormat = (v) => v,
    ...props 
}) {
    return (
        <input
            type="range"
            className={`brutalist-slider ${className}`}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange?.(parseFloat(e.target.value))}
            disabled={disabled}
            {...props}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL WINDOW — Draggable panel container
// ─────────────────────────────────────────────────────────────────────────────

const TerminalWindowContext = React.createContext({ isDragging: false });

function TerminalWindow({ 
    id, 
    title, 
    tag, 
    initialX = 20, 
    initialY = 20, 
    width = '300px',
    children, 
    maxHeight, 
    onClose,
    minimized = false,
    ...props 
}) {
    const ref = React.useRef(null);
    const [pos, setPos] = React.useState({ x: initialX, y: initialY });
    const [isDragging, setIsDragging] = React.useState(false);
    const dragOffset = React.useRef({ x: 0, y: 0 });
    const zRef = React.useRef(10);
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const bringToFront = () => {
        TerminalWindow._globalZ = (TerminalWindow._globalZ || 10) + 1;
        zRef.current = TerminalWindow._globalZ;
        if (ref.current) ref.current.style.zIndex = zRef.current;
    };

    const handleMouseDown = (e) => {
        if (isMobile) return;
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
        const move = (e) => {
            const el = ref.current;
            const maxX = window.innerWidth - (el ? el.offsetWidth : 320);
            const maxY = window.innerHeight - (el ? el.offsetHeight : 30);
            const nextX = Math.max(0, Math.min(maxX, e.clientX - dragOffset.current.x));
            const nextY = Math.max(0, Math.min(maxY, e.clientY - dragOffset.current.y));
            setPos({ x: nextX, y: nextY });
        };
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
        <TerminalWindowContext.Provider value={{ isDragging }}>
            <div
                ref={ref}
                className={`sticker ${isDragging ? 'dragging' : ''}`}
                style={{ 
                    left: isMobile ? 'auto' : pos.x + 'px', 
                    top: isMobile ? 'auto' : pos.y + 'px', 
                    width: width, 
                    zIndex: zRef.current 
                }}
                onMouseDown={handleMouseDown}
                id={id}
                {...props}
            >
                <div className="sticker-header">
                    <span className="sticker-header-title">{title}</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                        {tag && <span className="sticker-header-tag">{tag}</span>}
                        {onClose && <button className="win-close" onClick={onClose} title="minimize" aria-label="Minimize panel">×</button>}
                    </div>
                </div>
                <div className="sticker-body" style={{ maxHeight: maxHeight || 'none', overflowY: maxHeight ? 'auto' : 'visible' }}>
                    {children}
                </div>
            </div>
        </TerminalWindowContext.Provider>
    );
}
TerminalWindow._globalZ = 10;

// ─────────────────────────────────────────────────────────────────────────────
// METER — Audio volume band meter
// ─────────────────────────────────────────────────────────────────────────────

function Meter({ 
    label, 
    value, 
    color = 'var(--accent)',
    showPercent = true,
    max = 1,
    ...props 
}) {
    const percent = Math.min(100, (value / max) * 100);
    return (
        <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px'}} {...props}>
            <span style={{fontSize: '0.6rem', color: 'var(--text-dim)', width: '30px'}}>{label}</span>
            <div className="band-meter-track">
                <div 
                    className="band-meter-fill" 
                    style={{ width: `${percent}%`, background: color }} 
                />
            </div>
            {showPercent && (
                <span style={{
                    fontSize: '0.55rem', 
                    color, 
                    width: '32px', 
                    textAlign: 'right', 
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {(value * 100).toFixed(0)}%
                </span>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAM ROW — Labeled parameter slider row
// ─────────────────────────────────────────────────────────────────────────────

function ParamRow({ 
    label, 
    value, 
    min = 0, 
    max = 100, 
    step = 1,
    onChange,
    suffix = '',
    showValue = true,
    ...props 
}) {
    return (
        <div className="param-row" {...props}>
            <label>{label}</label>
            <Slider
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={onChange}
            />
            {showValue && (
                <span style={{fontSize: '0.6rem', color: 'var(--text-bright)', textAlign: 'right', display: 'inline-block'}}>
                    {typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}{suffix}
                </span>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — Collapsible category section
// ─────────────────────────────────────────────────────────────────────────────

function Section({ 
    title, 
    children, 
    open = true, 
    onToggle,
    count,
    ...props 
}) {
    return (
        <div className="category-group" {...props}>
            <div className="category-header" onClick={onToggle}>
                <span className="cat-name">{title}</span>
                {count !== undefined && <span className="cat-count">{count}</span>}
                <span className={`cat-arrow ${open ? 'open' : ''}`}>▶</span>
            </div>
            <div className={`category-body ${open ? 'open' : ''}`}>
                {children}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS ROW — Simple status display row
// ─────────────────────────────────────────────────────────────────────────────

function StatusRow({ label, value, highlight = false, ...props }) {
    return (
        <div className="status-row" {...props}>
            <span className="status-label">{label}</span>
            <span className={`status-value ${highlight ? 'highlight' : ''}`}>{value}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT — Text input field
// ─────────────────────────────────────────────────────────────────────────────

function Input({ 
    value, 
    onChange, 
    placeholder = '', 
    type = 'text',
    disabled = false,
    className = '',
    ...props 
}) {
    return (
        <input
            type={type}
            className={`v3-input ${className}`}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            {...props}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// LFO BUTTON — Per-parameter LFO toggle
// ─────────────────────────────────────────────────────────────────────────────

function LfoButton({ 
    active = false, 
    onClick, 
    disabled = false,
    ...props 
}) {
    return (
        <button
            className={`lfo-btn ${active ? 'active' : ''}`}
            onClick={onClick}
            disabled={disabled}
            title={active ? 'LFO Active' : 'Enable LFO'}
            aria-label="Toggle LFO"
            {...props}
        >
            ♻
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO BAND BUTTON — Band selection toggle
// ─────────────────────────────────────────────────────────────────────────────

function AudioBandButton({ 
    active = false, 
    onClick, 
    children,
    color = 'var(--accent)',
    ...props 
}) {
    return (
        <button
            className={`audio-band-btn ${active ? 'active' : ''}`}
            onClick={onClick}
            style={{ borderColor: active ? color : undefined, color: active ? color : undefined }}
            {...props}
        >
            {children}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// EFFECT CARD — Glitch effect card
// ─────────────────────────────────────────────────────────────────────────────

function EffectCard({ 
    effect, 
    effectKey, 
    onToggle, 
    onAudioToggle,
    onLfoToggle,
    onParamChange,
    onAudioBandChange,
    audioReactive,
    audioBand,
    minimized = false,
    children,
    ...props 
}) {
    return (
        <div className={`glitch-item ${effect.enabled ? 'effect-active' : ''}`} {...props}>
            <div className="glitch-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <Toggle
                        checked={effect.enabled}
                        onChange={() => onToggle?.(effectKey, !effect.enabled)}
                    />
                    <span style={{fontSize: '0.75rem', fontWeight: 700, color: effect.enabled ? 'var(--text-bright)' : 'var(--text-dim)'}}>
                        {effect.name}
                    </span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                    {onLfoToggle && (
                        <LfoButton
                            active={effect.lfo?.enabled || false}
                            onClick={() => onLfoToggle?.(effectKey)}
                        />
                    )}
                    {onAudioToggle && (
                        <AudioBandButton
                            active={audioReactive}
                            onClick={() => onAudioToggle?.(effectKey)}
                        >
                            ⚡
                        </AudioBandButton>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESET CARD — Preset thumbnail card
// ─────────────────────────────────────────────────────────────────────────────

function PresetCard({ 
    preset, 
    onClick, 
    onLoad,
    onDelete,
    isStarter = false,
    ...props 
}) {
    return (
        <div 
            className={`preset-card ${isStarter ? 'starter' : ''}`}
            onClick={() => onClick?.(preset)}
            {...props}
        >
            {preset.thumbnail && (
                <img src={preset.thumbnail} alt={preset.name} />
            )}
            <div className="preset-name">
                {isStarter && <span className="starter-badge">STARTER</span>}
                {preset.name}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

window.Button = Button;
window.Toggle = Toggle;
window.Slider = Slider;
window.TerminalWindow = TerminalWindow;
window.TerminalWindowContext = TerminalWindowContext;
window.Meter = Meter;
window.ParamRow = ParamRow;
window.Section = Section;
window.StatusRow = StatusRow;
window.Input = Input;
window.LfoButton = LfoButton;
window.AudioBandButton = AudioBandButton;
window.EffectCard = EffectCard;
window.PresetCard = PresetCard;