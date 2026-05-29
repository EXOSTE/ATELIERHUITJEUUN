const possibilité = ["Résultat 1 :7", "Résultat 2 : Diamand", "Résultat 3: Cerise "];
const boutonLevier = document.getElementById("boutonLevier");
const messageStatut = document.getElementById("messageStatut");
const AfficheResultat = document.getElementById("AfficheResultat");

        function jouerRoulette() {
            boutonLevier.disabled = true;
            messageStatut.textContent = "La roulette tourne...";
            AfficheResultat.textContent = "";
            setTimeout(() => {
                const indexAleatoire = Math.floor(Math.random() * possibilité.length);
                const resultatGagnant = possibilité[indexAleatoire];

                messageStatut.textContent = "La roulette s'est arrêtée !";
                AfficheResultat.textContent = resultatGagnant;

                boutonLevier.disabled = false;

            }, 2000);
        }
        boutonLevier.addEventListener("click", jouerRoulette);