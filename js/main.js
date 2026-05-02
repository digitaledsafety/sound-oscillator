// Global variables for audio instruments, loops, and device orientation
      let instrument = null; // Main oscillator for single continuous note (long press)
      let previewLoop = null; // Tone.Loop for the pulsing preview sound
      let savedLoops = []; // Array to store multiple Tone.Loop instances (fixed tones from subsequent short taps)
      let masterBus = null; // Central gain node for effects routing
      let userVolume = 0.8; // User-defined volume (0.0 to 1.0)
      let delayNode = null; // Feedback delay effect
      let reverbNode = null; // Reverb effect
      let wakeLock = null; // Screen wake lock object
      let beta = 0; // Device orientation values (pitch)
      let gamma = 0; // Device orientation values (panning)
      let panner = null; // Stereo panner for spatial audio
      const maxFrequency = 880; // Maximum frequency for the oscillator/synth (approx A5)

      // --- Scale-related Global Variables and Definitions ---
      let currentScaleConfig = null; // Holds the { rootNote, intervals } for the selected scale

      const availableScales = {
        'Off': { intervals: null }, // No snapping
        'Major': { intervals: [0, 2, 4, 5, 7, 9, 11] },
        'Minor': { intervals: [0, 2, 3, 5, 7, 8, 10] },
        'Pentatonic Major': { intervals: [0, 2, 4, 7, 9] },
        'Blues': { intervals: [0, 3, 5, 6, 7, 10] },
        'Chromatic': { intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
        'Dorian': { intervals: [0, 2, 3, 5, 7, 9, 10] },
        'Lydian': { intervals: [0, 2, 4, 6, 7, 9, 11] },
        'Harmonic Minor': { intervals: [0, 2, 3, 5, 7, 8, 11] },
        'Minor Pentatonic': { intervals: [0, 3, 5, 7, 10] },
        'Phrygian Minor': { intervals: [0, 1, 3, 5, 7, 8, 10] },
        'Mixolydian': { intervals: [0, 2, 4, 5, 7, 9, 10] },
        'Aeolian': { intervals: [0, 2, 3, 5, 7, 8, 10] },
        'Locrian': { intervals: [0, 1, 3, 5, 6, 8, 10] }
      };

      let generatedScaleFrequencies = []; // Cache for frequencies of the current scale

      // D3.js visualization elements
      let waveformSvg = null;
      let xScale = null;
      let yScale = null;

      let waveformAnalyzer = null;
      let spectrumAnalyzer = null;
      const barCount = 64; // Number of bars to display in the visualization

      /**
       * Creates a visual ripple effect at the specified coordinates.
       * @param {number} x - The x-coordinate.
       * @param {number} y - The y-coordinate.
       */
      function createRipple(x, y) {
        if (!waveformSvg) return;

        waveformSvg.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 0)
          .attr("fill", "none")
          .attr("stroke", "#3498db")
          .attr("stroke-width", 2)
          .attr("opacity", 1)
          .transition()
          .duration(1000)
          .ease(d3.easeOutExpo)
          .attr("r", 100)
          .attr("opacity", 0)
          .remove();
      }

      // Global caches for performance
      let svgWidth = window.innerWidth;
      let svgHeight = window.innerHeight;
      let vizModeSelect = null;

      // Long press and double tap variables
      let pressTimer = null;
      const longPressDuration = 500; // milliseconds
      let isLongPress = false;
      let lastTapTime = 0;
      const doubleTapThreshold = 300; // milliseconds

      // Multi-touch tracking
      const activePointers = new Set();
      const pressTimers = new Map();

      // --- Scale-related Functions ---

      /**
       * Generates an array of frequencies for a given scale and octave range.
       * @param {string} rootNote - The root note (e.g., 'C', 'A#').
       * @param {number[]} intervals - Array of semitone intervals from the root.
       * @param {number} minOctave - The minimum octave to generate notes from.
       * @param {number} maxOctave - The maximum octave to generate notes up to.
       * @returns {number[]} Sorted array of frequencies in Hz.
       */
      function generateScaleFrequencies(rootNote, intervals, minOctave = 3, maxOctave = 6) {
        const notes = [];
        // Get the MIDI note for the root of the first octave
        const baseMidi = Tone.Midi(`${rootNote}${minOctave}`).toMidi();

        for (let octave = minOctave; octave <= maxOctave; octave++) {
          for (let interval of intervals) {
            const midiNote = baseMidi + (octave - minOctave) * 12 + interval;
            const freq = Tone.Frequency(midiNote, 'midi').toFrequency();

            // Only add frequencies within a reasonable audible and application range
            if (freq >= 50 && freq <= maxFrequency * 1.5) {
              notes.push(freq);
            }
          }
        }
        // Sort the frequencies to make snapping more efficient
        return notes.sort((a, b) => a - b);
      }

      /**
       * Creates a new FMSynth with the specified waveform and connects it to the master gain.
       * @param {string} [waveform] - The oscillator type. Defaults to the current UI selection.
       * @returns {Tone.FMSynth} The newly created synth.
       */
      function createSynth(waveform) {
        const selectedWaveform = waveform || document.getElementById('waveformSelect').value;
        return new Tone.FMSynth({
          oscillator: { type: selectedWaveform }
        }).connect(masterBus);
      }

      /**
       * Finds the closest frequency in a sorted array of scale frequencies to a given raw frequency.
       * @param {number} rawFreq - The frequency from device orientation.
       * @returns {number} The snapped frequency.
       */
      function getSnappedFrequency(rawFreq) {
        if (generatedScaleFrequencies.length === 0) {
          return rawFreq; // Should not happen if 'Off' is handled correctly
        }

        let closestFreq = generatedScaleFrequencies[0];
        let minDifference = Math.abs(rawFreq - closestFreq);

        for (let i = 1; i < generatedScaleFrequencies.length; i++) {
          const currentFreq = generatedScaleFrequencies[i];
          const difference = Math.abs(rawFreq - currentFreq);
          if (difference < minDifference) {
            minDifference = difference;
            closestFreq = currentFreq;
          }
        }
        return closestFreq;
      }

      // Function to get the normalized frequency based on device beta tilt
      // This function now applies snapping if a scale is selected.
      function getNormalizedValue() {
        // Using raw beta directly as per user-provided original logic
        let rawFreq = ((Math.sin(beta * (Math.PI / 180))) * maxFrequency + maxFrequency) / 2;

        // If a scale is selected (i.e., not 'Off'), snap the frequency
        if (currentScaleConfig && currentScaleConfig.intervals && generatedScaleFrequencies.length > 0) {
          rawFreq = getSnappedFrequency(rawFreq);
        }
        return rawFreq;
      }

      // Function to initialize Tone.js audio context and effects
      async function startSounds() {
        // Idempotency check to prevent redundant audio graph initialization
        if (masterBus) return;

        // Initialize effects bus
        masterBus = new Tone.Gain();

        // Master compressor to prevent audio clipping and normalize volume
        const masterCompressor = new Tone.Compressor({
          threshold: -12,
          ratio: 4,
          attack: 0.01,
          release: 0.25
        });
        // Low-shelf filter to give a slight boost to low frequencies
        const lowBump = new Tone.Filter(200, "lowshelf");

        // Reverb for spatial depth
        reverbNode = new Tone.Reverb({
          decay: parseFloat(document.getElementById('reverbDecaySlider').value),
          wet: parseFloat(document.getElementById('reverbWetSlider').value)
        });
        await reverbNode.ready;

        // Feedback Delay
        delayNode = new Tone.FeedbackDelay({
          delayTime: "8n",
          feedback: 0.3,
          wet: 0.5
        });

        // Stereo Panner for orientation-based spatial audio
        panner = new Tone.Panner(0).toDestination();

        // Chain the effects to the panner: masterBus -> lowBump -> compressor -> delay -> reverb -> panner
        masterBus.chain(lowBump, masterCompressor, delayNode, reverbNode, panner);

        // Initialize waveform analyzer and connect it to Tone.Destination
        waveformAnalyzer = new Tone.Waveform(1024);
        spectrumAnalyzer = new Tone.FFT(1024);
        Tone.Destination.connect(waveformAnalyzer);
        Tone.Destination.connect(spectrumAnalyzer);

        //console.log("Tone.js audio context ready to start on interaction.");
      }

      // Function to stop all active sounds and clear Tone.js transport
      function clearSounds() {
        // Stop and cancel all scheduled events on the Tone.js transport
        Tone.getTransport().stop();
        Tone.getTransport().cancel();
        Tone.getTransport().clear();

        // Stop the continuous instrument if it's active
        if (instrument) {
          instrument.stop();
          instrument.dispose(); // Dispose of the instrument to free up resources
          instrument = null;
        }

        // Stop and dispose of the preview loop and its synth
        if (previewLoop) {
            previewLoop.stop();
            // Dispose of the synth associated with the previewLoop
            if (previewLoop.synth) {
                previewLoop.synth.dispose();
            }
            previewLoop.dispose();
            previewLoop = null;
        }

        // Stop and dispose of all saved loops
        savedLoops.forEach(loop => {
          loop.stop();
          if (loop.synth) {
              loop.synth.dispose();
          }
          loop.dispose(); // Dispose of each loop
        });
        savedLoops = []; // Clear the saved loops array
        //console.log("All sounds cleared.");
        updateMasterVolume(); // Update volume after clearing sounds
      }

      // Function to toggle the continuous single note instrument (for long press)
      function toggleContinuousNote() {
        // Ensure Tone.js context is started on first interaction
        if (Tone.context.state !== 'running') {
          Tone.start();
        }

        if (instrument) {
          // If instrument is active, stop it
          instrument.stop();
          instrument.dispose();
          instrument = null;
          //console.log("Continuous note instrument stopped.");
        } else {
          // If instrument is not active, start it
          const selectedWaveform = document.getElementById('waveformSelect').value;
          instrument = new Tone.Oscillator(getNormalizedValue(), selectedWaveform).connect(masterBus).start();
          //console.log("Continuous note instrument started.");
          // Ensure transport is running if it's not already
          if (Tone.getTransport().state !== 'started') {
              Tone.getTransport().start();
              //console.log("Transport started for continuous note.");
          }
        }
        updateMasterVolume(); // Update volume after toggling continuous note
      }

      // Function to start the dynamic pulsing preview loop (for initial short tap)
      function startPreviewLoop() {
        if (Tone.context.state !== 'running') {
          Tone.start();
        }

        // Ensure no continuous instrument is playing
        if (instrument) {
          instrument.stop();
          instrument.dispose();
          instrument = null;
        }

        // Stop and dispose of any existing preview loop and its synth
        if (previewLoop) {
          previewLoop.stop();
          if (previewLoop.synth) { // Dispose of the synth if it exists
              previewLoop.synth.dispose();
          }
          previewLoop.dispose();
          previewLoop = null;
        }

        // Create the synth for the preview loop locally
        const synth = createSynth();
        previewLoop = new Tone.Loop((time) => {
          // Call getNormalizedValue() directly for each pulse to ensure dynamic update (and snapping if enabled)
          const currentFreq = getNormalizedValue();
          synth.triggerAttackRelease(currentFreq, "8n", time);
          //console.log("Preview Loop: Triggering note at frequency:", currentFreq.toFixed(2));
        }, "4n").start(0);

        // Attach the synth to the loop object for later disposal
        previewLoop.synth = synth;

        if (Tone.getTransport().state !== 'started') {
          Tone.getTransport().start();
          //console.log("Transport started for preview loop.");
        }
        //console.log("Started dynamic pulsing preview loop.");
        updateMasterVolume(); // Update volume after starting preview loop
      }

      // Function to add a fixed loop (tone is saved at time of touch)
      function addFixedLoop() {
        // Ensure Tone.js context is started on first interaction
        if (Tone.context.state !== 'running') {
          Tone.start();
        }

        // Capture the current normalized frequency when the tap occurs (this will be snapped if a scale is active)
        const fixedFrequency = getNormalizedValue(); // Capture the value ONCE here

        // Create a new FM synth for the loop
        const synth = createSynth();

        // Create a new Tone.Loop. The fixedFrequency is now used directly.
        const newLoop = new Tone.Loop((time) => {
          synth.triggerAttackRelease(fixedFrequency, "8n", time); // Use the captured fixedFrequency
        }, "4n").start(0); // Start the loop immediately

        newLoop.synth = synth; // Attach synth for explicit disposal
        savedLoops.push(newLoop); // Add the new loop to the array of saved loops

        // Start the Tone.js transport if it's not already running.
        if (Tone.getTransport().state !== 'started') {
          Tone.getTransport().start();
          //console.log("Transport started.");
        } else {
          //console.log("Transport already started.");
        }
        //console.log(`Added a new fixed loop at frequency: ${fixedFrequency.toFixed(2)} Hz. Total loops: ${savedLoops.length}`);
        updateMasterVolume(); // Update volume after adding a new loop
      }

      /**
       * Adjusts the master volume based on the number of active sound sources to prevent peaking.
       * Uses the user-defined volume and balances it based on the number of active tracks.
       */
      function updateMasterVolume() {
        let activeSoundCount = 0;
        if (instrument) activeSoundCount++;
        if (previewLoop) activeSoundCount++;
        activeSoundCount += savedLoops.length;

        // Total volume balance: userVolume distributed across active sources
        const totalGain = userVolume / Math.max(1, activeSoundCount);

        if (masterBus) {
          masterBus.gain.rampTo(totalGain, 0.1);
        }

        // Keep Tone.Destination at 0dB (unity) unless we need a global mute
        Tone.Destination.volume.rampTo(0, 0.1);

        //console.log(`Active: ${activeSoundCount}. Total Gain: ${totalGain.toFixed(2)}`);
      }


      // Function to request a screen wake lock
      // This prevents the screen from dimming or turning off while the app is in use.
      async function requestWakeLock() {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          //console.log('Wake Lock acquired');

          // Add a listener for the release event
          wakeLock.addEventListener('release', () => {
            //console.log('Wake Lock released');
            wakeLock = null;
          });
        } catch (err) {
          // Handle errors, e.g., if the user denies permission
          console.error('Error acquiring wake lock:', err);
        }
      }

      // D3.js color scale for the bars (from blue to red based on amplitude)
      const colorScale = d3.scaleLinear()
                           .domain([0, 0.5, 1]) // Amplitude range
                           .range(["#3498db", "#f1c40f", "#e74c3c"]); // Blue, Yellow, Red

      // Function to update the D3.js visualization
      function updateVisualization() {
        if (!waveformAnalyzer || !waveformSvg) {
          requestAnimationFrame(updateVisualization);
          return;
        }

        const mode = vizModeSelect ? vizModeSelect.value : 'waveform';
        let dataArray;

        if (mode === 'spectrum' && spectrumAnalyzer) {
          dataArray = spectrumAnalyzer.getValue();
        } else {
          dataArray = waveformAnalyzer.getValue();
        }

        const minBarHeight = svgHeight * 0.01;
        const samplesPerBar = Math.floor(dataArray.length / barCount);
        const barWidth = svgWidth / barCount;

        const barData = [];
        const visualGain = mode === 'spectrum' ? 1.0 : 2.0;

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < samplesPerBar; j++) {
            let val = dataArray[i * samplesPerBar + j];
            if (mode === 'spectrum') {
              // FFT values are in dB, map them to 0-1 range
              val = (val + 100) / 100;
            }
            sum += Math.min(1.0, Math.abs(val) * visualGain);
          }
          barData.push(sum / samplesPerBar);
        }

        waveformSvg.selectAll(".bar")
          .data(barData)
          .join("rect")
          .attr("class", "bar")
          .attr("x", (d, i) => i * barWidth + (barWidth * 0.1))
          .attr("width", barWidth * 0.8)
          .attr("y", d => svgHeight - Math.max(minBarHeight, d * svgHeight))
          .attr("height", d => Math.max(minBarHeight, d * svgHeight))
          .attr("fill", d => colorScale(d));

        const freq = getNormalizedValue();
        const display = document.getElementById('frequencyDisplay');
        if (display) {
          const note = Tone.Frequency(freq).toNote();
          display.textContent = `${freq.toFixed(2)} Hz (${note})`;
        }

        requestAnimationFrame(updateVisualization);
      }

      // Handle SVG resizing
      function resizeSvg() {
        if (waveformSvg) {
          svgWidth = window.innerWidth;
          svgHeight = window.innerHeight;

          waveformSvg.attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
                     .attr("width", svgWidth)
                     .attr("height", svgHeight);

          if (xScale) xScale.range([0, svgWidth]);
          if (yScale) yScale.range([svgHeight, 0]);
        }
      }

      // Main script execution when the DOM is fully loaded
      document.addEventListener('DOMContentLoaded', () => {
        const rootNoteSelect = document.getElementById('rootNoteSelect');
        const scaleSelect = document.getElementById('scaleSelect');
        const waveformSelect = document.getElementById('waveformSelect');
        const volumeSlider = document.getElementById('volumeSlider');
        const delaySlider = document.getElementById('delaySlider');
        const reverbWetSlider = document.getElementById('reverbWetSlider');
        const reverbDecaySlider = document.getElementById('reverbDecaySlider');
        vizModeSelect = document.getElementById('vizModeSelect');
        const clearAllBtn = document.getElementById('clearAllBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');

        // Select the SVG element using D3
        waveformSvg = d3.select("#waveformSvg");

        // Get initial dimensions for scales (used for initial setup, then updated by resizeSvg)
        const initialWidth = window.innerWidth;
        const initialHeight = window.innerHeight;

        // Initialize D3 scales (domain based on waveformAnalyzer size, range based on SVG dimensions)
        xScale = d3.scaleLinear()
          .domain([0, barCount - 1]) // Domain based on number of bars
          .range([0, initialWidth]);

        yScale = d3.scaleLinear()
          .domain([0, 1]) // Bar data (average amplitude) ranges from 0 to 1
          .range([initialHeight, 0]); // Invert y-axis for SVG (0 at top)

        // Initial SVG resize and add resize listener
        resizeSvg();
        window.addEventListener('resize', resizeSvg);

        // Populate scale dropdown
        for (const scaleName in availableScales) {
          const option = document.createElement('option');
          option.value = scaleName;
          option.textContent = scaleName;
          scaleSelect.appendChild(option);
        }
        scaleSelect.value = 'Off'; // Set default to 'Off'

        // --- Event Listener for Scale Controls ---
        function showSettings() {
            settingsModal.style.display = "flex";
        }

        function hideSettings() {
            settingsModal.style.display = "none";
        }

        function updateScaleSettings() {
            const selectedScaleName = scaleSelect.value;
            const selectedRootNote = rootNoteSelect.value;
            currentScaleConfig = availableScales[selectedScaleName];

            if (currentScaleConfig && currentScaleConfig.intervals) {
                generatedScaleFrequencies = generateScaleFrequencies(selectedRootNote, currentScaleConfig.intervals);
                rootNoteSelect.disabled = false;
            } else {
                generatedScaleFrequencies = []; // No snapping
                rootNoteSelect.disabled = true;
            }
            clearSounds(); // Reset all sounds when scale changes
        }

        scaleSelect.addEventListener('change', updateScaleSettings);
        rootNoteSelect.addEventListener('change', updateScaleSettings);
        waveformSelect.addEventListener('change', () => clearSounds()); // Reset sounds when waveform changes
        volumeSlider.addEventListener('input', (e) => {
            userVolume = parseFloat(e.target.value);
            updateMasterVolume();
        });
        delaySlider.addEventListener('input', (e) => {
          if (delayNode) {
            delayNode.feedback.rampTo(parseFloat(e.target.value), 0.1);
          }
        });
        reverbWetSlider.addEventListener('input', (e) => {
          if (reverbNode) {
            reverbNode.wet.rampTo(parseFloat(e.target.value), 0.1);
          }
        });
        reverbDecaySlider.addEventListener('change', (e) => {
          if (reverbNode) {
            reverbNode.decay = parseFloat(e.target.value);
          }
        });
        clearAllBtn.addEventListener('click', () => clearSounds());
        closeSettingsBtn.addEventListener('click', hideSettings);
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) hideSettings();
        });

        // Initial setup of scale frequencies (for 'Off' default)
        updateScaleSettings();

        // Centralized device orientation listener
        window.addEventListener("deviceorientation", (event) => {
          beta = event.beta !== null ? event.beta.valueOf() : beta;
          gamma = event.gamma !== null ? event.gamma.valueOf() : gamma;

          // Update Beta/Gamma display
          const betaDisplay = document.getElementById('betaDisplay');
          if (betaDisplay) {
              betaDisplay.textContent = `Beta: ${beta.toFixed(1)}°`;
          }
          const gammaDisplay = document.getElementById('gammaDisplay');
          if (gammaDisplay) {
              gammaDisplay.textContent = `Gamma: ${gamma.toFixed(1)}°`;
          }

          const freq = getNormalizedValue();
          // If the continuous instrument is active, update its frequency in real-time
          if (instrument) {
            instrument.frequency.rampTo(freq, 0.05); // Smooth frequency transition
          }

          // Update panner based on gamma (left/right tilt)
          if (panner) {
            // Map gamma (-90 to 90) to panner pan (-1 to 1)
            const panValue = Math.max(-1, Math.min(1, gamma / 90));
            panner.pan.rampTo(panValue, 0.1);
          }
        }, true);

        // Handle start button click for initial interaction requirements
        const startButton = document.getElementById('startButton');
        const startOverlay = document.getElementById('startOverlay');

        startButton.addEventListener('click', async () => {
          // Start Tone.js AudioContext
          await Tone.start();

          // Request DeviceOrientation permissions for iOS
          if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
              await DeviceOrientationEvent.requestPermission();
            } catch (err) {
              console.error('Error requesting orientation permission:', err);
            }
          }

          // Hide overlay and re-acquire wake lock
          startOverlay.style.display = 'none';
          requestWakeLock();
          //console.log("Audio context started and orientation permission requested.");
        });

        // Event listeners for tap (click) and long press on the SVG visualizer
        waveformSvg.on("pointerdown", function(event) {
          activePointers.add(event.pointerId);

          // Create visual feedback
          const [x, y] = d3.pointer(event);
          createRipple(x, y);

          const timer = setTimeout(() => {
            isLongPress = true;
            if (activePointers.size === 2) {
              showSettings();
            } else if (activePointers.size === 1) {
              toggleContinuousNote();
            }
          }, longPressDuration);

          pressTimers.set(event.pointerId, timer);
        });

        waveformSvg.on("pointerup pointercancel", function(event) {
          const timer = pressTimers.get(event.pointerId);
          if (timer) {
            clearTimeout(timer);
            pressTimers.delete(event.pointerId);
          }

          activePointers.delete(event.pointerId);

          if (isLongPress) {
            if (activePointers.size === 0) isLongPress = false;
            return;
          }

          if (event.type === "pointerup") {
            const currentTime = performance.now();
            if (currentTime - lastTapTime < doubleTapThreshold) {
              clearSounds();
              lastTapTime = 0;
            } else {
              if (instrument || previewLoop || savedLoops.length > 0) {
                addFixedLoop();
              } else {
                startPreviewLoop();
              }
              lastTapTime = currentTime;
            }
          }
          event.preventDefault();
        });

        // Register the service worker
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
              .then(registration => {
                //console.log('ServiceWorker registered');
              })
              .catch(registrationError => {
                console.error('ServiceWorker registration failed:', registrationError);
              });
          });
        }

        // Call the function to request the wake lock
        requestWakeLock();
        // Re-acquire wake lock when the page becomes visible again
        document.addEventListener('visibilitychange', async () => {
          if (wakeLock !== null && document.visibilityState === 'visible') {
            await requestWakeLock();
          }
        });

        startSounds(); // Prepare Tone.js, but don't start audio context yet
        resizeSvg(); // Ensure initial dimensions are cached
        updateVisualization(); // Start the D3 visualization loop
        updateMasterVolume(); // Initial volume update on load

        // Keyboard shortcuts
        window.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === "m") {
                showSettings();
            } else if (e.key === "Escape") {
                hideSettings();
            }
        });
      });
