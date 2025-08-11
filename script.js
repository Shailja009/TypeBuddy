const quoteDisplay = document.getElementById('quote-display');
const textInput = document.getElementById('text-input');
const timerDisplay = document.getElementById('timer-display');
const resultDisplay = document.getElementById('result-display');
const startTestBtn = document.getElementById('start-test-btn');
const stopTestBtn = document.getElementById('stop-test-btn');
const levelSelect = document.getElementById('level');
const modeSelect = document.getElementById('mode');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownDisplay = document.getElementById('countdown-display');

let currentQuote = '';
let timer; // Not directly used, intervalId holds the timer ref
let timeLeft;
let intervalId;
let startTime;
let charIndex = 0;
let errors = 0;
let isTestActive = false;
let selectedMode = 'normal';
let selectedTimer = 60; // Default for Easy

let cachedQuotes = [];
const MAX_CACHED_QUOTES = 20; // Cache up to 20 unique quotes

// Promise to track if quotes have been fetched and cached
let quotesReadyPromise = null;

// API to fetch text snippets (Open Library API)
// Using 'q=fiction' as an example, you can change this to other subjects or keywords.
// For paragraphs, we need descriptions that are longer.
const API_URL = 'https://openlibrary.org/search.json?q=fiction&limit=50'; // Fetch more books to get diverse descriptions

/**
 * Fetches quotes from the Open Library API and caches them.
 * Shows a loading message while fetching.
 * Handles text cleaning to ensure proper spacing.
 */
async function fetchAndCacheQuotes() {
    if (cachedQuotes.length > 0) {
        // If quotes are already cached, resolve immediately
        return Promise.resolve();
    }

    quoteDisplay.innerText = "Loading quotes..."; // Show loading message
    startTestBtn.disabled = true; // Disable button while loading

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        const docs = data.docs; // 'docs' contains the list of books
        if (docs && docs.length > 0) {
            const potentialQuotes = [];
            // Use Promise.allSettled to handle individual detail fetches failing gracefully
            const detailPromises = docs.map(async (doc) => {
                if (doc.key) { // Ensure there's a key to fetch details
                    try {
                        const detailsResponse = await fetch(`https://openlibrary.org${doc.key}.json`);
                        if (!detailsResponse.ok) { // Check if response was successful
                            throw new Error(`HTTP error! status: ${detailsResponse.status}`);
                        }
                        const detailsData = await detailsResponse.json();

                        let textContent = '';
                        if (detailsData.description) {
                            // Descriptions can sometimes be objects with a 'value' key
                            textContent = typeof detailsData.description === 'string' ? detailsData.description : detailsData.description.value;
                        } else if (detailsData.excerpts && detailsData.excerpts.length > 0) {
                            textContent = detailsData.excerpts[0].text;
                        }

                        if (textContent) {
                            // --- UPDATED: More Robust Text Cleaning for Spaces ---
                            let cleanedText = textContent;

                            // 1. Replace newlines with a single space
                            cleanedText = cleanedText.replace(/(\r\n|\n|\r)/gm, " ");

                            // 2. Add space after punctuation if followed by a letter without space
                            // E.g., "book.This" -> "book. This"
                            cleanedText = cleanedText.replace(/([.?!,])([a-zA-Z])/g, '$1 $2');

                            // 3. Add space between a lowercase letter and an uppercase letter (camelCase break)
                            // E.g., "PrideandPrejudice" -> "Pride and Prejudice"
                            cleanedText = cleanedText.replace(/([a-z])([A-Z])/g, '$1 $2');

                            // 4. Replace multiple spaces with a single space (after all other space insertions)
                            // This also handles cases where initial text had no spaces but newlines.
                            cleanedText = cleanedText.replace(/\s+/g, " ");

                            // 5. Trim leading/trailing whitespace
                            cleanedText = cleanedText.trim();

                            // Filter for reasonable length (at least a few sentences/a decent paragraph)
                            if (cleanedText.length > 100) { // Min length for a decent paragraph
                                return cleanedText;
                            }
                        }
                    } catch (detailError) {
                        console.warn(`Could not fetch details for ${doc.title || doc.key}:`, detailError);
                        return null; // Return null if fetching details failed
                    }
                }
                return null; // Return null if no key or other issue
            });

            const results = await Promise.allSettled(detailPromises);
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value !== null) {
                    potentialQuotes.push(result.value);
                }
            });

            if (potentialQuotes.length > 0) {
                // Shuffle the quotes to ensure better randomness and slice to MAX_CACHED_QUOTES
                cachedQuotes = shuffleArray(potentialQuotes).slice(0, MAX_CACHED_QUOTES);
                console.log(`Successfully cached ${cachedQuotes.length} quotes.`);
            } else {
                console.warn("No suitable quotes found after fetching from API. Using fallback.");
                cachedQuotes = ["The quick brown fox jumps over the lazy dog. This is a default sentence if API fails to provide suitable descriptions. It should have spaces now!"];
            }
        } else {
            console.warn("API returned no documents. Using fallback.");
            cachedQuotes = ["The quick brown fox jumps over the lazy dog. This is a default sentence because the API returned no works. It should have spaces now!"];
        }
    } catch (error) {
        console.error('Error fetching quotes:', error);
        cachedQuotes = ["The quick brown fox jumps over the lazy dog. This is a default sentence due to an error fetching from the API. It should have spaces now!"];
    } finally {
        startTestBtn.disabled = false; // Re-enable button after loading (even if failed)
        // Ensure displayQuote is called after quotes are ready
        displayQuote();
    }
}

