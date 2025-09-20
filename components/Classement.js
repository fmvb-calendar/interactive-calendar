// /components/Classement.js

export class ClassementList {
  /**
   * @param {Match[]} matchs
   * @param {Object} [options]
   * @param {(team:string)=>string} [options.getPoule] - fallback si pas de teamMeta ni champ match.poule
   * @param {Object<string,{poule:string,logo?:string,displayName?:string}>} [options.teamMeta]
   * @param {string[]} [options.categories] - si tu veux séparer par catégories
   */
  constructor(matchs, options = {}) {
    this.matchs = Array.isArray(matchs) ? matchs : [];
    this.teamMeta = options.teamMeta || {}; // ← clé: nom équipe exact
    this.getPoule =
      options.getPoule ||
      ((team) => {
        const meta = this.teamMeta[team];
        return meta?.poule || "Poule unique";
      });
    this.categories = options.categories || null;
  }

  /**
   * Construit/rafraîchit le classement dans le container
   * @param {HTMLElement} container
   */
  render(container) {
    container.innerHTML = "";

    // On garde seulement les matchs terminés avec un resultat set "x-y"
    const finished = this.matchs.filter(
      (m) =>
        m.termine === true &&
        typeof m.resultat === "string" &&
        /^\d+\s*-\s*\d+$/.test(m.resultat.trim())
    );

    // (A) Construire les stats à partir des matchs terminés
    const byPouleStats = this.#buildStatsByPoule(finished);

    // (B) Injecter les équipes "inscrites" via teamMeta (pour les afficher même à 0 match)
    this.#ensureAllTeamsFromMeta(byPouleStats);

    // Si tu veux séparer par catégories : regrouper, puis rendre
    if (this.categories) {
      const byCat = {};
      for (const m of this.matchs) {
        const cat = m.categorie || "Inconnue";
        if (!byCat[cat]) byCat[cat] = true;
      }
      Object.keys(byCat).forEach((cat) => {
        const h2 = document.createElement("h2");
        h2.textContent = `Classement — ${cat}`;
        container.appendChild(h2);

        // Filtrer les poules en ne gardant que les équipes qui apparaissent dans cette catégorie ?
        // La plupart du temps, on mélange les catégories dans les mêmes poules → on affiche tout
        // Si besoin on pourrait filtrer par cat en croisant les matchs.
        for (const [poule, rows] of Object.entries(byPouleStats)) {
          container.appendChild(this.#renderPouleTable(poule, rows));
        }
      });
    } else {
      // Cas simple : on rend toutes les poules
      for (const [poule, rows] of Object.entries(byPouleStats)) {
        container.appendChild(this.#renderPouleTable(poule, rows));
      }
    }
  }

  // ----------------- Internes -----------------

  #buildStatsByPoule(matchs) {
    /** structure: poule -> Map(team -> stats) */
    const table = {};

    for (const m of matchs) {
      // 1) Déterminer la poule (priorité au champ m.poule si présent)
      const poule =
        m.poule ||
        this.getPoule(m.equipeA) ||
        this.getPoule(m.equipeB) ||
        "Poule unique";

      if (!table[poule]) table[poule] = new Map();

      // 2) Récupérer/Créer les lignes d'équipe
      const teamA = this.#ensureTeam(table[poule], m.equipeA, m.logoA);
      const teamB = this.#ensureTeam(table[poule], m.equipeB, m.logoB);

      // 3) Incréments de base
      teamA.J++;
      teamB.J++;

      const [aSets, bSets] = this.#parseResultatSets(m.resultat);

      // 4) Points classement selon score en sets
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

      // 5) Départages: sets+ / sets-
      teamA.setsPlus += aSets;
      teamA.setsMoins += bSets;
      teamB.setsPlus += bSets;
      teamB.setsMoins += aSets;

      // 6) Si tu fournis m.score (points par set), on peut affiner (optionnel)
      const setPoints = this.#parseScorePoints(m.score);
      if (setPoints) {
        teamA.ptsPlus += setPoints.aPlus;
        teamA.ptsMoins += setPoints.aMoins;
        teamB.ptsPlus += setPoints.bPlus;
        teamB.ptsMoins += setPoints.bMoins;
      }
    }

    // 7) Transformer en tableaux triés
    const sorted = {};
    for (const [poule, map] of Object.entries(table)) {
      sorted[poule] = Array.from(map.values()).sort((t1, t2) => {
        if (t2.Pts !== t1.Pts) return t2.Pts - t1.Pts;
        const dSet1 = t1.setsPlus - t1.setsMoins;
        const dSet2 = t2.setsPlus - t2.setsMoins;
        if (dSet2 !== dSet1) return dSet2 - dSet1;
        if (t2.G !== t1.G) return t2.G - t1.G;
        return t1.J - t2.J;
      });
    }
    return sorted;
  }

  #ensureAllTeamsFromMeta(byPouleStats) {
    // Pour chaque équipe de teamMeta, s’assurer qu’elle est visible dans sa poule même à 0 match.
    for (const [team, meta] of Object.entries(this.teamMeta)) {
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
      // Re-trier la poule pour garder l’ordre (pts, diff sets, etc.)
      byPouleStats[poule].sort((t1, t2) => {
        if (t2.Pts !== t1.Pts) return t2.Pts - t1.Pts;
        const dSet1 = t1.setsPlus - t1.setsMoins;
        const dSet2 = t2.setsPlus - t2.setsMoins;
        if (dSet2 !== dSet1) return dSet2 - dSet1;
        if (t2.G !== t1.G) return t2.G - t1.G;
        return t1.J - t2.J;
      });
    }
  }

  #ensureTeam(map, name, logoFromMatch) {
    if (!map.has(name)) {
      const meta = this.teamMeta[name] || {};
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
      // si on n’avait pas de logo, on peut compléter via logoFromMatch
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
    return { winPts: 3, losePts: 0 };
  }

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
 * Exemple de métadonnées équipes.
 * Met une *et une seule* entrée par NOM EXACT d’équipe tel qu’il apparaît dans ton JSON (equipeA/equipeB).
 * - poule: "Poule A"/"Poule B"/etc.
 * - logo: chemin vers l’icône
 * - displayName: si tu veux afficher un libellé différent
 */
// teams.meta.js — à importer dans app.js
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
  EVBI: {
    logo: "./public/images/evbi.png",
    poule: "Poule C",
    displayName: "EVBI",
  },
};

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
