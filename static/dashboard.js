document.addEventListener("DOMContentLoaded", function () {

    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("mainContent");
    const toggleBtn = document.getElementById("toggleBtn");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");

    if (!sidebar) {
        console.error("Sidebar not found!");
        return;
    }


    /* =====================================================
       DESKTOP SIDEBAR
    ===================================================== */

    if (toggleBtn) {

        toggleBtn.addEventListener("click", function (event) {

            event.preventDefault();
            event.stopPropagation();

            sidebar.classList.toggle("expand");

            if (window.innerWidth > 768 && mainContent) {

                mainContent.classList.toggle("expand");

            }

        });

    }


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    if (mobileMenuBtn) {

        mobileMenuBtn.addEventListener("click", function (event) {

            event.preventDefault();
            event.stopPropagation();

            sidebar.classList.toggle("expand");

        });

    }


    /* =====================================================
       MOBILE LINK CLICK
    ===================================================== */

    const sidebarLinks =
        document.querySelectorAll("#sidebar a");

    sidebarLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            if (window.innerWidth <= 768) {

                sidebar.classList.remove("expand");

            }

        });

    });


    /* =====================================================
       RESIZE FIX
    ===================================================== */

    window.addEventListener("resize", function () {

        if (window.innerWidth > 768) {

            sidebar.classList.remove("expand");

            if (mainContent) {
                mainContent.classList.remove("expand");
            }

        }

    });

});

let currentLatitude = null;
let currentLongitude = null;
let locationWatchId = null;


// ========================================
// START LOCATION
// ========================================

async function initializeLocationSharing() {

    try {

        const response =
            await fetch("/get-location-settings");

        const result =
            await response.json();

        if (!result.success) {

            console.log(
                "📍 Could not load location settings."
            );

            return;
        }


        if (
            result.location_sharing === 1 &&
            result.live_location_updates === 1
        ) {

            console.log(
                "📍 Location sharing enabled"
            );

            startLocationSharing();

        } else {

            console.log(
                "📍 Location sharing disabled"
            );

        }

    } catch (error) {

        console.error(
            "Location settings error:",
            error
        );

    }

}


// ========================================
// START LOCATION AUTOMATICALLY
// ========================================

initializeLocationSharing();


// ========================================
// START LOCATION SHARING
// ========================================

function startLocationSharing() {

    // Prevent duplicate location watchers
    if (locationWatchId !== null) {

        console.log(
            "📍 Location sharing already running."
        );

        return;
    }


    if (!navigator.geolocation) {

        console.error(
            "Geolocation is not supported."
        );

        return;
    }


    locationWatchId =
        navigator.geolocation.watchPosition(

            async function(position) {

                currentLatitude =
                    position.coords.latitude;

                currentLongitude =
                    position.coords.longitude;


                console.log(
                    "📍 Location:",
                    currentLatitude,
                    currentLongitude
                );


                // ========================================
                // GET LOCATION SETTINGS
                // ========================================

                try {

                    const response =
                        await fetch(
                            "/get-location-settings"
                        );

                    const settings =
                        await response.json();


                    if (!settings.success) {

                        return;
                    }


                    // ========================================
                    // LOCATION SHARING
                    // ========================================

                    if (
                        settings.location_sharing != 1
                    ) {

                        console.log(
                            "📍 Location sharing disabled."
                        );

                        return;
                    }


                    // ========================================
                    // LIVE LOCATION
                    // ========================================

                    if (
                        settings.live_location_updates == 1
                    ) {

                        await fetch(
                            "/update-live-location",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({

                                    latitude:
                                        currentLatitude,

                                    longitude:
                                        currentLongitude

                                })
                            }
                        );

                    }

                }

                catch (error) {

                    console.error(
                        "Live location update error:",
                        error
                    );

                }

            },


            // ========================================
            // LOCATION ERROR
            // ========================================

            function(error) {

                console.error(
                    "Location error:",
                    error
                );


                showSOSStatus(
                    "❌ Location permission is required.",
                    "danger"
                );

            },


            // ========================================
            // LOCATION OPTIONS
            // ========================================

            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 10000
            }

        );


    notifyLocationSharing(
        "Live location sharing is active."
    );

}


// ========================================
// STOP LOCATION SHARING
// ========================================

function stopLocationSharing() {

    if (locationWatchId !== null) {

        navigator.geolocation.clearWatch(
            locationWatchId
        );

        locationWatchId = null;

    }


    currentLatitude = null;
    currentLongitude = null;


    notifyLocationSharing(
        "Live location sharing has stopped."
    );

}


