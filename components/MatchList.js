import { changeText, cloneTemplate, formatDateFr, removeElement} from "../functions/dom.js"

export class MatchList {

    /** @type {Match[]} */
    #match = []

    /** @type {HTMLUListElement} */
    #listElement

    /** @type {HTMLElement} */
    #filterCategoryElement

    /** @type {HTMLSelectElement} */
    #dateFilterElement

    /** @type {HTMLElement[]} */
    #items = []

    /** @type {HTMLElement} */
    #noMatchElement

    /** @type {HTMLElement} */
    #teamFilterElement

    /** @type {ButtonElement} */
    #resetFilter

    /** @type {ButtonElement} */
    #applyFilter

    constructor(match) {
        this.#match = match
    }

    /**
     * @param {HTMLElement} element
     */
    appendTo(element) {
        const fragment = cloneTemplate('matchList-layout')
        element.append(fragment)

        // récupérer les éléments
        this.#listElement = element.querySelector('#matchList')
        this.#filterCategoryElement = element.querySelector('.filter-category')
        this.#dateFilterElement = element.querySelector('#dateFilter')
        this.#teamFilterElement = element.querySelector('#teamFilter')
        this.#resetFilter = element.querySelector('#resetFilters')
        this.#applyFilter = element.querySelector('#applyFilters')

        // créer le message “Aucun match trouvé”
        this.#noMatchElement = document.createElement('li')
        this.#noMatchElement.className = 'no-match'
        this.#noMatchElement.textContent = "Aucun match trouvé"
        this.#noMatchElement.style.display = 'none'
        this.#listElement.append(this.#noMatchElement)

        // générer la liste avec séparateurs de date
        this.#buildList()

        // générer dynamiquement le filtres des équipes
        this.#dynamicFilterTeam()

        // cocher le radio "all" par défaut
        const allRadio = element.querySelector('input[name="categorie"][value="all"]')
        if (allRadio) allRadio.checked = true

        const isMobile = window.matchMedia("(max-width: 992px)").matches

        if (isMobile) {
            // mobile → appliquer seulement sur bouton
            this.#applyFilter.addEventListener('click', () => this.#applyFilters())
        } else {
            // desktop → appliquer immédiatement
            this.#filterCategoryElement.querySelectorAll('input[name="categorie"]').forEach(input => {
                input.addEventListener('change', () => this.#applyFilters())
            })
            this.#dateFilterElement.addEventListener('change', () => this.#applyFilters())
            this.#teamFilterElement.addEventListener('change', () => this.#applyFilters())
        }

