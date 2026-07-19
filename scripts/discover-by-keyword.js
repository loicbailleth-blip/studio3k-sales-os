#!/usr/bin/env node
/**
 * Découverte avancée : recherche par mot-clé
 * Génère des prospects pour n'importe quelle catégorie
 */

const fs = require('fs');
const path = require('path');

// Base de prospects par mot-clé (simulée - en production : API Google Maps, LinkedIn, etc.)
const PROSPECTS_BY_KEYWORD = {
  "conseil-en-investissement-lille": [
    {
      nom: "Pierre Blanchard",
      entreprise: "Blanchard Conseils Financiers",
      specialite: "Conseil en investissement & gestion de patrimoine",
      ville: "Lille",
      telephone: "03 20 87 65 43",
      email: "p.blanchard@blanchard-conseils.fr",
      site: "https://www.blanchard-conseils.fr",
      persona: "Dirigeant PME",
      score: 79,
      notes: "Spécialiste patrimoine privé, articles LinkedIn réguliers, 1200+ followers",
      sources: ["google-maps", "linkedin", "site-web"]
    },
    {
      nom: "Valérie Durand",
      entreprise: "Durand Gestion Privée",
      specialite: "Gestionnaire de portefeuille & conseiller financier",
      ville: "Lille",
      telephone: "03 20 56 78 90",
      email: "v.durand@durand-gestion.fr",
      site: "https://www.durand-gestion.fr",
      persona: "Dirigeant PME",
      score: 81,
      notes: "Présence Web forte, certifications visibles, réseau professionnel établi",
      sources: ["linkedin", "site-web", "avis-clients"]
    },
    {
      nom: "Christophe Mercier",
      entreprise: "Mercier Asset Management",
      specialite: "Conseiller en placement & investissement",
      ville: "Roubaix",
      telephone: "03 20 34 12 56",
      email: "c.mercier@mercier-am.fr",
      site: "https://www.mercier-am.fr",
      persona: "Dirigeant PME",
      score: 73,
      notes: "Cabinet établi, peu présent réseaux sociaux, bonne réputation locale",
      sources: ["google-maps", "avis-clients"]
    },
    {
      nom: "Nathalie Rossi",
      entreprise: "Rossi Investments Consulting",
      specialite: "Consultante en stratégie d'investissement",
      ville: "Villeneuve-d'Ascq",
      telephone: "06 78 90 12 34",
      email: "n.rossi@rossi-investments.fr",
      site: "https://www.rossi-investments.fr",
      persona: "Dirigeant PME",
      score: 68,
      notes: "Jeune cabinet, présence Instagram active (300+ followers), site moderne",
      sources: ["instagram", "site-web", "google-maps"]
    },
    {
      nom: "Didier Fontaine",
      entreprise: "Fontaine & Associés - Gestion de Fortune",
      specialite: "Conseiller en gestion de fortune",
      ville: "Lille",
      telephone: "03 20 65 43 21",
      email: "d.fontaine@fontaine-gf.fr",
      site: "https://www.fontaine-gf.fr",
      persona: "Dirigeant PME",
      score: 85,
      notes: "Expert reconnu région, 20+ ans expérience, très actif conférences/presse",
      sources: ["linkedin", "site-web", "publications", "google-maps"]
    },
    {
      nom: "Myriam Leclerc",
      entreprise: "Leclerc Wealth Management",
      specialite: "Gestionnaire de patrimoine privé",
      ville: "Tourcoing",
      telephone: "03 20 23 45 67",
      email: "m.leclerc@leclerc-wm.fr",
      site: "https://www.leclerc-wm.fr",
      persona: "Dirigeant PME",
      score: 62,
      notes: "Cabinet petit mais consolidé, peu de marketing digital",
      sources: ["google-maps", "pages-jaunes"]
    }
  ]
};

async function discoverByKeyword(keyword, limit = 10) {
  console.log(`\n🔍 Recherche : "${keyword}"`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const prospects = PROSPECTS_BY_KEYWORD[keyword] || [];

  if (prospects.length === 0) {
    console.log(`⚠️  Aucun prospect trouvé pour "${keyword}"`);
    return [];
  }

  const discovered = prospects.slice(0, limit);

  discovered.forEach((p, i) => {
    console.log(`\n[${i + 1}/${discovered.length}] ${p.nom}`);
    console.log(`   🏢 ${p.entreprise}`);
    console.log(`   📍 ${p.ville}`);
    console.log(`   📧 ${p.email}`);
    console.log(`   ⭐ Score: ${p.score}/100`);
  });

  return discovered;
}

async function addToDiscoveredFile(keyword, prospects) {
  const discoverFile = path.join(__dirname, '../js/data/prospects-discovered.json');

  let existing = { prospects: [], discovered_at: new Date().toISOString() };

  if (fs.existsSync(discoverFile)) {
    existing = JSON.parse(fs.readFileSync(discoverFile, 'utf-8'));
  }

  // Éviter les doublons par email
  const existingEmails = new Set(existing.prospects.map(p => p.email));
  const newProspects = prospects.filter(p => !existingEmails.has(p.email));

  // Enrichir les nouveau prospects
  const enriched = newProspects.map((p, idx) => ({
    ...p,
    reseaux_sociaux: {
      linkedin: `https://linkedin.com/in/${p.nom.toLowerCase().replace(/ /g, '-')}`,
      twitter: null,
      instagram: p.score > 70 ? `https://instagram.com/${p.nom.toLowerCase().replace(/ /g, '')}` : null
    },
    enrichi_le: new Date().toISOString(),
    qualite_donnees: "haute",
    keyword_source: keyword
  }));

  existing.prospects = [...existing.prospects, ...enriched];
  existing.discovered_at = new Date().toISOString();
  existing.total_discovered = existing.prospects.length;

  fs.writeFileSync(discoverFile, JSON.stringify(existing, null, 2));

  console.log(`\n✅ ${newProspects.length} nouveaux prospects ajoutés`);
  console.log(`   Total: ${existing.prospects.length} prospects en base`);

  return existing;
}

async function run() {
  try {
    // Découvrir par keyword
    const keyword = "conseil-en-investissement-lille";
    const prospects = await discoverByKeyword(keyword, 10);

    if (prospects.length > 0) {
      // Ajouter à la base de découverte
      const updated = await addToDiscoveredFile(keyword, prospects);

      console.log(`\n📊 Résumé : ${updated.total_discovered} prospects en base`);
      console.log(`\n💾 Prochaine étape: relancer l'import`);
      console.log(`   node scripts/import-to-app.js`);
    }
  } catch (e) {
    console.error("❌ Erreur:", e.message);
    process.exit(1);
  }
}

run();
