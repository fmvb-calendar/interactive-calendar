import { MatchList } from "./components/MatchList.js";
import { ResultList } from "./components/ResultList.js";
// ⚠️ Assure-toi que le nom du fichier/export correspond bien : Classement.js OU ClassementList.js
import {
  ClassementList,
  TEAM_META_HOMME,
  TEAM_META_FEMME,
} from "./components/Classement.js";
import { fixedFilterMobile, mobileFilter, toggleTab } from "./functions/dom.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7JcpyDjh8tt1Ih1gq3vOk82LiCvPxz8c",
  authDomain: "calendrier-competition-volley.firebaseapp.com",
  databaseURL:
    "https://calendrier-competition-volley-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "calendrier-competition-volley",
  storageBucket: "calendrier-competition-volley.firebasestorage.app",
  messagingSenderId: "969960128864",
  appId: "1:969960128864:web:8d3a39881a4cb0ca841e05",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ⬇️ Déclare les éléments une fois (le script est en `defer`, le DOM est prêt)
const tabCalendar = document.querySelector("#calendar");
const tabResultat = document.querySelector("#resultat");
const tabClassement = document.querySelector("#classement");

async function loadMatchs() {
  let matchs = null;

  try {
    const snapshot = await get(ref(database, "/"));
    if (snapshot.exists()) {
      matchs = snapshot.val();
      localStorage.setItem("matchs", JSON.stringify(matchs));
    } else {
      throw new Error("Pas de données dans Firebase");
    }
  } catch (error) {
    console.warn("Firebase hors service, fallback localStorage :", error);
    const localData = localStorage.getItem("matchs");
    if (localData) {
      matchs = JSON.parse(localData);
    } else {
      console.error("Aucune donnée disponible");
      return;
    }
  }

  // Matchs (à venir)
  new MatchList(matchs).appendTo(tabCalendar);

  // Résultats (terminés)
  new ResultList(matchs).appendTo(tabResultat);

  const TEAM_META = { ...TEAM_META_HOMME, ...TEAM_META_FEMME };

  const classement = new ClassementList(matchs, {
    teamMeta: TEAM_META, // ← les poules/logos viennent d’ici
    // categories: ["Homme","Femme"],  // optionnel si tu veux des titres par catégorie
  });
  classement.render(document.querySelector("#classement"));

  toggleTab(); // si ta fonction n'a pas besoin de param, sinon passe ce qu'elle attend
  mobileFilter();
  fixedFilterMobile();
}

loadMatchs();
