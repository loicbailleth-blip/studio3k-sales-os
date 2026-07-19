# Pipeline CI/CD: Git → GitHub → Netlify

Repo local initialisé et prêt pour auto-déploiement sur chaque push.

## 1️⃣ Créer le repo GitHub

1. Va sur https://github.com/new
2. **Repository name:** `studio3k-sales-os`
3. **Description:** 3KOS SalesOS – Copilote de prospection pour 300+ appels/semaine
4. **Public** (pour Netlify)
5. Coche **Add a README file** ✋ **NON** (on a déjà le nôtre)
6. Click **Create repository**

## 2️⃣ Connecter le repo local à GitHub

Dans le terminal:

```bash
cd D:\STUDIO3K_SALES_OS

# Ajoute l'origin GitHub
git remote add origin https://github.com/TON_USERNAME/studio3k-sales-os.git

# Renomme main (si besoin)
git branch -M main

# Push le commit initial
git push -u origin main
```

## 3️⃣ Configurer Netlify pour auto-déploiement

1. Va sur https://app.netlify.com
2. **New site from Git** → **GitHub**
3. Authorize → Select **studio3k-sales-os**
4. **Build settings:**
   - Build command: (laisser vide — c'est une PWA statique)
   - Publish directory: `.` (racine du repo)
5. Click **Deploy site**

## 4️⃣ Test du pipeline

Maintenant, chaque `git push` déclenche le déploiement automatique:

```bash
# Modification locale
echo "// test" >> js/app.js
git add js/app.js
git commit -m "Test: vérifier auto-déploiement"
git push

# Netlify redéploie en ~30 secondes
# Voir le statut sur https://app.netlify.com/sites/ton-site
```

## 📍 URL en production

Après déploiement Netlify, ton app sera en direct sur:
- `https://studio3k-sales-os.netlify.app` (auto-généré)
- Ou un domaine custom si tu le configures

**Dès maintenant:** 300 appels/semaine, zéro risque d'oublier un push.
