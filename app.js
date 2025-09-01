import { MatchList } from "./components/MatchList.js"
import { ResultList } from "./components/ResultList.js"
import { fixedFilterMobile, mobileFilter, toggleTab } from "./functions/dom.js"

try {
    // Référence à la racine de la DB
    const ref = firebase.database().ref('/');

    // Récupérer les données depuis Firebase
    const snapshot = await ref.get();

    if (!snapshot.exists()) {
        throw new Error('Aucune donnée disponible');
    }

    const matchs = snapshot.val(); // JSON récupéré depuis Firebase

    // Ton code existant reste identique
    const list = new MatchList(matchs);
    list.appendTo(document.querySelector('#calendar'));

    const result = new ResultList(matchs);
    result.appendTo(document.querySelector('#resultat'));

    toggleTab(list);
    mobileFilter();
    fixedFilterMobile();

} catch (error) {
    console.error("Erreur de chargement des matchs :", error);
}