// Fisher-Yates (Knuth) shuffle algorithm for randomizing cached quotes
function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

/**
 * Selects a new random quote from the cache and displays it.
 * Handles cases where cache might be empty.
 */
function getNewQuote() {
    if (cachedQuotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * cachedQuotes.length);
        currentQuote = cachedQuotes[randomIndex];
    } else {
        // Fallback if cache is unexpectedly empty (should be filled by initial fetch)
        currentQuote = "The quick brown fox jumps over the lazy dog. This is a fallback sentence. (No quotes cached)";
    }
    displayQuote(); // Display the newly selected quote
}

/**
 * Displays the current quote in the quote-display area.
 * Handles initial messages and typing animation.
 */
function displayQuote() {
    // If test is not active AND there are no cached quotes, show loading message.
    if (!isTestActive && cachedQuotes.length === 0) {
        quoteDisplay.innerText = "Loading quotes...";
        quoteDisplay.classList.remove('typing-animation'); // Ensure animation is off
        return;
    } else if (!isTestActive) {
        // After quotes are loaded (cachedQuotes > 0) and test is not active, display the prompt
        quoteDisplay.innerText = "Click 'Start Test' to begin!";
        quoteDisplay.classList.remove('typing-animation'); // Ensure animation is off
        return;
    }

    // If test IS active, render the actual quote characters
    quoteDisplay.innerHTML = '';
    currentQuote.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.innerText = char;
        span.style.animationDelay = `${index * 0.02}s`; // Stagger animation
        quoteDisplay.appendChild(span);
    });
    quoteDisplay.classList.add('typing-animation'); // Add class for animation
}

/**
 * Starts the 3-second countdown before the test begins.
 */
function startCountdown() {
    textInput.value = ''; // Clear input field immediately
    textInput.disabled = true; // Disable input during countdown

    countdownOverlay.style.display = 'flex';
    let count = 3;
    countdownDisplay.innerText = count;

    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownDisplay.innerText = count;
        } else {
            countdownDisplay.innerText = 'Go!';
            clearInterval(countdownInterval);
            setTimeout(() => {
                countdownOverlay.style.display = 'none';
                startTest(); // Start the actual test after countdown
            }, 500); // Give a short moment for "Go!" to display
        }
    }, 1000);
}

/**
 * Initiates the typing test, setting up timer, modes, and display.
 */
