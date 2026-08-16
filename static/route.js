let map;

let routingControl = null;

let userMarker = null;

let currentLat = null;
let currentLng = null;

let destinationLat = null;
let destinationLng = null;

let currentRoute = [];

let safeWaypoints = [];


// Notification Permission

if ("Notification" in window) {

    Notification.requestPermission();

}


// ===============================
// Initialize Map
// ===============================


map = L.map("map").setView(
    [23.8103,90.4125],
    13
);


L.tileLayer(
"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
{
    attribution:
    "&copy; OpenStreetMap contributors"
}

).addTo(map);



// ===============================
// Show Danger Areas
// ===============================


if(typeof dangerLocations !== "undefined"){


dangerLocations.forEach(place=>{


let radius = 300;

let color="#28a745";


if(place.severity==="High"){

    radius=500;
    color="#dc3545";

}

else if(place.severity==="Medium"){

    radius=350;
    color="#ffc107";

}



L.circle(

[
place.latitude,
place.longitude
],

{

radius:radius,

color:color,

fillColor:color,

fillOpacity:0.25

}

)

.addTo(map)


.bindPopup(`

<h6>⚠ ${place.type}</h6>

<b>Severity:</b>
${place.severity}

<br>

<b>Status:</b>
${place.status}

<br><br>

${place.description}

`);


});


}



// ===============================
// Get Current Location
// ===============================


function getCurrentLocation(){


if(!navigator.geolocation){

alert(
"Location not supported"
);

return;

}



navigator.geolocation.getCurrentPosition(

position=>{


currentLat =
position.coords.latitude;


currentLng =
position.coords.longitude;



if(userMarker){

map.removeLayer(userMarker);

}



userMarker =
L.marker(
[currentLat,currentLng]
)

.addTo(map)

.bindPopup(
"📍 You are here"
);



map.setView(
[currentLat,currentLng],
15
);



let status =
document.getElementById("status");


if(status){

status.innerHTML =
"Current location detected";

}


},


()=>{

let status =
document.getElementById("status");


if(status){

status.innerHTML =
"Unable to detect location";

}


}


);


}



getCurrentLocation();



// ===============================
// Find Route Button
// ===============================


document
.getElementById("findRoute")
.addEventListener(
"click",
findRoute
);




// ===============================
// Generate Route
// ===============================


async function findRoute(){


let destination =
document
.getElementById("destination")
.value.trim();



if(destination===""){

alert(
"Enter destination"
);

return;

}



if(currentLat===null){

alert(
"Waiting for location"
);

return;

}



let response =
await fetch(

"https://nominatim.openstreetmap.org/search?format=json&q="
+
encodeURIComponent(destination)

);



let data =
await response.json();



if(data.length===0){

alert(
"Destination not found"
);

return;

}



destinationLat =
parseFloat(data[0].lat);


destinationLng =
parseFloat(data[0].lon);



createRoute(

[
currentLat,
currentLng
],

[
destinationLat,
destinationLng
]

);



}




// ===============================
// Create Route
// ===============================


function createRoute(start,end){


if(routingControl){

map.removeControl(
routingControl
);

}



routingControl =
L.Routing.control({

waypoints:[

L.latLng(
start[0],
start[1]
),

L.latLng(
end[0],
end[1]
)

],


addWaypoints:false,

draggableWaypoints:false,


show:false,


lineOptions:{

styles:[

{

color:"#0d6efd",

weight:6

}

]

}



})

.addTo(map);



routingControl.on(

"routesfound",

function(e){


currentRoute =
e.routes[0].coordinates;



let distance =
e.routes[0]
.summary
.totalDistance/1000;



let duration =
e.routes[0]
.summary
.totalTime/60;



document
.getElementById("distance")
.innerHTML =
distance.toFixed(2)
+" km";



document
.getElementById("duration")
.innerHTML =
duration.toFixed(0)
+" mins";



document
.getElementById("status")
.innerHTML =
"Route Generated";



analyzeRoute();



}

);


}




// ===============================
// Analyze Danger
// ===============================


function analyzeRoute(){


if(typeof dangerLocations==="undefined")
return;



let warnings=[];



dangerLocations.forEach(danger=>{


currentRoute.forEach(point=>{


let distance =
calculateDistance(

point.lat,

point.lng,

danger.latitude,

danger.longitude

);



if(distance<=0.30){

warnings.push(danger);

}


});


});



warnings=[

...new Map(

warnings.map(
item=>[
item.id,
item
]
)

).values()

];



calculateSafetyScore(
warnings
);


displayWarnings(
warnings
);



}




// ===============================
// Safety Score
// ===============================


function calculateSafetyScore(warnings){


let score=100;



warnings.forEach(item=>{


if(item.severity==="High")
score-=25;


else if(item.severity==="Medium")
score-=15;


else
score-=8;


});



if(score<0)
score=0;



let box =
document.getElementById(
"safeScore"
);


if(box){

box.innerHTML =
score+"/100";


}



}



// ===============================
// Warning Box
// ===============================


function displayWarnings(warnings){


let box =
document.getElementById(
"dangerAlert"
);



if(!box)
return;



if(warnings.length===0){


box.className =
"alert alert-success mt-3";


box.innerHTML =
"✅ No danger area detected";


return;


}



let list="";


warnings.forEach(item=>{


list+=`

<li>

${item.type}

(${item.severity})

</li>

`;


});



box.className =
"alert alert-danger mt-3";


box.innerHTML=`

<h5>⚠ Warning</h5>

Route passes near danger areas

<ul>

${list}

</ul>

`;



}




// ===============================
// Distance Formula
// ===============================


function calculateDistance(
lat1,
lon1,
lat2,
lon2
){


let R=6371;


let dLat =
(lat2-lat1)
*Math.PI/180;


let dLon =
(lon2-lon1)
*Math.PI/180;



let a =

Math.sin(dLat/2)*
Math.sin(dLat/2)

+

Math.cos(
lat1*Math.PI/180
)

*

Math.cos(
lat2*Math.PI/180
)

*

Math.sin(dLon/2)
*
Math.sin(dLon/2);



let c =
2*
Math.atan2(
Math.sqrt(a),
Math.sqrt(1-a)
);



return R*c;


}



// ===============================
// Live Danger Monitoring
// ===============================


setInterval(()=>{


getCurrentLocation();


},5000);



console.log(
"✅ SafeHer Safe Route Loaded"
);