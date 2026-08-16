let map;
let userMarker;
let hospitalMarkers=[];
let radiusCircle;

function calculateDistance(lat1, lon1, lat2, lon2){
    const R=6371;
    const dLat=(lat2-lat1)*Math.PI/180;
    const dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+
        Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
        Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function findHospitals(){
    document.getElementById("loading").style.display="block";
    navigator.geolocation.getCurrentPosition(loadHospitals,()=>{
        document.getElementById("loading").style.display="none";
        alert("Unable to get your location.");
    },{enableHighAccuracy:true});
}

function loadHospitals(position){
    const lat=position.coords.latitude;
    const lon=position.coords.longitude;
    const radius=document.getElementById("radius").value;

    if(!map){
        map=L.map("map").setView([lat,lon],14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {attribution:"© OpenStreetMap contributors"}).addTo(map);
    }else{
        map.setView([lat,lon],14);
        if(userMarker) map.removeLayer(userMarker);
        if(radiusCircle) map.removeLayer(radiusCircle);
        hospitalMarkers.forEach(m=>map.removeLayer(m));
        hospitalMarkers=[];
    }

    userMarker=L.marker([lat,lon]).addTo(map)
      .bindPopup("📍 Your Location").openPopup();

    radiusCircle=L.circle([lat,lon],{
        radius:parseInt(radius),
        color:"#dc3545",
        fillColor:"#dc3545",
        fillOpacity:0.08
    }).addTo(map);

    const query=`
[out:json];
(
 node["amenity"="hospital"](around:${radius},${lat},${lon});
 way["amenity"="hospital"](around:${radius},${lat},${lon});
 relation["amenity"="hospital"](around:${radius},${lat},${lon});
);
out center;`;

    fetch("https://overpass.kumi.systems/api/interpreter", {
        method:"POST",
        body:query
    })
    .then(r=>r.json())
    .then(data=>{
        console.log(data);
        document.getElementById("loading").style.display="none";

        if(!data.elements.length){
            document.getElementById("results").innerHTML=
            '<div class="alert alert-warning">No hospitals found.</div>';
            return;
        }

        const hospitals = data.elements
        .map(h => {

        const hLat = h.lat ?? h.center?.lat;
        const hLon = h.lon ?? h.center?.lon;

        if (hLat === undefined || hLon === undefined) {
            return null;
        }

        return {
            ...h,
            hLat,
            hLon,
            distance: calculateDistance(lat, lon, hLat, hLon)
        };
})
        .filter(Boolean);

        hospitals.sort((a,b)=>a.distance-b.distance);

        let html="";
        hospitals.forEach((h,index)=>{
            const name=h.tags.name||"Hospital";
            const phone=h.tags.phone||h.tags["contact:phone"]||"Not Available";
            const website=h.tags.website||h.tags["contact:website"]||"";
            const hours=h.tags.opening_hours||"Not Available";
            const emergency=h.tags.emergency||"Unknown";

            const marker = L.marker([h.hLat,h.hLon])

            .addTo(map)

            .bindPopup(

            `<b>${name}</b><br>${h.distance.toFixed(2)} km away`

            );

            hospitalMarkers.push(marker);

            const directions=`https://www.google.com/maps/dir/${lat},${lon}/${h.hLat},${h.hLon}`;
            const osm=`https://www.openstreetmap.org/?mlat=${h.hLat}&mlon=${h.hLon}#map=18/${h.hLat}/${h.hLon}`;

            const card=`
            <div class="card shadow-sm mb-3">
            <div class="card-body">
            <h5>🏥 ${name}</h5>
            <p>📍 <strong>${h.distance.toFixed(2)} km away</strong></p>
            <p>☎ ${phone}</p>
            <p>🌐 ${website?`<a href="${website}" target="_blank">Website</a>`:"Not Available"}</p>
            <p>🕒 ${hours}</p>
            <p>🚑 ${emergency}</p>
            <a class="btn btn-danger btn-sm" target="_blank" href="${directions}">🧭 Navigate</a>
            <a class="btn btn-outline-primary btn-sm ms-2" target="_blank" href="${osm}">🗺 View Map</a>
            ${phone!=="Not Available"?`<a class="btn btn-success btn-sm ms-2" href="tel:${phone}">📞 Call</a>`:""}
            </div></div>`;

            if(index===0){
                document.getElementById("nearestCard").style.display="block";
                document.getElementById("nearestHospital").innerHTML=card;
            }
            html+=card;
        });

        document.getElementById("results").innerHTML=html;
    })
    .catch(err=>{
        console.error(err);
        document.getElementById("loading").style.display="none";
        alert("Unable to fetch hospitals.");
    });
}

