import { MatchList } from "./components/MatchList.js"
import { ResultList } from "./components/ResultList.js"
import { fixedFilterMobile, mobileFilter, toggleTab } from "./functions/dom.js"

try {
    const response = await fetch('./public/matchs.json', {
        headers: {
            Accept: 'application/json',
        }
    })
    if (!response.ok) {
        throw new Error('Erreur serveur');
    }
    
    const matchs = await response.json()

    const list = new MatchList(matchs);
    list.appendTo(document.querySelector('#calendar'));

    const result = new ResultList(matchs);
    result.appendTo(document.querySelector('#resultat'));

    toggleTab(list);
    mobileFilter();
    fixedFilterMobile();
} catch (error) {
    console.error("Erreur de chargement des matchs :", error)
}
