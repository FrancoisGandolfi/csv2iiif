#!/usr/bin/env node
// manifestFromCsv.js

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const axios = require('axios');
const he = require('he');

// ---------------------------
// Mapping des champs Dublin Core vers labels franÃ§ais
// ---------------------------
const DC_LABELS = {
  "dcterms:abstract": "RÃ©sumÃ©",
  "dcterms:accessRights": "Droits dâ€™accÃ¨s",
  "dcterms:accrualMethod": "ModalitÃ© dâ€™entrÃ©e",
  "dcterms:accrualPeriodicity": "PÃ©riodicitÃ© des entrÃ©es",
  "dcterms:accrualPolicy": "Politique dâ€™entrÃ©e",
  "dcterms:alternative": "Titre secondaire",
  "dcterms:audience": "Public",
  "dcterms:educationLevel": "Niveau dâ€™Ã©ducation du public",
  "dcterms:bibliographicCitation": "Citation bibliographique",
  "dcterms:conformsTo": "Se conforme Ã ",
  "dcterms:contributor": "Contributeur(s)",
  "dcterms:coverage": "ThÃ¨me(s)",
  "dcterms:creator": "Auteur(s)",
  "dcterms:date": "Date de crÃ©ation",
  "dcterms:dateAccepted": "Date dâ€™acceptation",
  "dcterms:available": "Date de disponibilitÃ©",
  "dcterms:dateCopyrighted": "Date du copyright",
  "dcterms:created": "Date de crÃ©ation",
  "dcterms:issued": "Date de publication",
  "dcterms:modified": "Date de modification",
  "dcterms:dateSubmitted": "Date de soumission",
  "dcterms:valid": "Date de validitÃ©",
  "dcterms:description": "Description intellectuelle",
  "dcterms:extent": "Importance matÃ©rielle",
  "dcterms:format": "Description matÃ©rielle",
  "dcterms:hasFormat": "A un format",
  "dcterms:hasPart": "A une partie",
  "dcterms:hasVersion": "A une version",
  "dcterms:identifier": "Identifiant de la reproduction numÃ©rique",
  "dcterms:instructionalMethod": "MÃ©thode pÃ©dagogique",
  "dcterms:isFormatOf": "Est un format de",
  "dcterms:isPartOf": "Cadre de classement",
  "dcterms:isReferencedBy": "Est rÃ©fÃ©rencÃ© par",
  "dcterms:isReplacedBy": "Est remplacÃ© par",
  "dcterms:isRequiredBy": "Est requis par",
  "dcterms:isVersionOf": "Est une version de",
  "dcterms:language": "Langue",
  "dcterms:license": "Licence",
  "dcterms:mediator": "MÃ©diateur",
  "dcterms:medium": "Support",
  "dcterms:provenance": "Provenance",
  "dcterms:publisher": "Ã‰diteur commercial",
  "dcterms:references": "RÃ©fÃ©rence",
  "dcterms:relation": "Notice bibliographique",
  "dcterms:replaces": "Remplace",
  "dcterms:requires": "Requiert",
  "dcterms:rights": "Droits",
  "dcterms:rightsHolder": "DÃ©tenteur des droits",
  "dcterms:source": "Cote du document original",
  "dcterms:spatial": "Lieu(x)",
  "dcterms:subject": "Sujet(s) reprÃ©sentÃ©(s)",
  "dcterms:type": "Type de document"
};

// ---------------------------
// Helpers
// ---------------------------
function splitMulti(val) {
  return val ? val.split('|').map(s => s.trim()).filter(Boolean) : [];
}

