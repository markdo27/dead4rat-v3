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
        
        // Multi-band frequency energy
        this.bass = 0;   // 20-250 Hz
        this.mid = 0;    // 250-4000 Hz
        this.high = 0;   // 4000 Hz+

        // Smoothing for bands (prevents violent flickering)
        this._prevBass = 0;
        this._prevMid = 0;
        this._prevHigh = 0;
        this._smoothing = 0.7;
        
        // Threshold control mapping
        this.threshold = 0.04;
    }

    async start() {
        if (this.isRunning) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            source.connect(this.analyser);
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            this.isRunning = true;
            this.update();
            console.log("Audio Engine Started (Multi-Band)");
        } catch (err) {
            console.error("Microphone access denied or unavailable", err);
            alert("Microphone access is required for audio reactivity.");
        }
    }

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

        this.bass = this._prevBass * this._smoothing + rawBass * (1 - this._smoothing);
        this.mid = this._prevMid * this._smoothing + rawMid * (1 - this._smoothing);
        this.high = this._prevHigh * this._smoothing + rawHigh * (1 - this._smoothing);

        this._prevBass = this.bass;
        this._prevMid = this.mid;
        this._prevHigh = this.high;

        // Transient Detection
        this.transientDetected = this.rms > this.threshold;
    }
}
