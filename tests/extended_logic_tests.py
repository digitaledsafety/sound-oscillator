import re

def test_extended_js_logic():
    with open('js/main.js', 'r') as f:
        content = f.read()

    # Check for masterGain renaming
    if 'let masterGain = null;' not in content:
        print("Missing masterGain initialization")
        return False
    if 'effectsBus' in content:
        print("Found legacy effectsBus reference")
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
    if 'userVolume / Math.max(1, activeSoundCount)' not in content:
        print("Missing updated gain calculation in updateMasterVolume")
        return False
    if 'masterGain.gain.rampTo' not in content:
        print("Missing masterGain.gain.rampTo in updateMasterVolume")
        return False

    # Check for pointer events
    if 'pointerdown' not in content:
        print("Missing pointerdown event listener")
        return False
    if 'pointerup' not in content:
        print("Missing pointerup event listener")
        return False

    # Check for robust multi-touch (activePointers)
    if 'const activePointers = new Map();' not in content:
        print("Missing activePointers Map")
        return False

    # Check for Delay effect
    if 'delayEffect = new Tone.FeedbackDelay' not in content:
        print("Missing delayEffect initialization")
        return False
    if 'delaySlider' not in content:
        print("Missing delaySlider reference")
        return False

    # Check for openSettingsBtn presence (Discovery enhancement)
    if 'openSettingsBtn' not in content:
        print("Missing openSettingsBtn in JS")
        return False

    # Check for Audio Context initialization guard
    if content.count('await startSounds()') < 2:
        print(f"Insufficient startSounds() awaits: found {content.count('await startSounds()')}")
        return False

    return True

if __name__ == "__main__":
    if test_extended_js_logic():
        print("Extended JS logic integrity checks passed!")
    else:
        exit(1)
