const recordButton = document.getElementById('recordButton');
const filenameInput = document.getElementById('filenameInput');
const statusDiv = document.getElementById('status');
const durationInput = document.getElementById('durationInput');
const durationSlider = document.getElementById('durationSlider');
const durationValueSpan = document.getElementById('durationValue');

let mediaRecorder;
let audioChunks = [];
let recordingTimer;
let recordingCounter = 1; // Counter for filename numbering
// const RECORDING_DURATION = 15000; // No longer fixed

// --- Duration Input Synchronization ---
function updateDurationDisplay(value) {
    durationValueSpan.textContent = `${value}s`;
}

durationInput.addEventListener('input', (e) => {
    const value = e.target.value;
    durationSlider.value = value;
    updateDurationDisplay(value);
});

durationSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    durationInput.value = value;
    updateDurationDisplay(value);
});

// Initialize display
updateDurationDisplay(durationInput.value);
// --- End Duration Input Synchronization ---


recordButton.addEventListener('click', toggleRecording);

async function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        console.log("Already recording. Auto-stop enabled.");
    } else {
        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startRecording(stream);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            updateStatus(`Error: Could not access microphone. ${err.message}`);
        }
    }
}

function startRecording(stream) {
    audioChunks = []; // Reset chunks for new recording

    // Get recording duration from input (convert seconds to milliseconds)
    const recordingDurationSeconds = parseInt(durationInput.value, 10);
    if (isNaN(recordingDurationSeconds) || recordingDurationSeconds <= 0) {
        updateStatus("Error: Invalid recording duration set.");
        return; // Don't start recording
    }
    const recordingDurationMillis = recordingDurationSeconds * 1000;


    // Try to record as WAV, fallback to browser default
    const options = { mimeType: 'audio/wav' };
    try {
       if (MediaRecorder.isTypeSupported('audio/wav')) {
            mediaRecorder = new MediaRecorder(stream, options);
            console.log("Recording with MIME type: audio/wav");
       } else {
           console.warn("audio/wav not supported, using browser default.");
           mediaRecorder = new MediaRecorder(stream); // Use browser default
       }
    } catch (e) {
        console.warn("Error trying to set audio/wav, using browser default.", e);
        mediaRecorder = new MediaRecorder(stream); // Use browser default
    }


    mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        clearTimeout(recordingTimer);

        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        const baseFilename = filenameInput.value.trim() || 'recording';
        const sanitizedBase = baseFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filename = `${sanitizedBase}_${recordingCounter}.wav`;

        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(audioUrl);

        updateStatus(`Recording stopped. Saved as ${filename} (Check Downloads folder). Ready for next recording.`);
        recordingCounter++;
        recordButton.disabled = false;
        filenameInput.disabled = false; // Re-enable inputs
        durationInput.disabled = false;
        durationSlider.disabled = false;
        recordButton.textContent = 'Rec';

        stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    recordButton.disabled = true;
    filenameInput.disabled = true; // Disable inputs during recording
    durationInput.disabled = true;
    durationSlider.disabled = true;
    recordButton.textContent = 'Recording...';
    updateStatus(`Recording... Will stop automatically in ${recordingDurationSeconds} seconds.`);

    // Set timer to automatically stop recording
    recordingTimer = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            updateStatus(`${recordingDurationSeconds} seconds reached. Stopping recording...`);
            mediaRecorder.stop();
        }
    }, recordingDurationMillis); // Use the duration from the input
}

function updateStatus(message) {
    statusDiv.innerHTML = `<p>${message}</p>`;
}