// ========================================
// SOS BUTTON
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    function() {


        const sosButton =
            document.getElementById(
                "sosButton"
            );


        const sosStatus =
            document.getElementById(
                "sosStatus"
            );


        // ========================================
        // CHECK SOS BUTTON
        // ========================================

        if (!sosButton) {

            console.error(
                "❌ SOS button not found."
            );

            return;
        }


        console.log(
            "🚨 SOS button initialized."
        );


        let sosHoldTimer = null;

        let sosCountdownTimer = null;

        let sosTriggered = false;

        const SOS_HOLD_TIME = 4000;


        // ========================================
        // START SOS HOLD
        // ========================================

        function startSOSHold(event) {

            event.preventDefault();


            if (sosTriggered) {

                return;
            }


            console.log(
                "🚨 SOS hold started"
            );


            sosButton.classList.add(
                "holding"
            );


            let remaining = 4;


            sosButton.innerHTML =
                "Hold... 4";


            // ========================================
            // COUNTDOWN
            // ========================================

            sosCountdownTimer =
                setInterval(function() {


                    remaining--;


                    if (
                        remaining > 0
                    ) {

                        sosButton.innerHTML =
                            "Hold... " +
                            remaining;

                    }

                }, 1000);


            // ========================================
            // TRIGGER AFTER 4 SECONDS
            // ========================================

            sosHoldTimer =
                setTimeout(function() {


                    clearInterval(
                        sosCountdownTimer
                    );


                    sosCountdownTimer =
                        null;


                    sosTriggered =
                        true;


                    sosButton.classList.remove(
                        "holding"
                    );


                    sosButton.innerHTML =
                        "⏳ Sending SOS...";


                    console.log(
                        "🚨 4 SECOND SOS TRIGGERED"
                    );


                    triggerSOS();


                }, SOS_HOLD_TIME);

        }


        // ========================================
        // CANCEL HOLD
        // ========================================

        function cancelSOSHold(event) {

            event.preventDefault();


            if (sosTriggered) {

                return;
            }


            if (sosHoldTimer) {

                clearTimeout(
                    sosHoldTimer
                );

                sosHoldTimer = null;

            }


            if (sosCountdownTimer) {

                clearInterval(
                    sosCountdownTimer
                );

                sosCountdownTimer = null;

            }


            sosButton.classList.remove(
                "holding"
            );


            sosButton.innerHTML =
                "SOS";


            console.log(
                "SOS hold cancelled"
            );

        }


        // ========================================
        // TRIGGER SOS
        // ========================================

        function triggerSOS() {

            console.log(
                "🚨 Triggering SOS..."
            );


            // ========================================
            // CHECK LOCATION
            // ========================================

            if (
                currentLatitude === null ||
                currentLongitude === null
            ) {

                showSOSStatus(
                    "📍 Location is not available yet.",
                    "danger"
                );


                sosTriggered =
                    false;


                sosButton.innerHTML =
                    "SOS";


                return;
            }


            console.log(
                "🚨 SOS LOCATION:",
                currentLatitude,
                currentLongitude
            );


            sendSOS(
                currentLatitude,
                currentLongitude
            );

        }


        // ========================================
        // MOUSE EVENTS
        // ========================================

        sosButton.addEventListener(
            "mousedown",
            startSOSHold
        );


        sosButton.addEventListener(
            "mouseup",
            cancelSOSHold
        );


        sosButton.addEventListener(
            "mouseleave",
            cancelSOSHold
        );


        // ========================================
        // TOUCH EVENTS
        // ========================================

        sosButton.addEventListener(
            "touchstart",
            startSOSHold,
            {
                passive: false
            }
        );


        sosButton.addEventListener(
            "touchend",
            cancelSOSHold,
            {
                passive: false
            }
        );


        sosButton.addEventListener(
            "touchcancel",
            cancelSOSHold,
            {
                passive: false
            }
        );


        // ========================================
        // SEND SOS
        // ========================================

        async function sendSOS(
            latitude,
            longitude
        ) {


            sosButton.disabled =
                true;


            sosButton.innerHTML =
                "⏳ Sending SOS...";


            showSOSStatus(
                "🚨 Sending emergency alert...",
                "danger"
            );


            try {


                const response =
                    await fetch(
                        "/sos",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                latitude:
                                    latitude,

                                longitude:
                                    longitude

                            })

                        }
                    );


                // ========================================
                // CHECK RESPONSE
                // ========================================

                const result =
                    await response.json();


                console.log(
                    "SOS response:",
                    result
                );


                // ========================================
                // SUCCESS
                // ========================================

                if (
                    result.success
                ) {

                    showSOSStatus(
                        "🚨 Emergency SOS sent successfully.",
                        "success"
                    );

                }


                // ========================================
                // ERROR
                // ========================================

                else {

                    showSOSStatus(
                        "❌ " +
                        (
                            result.message ||
                            "SOS could not be sent."
                        ),
                        "danger"
                    );

                }

            }


            catch (error) {

                console.error(
                    "SOS error:",
                    error
                );


                showSOSStatus(
                    "❌ Unable to send SOS.",
                    "danger"
                );

            }


            // ========================================
            // RESET SOS
            // ========================================

            sosTriggered =
                false;


            sosButton.disabled =
                false;


            sosButton.innerHTML =
                "SOS";

        }


        // ========================================
        // STATUS MESSAGE
        // ========================================

        function showSOSStatus(
            message,
            type
        ) {


            if (!sosStatus) {

                return;
            }


            sosStatus.style.display =
                "block";


            sosStatus.className =
                "alert alert-" +
                type +
                " mt-3";


            sosStatus.innerHTML =
                message;

        }


    }
);


