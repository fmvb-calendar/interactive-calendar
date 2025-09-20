// /components/Classement.js

export class ClassementList {
  /**
   * @param {Match[]} matchs
   * @param {Object} [options]
   * @param {(team:string,cat?:string)=>string} [options.getPoule]
   * @param {Object<string,{poule:string,logo?:string,displayName?:string}>} [options.teamMeta]
   * @param {Object<string,Object<string,{poule:string,logo?:string,displayName?:string}>>} [options.teamMetaByCat]
   * @param {string[]} [options.categories]
   */
  constructor(matchs, options = {}) {
    this.matchs = Array.isArray(matchs) ? matchs : [];

    // Métadonnées équipes (globales ou par catégorie)
    this.teamMeta = options.teamMeta || {};
    this.teamMetaByCat = options.teamMetaByCat || null;

    this.getPoule =
      options.getPoule ||
      ((team, cat) => {
        const metaCat =
          (this.teamMetaByCat && cat && this.teamMetaByCat[cat]?.[team]) ||
          this.teamMeta[team] ||
          null;
        return metaCat?.poule || "Poule unique";
      });

    this.categories = options.categories || null;
  }

  /**
   * Construit/rafraîchit le classement dans le container
   * @param {HTMLElement} container
   */
  render(container) {
    container.innerHTML = "";

    // On garde seulement les matchs terminés avec un resultat "x-y"
    const finished = this.matchs.filter(
      (m) =>
        m.termine === true &&
        typeof m.resultat === "string" &&
        /^\d+\s*-\s*\d+$/.test(m.resultat.trim())
    );

    if (this.categories && this.categories.length) {
      for (const cat of this.categories) {
        const h2 = document.createElement("h2");
        h2.textContent = `Classement — ${cat}`;
        container.appendChild(h2);

        // Matches de la catégorie
        const finishedCat = finished.filter((m) => m.categorie === cat);

        // Stats + H2H pour cette catégorie
        const { byPoule, h2h } = this.#buildStatsByPoule(finishedCat, cat);

        // Injecter toutes les équipes de la catégorie (même à 0 match)
        this.#ensureAllTeamsFromMeta(byPoule, cat, h2h);

        // Rendu
        for (const [poule, rows] of Object.entries(byPoule)) {
          container.appendChild(this.#renderPouleTable(poule, rows));
        }
      }
    } else {
      // Cas simple : toutes catégories confondues
      const { byPoule, h2h } = this.#buildStatsByPoule(finished, null);
      this.#ensureAllTeamsFromMeta(byPoule, null, h2h);
      for (const [poule, rows] of Object.entries(byPoule)) {
        container.appendChild(this.#renderPouleTable(poule, rows));
      }
    }
  }

  // ----------------- Internes -----------------

  #ratio(a, b) {
    if (b > 0) return a / b;
    return a > 0 ? Infinity : 0;
  }

  /**
   * Construit les stats par poule + la matrice H2H (confrontations directes)
   * @param {Match[]} matchs
   * @param {string|null} cat
   * @returns {{byPoule:Object<string,Array>, h2h:Object}}
   */
  #buildStatsByPoule(matchs, cat = null) {
    /** table: poule -> Map(team -> stats) */
    const table = {};
    /** h2h: poule -> A -> B -> { wins, setsPlus, setsMoins, ptsPlus, ptsMoins } */
    const h2h = {};

    const ensureH2H = (p, a, b) => {
      h2h[p] = h2h[p] || {};
      h2h[p][a] = h2h[p][a] || {};
      h2h[p][b] = h2h[p][b] || {};
      if (!h2h[p][a][b]) {
        h2h[p][a][b] = {
          wins: 0,
          setsPlus: 0,
          setsMoins: 0,
          ptsPlus: 0,
          ptsMoins: 0,
        };
      }
      if (!h2h[p][b][a]) {
        h2h[p][b][a] = {
          wins: 0,
          setsPlus: 0,
          setsMoins: 0,
          ptsPlus: 0,
          ptsMoins: 0,
        };
      }
    };

    for (const m of matchs) {
      const currentCat = cat ?? m.categorie;

      // 1) Déterminer la poule
      const poule =
        m.poule ||
        this.getPoule(m.equipeA, currentCat) ||
        this.getPoule(m.equipeB, currentCat) ||
        "Poule unique";

      if (!table[poule]) table[poule] = new Map();

      // 2) Lignes d'équipe
      const teamA = this.#ensureTeam(
        table[poule],
        m.equipeA,
        m.logoA,
        currentCat
      );
      const teamB = this.#ensureTeam(
        table[poule],
        m.equipeB,
        m.logoB,
        currentCat
      );

