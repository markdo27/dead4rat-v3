class MaskEngine {
    constructor(width = 640, height = 480) {
        this.width = width;
        this.height = height;
        
        // Internal canvas to hold the BW mask
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = this.width;
        this.maskCanvas.height = this.height;
        this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });
        
        this.segmentationModel = null;
        this.isReady = false;
        this.isProcessing = false;
        
        // Settings
        this.enabled = false;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Note: relies on window.SelfieSegmentation from CDN loaded in index.html
            this.segmentationModel = new SelfieSegmentation({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
            }});

            this.segmentationModel.setOptions({
                modelSelection: 1, // 0 for general, 1 for landscape (faster)
                selfieMode: false,
            });

            this.segmentationModel.onResults((results) => this.onResults(results));

            // Warm up the model
            const blankCanvas = document.createElement('canvas');
            blankCanvas.width = 64;
            blankCanvas.height = 64;
            await this.segmentationModel.send({image: blankCanvas});
            
            this.isReady = true;
            this.initialized = true;
            console.log("MaskEngine: MediaPipe initialized and warmed up.");
        } catch (error) {
            console.error("MaskEngine Initialization Error:", error);
        }
    }

    onResults(results) {
        if (!this.maskCtx) return;
        
        const w = this.maskCanvas.width;
        const h = this.maskCanvas.height;
        
        this.maskCtx.save();
        this.maskCtx.clearRect(0, 0, w, h);

        // Draw the mask directly
        if (results.segmentationMask) {
            // MediaPipe puts out an alpha mask where person is white, bg is transparent/black
            this.maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);
            
            // For a pure BW matte:
            this.maskCtx.globalCompositeOperation = 'source-in';
            this.maskCtx.fillStyle = '#FFFFFF';
            this.maskCtx.fillRect(0, 0, w, h);
            
            this.maskCtx.globalCompositeOperation = 'destination-over';
            this.maskCtx.fillStyle = '#000000';
            this.maskCtx.fillRect(0, 0, w, h);
        } else {
            // Failsafe: whole image is white (person)
            this.maskCtx.fillStyle = '#FFFFFF';
            this.maskCtx.fillRect(0, 0, w, h);
        }
        
        this.maskCtx.restore();
        this.isProcessing = false;
    }

    async process(videoElement) {
        if (!this.enabled || !this.isReady || this.isProcessing) return;
        if (!videoElement || videoElement.readyState < 2) return;
        
        this.isProcessing = true;
        try {
            await this.segmentationModel.send({image: videoElement});
        } catch (e) {
            console.error("MaskEngine API Error:", e);
        } finally {
            this.isProcessing = false;
        }
    }
    
    getMask() {
        return this.maskCanvas;
    }
}
