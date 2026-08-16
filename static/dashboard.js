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

initializeLocationSharing();

function startLocationSharing() {

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


                // Get location settings
                try {

                    const response =
                        await fetch(
                            "/get-location-settings"
                        );

                    const settings =
                        await response.json();


                    if (
                        !settings.success
                    ) {
                        return;
                    }


                    // --------------------------------
                    // LOCATION SHARING
                    // --------------------------------

                    if (
                        settings.location_sharing != 1
                    ) {

                        console.log(
                            "📍 Location sharing disabled."
                        );

                        return;
                    }


                    // --------------------------------
                    // LIVE LOCATION
                    // --------------------------------

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
// START LOCATION AUTOMATICALLY
// ========================================

if (
    LOCATION_SHARING_ENABLED === 1 &&
    LIVE_LOCATION_ENABLED === 1
) {
    console.log("📍 Location sharing enabled");
    startLocationSharing();
} else {
    console.log("📍 Location sharing disabled");
}

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
// DANGER ZONE DETECTION
// ========================================

let notifiedDangerZones = new Set();

async function checkDangerZones() {

    if (
        currentLatitude === null ||
        currentLongitude === null
    ) {
        return;
    }

    try {

        const response = await fetch(
            `/check-danger-zones?latitude=${currentLatitude}&longitude=${currentLongitude}`
        );

        const result = await response.json();

        if (!result.success) {
            return;
        }


        // Detection disabled
        if (!result.danger) {
            return;
        }


        // Alerts disabled
        if (!result.alerts_enabled) {
            return;
        }


        result.zones.forEach(function(zone) {

            // Don't repeatedly notify
            if (
                notifiedDangerZones.has(zone.id)
            ) {
                return;
            }


            notifiedDangerZones.add(zone.id);


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

// ========================================
// SOS BUTTON
// ========================================

const sosButton =
    document.getElementById("sosButton");

const sosStatus =
    document.getElementById("sosStatus");


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

    console.log("🚨 SOS hold started");

    sosButton.classList.add("holding");

    let remaining = 4;

    sosButton.innerHTML = "Hold... 4";


    // Countdown

    sosCountdownTimer = setInterval(function () {

        remaining--;

        if (remaining > 0) {

            sosButton.innerHTML =
                "Hold... " + remaining;

        }

    }, 1000);


    // Trigger after 4 seconds

    sosHoldTimer = setTimeout(function () {

        clearInterval(sosCountdownTimer);

        sosCountdownTimer = null;

        sosTriggered = true;

        sosButton.classList.remove("holding");

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

        clearTimeout(sosHoldTimer);

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

    sosButton.innerHTML = "SOS";


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


    if (
        currentLatitude === null ||
        currentLongitude === null
    ) {

        showSOSStatus(
            "📍 Location is not available yet.",
            "danger"
        );


        sosTriggered = false;

        sosButton.innerHTML = "SOS";

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
    { passive: false }
);

sosButton.addEventListener(
    "touchend",
    cancelSOSHold,
    { passive: false }
);

sosButton.addEventListener(
    "touchcancel",
    cancelSOSHold,
    { passive: false }
);


// ========================================
// SEND SOS
// ========================================

async function sendSOS(
    latitude,
    longitude
) {

    sosButton.disabled = true;


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


        const result =
            await response.json();


        console.log(
            "SOS response:",
            result
        );


        if (result.success) {

            showSOSStatus(
                "🚨 Emergency SOS sent successfully.",
                "success"
            );

        }

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

    sosTriggered = false;


    sosButton.disabled = false;


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

let notifiedDangerZones = new Set();

async function checkDangerZones() {

    try {

        // First check user's setting
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


        // Get nearby danger zones
        const response =
            await fetch("/nearby-danger-zones");

        const result =
            await response.json();


        if (!result.success) {
            return;
        }


        result.danger_zones.forEach(function(zone) {

            // Don't notify repeatedly for the same incident
            if (notifiedDangerZones.has(zone.id)) {
                return;
            }


            notifiedDangerZones.add(zone.id);


            notifyDangerZone(
                `Danger zone nearby: ${zone.incident_type}`
            );

        });

    }

    catch (error) {

        console.error(
            "Danger zone detection error:",
            error
        );

    }
}

// ========================================
// CHECK DANGER ZONES
// ========================================

checkDangerZones();

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