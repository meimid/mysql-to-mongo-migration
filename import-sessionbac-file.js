const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./config');

const DEFAULT_BATCH_SIZE = 1000;

const SessionBacSchema = new mongoose.Schema({
  id: Number,
  etablissement_id: String,
  nni: String,
  numDossier: String,
  serie: String,
  typec: String,
  nomAr: String,
  nomFr: String,
  lieuNaissAr: String,
  lieuNaissFr: String,
  dateNaiss: Date,
  centreAr: String,
  centreFr: String,
  numAnonymat: String,
  groupeAnonymat: String,
  moyenne: Number,
  decision: String,
  LMATF: String,
  coeficient: Number,
  Maxinote: Number,
  Noteecrite: Number,
  noteS1: Number,
  noteS2: Number,
  noteRetenue: Number,
  nomMatiereF: String,
  nomMatiereA: String,
  type: String,
  ecoleAr: String,
  ecole: String
}, { collection: 'sessionbac' });

SessionBacSchema.index({ numDossier: 1 });
SessionBacSchema.index({ nni: 1 });

const SessionBacModel = mongoose.model('SessionBacImport', SessionBacSchema, 'sessionbac');

const HEADER_ALIASES = {
  id: ['id', 'ID'],
  etablissement_id: ['etablissement_id', 'etablissementId', 'ETABLISSEMENT_ID'],
  nni: ['nni', 'NNI'],
  numDossier: ['numDossier', 'NumDossier', 'num_dossier', 'NODOSS', 'NODOS', 'NumeroDossier', 'numeroDossier'],
  serie: ['serie', 'SERIE'],
  typec: ['typec', 'typeC', 'type_c', 'TYPEC'],
  nomAr: ['nomAr', 'NOMAR', 'NOMPA', 'nom_ar'],
  nomFr: ['nomFr', 'NOMFR', 'NOMPL', 'nom_fr'],
  lieuNaissAr: ['lieuNaissAr', 'LIEUNA', 'lieu_naiss_ar'],
  lieuNaissFr: ['lieuNaissFr', 'LIEUN', 'lieu_naiss_fr'],
  dateNaiss: ['dateNaiss', 'DATN', 'date_naiss'],
  centreAr: ['centreAr', 'CENTREA', 'centre_ar'],
  centreFr: ['centreFr', 'CENTREF', 'centre_fr'],
  numAnonymat: ['numAnonymat', 'NOANO', 'num_anonymat'],
  groupeAnonymat: ['groupeAnonymat', 'NOETCC', 'groupe_anonymat'],
  moyenne: ['moyenne', 'MOYG', 'Moyg'],
  decision: ['decision', 'Decision', 'DECISION'],
  LMATF: ['LMATF', 'lmatf'],
  coeficient: ['coeficient', 'coefficient', 'Coefn', 'COEF', 'coef'],
  Maxinote: ['Maxinote', 'MAXINOTE', 'maxiNote', 'noteMatiere'],
  Noteecrite: ['Noteecrite', 'NOTE_ECRITE', 'noteEcrite'],
  noteS1: ['noteS1', 'NE1'],
  noteS2: ['noteS2', 'NE2'],
  noteRetenue: ['noteRetenue', 'NOTE_RETENUE'],
  nomMatiereF: ['nomMatiereF', 'matiere', 'matiereFr'],
  nomMatiereA: ['nomMatiereA', 'LMATA', 'matiereAr'],
  type: ['type', 'Type'],
  ecoleAr: ['ecoleAr', 'LETABA'],
  ecole: ['ecole', 'LETAB']
};

function parseArgs(argv) {
  const args = {
    file: null,
    replace: false,
    append: false,
    dryRun: false,
    batchSize: DEFAULT_BATCH_SIZE
  };

  for (const arg of argv.slice(2)) {
    if (arg === '--replace') args.replace = true;
    else if (arg === '--append') args.append = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--batch-size=')) args.batchSize = Number(arg.split('=')[1]);
    else if (!args.file) args.file = arg;
  }

  if (!args.file || args.replace === args.append || !Number.isFinite(args.batchSize) || args.batchSize < 1) {
    printUsage();
    process.exit(1);
  }

  return args;
}

function printUsage() {
  console.log(`
Usage:
  node import-sessionbac-file.js <file.csv|file.xlsx|file.xls> --replace
  node import-sessionbac-file.js <file.csv|file.xlsx|file.xls> --append

Options:
  --replace              Drop Mongo collection sessionbac before importing.
  --append               Insert rows without dropping existing sessionbac data.
  --dry-run              Parse and show counts/sample, but do not write MongoDB.
  --batch-size=1000      Mongo insert batch size.

Examples:
  node import-sessionbac-file.js sessionbac.csv --replace
  node import-sessionbac-file.js sessionbac.xlsx --replace --batch-size=500
`);
}

function normalizeHeader(header) {
  return String(header || '').replace(/^\uFEFF/, '').trim();
}

