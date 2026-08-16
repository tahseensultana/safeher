
const locationBtn = document.getElementById("locationBtn");

if (locationBtn) {

    locationBtn.addEventListener("click", function () {

        if (!navigator.geolocation) {

            alert("Geolocation is not supported by your browser.");

            return;
        }

        locationBtn.disabled = true;
        locationBtn.innerHTML =
            '<i class="bi bi-hourglass-split"></i> Getting Location...';

        navigator.geolocation.getCurrentPosition(

            function (position) {

                document.getElementById("latitude").value =
                    position.coords.latitude.toFixed(6);

                document.getElementById("longitude").value =
                    position.coords.longitude.toFixed(6);

                locationBtn.innerHTML =
                    '<i class="bi bi-check-circle-fill"></i> Location Captured';

                locationBtn.classList.remove("btn-danger");
                locationBtn.classList.add("btn-success");

            },

            function (error) {

                let message = "Unable to get location.";

                switch (error.code) {

                    case error.PERMISSION_DENIED:
                        message = "Location permission denied.";
                        break;

                    case error.POSITION_UNAVAILABLE:
                        message = "Location unavailable.";
                        break;

                    case error.TIMEOUT:
                        message = "Location request timed out.";
                        break;

                }

                alert(message);

                locationBtn.disabled = false;

                locationBtn.innerHTML =
                    '<i class="bi bi-geo-alt-fill"></i> Get Current Location';

            }

        );

    });

}


// ================================
// Image Preview
// ================================

const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");

if (imageInput) {

    imageInput.addEventListener("change", function () {

        const file = this.files[0];

        if (!file) {

            preview.style.display = "none";
            return;

        }

        const reader = new FileReader();

        reader.onload = function (e) {

            preview.src = e.target.result;
            preview.style.display = "block";

        };

        reader.readAsDataURL(file);

    });

}


// ================================
// Form Validation
// ================================

const reportForm = document.querySelector("form");

if (reportForm) {

    reportForm.addEventListener("submit", function (e) {

        const incident =
            document.querySelector("[name='incident_type']").value;

        const severity =
            document.querySelector("[name='severity']").value;

        const description =
            document.querySelector("[name='description']").value.trim();

        if (incident === "") {

            alert("Please select an incident type.");

            e.preventDefault();

            return;

        }

        if (severity === "") {

            alert("Please select the severity.");

            e.preventDefault();

            return;

        }

        if (description.length < 10) {

            alert("Please describe the incident in more detail.");

            e.preventDefault();

            return;

        }

    });

}


// ================================
// Character Counter
// ================================

const textarea = document.querySelector("[name='description']");

if (textarea) {

    const counter = document.createElement("small");

    counter.className = "text-light d-block mt-2";

    textarea.parentNode.appendChild(counter);

    function updateCounter() {

        counter.innerHTML =
            textarea.value.length + " / 1000 characters";

    }

    textarea.addEventListener("input", updateCounter);

    updateCounter();

}


// ================================
// Emergency Severity Warning
// ================================

const severitySelect = document.querySelector("[name='severity']");

if (severitySelect) {

    severitySelect.addEventListener("change", function () {

        if (this.value === "Emergency") {

            alert(
                "Emergency selected.\n\nPlease also press the SOS button if you need immediate assistance."
            );

        }

    });

}