let map;
let userMarker;
let policeMarkers = [];

function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function findPolice() {

    document.getElementById("loading").style.display = "block";

    navigator.geolocation.getCurrentPosition(

        loadPolice,

        function () {

            document.getElementById("loading").style.display = "none";

            alert("Unable to get your location.");

        },

        {
            enableHighAccuracy: true
        }

    );

}

function loadPolice(position) {

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const radius =
        document.getElementById("radius").value;

    if (!map) {

        map = L.map("map").setView([lat, lon], 15);

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution: "© OpenStreetMap"
            }
        ).addTo(map);

    } else {

        map.setView([lat, lon], 15);

        if (userMarker)
            map.removeLayer(userMarker);

        policeMarkers.forEach(marker => map.removeLayer(marker));

        policeMarkers = [];

    }

    userMarker = L.marker([lat, lon])

        .addTo(map)

        .bindPopup("📍 Your Current Location")

        .openPopup();

    const query = `
[out:json];
(
node["amenity"="police"](around:${radius},${lat},${lon});
way["amenity"="police"](around:${radius},${lat},${lon});
relation["amenity"="police"](around:${radius},${lat},${lon});
);
out center;
`;

    fetch("https://overpass-api.de/api/interpreter", {

        method: "POST",

        body: query

    })

    .then(response => response.json())

    .then(data => {

        document.getElementById("loading").style.display = "none";

        if (data.elements.length === 0) {

            document.getElementById("results").innerHTML =

                `<div class="alert alert-warning">

                    No police stations found nearby.

                </div>`;

            return;

        }

        const stations = data.elements.map(station => {

            const stationLat =
                station.lat || station.center.lat;

            const stationLon =
                station.lon || station.center.lon;

            const distance =
                calculateDistance(
                    lat,
                    lon,
                    stationLat,
                    stationLon
                );

            return {

                ...station,

                stationLat,

                stationLon,

                distance

            };

        });

        stations.sort((a, b) => a.distance - b.distance);

        displayStations(stations, lat, lon);

    })

    .catch(error => {

        document.getElementById("loading").style.display = "none";

        console.error(error);

        alert("Unable to load nearby police stations.");

    });

}

function displayStations(stations, userLat, userLon) {

    let html = "";

    stations.forEach((station, index) => {

        const phone =
            station.tags.phone ||
            station.tags["contact:phone"] ||
            "Not Available";

        const name =
            station.tags.name ||
            "Police Station";

        const directions =
            `https://www.google.com/maps/dir/${userLat},${userLon}/${station.stationLat},${station.stationLon}`;

        const osm =
            `https://www.openstreetmap.org/?mlat=${station.stationLat}&mlon=${station.stationLon}#map=18/${station.stationLat}/${station.stationLon}`;

        const marker = L.marker([

            station.stationLat,
            station.stationLon

        ])

        .addTo(map)

        .bindPopup(`
            <b>${name}</b><br>
            📍 ${station.distance.toFixed(2)} km away
        `);

        policeMarkers.push(marker);

        const card = `

<div class="card shadow-sm mb-3">

<div class="card-body">

<h5>

🚓 ${name}

</h5>

<p class="mb-1">

📍 <strong>${station.distance.toFixed(2)} km</strong> away

</p>

<p class="mb-3">

☎ ${phone}

</p>

<a
href="${directions}"
target="_blank"
class="btn btn-danger btn-sm">

Directions

</a>

<a
href="${osm}"
target="_blank"
class="btn btn-outline-primary btn-sm ms-2">

View Map

</a>

</div>

</div>

`;

        if (index === 0) {

            document.getElementById("nearestCard").style.display = "block";

            document.getElementById("nearestStation").innerHTML = card;

        }

        html += card;

    });

    document.getElementById("results").innerHTML = html;

}