// =======================================
// SafeHer Admin Dashboard JS
// =======================================


// =============================
// Sidebar Toggle
// =============================

// =======================================
// SIDEBAR
// =======================================

document.addEventListener("DOMContentLoaded", function () {

    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("mainContent");

    const toggleBtn = document.getElementById("toggleBtn");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");


    /* =========================================
       CHECK SIDEBAR
    ========================================= */

    if (!sidebar) {
        console.log("Sidebar not found");
        return;
    }


    /* =========================================
       DESKTOP SIDEBAR
    ========================================= */

    if (toggleBtn) {

        toggleBtn.addEventListener("click", function () {

            sidebar.classList.toggle("expand");

            if (mainContent && window.innerWidth > 768) {

                mainContent.classList.toggle("expand");

            }

        });

    }


    /* =========================================
       MOBILE SIDEBAR
    ========================================= */

    if (mobileMenuBtn) {

        mobileMenuBtn.addEventListener("click", function () {

            sidebar.classList.toggle("expand");

        });

    }


    /* =========================================
       CLOSE MOBILE SIDEBAR
       AFTER CLICKING MENU ITEM
    ========================================= */

    const sidebarLinks = document.querySelectorAll(".sidebar a");

    sidebarLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            if (window.innerWidth <= 768) {

                sidebar.classList.remove("expand");

            }

        });

    });


    /* =========================================
       HANDLE WINDOW RESIZE
    ========================================= */

    window.addEventListener("resize", function () {

        /*
         * When moving from mobile to desktop,
         * remove mobile-only sidebar state.
         */

        if (window.innerWidth > 768) {

            sidebar.classList.remove("expand");

        }

    });

});
// =============================
// Delete Confirmation
// =============================

document.querySelectorAll(".delete-btn").forEach(function (button) {

    button.addEventListener("click", function (e) {

        if (!confirm("Delete this record?")) {

            e.preventDefault();

        }

    });

});


// =============================
// Statistics Bar Chart
// =============================

// =============================
// System Statistics Chart
// =============================

const statsCanvas = document.getElementById("statsChart");

if (statsCanvas) {

    new Chart(statsCanvas, {

        type: "bar",

        data: {

            labels: [

                "Users",
                "Contacts",
                "Locations",
                "SOS",
                "Incidents"

            ],

            datasets: [{

                label: "Records",

                data: [

                    TOTAL_USERS,
                    TOTAL_CONTACTS,
                    TOTAL_LOCATIONS,
                    TOTAL_SOS,
                    TOTAL_INCIDENTS

                ],

                borderRadius: 8,

                borderWidth: 0

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    display: false

                },

                tooltip: {

                    enabled: true

                }

            },

            scales: {

                x: {

                    grid: {

                        display: false

                    },

                    ticks: {

                        color: "#d6b4b4"

                    }

                },

                y: {

                    beginAtZero: true,

                    ticks: {

                        color: "#d6b4b4",

                        precision: 0

                    },

                    grid: {

                        color: "rgba(255,255,255,.08)"

                    }

                }

            }

        }

    });

}


// =============================
// Live Clock
// =============================

const clock = document.getElementById("clock");

if (clock) {

    function updateClock() {

        const now = new Date();

        const options = {

            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"

        };

        clock.innerHTML = now.toLocaleString("en-US", options);

    }

    updateClock();

    setInterval(updateClock, 1000);

}


// =============================
// Active Sidebar Link
// =============================

const links = document.querySelectorAll(".sidebar a");

links.forEach(function (link) {

    link.addEventListener("click", function () {

        links.forEach(function (l) {

            l.classList.remove("active");

        });

        this.classList.add("active");

    });

});


// =============================
// Smooth Scroll
// =============================

document.querySelectorAll('a[href^="#"]').forEach(function(anchor){

    anchor.addEventListener("click",function(e){

        e.preventDefault();

        const target=document.querySelector(this.getAttribute("href"));

        if(target){

            target.scrollIntoView({

                behavior:"smooth"

            });

        }

    });

});


// =============================
// Auto Refresh Every 5 Minutes
// =============================

// Uncomment if needed

// setInterval(function () {
//     location.reload();
// }, 300000);