      // 3) Incréments de base
      teamA.J++;
      teamB.J++;

      // 4) Sets du match
      const [aSets, bSets] = this.#parseResultatSets(m.resultat);

      // 5) Points de classement
      if (aSets > bSets) {
        teamA.G++;
        teamB.P++;
        const { winPts, losePts } = this.#pointsFromSetScore(aSets, bSets);
        teamA.Pts += winPts;
        teamB.Pts += losePts;
      } else if (bSets > aSets) {
        teamB.G++;
        teamA.P++;
        const { winPts, losePts } = this.#pointsFromSetScore(bSets, aSets);
        teamB.Pts += winPts;
        teamA.Pts += losePts;
      }

      // 6) Cumul sets
      teamA.setsPlus += aSets;
      teamA.setsMoins += bSets;
      teamB.setsPlus += bSets;
      teamB.setsMoins += aSets;

      // 7) Cumul points (si disponibles)
      const setPoints = this.#parseScorePoints(m.score);
      if (setPoints) {
        teamA.ptsPlus += setPoints.aPlus;
        teamA.ptsMoins += setPoints.aMoins;
        teamB.ptsPlus += setPoints.bPlus;
        teamB.ptsMoins += setPoints.bMoins;
      }

      // 8) H2H
      ensureH2H(poule, m.equipeA, m.equipeB);
      h2h[poule][m.equipeA][m.equipeB].setsPlus += aSets;
      h2h[poule][m.equipeA][m.equipeB].setsMoins += bSets;
      h2h[poule][m.equipeB][m.equipeA].setsPlus += bSets;
      h2h[poule][m.equipeB][m.equipeA].setsMoins += aSets;

      if (setPoints) {
        h2h[poule][m.equipeA][m.equipeB].ptsPlus += setPoints.aPlus;
        h2h[poule][m.equipeA][m.equipeB].ptsMoins += setPoints.aMoins;
        h2h[poule][m.equipeB][m.equipeA].ptsPlus += setPoints.bPlus;
        h2h[poule][m.equipeB][m.equipeA].ptsMoins += setPoints.bMoins;
      }