        this.#resetFilter.addEventListener('click', () => this.resetFilters())
    }

    /**
     * Génère la liste des matchs avec séparateurs de date
     */
    #buildList() {
        this.#listElement.innerHTML = ''
        this.#items = []

        // regrouper les matchs par date
        const matchsParPhaseDate = new Map();

        this.#match.forEach(match => {
            const phase = match.phase || "Phase de poules";
            const date = match.date;
            const key = `${phase}|${date}`;

            if (!matchsParPhaseDate.has(key)) matchsParPhaseDate.set(key, []);
            matchsParPhaseDate.get(key).push(match);
        });

        // 🔥 On trie les clés par date (pas par phase)
        Array.from(matchsParPhaseDate.keys())
            .sort((a, b) => {
                const dateA = a.split('|')[1]; // récupérer la date
                const dateB = b.split('|')[1];
                return new Date(dateA) - new Date(dateB);
            })
            .forEach(key => {
                const [phase, date] = key.split('|');

                const matchsSection = matchsParPhaseDate.get(key).filter(match => !match.termine);
                if (matchsSection.length === 0) return;

                // Créer le séparateur
                const separator = document.createElement('li');
                separator.className = 'date-separator';
                separator.textContent = `${phase} – ${formatDateFr(date)}`;
                this.#listElement.append(separator);

                // Trier les matchs de cette section par heure
                matchsSection
                    .sort((a, b) => {
                        const [hA, mA] = a.heure.split(':').map(Number);
                        const [hB, mB] = b.heure.split(':').map(Number);
                        return hA === hB ? mA - mB : hA - hB;
                    })
                    .forEach(match => {
                        const item = new MatchListItem(match);
                        this.#listElement.append(item.element);
                        this.#items.push(item.element);
                    });
            });



        // ajouter le message “Aucun match trouvé” à la fin
        this.#listElement.append(this.#noMatchElement)
    }

    /**
     * Applique les filtres catégorie et date
     */
    #applyFilters() {
        const selectedCategory = this.#filterCategoryElement.querySelector('input[name="categorie"]:checked')?.value || 'all'
        const selectedDate = this.#dateFilterElement.value
        const selectedTeam = this.#teamFilterElement.value

        // filtrer les matchs
        this.#items.forEach(li => {
            const matchCategory = li.dataset.category
            const matchDate = li.dataset.day
            const teamA = li.dataset.teamA
            const teamB = li.dataset.teamB

            const categoryMatch = (selectedCategory === 'all' || matchCategory === selectedCategory)
            const dateMatch = (selectedDate === 'all' || matchDate === selectedDate)
            const teamMatch = (selectedTeam === 'all' || teamA === selectedTeam || teamB === selectedTeam)

            li.style.display = (categoryMatch && dateMatch && teamMatch) ? '' : 'none'
        })

       // récupérer tous les séparateurs de date
        const dateSeparators = [...this.#listElement.querySelectorAll('.date-separator')];

        // pour chaque séparateur, vérifier les éléments jusqu'au prochain séparateur
        dateSeparators.forEach((sep, index) => {
            let nextSep = dateSeparators[index + 1]; // prochain séparateur (ou null si c’est le dernier)
            let hasVisible = false;

            let next = sep.nextElementSibling;
            while (next && next !== nextSep && !next.classList.contains('no-match')) {
                if (next.classList.contains('match-list-item') && next.style.display !== 'none') {
                    hasVisible = true;
                    break;
                }
                next = next.nextElementSibling;
            }

            // afficher ou cacher le séparateur
            sep.style.display = hasVisible ? '' : 'none';
        });

        // afficher ou masquer le message “Aucun match trouvé”
        const hasVisibleMatch = this.#items.some(li => li.style.display !== 'none');
        this.#noMatchElement.style.display = hasVisibleMatch ? 'none' : '';

    }
    
    /**
     * Reinitialiser le filtre
     */
    resetFilters() {
        this.#filterCategoryElement.querySelector('input[value="all"]').checked = true
        this.#dateFilterElement.value = 'all'
        this.#teamFilterElement.value = 'all'
        this.#applyFilters()
    }

    /**
     * Gerer dynamiquement les filtres des equipes
     */
    #dynamicFilterTeam() {
        // On vide d'abord le select et on remet "Toutes les équipes"
        this.#teamFilterElement.innerHTML = ''

        const teamFilter = new Set()
        this.#match.forEach(match => {
            teamFilter.add(match.equipeA)
            teamFilter.add(match.equipeB)
        })
        
        const defaultOption = document.createElement('option')
        defaultOption.value = 'all'
        defaultOption.textContent = 'Toutes les équipes'
        this.#teamFilterElement.append(defaultOption)

        // On trie et on ajoute les équipes
        Array.from(teamFilter)
            .filter(team => {
                // Éliminer les valeurs vides ou null
                if (!team) return false;

                // Placeholder quart/demi (Q1, Q2, D1, etc.)
                if (/^[QD]\d$/i.test(team)) return false;

                // "Vainqueur ..." ou "Perdant ..."
                if (/^(Vainqueur|Perdant)/i.test(team)) return false;

                // Placeholders type "1er A", "4e B", etc.
                if (/^\d+(er|e)\s+[A-Z]$/i.test(team)) return false;

                return true;
            })
            .sort()
            .forEach(team => {
                const option = document.createElement('option');
                option.value = team;
                option.textContent = team;
                this.#teamFilterElement.appendChild(option);
            });

    }

}

class MatchListItem {

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

        removeElement(li, '.score')

        changeText(li, '.match-title', match.competition)
        changeText(li, '.match-genre', match.categorie)
        changeText(li, '.match-lieu', match.lieu)
        changeText(li, '.match-date', formatDateFr(match.date))
        changeText(li, '.teamA', match.equipeA)
        changeText(li, '.teamB', match.equipeB)
        changeText(li, '.match-heure', match.heure)

        li.querySelector('.team-flag-a img').setAttribute('src', match.logoA)
        li.querySelector('.team-flag-b img').setAttribute('src', match.logoB)
    }

    get element() {
        return this.#element
    }
}
