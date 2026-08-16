let recorder = null;
let chunks = [];

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const timer = document.getElementById("timer");
const status = document.getElementById("recordingStatus");

let startTime = null;
let timerInterval = null;
let recordingDuration = 0;


// ========================================
// SELECT SUPPORTED AUDIO FORMAT
// ========================================

function getSupportedMimeType() {

    const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus"
    ];

    for (const type of types) {

        if (MediaRecorder.isTypeSupported(type)) {

            console.log("Using audio format:", type);

            return type;

        }

    }

    return "";

}


// ========================================
// START RECORDING
// ========================================

startButton.addEventListener("click", async function () {

    console.log("START CLICKED");

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        console.log("MICROPHONE ACCESS GRANTED");


        chunks = [];


        const mimeType =
            getSupportedMimeType();


        if (mimeType) {

            recorder =
                new MediaRecorder(
                    stream,
                    {
                        mimeType: mimeType
                    }
                );

        } else {

            recorder =
                new MediaRecorder(stream);

        }


        console.log(
            "Recorder MIME:",
            recorder.mimeType
        );


        // ========================================
        // AUDIO DATA
        // ========================================

        recorder.ondataavailable = function (event) {

            console.log(
                "Audio chunk:",
                event.data.size
            );


            if (event.data.size > 0) {

                chunks.push(event.data);

            }

        };


        // ========================================
        // RECORDING STARTED
        // ========================================

        recorder.onstart = function () {

            console.log(
                "RECORDING STARTED"
            );


            status.className =
                "alert alert-danger text-center";


            status.innerHTML =
                "🔴 Recording in progress...";

        };


        // ========================================
        // RECORDING STOPPED
        // ========================================

        recorder.onstop = async function () {

            console.log(
                "RECORDING STOPPED"
            );


            const actualMimeType =
                recorder.mimeType ||
                "audio/webm";


            const audioBlob =
                new Blob(
                    chunks,
                    {
                        type: actualMimeType
                    }
                );


            console.log(
                "Recording MIME:",
                actualMimeType
            );


            console.log(
                "Recording size:",
                audioBlob.size
            );


            if (audioBlob.size === 0) {

                status.className =
                    "alert alert-danger text-center";


                status.innerHTML =
                    "❌ Recording is empty.";


                return;

            }


            // ========================================
            // DETERMINE EXTENSION
            // ========================================

            let extension = "webm";


            if (
                actualMimeType.includes("mp4")
            ) {

                extension = "mp4";

            }

            else if (
                actualMimeType.includes("ogg")
            ) {

                extension = "ogg";

            }


            const filename =
                "emergency_recording."
                + extension;


            // ========================================
            // CREATE FILE
            // ========================================

            const audioFile =
                new File(
                    [audioBlob],
                    filename,
                    {
                        type: actualMimeType
                    }
                );


            // ========================================
            // FORM DATA
            // ========================================

            const formData =
                new FormData();


            formData.append(
                "audio",
                audioFile
            );


            formData.append(
                "duration",
                recordingDuration
            );


            status.className =
                "alert alert-warning text-center";


            status.innerHTML =
                "⏳ Saving emergency recording...";


            // ========================================
            // UPLOAD
            // ========================================

            try {

                const response =
                    await fetch(
                        "/save-recording",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "Server returned "
                        + response.status
                    );

                }


                const result =
                    await response.json();


                console.log(
                    "SERVER RESPONSE:",
                    result
                );


                if (result.success) {

                    status.className =
                        "alert alert-success text-center";


                    status.innerHTML =
                        "✅ Emergency recording saved successfully.";

                }

                else {

                    throw new Error(
                        result.message ||
                        "Recording could not be saved."
                    );

                }

            }

            catch (error) {

                console.error(
                    "UPLOAD ERROR:",
                    error
                );


                status.className =
                    "alert alert-danger text-center";


                status.innerHTML =
                    "❌ Error saving recording.";

            }

        };


        // ========================================
        // RECORDER ERROR
        // ========================================

        recorder.onerror = function (event) {

            console.error(
                "RECORDER ERROR:",
                event
            );


            status.className =
                "alert alert-danger text-center";


            status.innerHTML =
                "❌ Recording error occurred.";

        };


        // ========================================
        // START
        // ========================================

        recorder.start();


        startTime =
            Date.now();


        recordingDuration = 0;


        startButton.style.display =
            "none";


        stopButton.style.display =
            "block";


        startTimer();

    }


    catch (error) {

        console.error(
            "MICROPHONE ERROR:",
            error
        );


        status.className =
            "alert alert-danger text-center";


        if (
            error.name ===
            "NotAllowedError"
        ) {

            status.innerHTML =
                "❌ Microphone permission was denied.";

        }

        else if (
            error.name ===
            "NotFoundError"
        ) {

            status.innerHTML =
                "❌ No microphone was found.";

        }

        else {

            status.innerHTML =
                "❌ Unable to access microphone.";

        }

    }

});


// ========================================
// STOP RECORDING
// ========================================

stopButton.addEventListener(
    "click",
    function () {

        console.log(
            "STOP CLICKED"
        );


        if (
            recorder &&
            recorder.state === "recording"
        ) {

            recordingDuration =
                Math.floor(
                    (Date.now() - startTime) / 1000
                );


            stopTimer();


            status.className =
                "alert alert-warning text-center";


            status.innerHTML =
                "⏳ Saving emergency recording...";


            /*
             * IMPORTANT:
             * Stop MediaRecorder first.
             */

            recorder.stop();


            /*
             * Do NOT stop the microphone
             * until MediaRecorder has finished.
             */

            recorder.onstop = recorder.onstop;


            startButton.style.display =
                "block";


            stopButton.style.display =
                "none";

        }

    }
);


// ========================================
// TIMER
// ========================================

function startTimer() {

    timerInterval =
        setInterval(
            function () {

                recordingDuration =
                    Math.floor(
                        (Date.now() - startTime) / 1000
                    );


                const minutes =
                    Math.floor(
                        recordingDuration / 60
                    );


                const seconds =
                    recordingDuration % 60;


                timer.innerHTML =
                    String(minutes)
                        .padStart(2, "0")
                    + ":"
                    +
                    String(seconds)
                        .padStart(2, "0");

            },
            1000
        );

}


function stopTimer() {

    clearInterval(
        timerInterval
    );

}


// ========================================
// INITIAL STATE
// ========================================

stopButton.style.display =
    "none";


timer.innerHTML =
    "00:00";


status.className =
    "alert alert-secondary text-center";


status.innerHTML =
    "Ready to record";


console.log(
    "🎙️ SafeHer Emergency Recording Loaded"
);