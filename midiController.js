class MidiController {
    constructor(globalState) {
        this.globalState = globalState;
        this.midiAccess = null;
        
        // Simple mapping structure: CC Number -> function to update globalState
        this.ccMappings = {
            1: (val) => this.mapToParam(val, 'videoFeedback', 'amount'),
            2: (val) => this.mapToParam(val, 'videoFeedback', 'zoom'),
            3: (val) => this.mapToParam(val, 'scanLines', 'opacity'),
            4: (val) => this.mapToParam(val, 'dataPointCloud', 'density'),
            // Expand standard mappings here for generic 8-knob controllers
        };
    }

    async start() {
        if (!navigator.requestMIDIAccess) {
            console.warn("Web MIDI API not supported in this browser.");
            return;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            for (let input of this.midiAccess.inputs.values()) {
                input.onmidimessage = this.getMIDIMessage.bind(this);
            }
            this.midiAccess.onstatechange = (e) => {
                if (e.port.state === 'connected' && e.port.type === 'input') {
                    e.port.onmidimessage = this.getMIDIMessage.bind(this);
                }
            };
            console.log("MIDI Subsystem Initialized");
        } catch (err) {
            console.error("MIDI Access Denied", err);
        }
    }

    getMIDIMessage(message) {
        let command = message.data[0];
        let noteOrCc = message.data[1];
        let velocityOrValue = message.data.length > 2 ? message.data[2] : 0;

        // Control Change (usually 176 for Channel 1)
        if (command === 176) {
            // Normalized 0.0 to 1.0
            const normalizedVal = velocityOrValue / 127.0; 
            
            if (this.ccMappings[noteOrCc]) {
                this.ccMappings[noteOrCc](normalizedVal);
            } else {
                console.log(`Unmapped CC Received: CC#${noteOrCc} Value: ${velocityOrValue}`);
            }
        }
    }

    // Helper to map normalized 0.0-1.0 value to a specific Glitch param's min/max range
    mapToParam(normalizedVal, effectKey, paramKey) {
        const effect = this.globalState.glitchez[effectKey];
        if (!effect) return;
        const param = effect.params[paramKey];
        if (!param) return;

        // Enable effect if it's mapped to a knob and turned up past 0.01
        if (normalizedVal > 0.01 && !effect.enabled) {
            effect.enabled = true;
            // Update UI reflectively if possible, but React might need a forced render update.
            // For now, it will just activate the webgl shader
        }

        const range = param.max - param.min;
        param.value = (normalizedVal * range) + param.min;
    }
}
