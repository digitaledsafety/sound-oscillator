// Global variables for audio instruments, loops, and device orientation
      let instrument = null; // Main oscillator for single continuous note (long press)
      let previewLoop = null; // Tone.Loop for the pulsing preview sound
      let savedLoops = []; // Array to store multiple Tone.Loop instances (fixed tones from subsequent short taps)
      let wakeLock = null; // Screen wake lock object
      let beta = 0; // Device orientation values (pitch)
      const maxFrequency = 880; // Maximum frequency for the oscillator/synth (approx A5)

      // --- Scale-related Global Variables and Definitions ---
      let currentScaleConfig = null; // Holds the { rootNote, intervals } for the selected scale

      const availableScales = {
        'Off': { rootNote: null, intervals: null }, // No snapping
        'C Major': { rootNote: 'C', intervals: [0, 2, 4, 5, 7, 9, 11] },
        'A Minor': { rootNote: 'A', intervals: [0, 2, 3, 5, 7, 8, 10] },
        'C Pentatonic Major': { rootNote: 'C', intervals: [0, 2, 4, 7, 9] },
        'A Blues': { rootNote: 'A', intervals: [0, 3, 5, 6, 7, 10] },
        'Chromatic': { rootNote: 'C', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
        'C Dorian': { rootNote: 'C', intervals: [0, 2, 3, 5, 7, 9, 10] },
        'C Lydian': { rootNote: 'C', intervals: [0, 2, 4, 6, 7, 9, 11] },
        'C Harmonic Minor': { rootNote: 'C', intervals: [0, 2, 3, 5, 7, 8, 11] },
        'F Minor': { rootNote: 'F', intervals: [0, 2, 3, 5, 7, 8, 10] },
        'C Minor Pentatonic': { rootNote: 'C', intervals: [0, 3, 5, 7, 10] }, // Added C Minor Pentatonic
        'G Minor Pentatonic': { rootNote: 'G', intervals: [0, 3, 5, 7, 10] }, // Added G Minor Pentatonic
        'Dorian Minor': { rootNote: 'D', intervals: [0, 2, 3, 5, 7, 9, 10] }, // Added Dorian Minor (same as Dorian, but explicit name)
        'Phrygian Minor': { rootNote: 'E', intervals: [0, 1, 3, 5, 7, 8, 10] } // Added Phrygian Minor
      };

      let generatedScaleFrequencies = []; // Cache for frequencies of the current scale

      // D3.js visualization elements
      let waveformSvg = null;
      let xScale = null;
      let yScale = null;

      let waveformAnalyzer = null;
      const barCount = 64; // Number of bars to display in the visualization
      // Removed minBarHeight global variable, now calculated dynamically

      // Long press and double tap variables
      let pressTimer = null;
      const longPressDuration = 500; // milliseconds
      let isLongPress = false;
      let lastTapTime = 0;
      const doubleTapThreshold = 300; // milliseconds

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
      function startSounds() {
        // Master compressor to prevent audio clipping and normalize volume
        const masterCompressor = new Tone.Compressor({
          "threshold": 0,
          "ratio": 1,
          "attack": 0.5,
          "release": 0.1
        });
        // Low-shelf filter to give a slight boost to low frequencies
        const lowBump = new Tone.Filter(200, "lowshelf");

        // Chain the effects to the master output
        Tone.Master.chain(lowBump, masterCompressor);

        // Initialize waveform analyzer and connect it to Tone.Master
        waveformAnalyzer = new Tone.Waveform(1024); // 1024 samples for the waveform
        Tone.Master.connect(waveformAnalyzer); // Connect master output to analyzer

        console.log("Tone.js audio context ready to start on interaction.");
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
        console.log("All sounds cleared.");
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
          console.log("Continuous note instrument stopped.");
        } else {
          // If instrument is not active, start it
          instrument = new Tone.Oscillator(getNormalizedValue(), "sine").toMaster().start();
          console.log("Continuous note instrument started.");
          // Ensure transport is running if it's not already
          if (Tone.getTransport().state !== 'started') {
              Tone.getTransport().start();
              console.log("Transport started for continuous note.");
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
          previewLoop = null;
        }

        // Create the synth for the preview loop locally
        const synth = new Tone.FMSynth().toMaster();
        previewLoop = new Tone.Loop((time) => {
          // Call getNormalizedValue() directly for each pulse to ensure dynamic update (and snapping if enabled)
          const currentFreq = getNormalizedValue();
          synth.triggerAttackRelease(currentFreq, "8n", time);
          console.log("Preview Loop: Triggering note at frequency:", currentFreq.toFixed(2));
        }, "4n").start(0);

        // Attach the synth to the loop object for later disposal
        previewLoop.synth = synth;

        if (Tone.getTransport().state !== 'started') {
          Tone.getTransport().start();
          console.log("Transport started for preview loop.");
        }
        console.log("Started dynamic pulsing preview loop.");
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
        const synth = new Tone.FMSynth().toMaster();

        // Create a new Tone.Loop. The fixedFrequency is now used directly.
        const newLoop = new Tone.Loop((time) => {
          synth.triggerAttackRelease(fixedFrequency, "8n", time); // Use the captured fixedFrequency
        }, "4n").start(0); // Start the loop immediately

        newLoop.synth = synth; // Attach synth for explicit disposal
        savedLoops.push(newLoop); // Add the new loop to the array of saved loops

        // Start the Tone.js transport if it's not already running.
        if (Tone.getTransport().state !== 'started') {
          Tone.getTransport().start();
          console.log("Transport started.");
        } else {
          console.log("Transport already started.");
        }
        console.log(`Added a new fixed loop at frequency: ${fixedFrequency.toFixed(2)} Hz. Total loops: ${savedLoops.length}`);
        updateMasterVolume(); // Update volume after adding a new loop
      }

      /**
       * Adjusts the master volume based on the number of active sound sources to prevent peaking.
       * Uses a logarithmic reduction (inverse of linear gain) for each additional track.
       */
      function updateMasterVolume() {
          let activeSoundCount = 0;
          if (instrument) activeSoundCount++;
          if (previewLoop) activeSoundCount++;
          activeSoundCount += savedLoops.length;

          let targetVolumeDb = 0; // Default to 0dB (unity gain)

          if (activeSoundCount > 1) {
              // Calculate linear gain as 1 divided by the number of active sources
              // A typical approach for multiple simultaneous sources is to sum their powers (amplitude squared)
              // and ensure total power doesn't exceed 1, which for N identical sources means each should be 1/sqrt(N).
              // However, a simple 1/N for gain often works well enough perceptually for volume reduction.
              // For decibels, 20 * log10(gain). Here, for N sources, gain = 1/N. So 20 * log10(1/N) = -20 * log10(N).
              targetVolumeDb = -20 * Math.log10(activeSoundCount);
          }

          // Ensure volume doesn't go too low or produce errors with log of 0
          if (activeSoundCount === 0) targetVolumeDb = -Infinity; // Mute if no sounds
          else if (targetVolumeDb < -40) targetVolumeDb = -40; // Cap lowest volume to avoid silent tracks

          // Apply a smooth ramp to the volume change to avoid clicks/pops
          Tone.Master.volume.rampTo(targetVolumeDb, 0.1); // 0.1 seconds ramp
          console.log(`Active sounds: ${activeSoundCount}. Master volume set to: ${targetVolumeDb.toFixed(2)} dB`);
      }


      // Function to request a screen wake lock
      // This prevents the screen from dimming or turning off while the app is in use.
      async function requestWakeLock() {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Wake Lock acquired');

          // Add a listener for the release event
          wakeLock.addEventListener('release', () => {
            console.log('Wake Lock released');
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

      // Function to update the D3.js bar graph visualization
      function updateWaveformVisualization() {
        if (!waveformAnalyzer || !waveformSvg) {
          requestAnimationFrame(updateWaveformVisualization);
          return;
        }

        // Get the waveform data from the analyzer
        const waveformArray = waveformAnalyzer.getValue();

        // Get current SVG dimensions
        const svgWidth = waveformSvg.node().clientWidth;
        const svgHeight = waveformSvg.node().clientHeight;

        // Dynamic minimum bar height based on SVG height
        const minBarHeight = svgHeight * 0.01; // 1% of SVG height

        // Calculate samples per bar and bar width
        const samplesPerBar = Math.floor(waveformArray.length / barCount);
        const barWidth = svgWidth / barCount;

        // Prepare data for bars (average amplitude for each segment)
        const barData = [];
        const visualGain = 2.0; // Factor to visually amplify low signals
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < samplesPerBar; j++) {
            // Apply visualGain here to amplify for visualization, and clamp to 1.0
            sum += Math.min(1.0, Math.abs(waveformArray[i * samplesPerBar + j]) * visualGain);
          }
          barData.push(sum / samplesPerBar); // Average amplitude for the bar
        }

        // D3 update pattern for rectangles
        const bars = waveformSvg.selectAll(".bar") // Select by class now
          .data(barData);

        // Enter new bars
        bars.enter().append("rect")
          .attr("class", "bar") // Assign class for styling
          .attr("x", (d, i) => i * barWidth)
          .attr("width", barWidth * 0.8) // Slightly smaller width for gaps
          .merge(bars) // Merge enter and update selections
          .transition() // Add transition for smooth changes
          .duration(50) // Short duration for quick updates
          .attr("x", (d, i) => i * barWidth + (barWidth * 0.1)) // Adjust x for centering with gap
          // Ensure bars have a minimum height and are positioned from the bottom
          .attr("y", d => svgHeight - Math.max(minBarHeight, d * svgHeight))
          .attr("height", d => Math.max(minBarHeight, d * svgHeight))
          .attr("fill", d => colorScale(d)); // 'd' is the amplitude value for each bar
        // Exit old bars
        bars.exit().remove();

        // Request the next frame
        requestAnimationFrame(updateWaveformVisualization);
      }

      // Handle SVG resizing
      function resizeSvg() {
        if (waveformSvg) {
          const svgElement = waveformSvg.node();
          const width = window.innerWidth; // Use window dimensions for full screen
          const height = window.innerHeight;

          // Update SVG viewbox to match new dimensions
          waveformSvg.attr("viewBox", `0 0 ${width} ${height}`)
                     .attr("width", width)
                     .attr("height", height);

          // Update D3 scales ranges (though not directly used for bars, good practice)
          xScale.range([0, width]);
          yScale.range([height, 0]);
        }
      }

      // Main script execution when the DOM is fully loaded
      document.addEventListener('DOMContentLoaded', () => {
        // Removed the betaDisplay element as it's no longer in the HTML
        // const betaDisplay = document.getElementById('beta-display');
        const scaleSelect = document.getElementById('scaleSelect');

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
        function updateScaleSettings() {
            const selectedScaleName = scaleSelect.value;
            currentScaleConfig = availableScales[selectedScaleName];

            if (currentScaleConfig && currentScaleConfig.rootNote && currentScaleConfig.intervals) {
                generatedScaleFrequencies = generateScaleFrequencies(currentScaleConfig.rootNote, currentScaleConfig.intervals);
                console.log(`Scale updated to: ${selectedScaleName}. Generated ${generatedScaleFrequencies.length} frequencies.`);
            } else {
                generatedScaleFrequencies = []; // No snapping
                console.log("Snapping Off.");
            }
            clearSounds(); // Reset all sounds when scale changes
        }

        scaleSelect.addEventListener('change', updateScaleSettings);

        // Initial setup of scale frequencies (for 'Off' default)
        updateScaleSettings();

        // Centralized device orientation listener
        window.addEventListener("deviceorientation", (event) => {
          beta = event.beta !== null ? event.beta.valueOf() : beta;

          // Removed the line that updates betaDisplay.textContent
          // betaDisplay.textContent = `Beta: ${beta.toFixed(2)}`;

          // Log live frequency (raw or snapped) if active for debugging
          if (previewLoop || instrument) {
              const currentOutputFreq = getNormalizedValue(); // Will be snapped if a scale is active
              console.log("Live Output Freq (dynamic):", currentOutputFreq.toFixed(2));
          }


          // If the continuous instrument is active, update its frequency in real-time
          if (instrument) {
            instrument.frequency.value = getNormalizedValue(); // This will be snapped if a scale is active
          }
          // The previewLoop's frequency is updated directly in its callback, so no need to update here.
        }, true);

        // Event listeners for tap (click) and long press on the SVG visualizer
        waveformSvg.on("mousedown touchstart", async function() {
          // Ensure Tone.js context is started on first interaction
          if (Tone.context.state !== 'running') {
            try {
              await Tone.start();
              console.log("Tone.js audio context started by user interaction.");
              // Explicitly resume context if it's not running after Tone.start()
              if (Tone.context.state !== 'running') {
                await Tone.context.resume();
                console.log("Tone.js audio context resumed by user interaction.");
              }
            } catch (e) {
              console.error("Error starting/resuming Tone.js context:", e);
            }
          }

          isLongPress = false;
          pressTimer = setTimeout(() => {
            isLongPress = true;
            toggleContinuousNote(); // Long press toggles continuous note
          }, longPressDuration);
        });

        waveformSvg.on("mouseup touchend", function(event) {
          clearTimeout(pressTimer); // Clear long press timer
          if (isLongPress) {
              isLongPress = false; // Reset long press flag
              return; // Long press already handled
          }

          const currentTime = Tone.now() * 1000; // Convert Tone.now() seconds to milliseconds
          if (currentTime - lastTapTime < doubleTapThreshold) {
              // This is a double tap
              clearSounds();
              console.log("Double tap detected: All sounds stopped.");
              lastTapTime = 0; // Reset to prevent triple taps from being double taps
          } else {
              // This is a single tap (or the first tap of a potential double tap)
              // If continuous tone is playing, a short tap adds a fixed loop.
              // If preview loop is playing, a short tap adds a fixed loop.
              // If neither continuous nor preview are playing, but saved loops exist, a short tap starts preview.
              // If absolutely nothing is playing, a short tap starts preview.
              if (instrument || previewLoop || savedLoops.length > 0) { // If any sound is currently active
                  addFixedLoop(); // Add a fixed loop, allowing existing sounds to continue
              } else {
                  startPreviewLoop(); // Otherwise, start the dynamic preview loop
              }
              lastTapTime = currentTime;
          }
          event.preventDefault(); // Prevent default browser behavior (e.g., zooming on double tap)
        });

        // Register the service worker
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
              .then(registration => {
                console.log('ServiceWorker registered: ', registration);
              })
              .catch(registrationError => {
                console.log('ServiceWorker registration failed: ', registrationError);
              });
          });
        }

        // Call the function to request the wake lock
        requestWakeLock();
        startSounds(); // Prepare Tone.js, but don't start audio context yet
        updateWaveformVisualization(); // Start the D3 visualization loop
        updateMasterVolume(); // Initial volume update on load
      });
