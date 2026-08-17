fetch("/get-fake-call-settings")
    .then(response => response.json())
    .then(data => {

        if (!data.success) {
            console.log("Fake call settings not found.");
            return;
        }

        console.log("Fake Call Settings:", data);

        // Use these values if needed
        console.log("Caller:", data.caller_name);
        console.log("Delay:", data.delay);
        console.log("Ringtone:", data.ringtone);
        console.log("Vibration:", data.vibration);

    })
    .catch(error => {
        console.error("Error loading fake call settings:", error);
    });
// =========================================
// SafeHer Fake Call
// =========================================

// Screens
const setupScreen = document.getElementById("setupScreen");
const countdownScreen = document.getElementById("countdownScreen");
const incomingCall = document.getElementById("incomingCall");
const activeCall = document.getElementById("activeCall");

// Inputs
const callerNameSelect = document.getElementById("callerName");
const customCallerBox = document.getElementById("customCallerBox");
const customCaller = document.getElementById("customCaller");
const callDelay = document.getElementById("callDelay");

// Buttons
const startFakeCall = document.getElementById("startFakeCall");
const cancelCall = document.getElementById("cancelCall");
const acceptCall = document.getElementById("acceptCall");
const declineCall = document.getElementById("declineCall");
const endCall = document.getElementById("endCall");

// Display elements
const countdown = document.getElementById("countdown");
const incomingCaller = document.getElementById("incomingCaller");
const activeCaller = document.getElementById("activeCaller");
const callTimer = document.getElementById("callTimer");


// =========================================
// Variables
// =========================================

let countdownTimer = null;
let ringtoneTimer = null;
let callTimerInterval = null;

let countdownValue = 0;
let callSeconds = 0;

let selectedCaller = "Mom";


// =========================================
// Custom Caller
// =========================================

callerNameSelect.addEventListener("change", function () {

    if (this.value === "custom") {

        customCallerBox.style.display = "block";

        customCaller.focus();

    } else {

        customCallerBox.style.display = "none";

    }

});


// =========================================
// Get Caller Name
// =========================================

function getCallerName() {

    if (callerNameSelect.value === "custom") {

        const name = customCaller.value.trim();

        if (name === "") {

            alert("Please enter a caller name.");

            customCaller.focus();

            return null;

        }

        return name;

    }

    return callerNameSelect.value;

}


// =========================================
// Start Fake Call
// =========================================

startFakeCall.addEventListener("click", function () {

    const caller = getCallerName();

    if (!caller) {
        return;
    }

    selectedCaller = caller;

    let delay = parseInt(callDelay.value);

    if (isNaN(delay) || delay < 1) {

        delay = 5;

    }

    startCountdown(delay);

});


// =========================================
// Countdown
// =========================================

function startCountdown(seconds) {

    clearAllTimers();

    setupScreen.style.display = "none";

    countdownScreen.style.display = "flex";

    incomingCall.style.display = "none";

    activeCall.style.display = "none";

    countdownValue = seconds;

    countdown.innerText = countdownValue;


    countdownTimer = setInterval(function () {

        countdownValue--;

        countdown.innerText = countdownValue;


        if (countdownValue <= 0) {

            clearInterval(countdownTimer);

            countdownTimer = null;

            showIncomingCall();

        }

    }, 1000);

}


// =========================================
// Show Incoming Call
// =========================================

function showIncomingCall() {

    clearInterval(countdownTimer);

    countdownTimer = null;

    countdownScreen.style.display = "none";

    setupScreen.style.display = "none";

    activeCall.style.display = "none";

    incomingCall.style.display = "flex";


    incomingCaller.innerText = selectedCaller;

    activeCaller.innerText = selectedCaller;


    startRingtone();

}


// =========================================
// Fake Ringtone
// =========================================

let ringtoneAudio = null;

function startRingtone() {

    stopRingtone();

    ringtoneAudio = new Audio(
        "/static/sounds/ringtone.mp3"
    );

    ringtoneAudio.loop = true;

    ringtoneAudio.play().catch(function(error) {

        console.log("Ringtone could not play:", error);

    });

    if (navigator.vibrate) {

        navigator.vibrate([
            300,
            200,
            300
        ]);

    }
}


// =========================================
// Stop Ringtone
// =========================================

function stopRingtone() {

    if (ringtoneAudio) {

        ringtoneAudio.pause();

        ringtoneAudio.currentTime = 0;

        ringtoneAudio = null;

    }

    if (navigator.vibrate) {
        navigator.vibrate(0);
    }
}


// =========================================
// Accept Call
// =========================================

acceptCall.addEventListener("click", function () {

    stopRingtone();

    incomingCall.style.display = "none";

    activeCall.style.display = "flex";

    activeCaller.innerText = selectedCaller;

    startCallTimer();

});


// =========================================
// Decline Call
// =========================================

declineCall.addEventListener("click", function () {

    stopRingtone();

    resetFakeCall();

});


// =========================================
// End Call
// =========================================

endCall.addEventListener("click", function () {

    stopRingtone();

    stopCallTimer();

    resetFakeCall();

});


// =========================================
// Cancel Countdown
// =========================================

cancelCall.addEventListener("click", function () {

    clearAllTimers();

    resetFakeCall();

});


// =========================================
// Call Timer
// =========================================

function startCallTimer() {

    stopCallTimer();

    callSeconds = 0;

    updateCallTimer();


    callTimerInterval = setInterval(function () {

        callSeconds++;

        updateCallTimer();

    }, 1000);

}


function updateCallTimer() {

    const minutes = Math.floor(callSeconds / 60);

    const seconds = callSeconds % 60;

    callTimer.innerText =
        String(minutes).padStart(2, "0")
        + ":"
        + String(seconds).padStart(2, "0");

}


function stopCallTimer() {

    if (callTimerInterval) {

        clearInterval(callTimerInterval);

        callTimerInterval = null;

    }

}


// =========================================
// Reset
// =========================================

function resetFakeCall() {

    clearAllTimers();

    setupScreen.style.display = "block";

    countdownScreen.style.display = "none";

    incomingCall.style.display = "none";

    activeCall.style.display = "none";

    callTimer.innerText = "00:00";

}


// =========================================
// Clear Timers
// =========================================

function clearAllTimers() {

    if (countdownTimer) {

        clearInterval(countdownTimer);

        countdownTimer = null;

    }

    stopRingtone();

    stopCallTimer();

}


// =========================================
// Keyboard Support
// =========================================

document.addEventListener("keydown", function (event) {

    // Escape = cancel/end

    if (event.key === "Escape") {

        clearAllTimers();

        resetFakeCall();

    }

});


// =========================================
// Initial State
// =========================================

resetFakeCall();

console.log("✅ SafeHer Fake Call loaded");
