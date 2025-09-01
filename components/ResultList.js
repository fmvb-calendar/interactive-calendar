import { changeText, cloneTemplate, formatDateFr, formatScore, removeElement} from "../functions/dom.js"

export class ResultList {

    /** @type {Match[]} */
    #match = []

    /** @type {HTMLUListElement} */
    #listElement

    /** @type {HTMLElement[]} */
    #items = []

    constructor(match) {
        this.#match = match
    }

    /**
     * @param {HTMLElement} element
     */
    appendTo(element) {
        const fragment = cloneTemplate('matchList-layout')
        element.append(fragment)

        removeElement(element, '.filter')
        removeElement(element, '.mobileFilter')

        // récupérer les éléments
        this.#listElement = element.querySelector('#matchList')

        // générer la liste avec séparateurs de date
        this.#buildList()
    }

    /**
     * Génère la liste des matchs avec séparateurs de date
     */
    #buildList() {
        this.#listElement.innerHTML = ''
        this.#items = []

        // regrouper les matchs par date
        const matchsParDate = new Map()
        this.#match.forEach(match => {
            if (!matchsParDate.has(match.date)) matchsParDate.set(match.date, [])
            matchsParDate.get(match.date).push(match)
        })

        // parcourir les dates dans l'ordre
        Array.from(matchsParDate.keys()).sort().forEach(date => {

             // récupérer les matchs NON terminés pour cette date
            const matchsDuJour = matchsParDate.get(date).filter(match => match.termine)

            // si aucun match non terminé, on passe à la date suivante
            if (matchsDuJour.length === 0) return

            // créer séparateur
            const separator = document.createElement('li')
            separator.className = 'date-separator'
            separator.textContent = formatDateFr(date)
            this.#listElement.append(separator)
            // trier les matchs de cette date par heure avant affichage
            matchsDuJour
                .sort((a, b) => {
                    const [hA, mA] = a.heure.split(':').map(Number)
                    const [hB, mB] = b.heure.split(':').map(Number)
                    return hA === hB ? mA - mB : hA - hB
                })
                .forEach(match => {
                    const item = new ResultListItem(match)
                    this.#listElement.append(item.element)
                    this.#items.push(item.element)
                })
        })
    }

}

class ResultListItem {

    #match
    #element

    constructor(match) {
        this.#match = match
        const li = cloneTemplate('matchList-item').firstElementChild
        this.#element = li

        li.dataset.category = match.categorie
        li.dataset.day = match.date
        li.dataset.teamA = match.equipeA
        li.dataset.teamB = match.equipeB

        removeElement(li, '.match-title')
        removeElement(li, '.match-lieu')

        const [r1, r2] = match.resultat.split("-").map(Number)
        const resultatContent =  li.querySelector('.match-heure')
        if (r1 > r2) {
            resultatContent.innerHTML = `<b>${r1}</b> - ${r2}`
        } else {
            resultatContent.innerHTML = `${r1} - <b>${r2}</b>`
        }

        changeText(li, '.match-genre', match.categorie)
        changeText(li, '.match-date', formatDateFr(match.date))
        changeText(li, '.teamA', match.equipeA)
        changeText(li, '.teamB', match.equipeB)
        changeText(li, '.score', match.score)

        const scoreElement = li.querySelector('.score')
        scoreElement.innerHTML = formatScore(match.score)

        li.querySelector('.team-flag-a img').setAttribute('src', match.logoA)
        li.querySelector('.team-flag-b img').setAttribute('src', match.logoB)
    }

    get element() {
        return this.#element
    }
}
