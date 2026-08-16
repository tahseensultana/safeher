let map;
let marker;
let accuracyCircle;
let currentLatitude = null;
let currentLongitude = null;

function getLocation() {
    startTracking();
}

function startTracking() {

    if (!navigator.geolocation) {

        alert("Geolocation is not supported.");

        return;
    }

    navigator.geolocation.watchPosition(

        updateLocation,

        showError,

        {

            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 0

        }

    );

}


function updateLocation(position) {

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    currentLatitude = lat;
    currentLongitude = lng;
    const accuracy = position.coords.accuracy;

    document.getElementById("latitude").innerHTML =
        lat.toFixed(6);

    document.getElementById("longitude").innerHTML =
        lng.toFixed(6);

    document.getElementById("accuracy").innerHTML =
        accuracy.toFixed(1) + " meters";

    if (!map) {

        map = L.map("map").setView([lat, lng], 17);

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution: "© OpenStreetMap contributors"
            }
        ).addTo(map);

        marker = L.marker([lat, lng]).addTo(map);

        accuracyCircle = L.circle([lat, lng], {

            radius: accuracy,

            color: "#0d6efd",

            fillColor: "#0d6efd",

            fillOpacity: 0.15

        }).addTo(map);

    }

    else {

        marker.setLatLng([lat, lng]);

        accuracyCircle.setLatLng([lat, lng]);

        accuracyCircle.setRadius(accuracy);

        map.panTo([lat, lng]);

    }

}

function showError(error) {

    switch(error.code){

        case error.PERMISSION_DENIED:
            alert("Location permission denied.");
            break;

        case error.POSITION_UNAVAILABLE:
            alert("Location unavailable.");
            break;

        case error.TIMEOUT:
            alert("Location request timed out.");
            break;

        default:
            alert("Unknown error.");
    }

}

function shareLocation() {

    if (currentLatitude === null || currentLongitude === null) {

        alert("Location is not available yet.");
        return;
    }

    // Save shared location in history
    fetch("/save-location", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            latitude: currentLatitude,
            longitude: currentLongitude,
            event_type: "Shared"

        })

    });

    // Open the Share Modal
    const modal = new bootstrap.Modal(
        document.getElementById("shareModal")
    );

    modal.show();

}

function buildLocationMessage() {

    const link =
        `https://www.openstreetmap.org/?mlat=${currentLatitude}&mlon=${currentLongitude}#map=17/${currentLatitude}/${currentLongitude}`;

    return `🚨 SafeHer Emergency Alert

I am sharing my live location.

📍 ${link}

Please check on me as soon as possible.`;

}

function saveLocation() {

    if (currentLatitude === null || currentLongitude === null) {

        alert("Location not available.");
        return;
    }

    fetch("/save-location", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            latitude: currentLatitude,
            longitude: currentLongitude,
            event_type: "Saved"

        })

    })

    .then(response => response.json())

    .then(data => {

        if (data.success) {

            alert("✅ Current location saved successfully!");

        } else {

            alert("Failed to save location.");

        }

    })

    .catch(error => {

        console.error(error);

        alert("Something went wrong.");

    });

}


window.onload = function () {

    if (savedLocation.latitude !== null) {

        map = L.map("map").setView(
            [savedLocation.latitude, savedLocation.longitude],
            17
        );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution: "© OpenStreetMap contributors"
            }
        ).addTo(map);

        marker = L.marker([
            savedLocation.latitude,
            savedLocation.longitude
        ]).addTo(map);

        document.getElementById("latitude").innerHTML =
            Number(savedLocation.latitude).toFixed(6);

        document.getElementById("longitude").innerHTML =
            Number(savedLocation.longitude).toFixed(6);

        document.getElementById("accuracy").innerHTML =
            "Saved Location";

    } else {

        startTracking();

    }

};

function shareViaEmail() {

    const message = buildLocationMessage();

    const contacts =
        document.querySelectorAll(".contact-check:checked");

    if (contacts.length === 0) {

        alert("Select at least one contact.");
        return;

    }

    let emails = [];

    contacts.forEach(contact => {

        if (contact.dataset.email) {

            emails.push(contact.dataset.email);

        }

    });

    if (emails.length === 0) {

        alert("No email addresses found.");
        return;

    }

    window.location.href =
        `mailto:${emails.join(",")}?subject=SafeHer Live Location&body=${encodeURIComponent(message)}`;

}
function shareViaSMS() {

    const message = buildLocationMessage();

    const contacts =
        document.querySelectorAll(".contact-check:checked");

    if (contacts.length === 0) {

        alert("Select at least one contact.");
        return;

    }

    contacts.forEach(contact => {

        const phone =
            contact.value.replace(/\D/g, "");

        window.open(
            `sms:${phone}?body=${encodeURIComponent(message)}`
        );

    });

}
function shareViaWhatsApp() {

    const message = buildLocationMessage();

    const contacts =
        document.querySelectorAll(".contact-check:checked");

    if (contacts.length === 0) {

        alert("Select at least one contact.");
        return;

    }

    contacts.forEach(contact => {

        const phone =
            contact.value.replace(/\D/g, "");

        window.open(
            `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
            "_blank"
        );

    });

}
function copyLocation() {

    navigator.clipboard.writeText(buildLocationMessage());

    alert("✅ Location copied to clipboard.");

}