// ========================================
// NEARBY ALERT BADGE
// ========================================

// ========================================
// NEARBY EMERGENCY NOTIFICATIONS
// ========================================

let knownNearbyAlertIds = new Set();

async function updateNearbyAlertBadge() {

    try {

        const response = await fetch(
            "/nearby-emergency-alerts"
        );

        const result = await response.json();

        if (!result.success) {
            return;
        }


        const badge =
            document.getElementById(
                "nearbyAlertBadge"
            );


        const alerts = result.alerts || [];


        // ========================================
        // UPDATE BADGE
        // ========================================

        if (badge) {

            if (alerts.length > 0) {

                badge.innerText =
                    alerts.length;

                badge.style.display =
                    "inline-block";

            } else {

                badge.style.display =
                    "none";

            }

        }


        // ========================================
        // CHECK FOR NEW ALERTS
        // ========================================

        alerts.forEach(function(alert) {

            // First load:
            // don't show notifications for old alerts

            if (knownNearbyAlertIds.size === 0) {

                knownNearbyAlertIds.add(
                    alert.id
                );

                return;
            }


            // New alert

            if (
                !knownNearbyAlertIds.has(
                    alert.id
                )
            ) {

                knownNearbyAlertIds.add(
                    alert.id
                );


                // --------------------------------
                // Show notification
                // --------------------------------

                showNotification(
                    "🚨 Emergency reported nearby!",
                    "danger"
                );

            }

        });

    }

    catch (error) {

        console.error(
            "Nearby alert notification error:",
            error
        );

    }

}
updateNearbyAlertBadge();

setInterval(
    updateNearbyAlertBadge,
    5000
);

// ========================================
// SAFEHER NOTIFICATION SYSTEM
// ========================================

function showNotification(message, type = "danger") {

    console.log("🔔 Notification:", message);

    // ----------------------------------------
    // Create notification
    // ----------------------------------------

    const notification =
        document.createElement("div");

    notification.className =
        `alert alert-${type} shadow-lg position-fixed`;

    notification.style.top = "20px";
    notification.style.right = "20px";
    notification.style.zIndex = "9999";
    notification.style.minWidth = "300px";

    notification.innerHTML = `
        <div class="d-flex align-items-center">

            <i class="bi bi-bell-fill me-2"></i>

            <span>${message}</span>

            <button
                type="button"
                class="btn-close ms-auto"
                onclick="this.parentElement.parentElement.remove()">
            </button>

        </div>
    `;

    document.body.appendChild(notification);


    // ----------------------------------------
    // Sound
    // ----------------------------------------
    checkNotificationSetting(
    "nearby_user_alerts",
        function(enabled) {

            if (enabled) {

                showNotification(
                "🚨 Emergency reported nearby!",
                "danger"
                );

            }

        }
    );
    checkNotificationSetting(
        "sound",
        function(enabled) {

            if (enabled) {
                playNotificationSound();
            }

        }
    );


    // ----------------------------------------
    // Vibration
    // ----------------------------------------

    checkNotificationSetting(
        "vibration",
        function(enabled) {

            if (
                enabled &&
                navigator.vibrate
            ) {

                navigator.vibrate(
                    [200, 100, 200]
                );

            }

        }
    );


    // ----------------------------------------
    // Automatically remove
    // ----------------------------------------

    setTimeout(
        function() {

            if (
                notification &&
                notification.parentElement
            ) {

                notification.remove();

            }

        },
        5000
    );
}