function startTest() {
    isTestActive = true;
    startTestBtn.disabled = true;
    levelSelect.disabled = true;
    modeSelect.disabled = true;
    stopTestBtn.style.display = 'inline-block';
    textInput.disabled = false;
    textInput.value = ''; // Ensure input is clear again
    textInput.focus(); // Focus input for immediate typing
    charIndex = 0; // Reset character index
    errors = 0; // Reset error count
    resultDisplay.innerText = ''; // Clear previous results
    timerDisplay.innerText = `Time: ${selectedTimer}s`; // Set initial timer display

    // Apply mode specific styles/behavior
    if (selectedMode === 'invisible') {
        textInput.classList.add('invisible-mode');
    } else {
        textInput.classList.remove('invisible-mode');
    }

    // Ensure a fresh quote is picked AFTER quotes are confirmed to be ready
    getNewQuote();

    // Story mode has no set timer initially, counts up
    if (selectedMode !== 'story') {
        timeLeft = selectedTimer;
        startTime = new Date().getTime();
        clearInterval(intervalId); // Clear any previous timer interval
        intervalId = setInterval(updateTimer, 1000);
    } else {
        // Story mode: timer counts up from 0
        startTime = new Date().getTime();
        timerDisplay.innerText = `Time: 0s`;
        clearInterval(intervalId); // Clear any previous interval
        intervalId = setInterval(() => {
            const elapsedTime = Math.floor((new Date().getTime() - startTime) / 1000);
            timerDisplay.innerText = `Time: ${elapsedTime}s`;
        }, 1000);
    }

    // Remove typing animation class for a fresh start when re-displaying quote
    quoteDisplay.classList.remove('typing-animation');
    // displayQuote() is called by getNewQuote() which re-applies animation if needed
    updateQuoteDisplay(); // Highlight first character
}

/**
 * Updates the countdown timer for timed modes.
 */
function updateTimer() {
    timeLeft--;
    timerDisplay.innerText = `Time: ${timeLeft}s`;
    if (timeLeft <= 0) {
        clearInterval(intervalId); // Stop timer
        endTest(); // End the test
    }
}

/**
 * Handles user input in the text area, providing real-time feedback and tracking progress.
 * @param {Event} e - The input event object.
 */
function handleInput(e) {
    if (!isTestActive) return;

    // Prevent backspace in 'no-backspace' mode
    if (selectedMode === 'no-backspace' && e.inputType === 'deleteContentBackward') {
        e.preventDefault();
        return;
    }

    const typedText = textInput.value;

    // Adjust charIndex to match the current length of typed text for accurate highlighting
    charIndex = typedText.length;

    // Recalculate errors based on the current typed input vs. currentQuote
    errors = 0;
    for(let i = 0; i < typedText.length; i++) {
        if (i < currentQuote.length && typedText[i] !== currentQuote[i]) {
            errors++;
        }
    }

    updateQuoteDisplay(); // Update display with correct/incorrect highlights

    // End test for non-story modes when the quote is fully typed
    if (selectedMode !== 'story' && charIndex >= currentQuote.length) {
        clearInterval(intervalId);
        endTest();
    }
}

/**
 * Renders the quote in the display area, highlighting correct, incorrect, and current characters.
 * Handles scrolling to keep the current character in view.
 */
function updateQuoteDisplay() {
    quoteDisplay.innerHTML = ''; // Clear previous spans
    const typedText = textInput.value; // Get the current typed text

    for (let i = 0; i < currentQuote.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.innerText = currentQuote[i];

        if (i < typedText.length) {
            // Compare character from original quote with character from typed text
            if (typedText[i] === currentQuote[i]) {
                charSpan.classList.add('correct');
            } else {
                charSpan.classList.add('incorrect');
            }
        } else if (i === typedText.length) { // Highlight the next expected character
            charSpan.classList.add('current');
        }
        quoteDisplay.appendChild(charSpan);
    }

    // Remove 'current' highlight if user has typed beyond the quote or test ended
    if (typedText.length >= currentQuote.length && selectedMode !== 'story') {
        Array.from(quoteDisplay.children).forEach(span => {
            span.classList.remove('current');
        });
    }

    // Scroll quote display if needed to keep current char in view
    const currentSpan = quoteDisplay.querySelector('.current');
    if (currentSpan) {
        const quoteDisplayRect = quoteDisplay.getBoundingClientRect();
        const currentSpanRect = currentSpan.getBoundingClientRect();

        // Check if currentSpan is out of view (bottom)
        if (currentSpanRect.bottom > quoteDisplayRect.bottom) {
            quoteDisplay.scrollTop += currentSpanRect.bottom - quoteDisplayRect.bottom + 10; // Scroll down with buffer
        }
        // Check if currentSpan is out of view (top) - for backspacing
        if (currentSpanRect.top < quoteDisplayRect.top) {
            quoteDisplay.scrollTop -= quoteDisplayRect.top - currentSpanRect.top + 10; // Scroll up with buffer
        }
    }
}