      if (aSets > bSets) h2h[poule][m.equipeA][m.equipeB].wins++;
      if (bSets > aSets) h2h[poule][m.equipeB][m.equipeA].wins++;
    }

    // 9) Transformer en tableaux triés (avec comparateur avancé)
    const byPoule = {};
    for (const [poule, map] of Object.entries(table)) {
      const comp = this.#makeComparator(h2h[poule] || {});
      byPoule[poule] = Array.from(map.values()).sort(comp);
    }
    return { byPoule, h2h };
  }

  /**
   * Injecter toutes les équipes déclarées en meta (même à 0 match) puis re-trier
   */
  #ensureAllTeamsFromMeta(byPouleStats, cat = null, h2h = {}) {
    const metaSet =
      (this.teamMetaByCat && cat && this.teamMetaByCat[cat]) ||
      this.teamMeta ||
      {};

    for (const [team, meta] of Object.entries(metaSet)) {
      const poule = meta.poule || "Poule unique";
      if (!byPouleStats[poule]) byPouleStats[poule] = [];
      const exists = byPouleStats[poule].some((r) => r.team === team);
      if (!exists) {
        byPouleStats[poule].push({
          team,
          displayName: meta.displayName || team,
          logo: meta.logo || "",
          J: 0,
          G: 0,
          P: 0,
          Pts: 0,
          setsPlus: 0,
          setsMoins: 0,
          ptsPlus: 0,
          ptsMoins: 0,
        });
      }
      // Re-tri avec le comparateur avancé
      const comp = this.#makeComparator(h2h[poule] || {});
      byPouleStats[poule].sort(comp);
    }
  }

  /**
   * Comparateur avancé (pts, G, ratio sets, diff sets, ratio pts, diff pts, H2H, J)
   */
  #makeComparator(h2hPoule) {
    const ratio = this.#ratio.bind(this);
    const compareH2H = this.#compareH2H.bind(this, h2hPoule);

    return (t1, t2) => {
      // 1) Points
      if (t2.Pts !== t1.Pts) return t2.Pts - t1.Pts;

      // 2) Victoires
      if (t2.G !== t1.G) return t2.G - t1.G;

      // 3) Ratio de sets
      const rSet1 = ratio(t1.setsPlus, t1.setsMoins);
      const rSet2 = ratio(t2.setsPlus, t2.setsMoins);
      if (rSet2 !== rSet1) return rSet2 - rSet1;

      // 4) Différence de sets
      const dSet1 = t1.setsPlus - t1.setsMoins;
      const dSet2 = t2.setsPlus - t2.setsMoins;
      if (dSet2 !== dSet1) return dSet2 - dSet1;

      // 5) Ratio de points
      const rPts1 = ratio(t1.ptsPlus, t1.ptsMoins);
      const rPts2 = ratio(t2.ptsPlus, t2.ptsMoins);
      if (rPts2 !== rPts1) return rPts2 - rPts1;

      // 6) Différence de points
      const dPts1 = t1.ptsPlus - t1.ptsMoins;
      const dPts2 = t2.ptsPlus - t2.ptsMoins;
      if (dPts2 !== dPts1) return dPts2 - dPts1;

      // 7) Confrontation directe (A vs B)
      const h2hCmp = compareH2H(t1.team, t2.team);
      if (h2hCmp !== 0) return h2hCmp;

      // 8) Moins de matchs joués
      if (t1.J !== t2.J) return t1.J - t2.J;

      return 0;
    };
  }

  /**
   * Confrontation directe: victoires → ratio sets → ratio points
   * @returns {number} >0 si B devant, <0 si A devant, 0 si égalité
   */
  #compareH2H(h2hPoule, teamA, teamB) {
    if (!h2hPoule) return 0;
    const A = h2hPoule?.[teamA]?.[teamB];
    const B = h2hPoule?.[teamB]?.[teamA];
    if (!A || !B) return 0;

    if (A.wins !== B.wins) return B.wins - A.wins;

    const rSetA = this.#ratio(A.setsPlus, A.setsMoins);
    const rSetB = this.#ratio(B.setsPlus, B.setsMoins);
    if (rSetB !== rSetA) return rSetB - rSetA;

    const rPtsA = this.#ratio(A.ptsPlus, A.ptsMoins);
    const rPtsB = this.#ratio(B.ptsPlus, B.ptsMoins);
    if (rPtsB !== rPtsA) return rPtsB - rPtsA;

    return 0;
  }

  #ensureTeam(map, name, logoFromMatch, cat) {
    if (!map.has(name)) {
      const metaCat =
        (this.teamMetaByCat && cat && this.teamMetaByCat[cat]?.[name]) || {};
      const metaGlobal = this.teamMeta[name] || {};
      const meta = { ...metaGlobal, ...metaCat };
      map.set(name, {
        team: name,
        displayName: meta.displayName || name,
        logo: meta.logo || logoFromMatch || "",
        J: 0,
        G: 0,
        P: 0,
        Pts: 0,
        setsPlus: 0,
        setsMoins: 0,
        ptsPlus: 0,
        ptsMoins: 0,
      });
    } else {
      const row = map.get(name);
      if (!row.logo && logoFromMatch) row.logo = logoFromMatch;
    }
    return map.get(name);
  }

  #parseResultatSets(resultat) {
    const [a, b] = resultat.split("-").map((x) => parseInt(x.trim(), 10) || 0);
    return [a, b];
  }

  #pointsFromSetScore(winnerSets, loserSets) {
    if (winnerSets === 3 && (loserSets === 0 || loserSets === 1)) {
      return { winPts: 3, losePts: 0 };
    }
    if (winnerSets === 3 && loserSets === 2) {
      return { winPts: 2, losePts: 1 };
    }
    // fallback
    return { winPts: 3, losePts: 0 };
  }

  // "25-20 | 27-25 | 25-17" → cumuls des points
  #parseScorePoints(scoreStr) {
    if (!scoreStr || typeof scoreStr !== "string") return null;
    const sets = scoreStr
      .split(/[\|\u007C,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    let aPlus = 0,
      aMoins = 0,
      bPlus = 0,
      bMoins = 0;
    for (const s of sets) {
      const m = s.match(/(\d+)\s*-\s*(\d+)/);
      if (!m) continue;
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      aPlus += a;
      aMoins += b;
      bPlus += b;
      bMoins += a;
    }
    return { aPlus, aMoins, bPlus, bMoins };
  }

  #renderPouleTable(pouleName, rows) {
    const wrapper = document.createElement("div");
    wrapper.className = "classement-poule";

    const h3 = document.createElement("h3");
    h3.textContent = pouleName;
    wrapper.appendChild(h3);

    const table = document.createElement("table");
    table.className = "classement-table";

    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Équipe</th>
          <th>J</th>
          <th>G</th>
          <th>P</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    rows.forEach((t, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td class="team-cell">
          ${
            t.logo
              ? `<img class="team-logo" src="${t.logo}" alt="${
                  t.displayName || t.team
                }">`
              : ""
          }
          <span>${t.displayName || t.team}</span>
        </td>
        <td>${t.J}</td>
        <td>${t.G}</td>
        <td>${t.P}</td>
        <td>${t.Pts}</td>
      `;
      tbody.appendChild(tr);
    });

    wrapper.appendChild(table);
    return wrapper;
  }
}

/**
 * Métadonnées équipes — NOM EXACT (equipeA/equipeB dans ton JSON)
 */

// FEMME
export const TEAM_META_FEMME = {
  "BI'AS": {
    logo: "./public/images/bias.png",
    poule: "Poule A",
    displayName: "BI'AS",
  },
  "SQUAD-X": {
    logo: "./public/images/squad.png",
    poule: "Poule A",
    displayName: "SQUAD-X",
  },
  AVBCA: {
    logo: "./public/images/avbca.png",
    poule: "Poule A",
    displayName: "AVBCA",
  },
  GNVB: {
    logo: "./public/images/gnvb.png",
    poule: "Poule A",
    displayName: "GNVB",
  },
  ECVB: {
    logo: "./public/images/ecvb.png",
    poule: "Poule B",
    displayName: "ECVB",
  },
  AMVB: {
    logo: "./public/images/amvb.png",
    poule: "Poule B",
    displayName: "AMVB",
  },
  ASI: {
    logo: "./public/images/asi.png",
    poule: "Poule B",
    displayName: "ASI",
  },
  EVBI: {
    logo: "./public/images/evbi.png",
    poule: "Poule B",
    displayName: "EVBI",
  },
  MAMI: {
    logo: "./public/images/mami.png",
    poule: "Poule A",
    displayName: "MAMI",
  },
};

// HOMME
export const TEAM_META_HOMME = {
  COSFA: {
    logo: "./public/images/cosfa.png",
    poule: "Poule C",
    displayName: "COSFA",
  },
  MAMA: {
    logo: "./public/images/mama.png",
    poule: "Poule C",
    displayName: "MAMA",
  },
  "ASI 1": {
    logo: "./public/images/asi.png",
    poule: "Poule C",
    displayName: "ASI 1",
  },
  NADJY: {
    logo: "./public/images/nadjy.png",
    poule: "Poule C",
    displayName: "NADJY",
  },
  EVBI: {
    logo: "./public/images/evbi.png",
    poule: "Poule C",
    displayName: "EVBI",
  },
  MVBC: {
    logo: "./public/images/mvbc.png",
    poule: "Poule D",
    displayName: "MVBC",
  },
  "POLE GN": {
    logo: "./public/images/gnvb.png",
    poule: "Poule D",
    displayName: "Pôle GN",
  },
  "GNVB 2": {
    logo: "./public/images/gnvb.png",
    poule: "Poule D",
    displayName: "GNVB 2",
  },
  CVBF: {
    logo: "./public/images/cvbf.png",
    poule: "Poule D",
    displayName: "CVBF",
  },
  "ASI 2": {
    logo: "./public/images/asi.png",
    poule: "Poule D",
    displayName: "ASI 2",
  },
  "GNVB 1": {
    logo: "./public/images/gnvb.png",
    poule: "Poule D",
    displayName: "GNVB 1",
  },
};