function parseUrlLabelList(val) {
  const items = splitMulti(val);
  const hasUrl = items.some(item => /^https?:\/\//.test(item));

  if (hasUrl) {
    return items.map(item => {
      const trimmed = item.trim();
      if (/^https?:\/\//.test(trimmed)) {
        const [uri, ...rest] = trimmed.split(' ');
        const label = rest.join(' ') || uri;
        return `<a class="uri-value-link" href="${he.encode(uri)}">${he.encode(label)}</a>`;
      } else {
        return he.encode(trimmed);
      }
    });
  } else {
    return items;
  }
}

async function fetchImageDimensions(infoUrl) {
  try {
    const response = await axios.get(infoUrl);
    return {
      height: response.data.height,
      width: response.data.width
    };
  } catch (err) {
    console.error(`âŒ Erreur en rÃ©cupÃ©rant ${infoUrl} :`, err.message);
    return { height: 2000, width: 1500 };
  }
}

// ---------------------------
// Build Manifest
// ---------------------------
async function buildManifest(row, { protocol, host, iiifField }) {
  const identifier = row['dcterms:identifier'] || `doc-${Math.floor(Math.random() * 100000)}`;
  const idBase = `${protocol}://${host}/${identifier}/manifest`;

  const iiifImages = splitMulti(row[iiifField]);
  if (iiifImages.length === 0) throw new Error('Aucune URL IIIF trouvÃ©e pour cette ligne');

  const canvases = [];
  for (let idx = 0; idx < iiifImages.length; idx++) {
    const infoUrl = iiifImages[idx];
    const imageBase = infoUrl.replace(/info\.json$/, '').replace(/\/$/, '');
    const canvasId = `${idBase}/canvas/${idx + 1}`;
    const annotationId = `${canvasId}/annotation/1`;

    const { height, width } = await fetchImageDimensions(infoUrl);

    canvases.push({
      '@id': canvasId,
      '@type': 'sc:Canvas',
      label: `Page ${idx + 1}`,
      height,
      width,
      images: [{
        '@id': annotationId,
        '@type': 'oa:Annotation',
        motivation: 'sc:painting',
        on: canvasId,
        resource: {
          '@id': `${imageBase}/full/full/0/default.jpg`,
          '@type': 'dctypes:Image',
          format: 'image/jpeg',
          height,
          width,
          service: {
            '@context': 'http://iiif.io/api/image/2/context.json',
            '@id': imageBase,
            profile: 'http://iiif.io/api/image/2/level2.json'
          }
        }
      }]
    });
  }

// RÃ©cupÃ¨re la colonne 'dcterms:title' (insensible Ã  la casse)
const titleField = Object.keys(row).find(k => k.toLowerCase() === 'dcterms:title');
const title = he.encode(titleField ? row[titleField]?.trim() : 'Titre non dÃ©fini');

const metadata = [
  { label: "Title", value: title },
  ...Object.keys(DC_LABELS)
    .map(f => {
      const value = parseUrlLabelList(row[f]);
      return value && value.length !== 0 ? { label: DC_LABELS[f], value } : null;
    })
    .filter(Boolean)
];

return {
  '@context': 'http://iiif.io/api/presentation/2/context.json',
  '@id': idBase,
  '@type': 'sc:Manifest',
  label: title,
  description: row['dcterms:description']?.trim() || 'Description non disponible',
  metadata,
  license: 'https://creativecommons.org/publicdomain/zero/1.0/',
  attribution: 'HumathÃ¨que Condorcet',
  logo: {
    '@id': 'https://bibnum.campus-condorcet.fr/themes/condorcet/asset/img/logo/favicon.png'
  },
  sequences: [{
    '@type': 'sc:Sequence',
    '@id': `${idBase}/sequence/normal`,
    canvases
  }]
};

// ---------------------------
// Main
// ---------------------------
(async () => {
  const csvFile = process.argv[2];
  const outDir = process.argv[3] || 'manifests';
  const host = process.env.HOST || 'localhost:3000';
  const protocol = process.env.PROTOCOL || 'http';

  if (!csvFile) {
    console.error('Usage: node manifestFromCsv.js <fichier.csv> [dossierSortie]');
    process.exit(1);
  }

  const content = fs.readFileSync(csvFile, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true });

  // VÃ©rification de la colonne iiif/IIIF
  const iiifField = Object.keys(records[0]).find(c => c.toLowerCase() === 'iiif');
  if (!iiifField) {
    console.error('âŒ ERREUR: le CSV doit contenir une colonne "iiif" ou "IIIF".');
    process.exit(1);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (const [idx, row] of records.entries()) {
    try {
      if (!row[iiifField] || row[iiifField].trim() === '') {
        console.error(`âŒ ERREUR: pas d'URL IIIF pour la ligne ${idx + 2} (identifiant: ${row['dcterms:identifier'] || 'non dÃ©fini'})`);
        continue;
      }

      const manifest = await buildManifest(row, { protocol, host, iiifField });
      const filename = path.join(outDir, `${row['dcterms:identifier'] || `doc-${idx+1}`}.json`);
      fs.writeFileSync(filename, JSON.stringify(manifest, null, 2));
      console.log(`âœ… Manifest gÃ©nÃ©rÃ© : ${filename}`);
    } catch (err) {
      console.error(`âŒ Erreur pour ${row['dcterms:identifier'] || `ligne ${idx+2}`} : ${err.message}`);
    }
  }
})();
