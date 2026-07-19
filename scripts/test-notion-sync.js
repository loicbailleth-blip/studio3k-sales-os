#!/usr/bin/env node
/**
 * Test de connexion Notion et synchronisation
 * Vérifie les identifiants et synce les clients
 */

const fs = require('fs');
const path = require('path');

async function testNotionConnection() {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_ID;

  console.log("\n🔍 Vérification Notion...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (!token || !dbId) {
    console.log("❌ Configuration Notion manquante\n");
    console.log("📋 Pour configurer Notion :\n");
    console.log("1️⃣  Crée une intégration Notion :");
    console.log("   https://www.notion.so/my-integrations\n");
    console.log("2️⃣  Copie le 'Internal Integration Token'\n");
    console.log("3️⃣  Crée une base de données avec ces champs :");
    console.log("   - Nom (title)");
    console.log("   - Entreprise (rich_text)");
    console.log("   - Email (email)");
    console.log("   - Téléphone (phone_number)");
    console.log("   - Site (url)");
    console.log("   - Ville (rich_text)");
    console.log("   - Persona (select)");
    console.log("   - Score (number)");
    console.log("   - Notes (rich_text)\n");
    console.log("4️⃣  Partage la base avec ton intégration\n");
    console.log("5️⃣  Configure dans 3KOS :");
    console.log("   - Ouvre Bibliothèque > Paramètres");
    console.log("   - Remplis Token Notion et ID Database");
    console.log("   - Clique 'Enregistrer config'\n");
    console.log("6️⃣  Relance la sync depuis Fichier Clients\n");
    return false;
  }

  console.log("✅ Token configuré");
  console.log("✅ Database ID configuré\n");

  try {
    // Test la connexion
    const response = await fetch("https://api.notion.com/v1/databases/" + dbId, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28"
      }
    });

    if (response.ok) {
      const db = await response.json();
      console.log("✅ CONNEXION NOTION VALIDÉE!\n");
      console.log(`📊 Base: ${db.title || 'Sans titre'}`);
      console.log(`   ${db.object === 'database' ? '✓ Type: Database' : '✗ Type incorrect'}`);

      // Compter les pages
      const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Notion-Version": "2022-06-28"
        }
      });

      if (queryRes.ok) {
        const results = await queryRes.json();
        console.log(`   📝 ${results.results.length} pages existantes\n`);

        console.log("🚀 SYNC POSSIBLE!\n");
        console.log("Relance depuis 3KOS :");
        console.log("  1. Fichier Clients");
        console.log("  2. ↻ Synchroniser Notion\n");
      }

      return true;
    } else {
      const err = await response.json();
      console.log("❌ Erreur Notion :", err.message);
      console.log("\n💡 Vérifications :");
      console.log("   - Token correct?");
      console.log("   - Database ID correct?");
      console.log("   - Intégration partagée avec la base?");
      return false;
    }
  } catch (e) {
    console.log("❌ Erreur réseau:", e.message);
    return false;
  }
}

testNotionConnection();