/**
 * Ends the typing test, calculates WPM, accuracy, and displays results.
 * Resets the UI to ready state.
 */
function endTest() {
    isTestActive = false;
    clearInterval(intervalId); // Stop any active timers
    textInput.disabled = true; // Disable input
    startTestBtn.disabled = false; // Enable start button
    levelSelect.disabled = false; // Enable level selection
    modeSelect.disabled = false; // Enable mode selection
    stopTestBtn.style.display = 'none'; // Hide stop button
    textInput.classList.remove('invisible-mode'); // Ensure input is visible after test

    const endTime = new Date().getTime();
    const duration = (endTime - startTime) / 1000; // Duration in seconds

    const typedTextValue = textInput.value;
    const wordsTyped = typedTextValue.split(/\s+/).filter(word => word !== '').length;

    let correctChars = 0;
    // Calculate correct characters based on actual typed characters vs. original quote
    for (let i = 0; i < typedTextValue.length; i++) {
        if (i < currentQuote.length && typedTextValue[i] === currentQuote[i]) {
            correctChars++;
        }
    }

    const totalTypedChars = typedTextValue.length;
    const timeInMinutes = duration / 60;

    let wpm = 0;
    let accuracy = 0;

    if (timeInMinutes > 0) {
        // WPM: (Correct characters / 5) / time in minutes
        wpm = Math.round((correctChars / 5) / timeInMinutes);
    }
    if (totalTypedChars > 0) {
        // Accuracy: (Correct characters / Total characters typed) * 100
        accuracy = Math.round((correctChars / totalTypedChars) * 100);
    }

    resultDisplay.innerHTML = `WPM: <span style="color: #98c379;">${wpm}</span> | Accuracy: <span style="color: #61afef;">${accuracy}%</span> | Errors: <span style="color: #e06c75;">${errors}</span>`;

    // Clear highlight and reset quote display
    Array.from(quoteDisplay.children).forEach(span => {
        span.classList.remove('current');
    });

    textInput.value = ''; // Clear input field
    currentQuote = ''; // Clear currentQuote so displayQuote shows initial prompt
    displayQuote(); // Reset quote display to initial "Click 'Start Test'..." message
}

// --- Event Listeners ---

// Start Test Button Click
startTestBtn.addEventListener('click', async () => {
    // Determine selected timer based on level
    selectedTimer = parseInt(levelSelect.value === 'easy' ? 60 : levelSelect.value === 'medium' ? 45 : 30);
    selectedMode = modeSelect.value;

    // Ensure quotes are ready before starting countdown
    // This will only initiate fetching if quotes haven't been fetched yet.
    if (!quotesReadyPromise) {
        quotesReadyPromise = fetchAndCacheQuotes();
    }
    await quotesReadyPromise; // WAIT for the quotes to be loaded and cached

    // Now that quotes are confirmed ready, start the countdown
    startCountdown();
});

// Stop Test Button Click
stopTestBtn.addEventListener('click', () => {
    clearInterval(intervalId); // Stop any active timers
    endTest(); // Immediately end the test
});

// Text Input Event (for real-time feedback)
textInput.addEventListener('input', handleInput);

// Keydown event (specifically for No Backspace mode)
textInput.addEventListener('keydown', (e) => {
    if (selectedMode === 'no-backspace' && e.key === 'Backspace') {
        e.preventDefault(); // Prevent default backspace behavior
    }
});

// --- Initial Setup on Page Load ---

// Initiate pre-fetching of quotes as soon as the page loads.
// This allows quotes to be ready by the time the user clicks "Start Test".
quotesReadyPromise = fetchAndCacheQuotes();