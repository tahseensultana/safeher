function googleTranslateElementInit() {

    new google.translate.TranslateElement(
        {
            pageLanguage: "en",
            includedLanguages: "en,bn",
            autoDisplay: false
        },
        "google_translate_element"
    );

}


document.addEventListener(
    "DOMContentLoaded",
    function () {

        fetch("/get-app-preferences")
            .then(response => response.json())
            .then(data => {

                if (!data.success) {
                    return;
                }

                if (data.language === "বাংলা") {

                    setTimeout(function () {

                        const translator =
                            document.querySelector(
                                ".goog-te-combo"
                            );

                        if (translator) {

                            translator.value = "bn";

                            translator.dispatchEvent(
                                new Event("change")
                            );

                        }

                    }, 1500);

                }

            })
            .catch(error => {

                console.error(
                    "Language loading error:",
                    error
                );

            });

    }
);