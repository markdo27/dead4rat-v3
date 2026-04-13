class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.isRunning = false;
        
        // Output values
        this.rms = 0;
        this.spectralCentroid = 0;
        this.transientDetected = false;
        this.bassTransient = false;
        this.midTransient  = false;
        this.highTransient = false;
        
        // Multi-band frequency energy
        this.bass = 0;   // 20-250 Hz
        this.mid = 0;    // 250-4000 Hz
        this.high = 0;   // 4000 Hz+

        // Smoothing for bands (prevents violent flickering)
        this._prevBass = 0;
        this._prevMid = 0;
        this._prevHigh = 0;
        this._smoothing = 0.7;
        
        // Global threshold (kept for backwards compat)
        this.threshold = 0.04;
        // Per-band transient thresholds (internal, fixed defaults)
        this.bassThreshold = 0.15;
        this.midThreshold  = 0.10;
        this.highThreshold = 0.08;
        // Per-band output gain (0–4×, default 1.0 = unity)
        this.bassGain = 1.0;
        this.midGain  = 1.0;
        this.highGain = 1.0;

        this.stream = null;
        this.sourceNode = null; // generic source node (mic or file)
        this.fileAudioElement = null; // for file-based playback
        this.sourceType = 'mic'; // 'mic' | 'file'
    }

    // ─── Getters for UI control ───────────────────────────────────────────
    get smoothing() { return this._smoothing; }
    set smoothing(val) {
        this._smoothing = Math.min(0.99, Math.max(0.0, val));
    }

    /** Returns the live frequency array buffer (do not modify) */
    getFrequencyData() {
        if (!this.analyser || !this.dataArray) return new Uint8Array(0);
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray; // Returns live reference - callers must NOT modify
    }

    // ─── Start from Microphone ────────────────────────────────────────────
    async start() {
        if (this.isRunning) return;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
            
            this._setupAnalyser();
            this.sourceType = 'mic';
            this.isRunning = true;
            this.update();
            console.log('[AudioEngine] Mic started (Multi-Band)');
        } catch (err) {
            console.error('[AudioEngine] Microphone access denied or unavailable', err);
        }
    }

    // ─── Start from Audio File (MP3 / WAV) ───────────────────────────────
    async startFromFile(file) {
        // Stop any running source first
        this.stop();

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create an <audio> element so the user can also hear it
            const audioEl = new Audio();
            audioEl.src = URL.createObjectURL(file);
            audioEl.loop = true;
            audioEl.crossOrigin = 'anonymous';
            audioEl.volume = 1.0;
            this.fileAudioElement = audioEl;

            // Wait for metadata
            await new Promise(resolve => { audioEl.oncanplay = resolve; });
            await audioEl.play();

            this.sourceNode = this.audioContext.createMediaElementSource(audioEl);
            // Re-route audio: source → analyser → destination (so we hear it)
            this._setupAnalyser(true);
            this.sourceType = 'file';
            this.isRunning = true;
            this.update();
            console.log('[AudioEngine] File source started:', file.name);
        } catch (err) {
            console.error('[AudioEngine] File source failed:', err);
        }
    }

    // ─── Internal: create & connect the analyser ─────────────────────────
    _setupAnalyser(connectToDestination = false) {
        const gl = this.audioContext;

        this.analyser = gl.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        
        this.sourceNode.connect(this.analyser);
        if (connectToDestination) {
            // File playback: let the user hear the audio
            this.analyser.connect(gl.destination);
        }

        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
    }

    // ─── Stop ─────────────────────────────────────────────────────────────
    stop() {
        if (!this.isRunning && !this.audioContext) return;
        this.isRunning = false;

        if (this.fileAudioElement) {
            this.fileAudioElement.pause();
            if (this.fileAudioElement.src) URL.revokeObjectURL(this.fileAudioElement.src);
            this.fileAudioElement = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.sourceNode) {
            try { this.sourceNode.disconnect(); } catch(_) {}
            this.sourceNode = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Reset output values
        this.rms = 0;
        this.spectralCentroid = 0;
        this.bass = 0;
        this.mid = 0;
        this.high = 0;
        this._prevBass = 0;
        this._prevMid = 0;
        this._prevHigh = 0;
        this.analyser = null;
        this.dataArray = null;
        console.log('[AudioEngine] Stopped');
    }

    // ─── Update (per-frame) ───────────────────────────────────────────────
    update() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.update());

        this.analyser.getByteFrequencyData(this.dataArray);
        
        const sampleRate = this.audioContext.sampleRate;
        const binCount = this.dataArray.length;
        const nyquist = sampleRate / 2;
        const hzPerBin = nyquist / binCount;

        // Band boundaries in bin indices
        const bassEnd = Math.min(Math.floor(250 / hzPerBin), binCount);
        const midEnd = Math.min(Math.floor(4000 / hzPerBin), binCount);

        let bassSum = 0, bassCount = 0;
        let midSum = 0, midCount = 0;
        let highSum = 0, highCount = 0;
        let sum = 0;
        let weightedSum = 0;
        let amplitudeSum = 0;

        for (let i = 0; i < binCount; i++) {
            const amplitude = this.dataArray[i] / 255.0;
            sum += amplitude * amplitude;
            weightedSum += i * amplitude;
            amplitudeSum += amplitude;

            if (i < bassEnd) {
                bassSum += amplitude;
                bassCount++;
            } else if (i < midEnd) {
                midSum += amplitude;
                midCount++;
            } else {
                highSum += amplitude;
                highCount++;
            }
        }

        // RMS (Volume)
        this.rms = Math.sqrt(sum / binCount);
        
        // Spectral Centroid (Brightness)
        if (amplitudeSum > 0.01) {
            this.spectralCentroid = (weightedSum / amplitudeSum) / (binCount * 0.5);
            this.spectralCentroid = Math.min(Math.max(this.spectralCentroid, 0.0), 1.0);
        } else {
            this.spectralCentroid = 0;
        }

        // Multi-band energy with smoothing
        const rawBass = bassCount > 0 ? bassSum / bassCount : 0;
        const rawMid = midCount > 0 ? midSum / midCount : 0;
        const rawHigh = highCount > 0 ? highSum / highCount : 0;

        const smoothedBass = this._prevBass * this._smoothing + rawBass * (1 - this._smoothing);
        const smoothedMid  = this._prevMid  * this._smoothing + rawMid  * (1 - this._smoothing);
        const smoothedHigh = this._prevHigh * this._smoothing + rawHigh * (1 - this._smoothing);

        // Apply per-band gain (clamped to 0–4×)
        this.bass = Math.min(1, smoothedBass * Math.max(0, this.bassGain));
        this.mid  = Math.min(1, smoothedMid  * Math.max(0, this.midGain));
        this.high = Math.min(1, smoothedHigh * Math.max(0, this.highGain));

        this._prevBass = smoothedBass;
        this._prevMid  = smoothedMid;
        this._prevHigh = smoothedHigh;

        // Per-band Transient Detection (using gained values)
        this.bassTransient = this.bass > this.bassThreshold;
        this.midTransient  = this.mid  > this.midThreshold;
        this.highTransient = this.high > this.highThreshold;
        // Global transient: any band fires OR classic RMS
        this.transientDetected = this.bassTransient || this.midTransient || this.highTransient || (this.rms > this.threshold);

    }
}
