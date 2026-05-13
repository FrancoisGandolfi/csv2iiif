Ce script Node.js permet de **générer des manifests IIIF (International Image Interoperability Framework)** à partir d'un fichier CSV contenant des métadonnées Dublin Core et des URLs d'images IIIF. Voici une explication détaillée de son fonctionnement et comment l'utiliser.

---

---

## **1. Prérequis**
Avant de l'exécuter, assurez-vous d'avoir installé les dépendances nécessaires :
```bash
npm install csv-parse axios he
```
*(Le script utilise `csv-parse/sync` pour parser le CSV, `axios` pour récupérer les dimensions des images, et `he` pour encoder les caractères spéciaux en HTML.)*

---

---

## **2. Structure du CSV attendu**
Votre fichier CSV doit contenir :
- **Une colonne `iiif` ou `IIIF`** : avec les URLs des fichiers `info.json` des images IIIF (ex: `https://exemple.fr/image1/info.json`).
- **Des colonnes Dublin Core** : comme `dcterms:title`, `dcterms:creator`, `dcterms:identifier`, etc. *(Voir le mapping `DC_LABELS` dans le script pour la liste complète.)*

**Exemple de CSV :**
```csv
dcterms:identifier,dcterms:title,dcterms:creator,iiif
doc-001,Titre du document,Auteur 1,https://exemple.fr/image1/info.json
doc-002,Autre titre,Auteur 2,https://exemple.fr/image2/info.json|https://exemple.fr/image3/info.json
```

> ⚠️ **Note** : Les valeurs multiples (ex: plusieurs URLs IIIF) doivent être séparées par `|`.

---

---

## **3. Exécution du script**
### **Syntaxe de base :**
```bash
node manifestFromCsv.js <fichier.csv> [dossierSortie]
```
- `<fichier.csv>` : Chemin vers votre fichier CSV.
- `[dossierSortie]` : *(Optionnel)* Dossier où les manifests seront générés. Par défaut : `manifests/`.

### **Variables d'environnement optionnelles :**
- `HOST` : Hôte pour les URLs des manifests (ex: `localhost:3000`). Par défaut : `localhost:3000`.
- `PROTOCOL` : Protocole (`http` ou `https`). Par défaut : `http`.

**Exemple :**
```bash
HOST="mon-serveur.fr" PROTOCOL="https" node manifestFromCsv.js mon_fichier.csv manifests/
```

---

---
## **4. Fonctionnement détaillé**
### **Étapes clés :**
1. **Lecture du CSV** :
   - Le script lit le fichier CSV et parse chaque ligne en objet JavaScript.
   - Il vérifie la présence d'une colonne `iiif` ou `IIIF`.

2. **Construction du manifest** :
   - Pour chaque ligne du CSV :
     - **Création des `canvases`** : Un `canvas` IIIF est généré pour chaque URL IIIF trouvée dans la colonne `iiif`.
       - Les dimensions de l'image sont récupérées via une requête HTTP vers l'URL `info.json`.
       - Si la requête échoue, des dimensions par défaut (`2000x1500`) sont utilisées.
     - **Métadonnées** :
       - Le titre est extrait de `dcterms:title` (ou "Titre non défini" si absent).
       - Les autres champs Dublin Core sont mappés en français via `DC_LABELS`.
       - Les valeurs multiples (séparées par `|`) sont transformées en listes.
       - Les URLs dans les métadonnées sont converties en liens HTML cliquables (ex: `<a href="...">Label</a>`).

3. **Génération du fichier JSON** :
   - Chaque manifest est sauvegardé dans un fichier JSON nommé `<identifiant>.json` (ou `doc-<index>.json` si l'identifiant est manquant).

---

---
## **5. Exemple de sortie**
Pour une ligne CSV comme :
```csv
dcterms:identifier,dcterms:title,iiif
doc-001,"Mon livre",https://exemple.fr/image1/info.json
```
Le script générera un fichier `manifests/doc-001.json` avec un manifest IIIF valide, contenant :
- Un `canvas` pour `https://exemple.fr/image1/info.json`.
- Les métadonnées associées (titre, identifiant, etc.).

---

---
## **6. Personnalisation possible**
### **Adapter le mapping des métadonnées**
Modifiez l'objet `DC_LABELS` pour ajouter/supprimer des champs Dublin Core ou changer leurs libellés en français.

### **Changer les dimensions par défaut**
Dans `fetchImageDimensions`, modifiez :
```javascript
return { height: 2000, width: 1500 };
```

### **Ajouter des champs personnalisés**
Si votre CSV contient des colonnes non-Dublin Core, ajoutez-les manuellement dans la section `metadata` de `buildManifest`.

---

---
## **7. Cas d'erreur courants**
- **Colonne `iiif` manquante** : Le script s'arrête avec une erreur.
- **URL IIIF invalide** : Le script utilise des dimensions par défaut et affiche un avertissement.
- **Ligne sans URL IIIF** : La ligne est ignorée, et un message d'erreur est affiché.

---
---
## **8. Exemple complet**
### **Fichier CSV (`exemple.csv`) :**
```csv
dcterms:identifier,dcterms:title,dcterms:creator,iiif
doc-001,"Titre 1","Auteur 1",https://exemple.fr/image1/info.json
doc-002,"Titre 2","Auteur 2",https://exemple.fr/image2/info.json|https://exemple.fr/image3/info.json
```

### **Commande :**
```bash
node manifestFromCsv.js exemple.csv
```

### **Résultat :**
- Deux fichiers JSON générés dans `manifests/` :
  - `manifests/doc-001.json`
  - `manifests/doc-002.json`

---
---
## **9. Pour aller plus loin**
- **Valider les manifests** : Utilisez un validateur IIIF comme [iiif.io/validator](https://iiif.io/api/presentation/validator/).
- **Automatiser** : Intégrez ce script dans un workflow (ex: GitHub Actions) pour générer automatiquement les manifests à chaque mise à jour du CSV.

---
---
### **Besoin d'aide pour adapter le script à votre cas précis ?**
Dites-moi :
- La structure exacte de votre CSV.
- Les champs Dublin Core que vous utilisez.
- Si vous souhaitez ajouter des fonctionnalités (ex: gestion de collections, thumbnails, etc.).