function getValue(row, field) {
  for (const header of HEADER_ALIASES[field] || [field]) {
    const value = row[header];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function cleanString(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function parseNumber(value) {
  const text = cleanString(value);
  if (text === null) return null;
  const number = Number(text.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function parseInteger(value) {
  const number = parseNumber(value);
  return number === null ? null : Math.trunc(number);
}

function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    // Excel serial date, 25569 days between 1899-12-30 and 1970-01-01.
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  const text = String(value).trim();
  if (!text) return null;

  const slashDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashDate) {
    const [, day, month, year] = slashDate;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapRow(row, index) {
  return {
    id: parseNumber(getValue(row, 'id')) || index + 1,
    etablissement_id: cleanString(getValue(row, 'etablissement_id')),
    nni: cleanString(getValue(row, 'nni')),
    numDossier: cleanString(getValue(row, 'numDossier')),
    serie: cleanString(getValue(row, 'serie')),
    typec: cleanString(getValue(row, 'typec')),
    nomAr: cleanString(getValue(row, 'nomAr')),
    nomFr: cleanString(getValue(row, 'nomFr')),
    lieuNaissAr: cleanString(getValue(row, 'lieuNaissAr')),
    lieuNaissFr: cleanString(getValue(row, 'lieuNaissFr')),
    dateNaiss: parseDate(getValue(row, 'dateNaiss')),
    centreAr: cleanString(getValue(row, 'centreAr')),
    centreFr: cleanString(getValue(row, 'centreFr')),
    numAnonymat: cleanString(getValue(row, 'numAnonymat')),
    groupeAnonymat: cleanString(getValue(row, 'groupeAnonymat')),
    moyenne: parseNumber(getValue(row, 'moyenne')),
    decision: cleanString(getValue(row, 'decision')),
    LMATF: cleanString(getValue(row, 'LMATF')),
    coeficient: parseInteger(getValue(row, 'coeficient')),
    Maxinote: parseNumber(getValue(row, 'Maxinote')),
    Noteecrite: parseNumber(getValue(row, 'Noteecrite')),
    noteS1: parseNumber(getValue(row, 'noteS1')),
    noteS2: parseNumber(getValue(row, 'noteS2')),
    noteRetenue: parseNumber(getValue(row, 'noteRetenue')),
    nomMatiereF: cleanString(getValue(row, 'nomMatiereF')),
    nomMatiereA: cleanString(getValue(row, 'nomMatiereA')),
    type: cleanString(getValue(row, 'type')),
    ecoleAr: cleanString(getValue(row, 'ecoleAr')),
    ecole: cleanString(getValue(row, 'ecole'))
  };
}

function detectDelimiter(headerLine) {
  const delimiters = [',', ';', '\t'];
  return delimiters
    .map(delimiter => ({ delimiter, count: headerLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function parseCsv(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map(line => {
    const values = parseCsvLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null]));
  });
}

function parseExcel(filePath) {
  let xlsx;
  try {
    xlsx = require('xlsx');
  } catch (error) {
    throw new Error('Excel import requires package xlsx. Run: npm install xlsx');
  }

  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: null, raw: true });
}

function readRows(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.csv' || extension === '.tsv') {
    return parseCsv(fs.readFileSync(filePath, 'utf8'));
  }
  if (extension === '.xlsx' || extension === '.xls') {
    return parseExcel(filePath);
  }
  throw new Error(`Unsupported file extension: ${extension}. Use CSV, XLSX, or XLS.`);
}

async function insertInBatches(documents, batchSize) {
  let inserted = 0;
  for (let index = 0; index < documents.length; index += batchSize) {
    const batch = documents.slice(index, index + batchSize);
    await SessionBacModel.collection.insertMany(batch, { ordered: false });
    inserted += batch.length;
    console.log(`⬆️ Inserted ${inserted}/${documents.length}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const filePath = path.resolve(args.file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const sourceRows = readRows(filePath);
  const documents = sourceRows.map(mapRow).filter(doc => doc.numDossier);

  console.log(`📄 Source rows: ${sourceRows.length}`);
  console.log(`✅ Rows with numDossier: ${documents.length}`);
  console.log('🔍 Sample document:', documents[0]);

  if (documents.length === 0) {
    throw new Error('No importable rows found. Check headers and numDossier values.');
  }

  if (args.dryRun) {
    console.log('🧪 Dry run complete. MongoDB was not modified.');
    return;
  }

  await mongoose.connect(config.mongo.uri);
  console.log('✅ Connected to MongoDB');

  if (args.replace) {
    await SessionBacModel.collection.drop().catch(err => {
      if (err.code !== 26) throw err;
    });
    console.log('🗑️ Dropped existing collection sessionbac');
  }

  await insertInBatches(documents, args.batchSize);
  await SessionBacModel.createIndexes();
  console.log('✅ Indexes synchronized.');
  console.log(`🎉 Import finished. Inserted: ${documents.length}`);

  await mongoose.disconnect();
  console.log('✅ Disconnected MongoDB');
}

main().catch(async error => {
  console.error('❌ Import failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