function notifyLocationSharing(message) {

    checkNotificationSetting(
        "location_sharing_alerts",
        function(enabled) {

            if (enabled) {

                showNotification(
                    "📍 " + message,
                    "info"
                );

            }

        }
    );
}

// ========================================
// LOAD NOTIFICATION SETTINGS
// ========================================

async function checkNotificationSetting(
    settingName,
    callback
) {

    try {

        const response =
            await fetch(
                "/get-notification-settings"
            );

        const result =
            await response.json();

        if (!result.success) {
            callback(false);
            return;
        }

        callback(
            result[settingName] === 1
        );

    }

    catch (error) {

        console.error(
            "Notification settings error:",
            error
        );

        callback(false);

    }
}

function playNotificationSound() {

    const audio =
        new Audio(
            "/static/sounds/notification.mp3"
        );

    audio.volume = 0.7;

    audio.play()
        .catch(function(error) {

            console.log(
                "Notification sound blocked:",
                error
            );

        });
}

function notifyDangerZone(message) {

    checkNotificationSetting(
        "danger_zone_alerts",
        function(enabled) {

            if (enabled) {

                showNotification(
                    "⚠️ " + message,
                    "warning"
                );

            }

        }
    );
}

// ========================================
// DANGER ZONE DETECTION
// ========================================

/* ========================================
   DANGER ZONE NOTIFICATION
======================================== */

let notifiedDangerZones = new Set();


/* ========================================
   CHECK DANGER ZONES
======================================== */

async function checkDangerZones() {

    // ----------------------------------------
    // Make sure location is available
    // ----------------------------------------

    if (
        typeof currentLatitude === "undefined" ||
        typeof currentLongitude === "undefined" ||
        currentLatitude === null ||
        currentLongitude === null
    ) {

        return;
    }


    try {

        // ========================================
        // CHECK USER NOTIFICATION SETTINGS
        // ========================================

        const settingsResponse =
            await fetch("/get-notification-settings");


        const settingsResult =
            await settingsResponse.json();


        if (
            !settingsResult.success ||
            !settingsResult.danger_zone_alerts
        ) {

            return;
        }


        // ========================================
        // CHECK NEARBY DANGER ZONES
        // ========================================

        const response = await fetch(
            `/check-danger-zones?latitude=${currentLatitude}&longitude=${currentLongitude}`
        );


        const result =
            await response.json();


        if (!result.success) {

            return;
        }


        // ========================================
        // NO DANGER
        // ========================================

        if (!result.danger) {

            return;
        }


        // ========================================
        // ALERTS DISABLED
        // ========================================

        if (!result.alerts_enabled) {

            return;
        }


        // ========================================
        // PROCESS DANGER ZONES
        // ========================================

        if (
            !result.zones ||
            result.zones.length === 0
        ) {

            return;
        }


        result.zones.forEach(function(zone) {


            // ------------------------------------
            // Don't notify same incident repeatedly
            // ------------------------------------

            if (
                notifiedDangerZones.has(zone.id)
            ) {

                return;
            }


            // ------------------------------------
            // Mark as notified
            // ------------------------------------

            notifiedDangerZones.add(
                zone.id
            );


            // ------------------------------------
            // Show notification
            // ------------------------------------

            notifyDangerZone(
                `You are near a reported danger zone: ${zone.incident_type}.`
            );


            console.log(
                "⚠️ Danger zone detected:",
                zone
            );

        });

    }

    catch (error) {

        console.error(
            "Danger zone check error:",
            error
        );

    }

}


/* ========================================
   START DANGER ZONE CHECK
======================================== */

checkDangerZones();


/* ========================================
   CHECK EVERY 10 SECONDS
======================================== */

setInterval(
    checkDangerZones,
    10000
);

async function loadNearbyLiveLocations() {

    try {

        const response =
            await fetch("/nearby-live-locations");

        const result =
            await response.json();

        if (!result.success) {
            return;
        }

        console.log(
            "Nearby live locations:",
            result.locations
        );

        result.locations.forEach(function(user) {

            console.log(
                "👤",
                user.name,
                "📍",
                user.latitude,
                user.longitude
            );

        });

    }

    catch (error) {

        console.error(
            "Live location error:",
            error
        );

    }
}
loadNearbyLiveLocations();

