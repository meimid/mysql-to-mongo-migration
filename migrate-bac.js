const mysql = require('mysql2');
const mongoose = require('mongoose');
const config = require('./config');

const BATCH_SIZE = Number(process.env.BATCH_SIZE || 1000);

async function connectMongo() {
  await mongoose.connect(config.mongo.uri);
  console.log('✅ Connected to MongoDB');
}

const BacSchema = new mongoose.Schema({
  numDossier: { type: String, index: true },
  nni: { type: String, index: true },
  serie: String,
  typeC: String,
  nomAr: String,
  nomFr: String,
  lieuNaissAr: String,
  lieuNaissFr: String,
  dateNaiss: Date,
  centreAr: String,
  centreFr: String,
  etablissement: { type: String, index: true },
  numAnonymat: String,
  groupeAnonymat: String,
  moyenne: Number,
  decision: String,
  matiere: String,
  coeficient: Number,
  noteMatiere: Number,
  noteS1: Number,
  noteS2: Number,
  matiereAr: String,
  ecoleAr: String,
  ecole: String,
  observation: String
}, { collection: 'bac21' });

const BacModel = mongoose.model('Bac21', BacSchema, 'bac21');

function createMysqlConnection() {
  return mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.username,
    password: config.mysql.password,
    database: config.mysql.database,
    charset: 'utf8mb4'
  });
}

function formatBacRow(r) {
  return {
    numDossier: r.NODOSS,
    serie: r.SERIE,
    typeC: r.TYPEC,
    nomAr: r.NOMPA,
    nomFr: r.NOMPL,
    nni: r.NNI,
    lieuNaissAr: r.LIEUNA,
    lieuNaissFr: r.LIEUN,
    dateNaiss: r.DATN,
    centreAr: r.CENTREA,
    centreFr: r.CENTREF,
    etablissement: r.NOETS,
    numAnonymat: r.NOANO,
    groupeAnonymat: r.NOETCC,
    moyenne: r.MOYG,
    decision: r.Decision,
    matiere: r.LMATF,
    coeficient: r.Coefn,
    noteMatiere: r.MAXINOTE,
    noteS1: r.NE1,
    noteS2: r.NE2,
    matiereAr: r.LMATA,
    ecoleAr: r.LETABA,
    ecole: r.LETAB,
    observation: r.Observation
  };
}

async function insertBatch(batch, insertedCount, totalRecords) {
  if (batch.length === 0) {
    return insertedCount;
  }

  await BacModel.collection.insertMany(batch, { ordered: false });
  const nextCount = insertedCount + batch.length;
  console.log(`⬆️ Inserted ${nextCount}/${totalRecords} documents`);
  return nextCount;
}

async function streamMysqlToMongo(connection, totalRecords) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        NODOSS, SERIE, TYPEC, NOMPA, NOMPL, NNI, LIEUNA, LIEUN, DATN,
        CENTREA, CENTREF, NOETS, NOANO, NOETCC, MOYG, Decision, LMATF,
        Coefn, MAXINOTE, NE1, NE2, LMATA, LETAB, LETABA, NOMAT, Observation
      FROM CANDIDATSBAC
    `;

    let batch = [];
    let insertedCount = 0;
    let sawFirstRow = false;
    let pendingInsert = Promise.resolve();
    const stream = connection.query(sql).stream({ highWaterMark: BATCH_SIZE });

    async function flushBatch() {
      const batchToInsert = batch;
      batch = [];
      insertedCount = await insertBatch(batchToInsert, insertedCount, totalRecords);
    }

    stream.on('data', row => {
      const formatted = formatBacRow(row);

      if (!sawFirstRow) {
        console.log('🔍 Sample formatted document:', formatted);
        sawFirstRow = true;
      }

      batch.push(formatted);

      if (batch.length >= BATCH_SIZE) {
        stream.pause();
        pendingInsert = pendingInsert
          .then(flushBatch)
          .then(() => stream.resume())
          .catch(reject);
      }
    });

    stream.on('error', reject);

    stream.on('end', () => {
      pendingInsert
        .then(flushBatch)
        .then(() => resolve(insertedCount))
        .catch(reject);
    });
  });
}

async function migrate() {
  const connection = createMysqlConnection();

  try {
    await connection.promise().connect();
    console.log('✅ Connected to MySQL');

    await connectMongo();

    const [[countRow]] = await connection.promise().query('SELECT COUNT(*) AS total FROM CANDIDATSBAC');
    const totalRecords = countRow.total;
    console.log('🔢 Total records from MySQL:', totalRecords);

    if (totalRecords === 0) {
      console.warn('⚠️ No data found in MySQL. Exiting.');
      return;
    }

    await BacModel.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection Bac21');

    const insertedCount = await streamMysqlToMongo(connection, totalRecords);

    console.log(`✅ Migration completed. Inserted: ${insertedCount} documents.`);
    await BacModel.createIndexes();
    console.log('✅ Indexes synchronized.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    console.log('✅ Disconnected MongoDB');

    await connection.promise().end().catch(() => {});
    console.log('✅ Disconnected MySQL');
  }
}

migrate();
