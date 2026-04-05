import collections
import time

class MayaFluxBridge:
    """
    Lock-free coordination layer to isolate Domain (Audio/MIDI processing) 
    from Presentation (UI/OpenGL).
    """
    def __init__(self):
        # We use a deque of maxlen=1 for atomic, lock-free passing of full state dictionaries.
        self._state_queue = collections.deque(maxlen=1)
        self._current_state = {
            "time_speed": 1.0,
            "color_input": 1.0,
            "mode": 1,
            "visual_library": 24,
            "audio_threshold": 0.04,
            "use_audio": False,
            "boids_cohesion": 0.5,
            "boids_separation": 0.5,
            "midi_trails_enabled": True,
            "transient_detected": False,
            "spectral_centroid": 0.0,
            "fps": 60.0
        }
        self._state_queue.append(self._current_state)

    def push_state(self, new_state_dict: dict):
        """Domain thread calls this to push new controller states."""
        # Using dict unpacking effectively creates a swift new copy.
        updated = {**self._current_state, **new_state_dict}
        self._state_queue.append(updated)

    def pull_state(self) -> dict:
        """Presentation thread calls this every frame (e.g., at 60fps) to get the latest state."""
        try:
            state = self._state_queue[-1]
            self._current_state = state
            
            # Auto-reset transient triggers after reading
            if state.get("transient_detected"):
                reset_state = {**state, "transient_detected": False}
                self._state_queue.append(reset_state)

            return state
        except IndexError:
            return self._current_state

mayaflux_bridge = MayaFluxBridge()
