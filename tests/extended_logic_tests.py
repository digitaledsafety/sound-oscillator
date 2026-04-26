import re

def test_extended_js_logic():
    with open('js/main.js', 'r') as f:
        content = f.read()

    # Check for masterBus renaming
    if 'let masterBus = null;' not in content:
        print("Missing masterBus initialization")
        return False
    if 'masterGain' in content:
        # Note: masterGain might still be in comments or strings, but let's check for variable usage
        if 'let masterGain =' in content or 'const masterGain =' in content:
             print("Found legacy masterGain reference")
             return False

    # Check for userVolume presence
    if 'let userVolume = 0.8;' not in content:
        print("Missing userVolume initialization")
        return False

    # Check for createSynth helper function
    if 'function createSynth()' not in content:
        print("Missing createSynth function")
        return False

    # Check that createSynth is used in startPreviewLoop and addFixedLoop
    # Count occurrences of createSynth() call
    synth_calls = len(re.findall(r'createSynth\(\)', content))
    if synth_calls < 2:
        print(f"createSynth() should be called at least twice, found {synth_calls}")
        return False

    # Check for updated compressor settings
    if 'threshold: -12' not in content:
        print("Missing updated compressor threshold")
        return False
    if 'ratio: 4' not in content:
        print("Missing updated compressor ratio")
        return False
    if 'attack: 0.01' not in content:
        print("Missing updated compressor attack")
        return False
    if 'release: 0.25' not in content:
        print("Missing updated compressor release")
        return False

    # Check for updated updateMasterVolume logic
    if '1.0 / Math.max(1, activeSoundCount)' not in content:
        print("Missing updated gain calculation in updateMasterVolume")
        return False
    if 'masterBus.gain.rampTo' not in content:
        print("Missing masterBus.gain.rampTo in updateMasterVolume")
        return False
    if 'Tone.Destination.volume.rampTo' not in content:
        print("Missing Tone.Destination.volume.rampTo in updateMasterVolume")
        return False

    # Check for pointer events
    if 'pointerdown' not in content:
        print("Missing pointerdown event listener")
        return False
    if 'pointerup' not in content:
        print("Missing pointerup event listener")
        return False

    # Check for multi-touch support
    if 'const activePointers = new Map();' not in content:
        print("Missing activePointers initialization")
        return False

    # Check for delay wet slider logic
    if 'delayWetSlider' not in content:
        print("Missing delayWetSlider reference in JS")
        return False

    # Verify removal of openSettingsBtn
    if 'openSettingsBtn' in content:
        print("openSettingsBtn still present in JS")
        return False

    # Check for Panner
    if 'panner = new Tone.Panner' not in content:
        print("Missing Tone.Panner initialization")
        return False
    if 'panner.pan.rampTo' not in content:
        print("Missing panner.pan.rampTo in orientation listener")
        return False

    return True

if __name__ == "__main__":
    if test_extended_js_logic():
        print("Extended JS logic integrity checks passed!")
    else:
        exit(1)
