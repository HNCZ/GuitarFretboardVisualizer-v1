/**
 * Guitar Fretboard Visualizer
 * 
 * A interactive web application for visualizing guitar fretboard layouts.
 * Displays notes, scales, intervals, and fret markers with customizable themes.
 * Supports multiple scales (chromatic, major, minor, pentatonic), root notes,
 * label types (intervals or note names), and export functionality.
 * 
 * Features:
 * - Dynamic fretboard rendering with configurable fret range
 * - Scale and root note selection
 * - Interactive note selection
 * - Theme switching (wood/clear)
 * - PNG export capability
 * - Roman numeral fret indicators - up
 * - Arabic numeral fret indicators - down
 */


const CONFIG = {
    // Chromatic scale: all 12 semitones
    notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    // Standard guitar tuning in semitone indices (E A D G B E)
    tuning: [4, 11, 7, 2, 9, 4],
    // String names from high to low
    tuningNames: ['e', 'B', 'G', 'D', 'A', 'E'],
    // Scale degree patterns (intervals from root note)
    scales: {
        chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        major: [0, 2, 4, 5, 7, 9, 11],
        minor: [0, 2, 3, 5, 7, 8, 10],
        majorPentatonic: [0, 2, 4, 7, 9],
        minorPentatonic: [0, 3, 5, 7, 10]
    },
    // Interval names for display
    intervals: ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'],
    // Fret numbers with inlay markers
    markers: [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
};

// State object to hold the current configuration of the fretboard visualizer
let state = {
    fretCount: 12, // Number of frets to display
    startFret: 0, // Starting fret number
    rootNote: 'E', // Root note for the scale
    scaleType: 'chromatic', // Type of scale being used
    labelType: 'interval', // Type of label to display (interval or note name)
    theme: 'wood', // Current theme of the visualizer
    selectedNotes: new Set() // Set to keep track of selected notes
};

// Elements object to reference DOM elements for rendering
const elements = {
    fretboard: document.getElementById('fretboard'), // Main fretboard element
    layers: {
        frets: document.getElementById('layer-frets'), // Layer for frets
        strings: document.getElementById('layer-strings'), // Layer for strings
        notes: document.getElementById('layer-notes'), // Layer for notes
        roman: document.getElementById('roman-indicators'), // Layer for Roman numeral indicators
        stringNames: document.getElementById('string-names') // Layer for string names
    },
    inputs: {
        fretCount: document.getElementById('fret-count'), // Input for number of frets
        startFret: document.getElementById('start-fret'), // Input for starting fret
        rootNote: document.getElementById('root-note'), // Input for root note
        scaleType: document.getElementById('scale-type'), // Input for scale type
        labelType: document.getElementById('label-type'), // Input for label type
        themeType: document.getElementById('theme-type'), // Input for theme type
        themeToggle: document.getElementById('theme-toggle') // Toggle for theme
    }
};

/**
 * Converts a number to its Roman numeral representation.
 * @param {number} num - The number to convert.
 * @returns {string} - The Roman numeral representation of the number.
 */
function toRoman(num) {
    if (num <= 0) return ''; // Return an empty string for non-positive numbers
    const map = { X: 10, IX: 9, V: 5, IV: 4, I: 1 }; // Mapping of Roman numerals to their values
    let roman = '', n = num; // Initialize the result string and a variable to hold the number
    for (let i in map) { // Iterate over the mapping
        while (n >= map[i]) { // While the number is greater than or equal to the value
            roman += i; // Append the Roman numeral to the result
            n -= map[i]; // Decrease the number by the value
        }
    }
    return roman; // Return the final Roman numeral string
}

/**
 * Retrieves information about the note at a specific string and fret.
 * @param {number} stringIndex - The index of the guitar string (0-5).
 * @param {number} fret - The fret number (0 for open string).
 * @returns {Object} - An object containing the note name, interval name, 
 *                     whether it's the root note, and if it's in the current scale.
 */
function getNoteInfo(stringIndex, fret) {
    const rootIdx = CONFIG.notes.indexOf(state.rootNote); // Get the index of the root note
    const openNoteIdx = CONFIG.tuning[stringIndex]; // Get the index of the open string note
    const currentNoteIdx = (openNoteIdx + fret) % 12; // Calculate the current note index
    const diff = (currentNoteIdx - rootIdx + 12) % 12; // Calculate the difference from the root note
    return {
        noteName: CONFIG.notes[currentNoteIdx], // Get the note name
        intervalName: CONFIG.intervals[diff], // Get the interval name
        isRoot: diff === 0, // Check if the note is the root note
        inScale: CONFIG.scales[state.scaleType].includes(diff) // Check if the note is in the current scale
    };
}

function renderStringNames() {
    elements.layers.stringNames.innerHTML = ''; // Clear existing string names
    CONFIG.tuningNames.forEach(name => { // Iterate over each string name in the tuning configuration
        const el = document.createElement('div'); // Create a new div element for the string name
        el.className = 'string-name'; // Assign a class for styling
        el.innerText = name; // Set the text content to the string name
        elements.layers.stringNames.appendChild(el); // Append the string name element to the string names layer
    });
}

function renderRoman() {
    elements.layers.roman.innerHTML = ''; // Clear existing Roman numeral indicators
    elements.layers.roman.style.gridTemplateColumns = `repeat(${state.fretCount}, 1fr)`; // Set the grid layout for Roman numerals
    for (let i = 0; i < state.fretCount; i++) { // Iterate over the number of frets
        const fretNum = state.startFret + i + 1; // Calculate the current fret number
        const el = document.createElement('div'); // Create a new div element for the Roman numeral
        el.className = 'roman-label'; // Assign a class for styling
        if (CONFIG.markers.includes(fretNum)) { // Check if the current fret number is a marker
            el.innerText = toRoman(fretNum); // Convert the fret number to Roman numeral and set as text
        }
        elements.layers.roman.appendChild(el); // Append the Roman numeral element to the Roman indicators layer
    }
}

/**
 * Renders the fret markers and numbers on the fretboard.
 * Creates fret elements with numbers and inlay dot markers at specified frets.
 */
function renderFrets() {
    elements.layers.frets.innerHTML = ''; // Clear existing frets
    elements.layers.frets.style.gridTemplateColumns = `repeat(${state.fretCount}, 1fr)`; // Set grid layout based on fret count
    
    for (let i = 0; i < state.fretCount; i++) {
        const fretNum = state.startFret + i + 1; // Calculate the actual fret number
        const fretEl = document.createElement('div'); // Create a fret container element
        fretEl.className = 'fret'; // Assign fret styling class
        
        const numEl = document.createElement('span'); // Create element for fret number display
        numEl.className = 'fret-number'; // Assign fret number styling class
        numEl.innerText = fretNum; // Set the fret number text
        fretEl.appendChild(numEl); // Add fret number to fret element
        
        // Add inlay markers at specified frets
        if (CONFIG.markers.includes(fretNum)) {
            if (fretNum % 12 === 0) {
                // Double dots for the 12th fret (octave marker)
                const dotT = document.createElement('div');
                dotT.className = 'marker-dot double-dot-top'; // Top dot of pair
                const dotB = document.createElement('div');
                dotB.className = 'marker-dot double-dot-bottom'; // Bottom dot of pair
                fretEl.appendChild(dotT);
                fretEl.appendChild(dotB);
            } else {
                // Single dot for other marker frets
                const dot = document.createElement('div');
                dot.className = 'marker-dot'; // Assign marker dot styling class
                fretEl.appendChild(dot); // Add dot to fret element
            }
        }
        
        elements.layers.frets.appendChild(fretEl); // Add completed fret element to the frets layer
    }
}

/**
 * Renders the guitar strings on the fretboard.
 * Creates a string element for each string in the guitar tuning configuration.
 */
function renderStrings() {
    elements.layers.strings.innerHTML = ''; // Clear existing strings
    CONFIG.tuningNames.forEach(name => { // Iterate over each string name in the tuning configuration
        const str = document.createElement('div'); // Create a new div element for the string
        str.className = 'string'; // Assign a class for styling
        str.id = name; // Set the element ID to the string name for reference
        elements.layers.strings.appendChild(str); // Append the string element to the strings layer
    });
}

/**
 * Renders the note markers on the fretboard.
 * Creates interactive note spots for each string and fret position.
 * Displays interval names or note names based on labelType setting.
 * Only shows notes that are in the current scale.
 */
function renderNotes() {
    elements.layers.notes.innerHTML = ''; // Clear existing note markers
    elements.layers.notes.style.gridTemplateColumns = `repeat(${state.fretCount}, 1fr)`; // Set grid layout based on fret count
    
    // Iterate over all strings (6 strings on guitar)
    for (let s = 0; s < 6; s++) {
        // Iterate over all frets in the current view
        for (let f = 0; f < state.fretCount; f++) {
            const actualFret = state.startFret + f + 1; // Calculate the actual fret number
            const noteData = getNoteInfo(s, actualFret); // Get note information for this position
            const id = `${s}-${actualFret}`; // Create unique identifier for this note spot
            
            // Create container for the note spot
            const spot = document.createElement('div');
            spot.className = 'note-spot';
            
            // Create the visible note marker element
            const marker = document.createElement('div');
            marker.className = 'note-marker';
            
            // Only render notes that exist in the current scale
            if (noteData.inScale) {
                // Display interval name or note name based on labelType setting
                marker.innerText = (state.labelType === 'interval') ? noteData.intervalName : noteData.noteName;
                
                // Highlight root notes with special styling
                if (noteData.isRoot) marker.classList.add('root');
                
                // Apply active styling if this note has been selected
                if (state.selectedNotes.has(id)) marker.classList.add('active');
            }
            
            // Add click handler for note selection/deselection
            spot.onclick = () => {
                if (state.selectedNotes.has(id)) {
                    state.selectedNotes.delete(id); // Deselect if already selected
                } else {
                    state.selectedNotes.add(id); // Select if not already selected
                }
                renderNotes(); // Re-render to update visual states
            };
            
            spot.appendChild(marker); // Add marker to spot container
            elements.layers.notes.appendChild(spot); // Add spot to notes layer
        }
    }
}

/**
 * Updates the fretboard theme by applying the appropriate CSS class.
 * Also syncs the theme dropdown input to reflect the current theme state.
 */
function updateTheme() {
    // Apply the current theme as a CSS class to the fretboard element (e.g., 'theme-wood' or 'theme-clear')
    elements.fretboard.className = `fretboard theme-${state.theme}`;
    
    // Sync the theme dropdown input value to match the current theme state
    elements.inputs.themeType.value = state.theme;
}

/**
 * Updates all visual elements of the fretboard.
 * This is the main rendering function called whenever the fretboard configuration changes.
 * It orchestrates all individual render functions to keep the display in sync with the current state.
 */
function updateAll() {
    updateTheme(); // Apply the current theme styling to the fretboard
    renderStringNames(); // Render the string name labels (e, B, G, D, A, E)
    renderRoman(); // Render Roman numeral fret indicators
    renderFrets(); // Render fret markers and numbers
    renderStrings(); // Render the guitar strings
    renderNotes(); // Render note markers and labels on the fretboard
    handleColorChange(); // Render picked custom root note and notes color 
}


/**
 * Event listeners
 */

// Handle fret count changes - requires full re-render of fretboard layout
elements.inputs.fretCount.onchange = (e) => { 
    state.fretCount = parseInt(e.target.value); 
    updateAll(); 
};

// Handle start fret changes - requires full re-render of fretboard layout
elements.inputs.startFret.onchange = (e) => { 
    state.startFret = parseInt(e.target.value); 
    updateAll(); 
};

// Handle root note changes - only notes need re-rendering since layout stays same
elements.inputs.rootNote.onchange = (e) => { 
    state.rootNote = e.target.value; 
    renderNotes(); 
};

// Handle scale type changes - only notes need re-rendering since layout stays same
elements.inputs.scaleType.onchange = (e) => { 
    state.scaleType = e.target.value; 
    renderNotes(); 
};

// Handle label type changes - only notes need re-rendering to update displayed text
elements.inputs.labelType.onchange = (e) => { 
    state.labelType = e.target.value; 
    renderNotes(); 
};

// Handle theme type changes - only theme styling needs updating
elements.inputs.themeType.onchange = (e) => { 
    state.theme = e.target.value; 
    updateTheme(); 
};


/**
 * Export functionality for the fretboard visualizer
 * Allows users to download the fretboard as a PNG image
 */

// Reference the export button element from the DOM
elements.inputs.exportBtn = document.getElementById('export-png');

// Handle export button click event
elements.inputs.exportBtn.onclick = async () => {
    // Get references to the wrapper and fretboard elements
    const wrapper = document.querySelector('.fretboard-wrapper');
    const romanRow = document.getElementById('roman-indicators');
    const fretboard = document.getElementById('fretboard');
    
    // Define pixel widths for export calculation
    const FRET_WIDTH = 80; // Width of each fret in pixels
    const NUT_WIDTH = 12; // Width of the nut (leftmost part) in pixels
    const NAMES_WIDTH = 40; // Width of string names column in pixels
    const totalContentWidth = (state.fretCount * FRET_WIDTH) + NUT_WIDTH + NAMES_WIDTH; // Total width needed

    // Save original wrapper styles to restore later
    const originalWrapperStyle = wrapper.style.cssText;
    
    // Add CSS class to indicate export mode is active
    document.body.classList.add('is-exporting');

    // Temporarily resize and reposition wrapper for consistent export size
    wrapper.style.width = totalContentWidth + "px";
    wrapper.style.minWidth = totalContentWidth + "px";
    wrapper.style.position = "absolute";
    wrapper.style.left = "-20000px"; // Position off-screen to avoid visual flicker
    wrapper.style.overflow = "visible";

    // Determine if background should be transparent based on theme
    const isTransparent = (state.theme === 'clear');
    
    // Allow DOM to settle before capturing canvas
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
        // Generate canvas from the DOM element using html2canvas library
        const canvas = await html2canvas(wrapper, {
            backgroundColor: isTransparent ? null : "#121212", // Transparent for 'clear' theme, dark for 'wood'
            scale: 2, // High DPI for crisp output
            logging: false, // Disable console logging
            useCORS: true, // Enable CORS for external resources
            width: totalContentWidth,
            height: wrapper.offsetHeight,
            windowWidth: totalContentWidth + 100 // Extra width for rendering buffer
        });

        // Generate filename based on root note
        const fileName = `guitar-fretboard-${state.rootNote}.png`;

        // Check if File System Access API is available (modern browsers)
        if ('showSaveFilePicker' in window) {
            try {
                // Open native file save dialog
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'PNG Image',
                        accept: { 'image/png': ['.png'] },
                    }],
                });
                
                // Convert canvas to blob and write to selected file
                canvas.toBlob(async (blob) => {
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                }, 'image/png');

            } catch (err) {
                // Silently handle user cancellation (AbortError), log other errors
                if (err.name !== 'AbortError') console.error("Error during saving:", err);
            }
        } else {
            // Fallback for browsers without File System Access API
            // Convert canvas to data URL and trigger download via link
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.download = fileName;
            link.href = image;
            link.click();
        }
        
    } catch (error) {
        // Log any errors that occur during export process
        console.error("Export failed:", error);
    } finally {
        // Cleanup: restore original wrapper styles and remove export mode class
        document.body.classList.remove('is-exporting');
        wrapper.style.cssText = originalWrapperStyle;
    }
};


