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

    # Check for new scales
    if "'Mixolydian'" not in content:
        print("Missing Mixolydian scale")
        return False

    # Check for UI update logic (in the visualization loop)
    if 'frequencyDisplay' not in content:
        print("Missing frequencyDisplay")
        return False

    # Check for effectsBus implementation
    if 'let effectsBus = null;' not in content:
        print("Missing effectsBus definition")
        return False
    if 'if (effectsBus) return;' not in content:
        print("Missing idempotency check in startSounds")
        return False
    if '.connect(effectsBus)' not in content:
        print("Missing instrument connection to effectsBus")
        return False

    # Check for Clear All button in index.html
    with open('index.html', 'r') as f:
        html_content = f.read()
    if 'id="clearAllBtn"' not in html_content:
        print("Missing clearAllBtn in index.html")
        return False

    # Check for PWA relative paths
    if 'href="manifest.json"' not in html_content:
        print("Missing relative manifest link in index.html")
        return False
    if "register('service-worker.js')" not in content:
        print("Missing relative service worker registration in js/main.js")
        return False

    return True

if __name__ == "__main__":
    if test_js_logic_integrity():
        print("JS logic integrity checks passed!")
    else:
        exit(1)
