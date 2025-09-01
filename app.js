import { MatchList } from "./components/MatchList.js"
import { ResultList } from "./components/ResultList.js"
import { fixedFilterMobile, mobileFilter, toggleTab } from "./functions/dom.js"

// --------------------
// Import Firebase (version modulaire 12.x)
// --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// --------------------
// Configuration Firebase
// --------------------
const firebaseConfig = {
    apiKey: "AIzaSyC7JcpyDjh8tt1Ih1gq3vOk82LiCvPxz8c",
    authDomain: "calendrier-competition-volley.firebaseapp.com",
    databaseURL: "https://calendrier-competition-volley-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "calendrier-competition-volley",
    storageBucket: "calendrier-competition-volley.firebasestorage.app",
    messagingSenderId: "969960128864",
    appId: "1:969960128864:web:8d3a39881a4cb0ca841e05"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// --------------------
// Fonction pour charger les matchs
// --------------------
async function loadMatchs() {
    let matchs = null;

    try {
        // Tentative de récupération depuis Firebase
        const snapshot = await get(ref(database, '/'));
        if (snapshot.exists()) {
            matchs = snapshot.val();
            console.log("Données récupérées depuis Firebase :", matchs);

            // Sauvegarde en localStorage pour fallback
            localStorage.setItem('matchs', JSON.stringify(matchs));
        } else {
            throw new Error("Pas de données dans Firebase");
        }
    } catch (error) {
        console.warn("Impossible de récupérer Firebase, utilisation du localStorage :", error);

        // Fallback localStorage
        const localData = localStorage.getItem('matchs');
        if (localData) {
            matchs = JSON.parse(localData);
            console.log("Données récupérées depuis localStorage :", matchs);
        } else {
            console.error("Aucune donnée disponible");
            return; // On arrête si aucune donnée
        }
    }

    // --------------------
    // Ton code existant pour afficher le calendrier
    // --------------------
    const list = new MatchList(matchs);
    list.appendTo(document.querySelector('#calendar'));

    const result = new ResultList(matchs);
    result.appendTo(document.querySelector('#resultat'));

    toggleTab(list);
    mobileFilter();
    fixedFilterMobile();
}

// Appel de la fonction au chargement
loadMatchs();