// Handle theme toggle button click - switches between 'wood' and 'clear' themes
elements.inputs.themeToggle.onclick = () => {
    state.theme = (state.theme === 'wood') ? 'clear' : 'wood';
    updateTheme();
};

// Handle fret count increment button - increases fret count up to maximum of 24
document.getElementById('fret-plus').onclick = () => {
    elements.inputs.fretCount.value = Math.min(24, parseInt(elements.inputs.fretCount.value) + 1);
    elements.inputs.fretCount.onchange({ target: elements.inputs.fretCount });
};

// Handle fret count decrement button - decreases fret count down to minimum of 1
document.getElementById('fret-minus').onclick = () => {
    elements.inputs.fretCount.value = Math.max(1, parseInt(elements.inputs.fretCount.value) - 1);
    elements.inputs.fretCount.onchange({ target: elements.inputs.fretCount });
};

// Reference the color picker input elements from the DOM for root and scale notes
elements.inputs.rootColorPicker = document.getElementById('color-root');
elements.inputs.noteColorPicker = document.getElementById('color-note');

/**
 * Handles color changes from the color picker inputs.
 * Updates CSS custom properties to reflect the selected colors for root notes and scale notes.
 * Stores the selected colors in the state object for persistence.
 */
function handleColorChange() {
    // Listen for changes to the root note color picker
    elements.inputs.rootColorPicker.addEventListener('input', (e) => {
        const newColor = e.target.value; // Get the selected color value
        document.documentElement.style.setProperty('--note-root', newColor); // Update CSS variable for root note color
        state.rootColor = newColor; // Store the color in state for persistence
    });

    // Listen for changes to the scale note color picker
    elements.inputs.noteColorPicker.addEventListener('input', (e) => {
        const newColor = e.target.value; // Get the selected color value
        document.documentElement.style.setProperty('--note-blue', newColor); // Update CSS variable for scale note color
        state.noteColor = newColor; // Store the color in state for persistence
    });
}


// Initialize the fretboard with the current state configuration
updateAll();