setInterval(
    loadNearbyLiveLocations,
    5000
);

let fakeCallTimer = null;
let fakeCallSettings = null;

const fakeCallButton =
    document.getElementById("fakeCallButton");

const fakeCallScreen =
    document.getElementById("fakeCallScreen");

const fakeCallerName =
    document.getElementById("fakeCallerName");


// ========================================
// LOAD FAKE CALL SETTINGS
// ========================================

async function loadFakeCallSettings() {

    try {

        const response =
            await fetch("/get-fake-call-settings");

        const result =
            await response.json();

        if (!result.success) {

            console.error(
                "Unable to load fake call settings."
            );

            return;
        }

        fakeCallSettings = result;

        console.log(
            "Fake call settings:",
            fakeCallSettings
        );

    }

    catch (error) {

        console.error(
            "Fake call settings error:",
            error
        );

    }
}


// ========================================
// START FAKE CALL
// ========================================

function startFakeCall() {

    if (!fakeCallSettings) {

        console.error(
            "Fake call settings not loaded."
        );

        return;
    }

    const delay =
        Number(fakeCallSettings.delay) || 5;

    const caller =
        fakeCallSettings.caller_name || "Mom";


    console.log(
        "📞 Fake call scheduled:",
        delay,
        "seconds"
    );


    fakeCallerName.innerText =
        caller;


    fakeCallTimer =
        setTimeout(
            function() {

                showFakeCall();

            },
            delay * 1000
        );
}


// ========================================
// SHOW FAKE CALL
// ========================================

function showFakeCall() {

    fakeCallScreen.style.display =
        "flex";


    fakeCallerName.innerText =
        fakeCallSettings.caller_name ||
        "Mom";


    playFakeCallSound();


    if (
        fakeCallSettings.vibration &&
        navigator.vibrate
    ) {

        navigator.vibrate([
            500,
            300,
            500,
            300,
            500
        ]);

    }

}


// ========================================
// RINGTONE
// ========================================

function playFakeCallSound() {

    const ringtone =
        fakeCallSettings.ringtone;


    if (ringtone === "silent") {
        return;
    }


    let soundFile =
        "/static/sounds/classic.mp3";


    if (
        ringtone === "phone_ring"
    ) {

        soundFile =
            "/static/sounds/phone_ring.mp3";

    }


    if (
        ringtone === "emergency_ring"
    ) {

        soundFile =
            "/static/sounds/emergency_ring.mp3";

    }


    const audio =
        new Audio(soundFile);


    audio.loop = true;

    audio.play()
        .catch(function(error) {

            console.log(
                "Audio playback blocked:",
                error
            );

        });


    window.fakeCallAudio =
        audio;
}


// ========================================
// ANSWER
// ========================================

function answerFakeCall() {

    stopFakeCall();

    console.log(
        "📞 Fake call answered"
    );

}


// ========================================
// REJECT
// ========================================

function rejectFakeCall() {

    stopFakeCall();

    console.log(
        "📞 Fake call rejected"
    );

}


// ========================================
// STOP FAKE CALL
// ========================================

function stopFakeCall() {

    fakeCallScreen.style.display =
        "none";


    if (window.fakeCallAudio) {

        window.fakeCallAudio.pause();

        window.fakeCallAudio.currentTime =
            0;

        window.fakeCallAudio = null;

    }


    if (
        navigator.vibrate
    ) {

        navigator.vibrate(0);

    }

}


// ========================================
// BUTTON
// ========================================

if (fakeCallButton) {

    fakeCallButton.addEventListener(
        "click",
        startFakeCall
    );

}


// ========================================
// ANSWER / REJECT
// ========================================

document
    .getElementById("answerFakeCall")
    ?.addEventListener(
        "click",
        answerFakeCall
    );


document
    .getElementById("rejectFakeCall")
    ?.addEventListener(
        "click",
        rejectFakeCall
    );


// ========================================
// LOAD SETTINGS
// ========================================

loadFakeCallSettings();

async function playSoundEffect(soundFile) {

    try {

        const response =
            await fetch("/get-app-preferences");

        const settings =
            await response.json();

        if (!settings.success) {
            return;
        }

        if (settings.sound_effects != 1) {
            return;
        }

        const audio =
            new Audio(
                "/static/sounds/" + soundFile
            );

        audio.play();

    }

    catch (error) {

        console.error(
            "Sound effect error:",
            error
        );

    }
}