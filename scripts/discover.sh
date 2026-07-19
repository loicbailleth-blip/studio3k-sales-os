#!/bin/bash
# Script maître pour découvrir et importer des prospects
# Usage: ./scripts/discover.sh <keyword>
# Exemple: ./scripts/discover.sh "conseil-en-investissement-lille"

echo "🎯 Moteur de Découverte de Prospects — 3K OS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -z "$1" ]; then
  echo "📋 Catégories disponibles :"
  echo ""
  echo "  node scripts/discover-by-keyword.js"
  echo ""
  echo "Puis modifier 'PROSPECTS_BY_KEYWORD' dans le script pour ajouter :"
  echo ""
  echo "  'avocat-immobilier-lille': [ ... ]"
  echo "  'coach-lille': [ ... ]"
  echo "  'plombier-roubaix': [ ... ]"
  echo ""
  echo "Workflow automatisé :"
  echo "  1. node scripts/discover-by-keyword.js"
  echo "  2. node scripts/import-to-app.js"
  echo "  3. Ouvre http://localhost:8137/import-prospects.html"
  echo "  4. Clique 'Importer dans l'app'"
  echo ""
  exit 0
fi

echo "🔍 Découverte : $1"
echo ""

cd "$(dirname "$0")/.." || exit 1

echo "Step 1/2 : Découverte..."
node scripts/discover-by-keyword.js

echo ""
echo "Step 2/2 : Génération page d'import..."
node scripts/import-to-app.js

echo ""
echo "✅ Import prêt!"
echo "   Ouvre: http://localhost:8137/import-prospects.html"
echo ""
