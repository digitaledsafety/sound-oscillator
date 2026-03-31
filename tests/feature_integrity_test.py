import sys

def test_new_features():
    with open('js/main.js', 'r') as f:
        js_content = f.read()

    with open('index.html', 'r') as f:
        html_content = f.read()

    # Check for new scales
    new_scales = ['Whole Tone', 'C Melodic Minor']
    for scale in new_scales:
        if f"'{scale}'" not in js_content:
            print(f"Missing scale in js/main.js: {scale}")
            return False

    # Check for new UI elements in HTML
    new_ui_elements = ['id="noteDisplay"', 'id="randomScaleBtn"']
    for element in new_ui_elements:
        if element not in html_content:
            print(f"Missing UI element in index.html: {element}")
            return False

    # Check for logic in JS
    new_logic = ['noteDisplay.textContent = note', 'randomScaleBtn.addEventListener', 'Math.random()']
    for logic in new_logic:
        if logic not in js_content:
            print(f"Missing logic in js/main.js: {logic}")
            return False

    # Check for global audio nodes fix and redundant connection prevention
    global_nodes = ['let masterCompressor = null;', 'let lowBump = null;', 'let reverb = null;', 'let isAudioChainInitialized = false;']
    for node in global_nodes:
        if node not in js_content:
            print(f"Missing global node declaration in js/main.js: {node}")
            return False

    if 'if (isAudioChainInitialized) return;' not in js_content:
        print("Missing isAudioChainInitialized check in startSounds")
        return False

    return True

if __name__ == "__main__":
    if test_new_features():
        print("New feature integrity checks passed!")
    else:
        sys.exit(1)
