import threading
import sounddevice as sd
import numpy as np
from scipy.fft import rfft, rfftfreq
from mayaflux_bridge import mayaflux_bridge
import time

class AudioEngine:
    def __init__(self, samplerate=48000, blocksize=2048):
        self.samplerate = samplerate
        self.blocksize = blocksize
        self.stream = None
        self.running = False
        self._thread = None
        
    def _audio_callback(self, indata, frames, time_info, status):
        """Called automatically for each audio block."""
        if status:
            print(status)
            
        current_state = mayaflux_bridge.pull_state()
        if not current_state.get("use_audio", False):
            return
            
        audio_data = indata[:, 0] # mono channel
        rms = np.sqrt(np.mean(audio_data**2))
        
        # Transient Detection
        threshold = current_state.get("audio_threshold", 0.04)
        transient = rms > threshold
        
        # Spectral Centroid (Brightness vs Warmth)
        yf = np.abs(rfft(audio_data))
        xf = rfftfreq(self.blocksize, 1 / self.samplerate)
        
        # Avoid division by zero
        sum_yf = np.sum(yf)
        if sum_yf > 1e-6:
            spectral_centroid = np.sum(xf * yf) / sum_yf
        else:
            spectral_centroid = 0.0
            
        # Normalize roughly between 0.0 (warmth) and 1.0 (brightness)
        # assuming useful frequency range is 0 to 10000Hz max
        normalized_centroid = min(max(spectral_centroid / 5000.0, 0.0), 1.0)
        
        # Push to MayaFlux lock-free queue
        mayaflux_bridge.push_state({
            "spectral_centroid": normalized_centroid,
            "transient_detected": transient
        })
        
    def start(self):
        self.running = True
        try:
            self.stream = sd.InputStream(
                callback=self._audio_callback,
                channels=1,
                samplerate=self.samplerate,
                blocksize=self.blocksize
            )
            self.stream.start()
        except Exception as e:
            print(f"Skipping audio engine start due to lack of devices: {e}")
            
    def stop(self):
        self.running = False
        if self.stream:
            self.stream.stop()
            self.stream.close()

if __name__ == "__main__":
    engine = AudioEngine()
    engine.start()
    time.sleep(2)
    engine.stop()
