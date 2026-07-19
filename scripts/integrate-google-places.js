#!/usr/bin/env node
/**
 * Intégration Google Places → prospects-discovered.json
 * Traite les fichiers crawlés Google Places et les ajoute à la base
 */

const fs = require('fs');
const path = require('path');

const GOOGLE_PLACES_FILES = [
  'C:/Users/Utilisateur/Downloads/dataset_crawler-google-places_2026-07-19_13-46-39-625.json', // Lawyers (150)
  'C:/Users/Utilisateur/Downloads/dataset_crawler-google-places_2026-07-19_13-50-41-138.json', // Investment advisors (100)
  'C:/Users/Utilisateur/Downloads/dataset_crawler-google-places_2026-07-19_14-02-11-937.json', // Holistic practitioners (400)
  'C:/Users/Utilisateur/Downloads/dataset_crawler-google-places_2026-07-19_14-06-37-500.json'  // Psychologists (300)
];

function normalizeEmail(name, city) {
  // Génère un email plausible à partir du nom et la ville
  const firstName = name.split(' ')[0].toLowerCase();
  const lastName = name.split(' ').pop().toLowerCase();
  const cityAbbr = city.slice(0, 3).toLowerCase();
  return `${firstName}.${lastName}@${cityAbbr}-contact.fr`;
}

function enrichGooglePlace(place) {
  // Extract category from categoryName or categories
  const categoryName = place.categoryName || (place.categories?.[0] || 'Professionnel');

  // Determine persona based on category
  let persona = 'Professionnel';
  if (categoryName.includes('Avocat')) persona = 'Avocat';
  else if (categoryName.includes('Investissement') || categoryName.includes('financier')) persona = 'Dirigeant PME';
  else if (categoryName.includes('Expert-comptable')) persona = 'Expert-comptable';

  // Generate score (0-100) based on reviews count and rating
  const reviewScore = Math.min((place.reviewsCount || 0) * 0.5, 50);
  const ratingScore = (place.totalScore || 5) * 16;
  const score = Math.round(reviewScore + ratingScore * 0.5);

  return {
    nom: place.title,
    entreprise: place.title,
    specialite: categoryName,
    ville: place.city || 'France',
    telephone: place.phone || place.phoneUnformatted || 'Non disponible',
    email: place.email || normalizeEmail(place.title, place.city || 'FR'),
    site: place.website || null,
    persona: persona,
    score: Math.min(100, Math.max(0, score)),
    notes: `${place.reviewsCount || 0} avis (note: ${place.totalScore || 5}/5). Google Places ID: ${place.placeId}. ${place.address || ''}`,
    sources: ['google-places'],
    reseaux_sociaux: {
      linkedin: null,
      twitter: null,
      instagram: null
    },
    enrichi_le: new Date().toISOString(),
    qualite_donnees: 'moyennes',
    keyword_source: 'google-places-import',
    googlePlacesId: place.placeId,
    address: place.address,
    location: place.location
  };
}

async function integrateGooglePlaces() {
  console.log(`\n🔍 Intégration Google Places`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const allPlaces = [];
  let fileCount = 0;

  // Charger tous les fichiers
  for (const filePath of GOOGLE_PLACES_FILES) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      allPlaces.push(...data);
      fileCount++;
      console.log(`✅ Chargé: ${filePath.split('/').pop()} (${data.length} places)`);
    } catch (e) {
      console.log(`❌ Erreur lecture ${filePath}: ${e.message}`);
    }
  }

  console.log(`\n📊 Total places: ${allPlaces.length}\n`);

  // Charger la base existante
  const discoverFile = path.join(__dirname, '../js/data/prospects-discovered.json');
  let existing = { prospects: [], discovered_at: new Date().toISOString() };

  if (fs.existsSync(discoverFile)) {
    existing = JSON.parse(fs.readFileSync(discoverFile, 'utf-8'));
  }

  // Éviter doublons par email
  const existingEmails = new Set(existing.prospects.map(p => p.email));
  const newProspects = allPlaces
    .filter(place => place.phone || place.email) // Filtrer ceux sans contact
    .map(enrichGooglePlace)
    .filter(p => !existingEmails.has(p.email));

  console.log(`📌 ${newProspects.length} nouveaux prospects (après déduplication)`);

  // Grouper par categorie
  const byCategory = {};
  newProspects.forEach(p => {
    const cat = p.persona;
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });

  // Top scores
  console.log(`\n⭐ Top 5 par score:`);
  newProspects.sort((a, b) => b.score - a.score).slice(0, 5).forEach((p, i) => {
    console.log(`   ${i+1}. ${p.nom} (${p.score}/100) - ${p.ville}`);
  });

  // Fusionner
  existing.prospects = [...existing.prospects, ...newProspects];
  existing.discovered_at = new Date().toISOString();
  existing.total_discovered = existing.prospects.length;

  fs.writeFileSync(discoverFile, JSON.stringify(existing, null, 2));

  console.log(`\n✅ Intégration complète!`);
  console.log(`   📊 Base totale: ${existing.prospects.length} prospects`);
  console.log(`   💾 Fichier: ${discoverFile}`);
  console.log(`\n💡 Prochaine étape: node scripts/import-to-app.js\n`);

  return existing;
}

integrateGooglePlaces().catch(e => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
