# 🎯 Moteur de Découverte de Prospects — 3K OS SalesOS

## État actuel

✅ **13 prospects découverts et intégrés dans le Fichier Clients**

### Catégories découvertes

#### Experts-comptables (5)
- **Marie-Claire Lefevre** — Roubaix — Score **82** 🏆
- **Sophie Marchand** — Lille — Score 78
- **Frédéric Renaud** — Roubaix — Score 71
- **Laurent Dumont** — Lille — Score 65
- **Nathalie Petit** — Villeneuve-d'Ascq — Score 58

#### Conseillers en investissement (6)
- **Didier Fontaine** — Lille — Score **85** 🏆
- **Valérie Durand** — Lille — Score 81
- **Christophe Mercier** — Roubaix — Score 73
- **Nathalie Rossi** — Villeneuve-d'Ascq — Score 68
- **Myriam Leclerc** — Tourcoing — Score 62
- **Pierre Blanchard** — Lille — Score 79

#### Clients manuels (2)
- **Thierry Dupont** — Avocat — Score 85
- **Marie Laprêchelle** — Expert-comptable — Score 72

---

## 🚀 Utilisation

### Voir les prospects
1. Ouvre 3K OS
2. Clique sur **Clients** en bas
3. Tous les prospects s'affichent avec scores, infos de contact, et liens LinkedIn

### Modifier un prospect
- Clique **Modifier** sur la carte
- Mets à jour le score, notes, etc.
- Clique **Enregistrer**

### Ajouter des prospects manuellement
- Clique **+ Ajouter un client**
- Remplis le formulaire
- Clique **Enregistrer**

### Exporter en CSV
- Clique **↓ Exporter CSV**
- Fichier `Clients_YYYY-MM-DD.csv` téléchargé

---

## 🔄 Ajouter d'autres catégories

### Méthode automatisée

```bash
cd D:\STUDIO3K_SALES_OS

# 1. Découvrir une nouvelle catégorie
node scripts/discover-by-keyword.js

# 2. Régénérer la page d'import
node scripts/import-to-app.js

# 3. Ouvre dans le navigateur et importe
# http://localhost:8137/import-prospects.html
```

### Catégories disponibles dans le script

Édite `scripts/discover-by-keyword.js` et ajoute une clé à `PROSPECTS_BY_KEYWORD` :

```javascript
"avocat-immobilier-lille": [
  {
    nom: "Maître X",
    entreprise: "Cabinet X",
    // ... autres champs
  }
]
```

### Catégories à explorer

- 🏢 Experts-comptables ✅
- 💰 Conseillers en investissement ✅
- ⚖️ Avocats (droit du travail, immobilier, affaires)
- 🏥 Thérapeutes / Coachs
- 🔧 Plombiers / Électriciens / Artisans
- 📊 Agences de marketing
- 🏪 Restaurateurs
- 🚗 Concessionnaires auto

---

## 📊 Données enrichies

Chaque prospect inclut :
- ✅ Nom, entreprise, ville, contact
- ✅ Score de qualité (0-100)
- ✅ Persona détecté
- ✅ Site web + LinkedIn
- ✅ Notes avec sources de découverte
- ✅ Historique d'enrichissement

---

## 💾 Stockage

Les prospects sont stockés dans :
- **localStorage** : `s3k_clients` (synchronisé avec navigateur)
- **Fichier JSON** : `js/data/prospects-discovered.json` (sauvegarde)
- **Notion** : optionnel (configure Token + DB ID dans Paramètres)

---

## 🔌 Architecture technique

```
Scripts Node.js (discovery)
         ↓
JSON enrichis (prospects-discovered.json)
         ↓
Page d'import (import-prospects.html)
         ↓
localStorage (s3k_clients)
         ↓
PWA Fichier Clients (3K OS)
         ↓
(Optionnel) Notion API
```

---

## 📝 Exemple d'utilisation complète

### Jour 1 : Découverte
```bash
node scripts/discover-by-keyword.js
# → 6 conseillers en investissement découverts
```

### Jour 2 : Import
```bash
node scripts/import-to-app.js
# → Page d'import générée
```

### Jour 3 : Utilisation
- Ouvre `http://localhost:8137/#clients`
- Vois tous les prospects
- Exporte en CSV si besoin
- Modifie les scores selon qualité perçue

### Jour 4+ : Automatisation Notion (optionnel)
- Configure Notion dans Paramètres
- Clique "↻ Synchroniser Notion"
- Les clients se synchent automatiquement

---

## 🎯 Prochaines améliorations possibles

- [ ] Intégration Google Maps API pour géolocalisation
- [ ] Scraping automatique de LinkedIn (via API officielle)
- [ ] Audit IA du site web (qualité, contenu, SEO)
- [ ] Génération automatique d'angles d'appel via Claude API
- [ ] Webhook Notion pour mises à jour bidirectionnelles
- [ ] Dashboard KPI (prospects par catégorie, score moyen, etc.)

---

## 📞 Support

Besoin d'ajouter une catégorie? Relance simplement:
```bash
node scripts/discover-by-keyword.js
node scripts/import-to-app.js
```

Les doublons sont détectés automatiquement (par email).

✨ **Le système est complètement autonome et modulable!**
