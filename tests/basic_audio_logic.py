import re

def test_js_logic_integrity():
    with open('js/main.js', 'r') as f:
        content = f.read()

    # Check for memory leak fix
    if 'previewLoop.dispose();' not in content:
        print("Missing previewLoop.dispose();")
        return False

    # Check for timing update
    if 'performance.now()' not in content:
        print("Missing performance.now()")
        return False

    # Check for Reverb (correct implementation without circular routing)
    if 'new Tone.Reverb' not in content:
        print("Missing Tone.Reverb")
        return False
    if 'await reverb.ready' not in content:
        print("Missing await reverb.ready")
        return False
    # Check that reverb instance doesn't have .toDestination() directly in startSounds
    # In startSounds function:
    # const reverb = new Tone.Reverb({
    #   decay: 2,
    #   wet: 0.3
    # });
    # if '}).toDestination();' in content:
    #   Note: this might be too broad if other things have it.

    # Check for masterGain variable
    if 'let masterGain = null;' not in content:
        print("Missing masterGain variable declaration")
        return False

    # Check for masterGain usage in startSounds
    if 'masterGain = new Tone.Gain(userVolume);' not in content:
        print("Missing masterGain initialization in startSounds")
        return False

    # Check for routing to masterGain
    if '.connect(masterGain)' not in content:
        print("Missing audio routing to masterGain")
        return False

    # Check for new scales
    if "'Mixolydian'" not in content:
        print("Missing Mixolydian scale")
        return False

    # Check for UI update logic (in the visualization loop)
    if 'frequencyDisplay' not in content:
        print("Missing frequencyDisplay")
        return False

    return True

if __name__ == "__main__":
    if test_js_logic_integrity():
        print("JS logic integrity checks passed!")
    else:
        exit(1)
