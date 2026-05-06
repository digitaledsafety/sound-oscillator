import re

def test_new_params_and_ui():
    with open('index.html', 'r') as f:
        html_content = f.read()

    with open('js/main.js', 'r') as f:
        js_content = f.read()

    # Check for new UI elements in index.html
    new_ui_elements = [
        'id="attackSlider"',
        'id="releaseSlider"',
        'id="delayWetSlider"'
    ]
    for element in new_ui_elements:
        if element not in html_content:
            print(f"Missing UI element: {element}")
            return False

    # Check for event listeners in js/main.js
    listeners = [
        'attackSlider.addEventListener',
        'releaseSlider.addEventListener',
        'delayWetSlider.addEventListener'
    ]
    for listener in listeners:
        if listener not in js_content:
            print(f"Missing event listener: {listener}")
            return False

    # Check for Ripple call in pointerdown
    if 'createRipple(event.clientX, event.clientY)' not in js_content:
        print("Missing createRipple call in pointerdown")
        return False

    return True

if __name__ == "__main__":
    if test_new_params_and_ui():
        print("New parameters and UI checks passed!")
    else:
        exit(1)
