/**
 * 
 * @param {string} id 
 * @returns {DocumentFragment}
 */
export function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true);
}

/**
 * Modifie le texte d'un élément trouvé à partir d'un sélecteur dans un conteneur donné.
 *
 * @param {HTMLElement} container - L'élément racine dans lequel chercher.
 * @param {string} selector - Le sélecteur CSS de l'élément cible.
 * @param {string} text - Le texte à insérer dans l'élément trouvé.
 */
export function changeText(container, selector, text) {
    container.querySelector(selector).innerText = text
}

/**
 * Formate une date au format "YYYY-MM-DD" en "JJ Mois AAAA" (ex: 08 août 2025).
 * @param {string} dateStr - La date au format "YYYY-MM-DD".
 * @returns {string} - La date formatée en français.
 */
export function formatDateFr(dateStr) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })
}

/**
 * Gère la navigation par onglets (Matchs / Résultats).
 * 
 * - Ajoute un écouteur d'événement à chaque onglet pour :
 *   - Activer l'onglet cliqué et désactiver les autres.
 *   - Afficher la section correspondante et masquer les autres.
 *   - Réinitialiser les filtres des matchs lorsqu'on passe à l'onglet "Résultats".
 * 
 * @param {Objet} [element] - Instance d'une classe gérant la liste des matchs
 */
export function toggleTab(element) {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.currentTarget.parentElement.querySelector('.active').classList.remove('active')
            e.currentTarget.classList.add('active')

            const target = e.currentTarget.dataset.tab

            document.querySelectorAll('.tab-content').forEach(section => {
                section.classList.remove('active')
            })

            document.getElementById(target).classList.add('active')

            // 🔹 Réinitialiser les filtres si on passe à l'onglet "Résultats"
            if (target === 'resultat' && element) {
                element.resetFilters()
            }
        })
    })
}

/**
 * 
 * @param {HTMLElement} container 
 * @param {string} selector 
 */
export function removeElement(container, selector) {
    container.querySelector(selector).remove()
}

/**
 * Transforme une chaîne de score en HTML avec le nombre le plus élevé en gras
 * Exemple : "20-25 | 18-25 | 25-22 | 15-25"
 * Retour : "20-<b>25</b> | 18-<b>25</b> | <b>25</b>-22 | 15-<b>25</b>"
 * @param {string} score
 * @returns {string} HTML
 */
export function formatScore(score) {
    return score.split('|').map(set => {
        const [a, b] = set.trim().split('-').map(Number)
        if (a > b) return `<b>${a}</b>-${b}`
        else if (b > a) return `${a}-<b>${b}</b>`
        else return `${a}-${b}` // égalité
    }).join(' | ')
}

/**
 * Fonctionnement du bouton filtre en version mobile
 */
export function mobileFilter() {
    const button = document.querySelector('.btn-filter')
    const close = document.querySelector('.btn-close')
    const filter = document.querySelector('.filter')
    const blocFilter = document.querySelector('.filter-item')
    const apply = document.querySelector('#applyFilters')

    // ouverture
    button.addEventListener('click', (e) => {
        e.stopPropagation()
        filter.classList.add('active')
    })

    // fermeture via croix
    close.addEventListener('click', (e) => {
        e.stopPropagation()
        filter.classList.remove('active')
    })

    // fermeture via appliquer
    apply.addEventListener('click', (e) => {
        e.stopPropagation()
        filter.classList.remove('active')
    })

    // fermeture en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
        if (!blocFilter.contains(e.target)) {            
            filter.classList.remove('active')
        }
    })
}

export function fixedFilterMobile() {
    const button = document.querySelector('.mobileFilter')
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) {
                button.classList.add('fixed')
            } else {
                button.classList.remove('fixed')
            }
        }
    }, {threshold: 0})
    observer.observe(document.getElementById('sentinel'))
}
