# Sound Oscillator PWA

Sound Oscillator is a Progressive Web Application (PWA) that generates interactive soundscapes based on your device's orientation. Tilt your device to change the pitch and explore different musical possibilities.

## Features

*   **Device Orientation Control:** The primary way to interact with the sound is by tilting your device. The pitch of the sound will change based on the device's beta (front-to-back tilt) orientation.
*   **Musical Scales:** Choose from a variety of musical scales (e.g., Major, Minor, Pentatonic, Blues) to snap the generated tones, making it easier to create harmonious sounds. Select 'Off' for no snapping (chromatic control).
*   **Interaction Modes:**
    *   **Short Tap (Initial):** Starts a pulsing preview sound that changes dynamically with device movement.
    *   **Short Tap (While sound is playing):** Adds a new sound layer with a fixed pitch (based on the device orientation at the moment of the tap). Multiple layers can be added.
    *   **Long Press (on the visualizer area):** Toggles a continuous single note that changes pitch with device movement.
    *   **Double Tap (on the visualizer area):** Stops and clears all currently playing sounds.
*   **Waveform Visualization:** A dynamic waveform display visualizes the sound being produced.
*   **Screen Wake Lock:** Keeps the screen active while you're using the app.
*   **Offline Capable:** As a PWA, it can be installed to your device and used even when offline.

## Technologies Used

*   **Tone.js:** Web Audio framework for sound generation and effects.
*   **D3.js:** For data-driven visualization of the waveform.
*   **Tailwind CSS:** For styling the user interface.
*   **HTML/CSS/JavaScript:** Core web technologies.
*   **Progressive Web App (PWA):** Utilizing manifest.json and a Service Worker for installability and offline capabilities.

## How to Use

1.  Open the application in a compatible web browser on a device with orientation sensors (most smartphones and tablets).
2.  Allow any permissions requested (e.g., for device orientation).
3.  Use the dropdown menu at the top-left to select a musical scale or turn scale-snapping off.
4.  Interact with the screen (visualizer area) using taps, long presses, and double taps as described above.
5.  Tilt your device to change the sound's pitch.

Enjoy creating your own unique soundscapes!
