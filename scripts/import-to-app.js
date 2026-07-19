#!/usr/bin/env node
/**
 * Import des prospects découverts dans la PWA
 * Lit prospects-discovered.json et les formate pour localStorage/Notion
 */

const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../js/data/prospects-discovered.json');

if (!fs.existsSync(dataFile)) {
  console.error('❌ Fichier prospects-discovered.json introuvable.');
  console.error('   Exécute d\'abord: node scripts/discover-prospects.js');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const prospects = data.prospects || [];

// Format pour localStorage (compatible avec clients.js)
const formattedClients = prospects.map((p, idx) => ({
  id: p.email || `prospect-${idx}`,
  nom: p.nom,
  entreprise: p.entreprise,
  email: p.email,
  telephone: p.telephone,
  site: p.site,
  ville: p.ville,
  persona: p.persona,
  score: p.score,
  notes: `${p.notes}\n\n📊 Sources: ${p.sources.join(', ')}\n🔗 LinkedIn: ${p.reseaux_sociaux.linkedin}`,
  createdAt: p.enrichi_le,
  updatedAt: p.enrichi_le,
  source: 'auto-discovery'
}));

// Générer l'HTML d'import
const htmlImport = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Import Prospects - 3KOS SalesOS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #161513;
      color: #e8e8e0;
      padding: 20px;
      margin: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #1a1915;
      border: 1px solid #3a3930;
      border-radius: 12px;
      padding: 40px;
    }
    h1 { color: #d4af37; margin-top: 0; }
    .prospect {
      background: #252420;
      border-left: 4px solid #d4af37;
      padding: 16px;
      margin: 12px 0;
      border-radius: 6px;
    }
    .prospect h3 { margin: 0 0 8px 0; color: #d4af37; }
    .prospect p { margin: 4px 0; font-size: 14px; }
    .score { color: #d4af37; font-weight: bold; }
    .btn {
      background: #d4af37;
      color: #161513;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
      font-size: 16px;
    }
    .btn:hover { background: #e6c200; }
    .success { color: #8fbf8f; }
    .note { color: #8a8a80; font-size: 12px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Import de ${formattedClients.length} Prospects</h1>
    <p>Découverts le: <strong>${new Date(data.discovered_at).toLocaleDateString('fr-FR')}</strong></p>

    <div id="prospects">
${formattedClients.map(p => `
      <div class="prospect">
        <h3>${p.nom}</h3>
        <p><strong>${p.entreprise}</strong> • ${p.ville}</p>
        <p>📧 ${p.email}</p>
        <p>☎️ ${p.telephone}</p>
        <p>🌐 <a href="${p.site}" target="_blank" style="color:#d4af37">${p.site}</a></p>
        <p>👤 <strong>${p.persona}</strong> • <span class="score">Score: ${p.score}/100</span></p>
        <p style="font-size:13px; color:#a8a8a0">${p.notes.substring(0, 150)}...</p>
      </div>
`).join('')}
    </div>

    <button class="btn" onclick="importToLocalStorage()">📥 Importer dans l'app</button>
    <button class="btn" onclick="copyJSON()" style="background:#666; margin-left:10px;">📋 Copier JSON</button>

    <div id="message" style="margin-top:20px;"></div>

    <p class="note">
      ✅ Les prospects seront importés dans le Fichier Clients de 3KOS SalesOS.<br>
      💡 Vous pouvez ensuite les synchroniser avec Notion depuis l'app.
    </p>
  </div>

  <script>
    const PROSPECTS_DATA = ${JSON.stringify(formattedClients)};

    function importToLocalStorage() {
      try {
        // Charger les clients existants
        const existing = JSON.parse(localStorage.getItem('s3k_clients') || '[]');

        // Fusionner (pas de doublons par email)
        const existingEmails = new Set(existing.map(c => c.email));
        const newClients = PROSPECTS_DATA.filter(p => !existingEmails.has(p.email));

        const allClients = [...existing, ...newClients];
        localStorage.setItem('s3k_clients', JSON.stringify(allClients));

        const msg = document.getElementById('message');
        msg.innerHTML = \`
          <div style="color: #8fbf8f; background:#1e2e1e; padding:16px; border-radius:6px;">
            <h3 style="margin-top:0; color:#8fbf8f;">✅ Import réussi!</h3>
            <p><strong>\${newClients.length} nouveaux prospects</strong> importés.</p>
            <p><strong>\${existing.length} prospects</strong> existaient déjà.</p>
            <p style="margin-top:12px;">👉 <a href="/index.html?target=clients" style="color:#d4af37; text-decoration:none;"><strong>Ouvrir le Fichier Clients →</strong></a></p>
          </div>
        \`;
      } catch (e) {
        const msg = document.getElementById('message');
        msg.innerHTML = \`<div style="color:#e58a7a;">❌ Erreur: \${e.message}</div>\`;
      }
    }

    function copyJSON() {
      navigator.clipboard.writeText(JSON.stringify(PROSPECTS_DATA, null, 2))
        .then(() => {
          const msg = document.getElementById('message');
          msg.innerHTML = '<div style="color: #8fbf8f;">✅ JSON copié dans le presse-papiers</div>';
          setTimeout(() => { msg.innerHTML = ''; }, 2000);
        });
    }
  </script>
</body>
</html>`;

// Sauvegarder la page HTML d'import
const importPath = path.join(__dirname, '../import-prospects.html');
fs.writeFileSync(importPath, htmlImport);

// Afficher les prospects
console.log(`\n📊 ${prospects.length} prospects prêts à être importés\n`);
prospects.forEach((p, i) => {
  console.log(`${i + 1}. ${p.nom.padEnd(25)} | Score: ${p.score}/100 | ${p.email}`);
});

console.log(`\n📄 Page d'import créée: ${importPath}`);
console.log(`   Ouvre cette URL: http://localhost:8137/import-prospects.html\n`);

// Sauvegarder aussi pour localStorage directement
const localStorageFile = path.join(__dirname, '../js/data/clients-import.json');
fs.writeFileSync(localStorageFile, JSON.stringify(formattedClients, null, 2));
console.log(`💾 Données formatées: ${localStorageFile}\n`);
