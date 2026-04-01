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

    # Check for Master Gain and User Volume
    if 'let masterGain = null;' not in content:
        print("Missing masterGain variable")
        return False
    if 'let userVolume = 0.7;' not in content:
        print("Missing userVolume variable")
        return False
    if 'masterGain = new Tone.Gain(1);' not in content:
        print("Missing masterGain initialization")
        return False
    if 'masterGain.chain(' not in content:
        print("Missing masterGain chain routing")
        return False
    if '.connect(masterGain)' not in content:
        print("Missing connections to masterGain")
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
