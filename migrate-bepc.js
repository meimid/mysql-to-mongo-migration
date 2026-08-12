const Sequelize = require('sequelize');
const mongoose = require('mongoose');
const config = require('./config'); // adjust if needed

// MySQL connection
const sequelize = new Sequelize(
  config.mysql.database,
  config.mysql.username,
  config.mysql.password,
  {
    host: config.mysql.host,
    port: config.mysql.port,
    dialect: config.mysql.dialect,
    logging: false
  }
);

// MongoDB connection
async function connectMongo() {
  await mongoose.connect(config.mongo.uri);
  console.log('✅ Connected to MongoDB');
}

// Define Sequelize models
const Candidate = sequelize.define('rescnc_cand_bepc', {
  id: { type: Sequelize.INTEGER, primaryKey: true },
  NNI: Sequelize.STRING,
  NODOSS: Sequelize.STRING,
  SERIE: Sequelize.STRING,
  TYPEC: Sequelize.STRING,
  NOMPL: Sequelize.STRING,
  LIEUN: Sequelize.STRING,
  DATN: Sequelize.DATE,
  NOETS: Sequelize.STRING,
  NOETCE: Sequelize.STRING,
  NOREG: Sequelize.STRING,
  centreAr: Sequelize.STRING,
  centreFr: Sequelize.STRING,
  MOYG: Sequelize.FLOAT,
  NOANO: Sequelize.STRING,
  NOETCC: Sequelize.STRING,
  Decision: Sequelize.STRING,
  ecole: Sequelize.STRING
}, {
  tableName: 'rescnc_cand_bepc',
  timestamps: false,
  freezeTableName: true
});


const Note = sequelize.define('note_bepc', {
  id: { type: Sequelize.INTEGER, primaryKey: true },
  bepc_id: Sequelize.INTEGER,
  note: Sequelize.DOUBLE,
  lmata: Sequelize.STRING,
  lmatf: Sequelize.STRING,
  coef: Sequelize.INTEGER,
  nodos: Sequelize.STRING,
  n2: Sequelize.INTEGER
}, {
  tableName: 'notes',
  timestamps: false,
  freezeTableName: true
});

// Define association
Candidate.hasMany(Note, { foreignKey: 'bepc_id', as: 'notes' });
Note.belongsTo(Candidate, { foreignKey: 'bepc_id', as: 'candidate' });

// Define MongoDB schema
const CandidateSchema = new mongoose.Schema({
  numDossier: String,
  nni: String,
  serie: String,
  typeC: String,
  nomFr: String,
  lieuNaissFr: String,
  dateNaiss: Date,
  nomAr: String,
  etablissement: String,
  lieuNaissAr: String,
  numAnonymat: String,
  groupeAnonymat: String,
  centreAr: String,
  centreFr: String,
  centre: {
    numero: String,
    nomAr: String,
    nomFr: String,
    region: String
  },
  moyenne: Number,
  decision: String,
  ecole: String,
  notes: [{
    note: Number,
    lmata: String,
    lmatf: String,
    coef: Number
  }]
});

const CandidateModel = mongoose.model('BEPC', CandidateSchema, 'bepc');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    await connectMongo();

    // Drop existing collection to avoid duplicates
    await CandidateModel.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection BEPC');

    // Fetch candidates with notes
    const results = await Candidate.findAll({
      include: [{ model: Note, as: 'notes' }]
    });

    console.log('🔢 Total candidates from MySQL:', results.length);

    if (results.length === 0) {
      console.warn('⚠️ No data found in MySQL. Exiting.');
      process.exit(0);
    }

    // Format data for MongoDB
    const formatted = results.map(c => ({
      numDossier: c.NODOSS,
      nni: c.NNI,
      serie: c.SERIE,
      typeC: c.TYPEC,
      nomFr: c.NOMPL,
      lieuNaissFr: c.LIEUN,
      dateNaiss: c.DATN,
      nomAr: c.NOMPL,
      etablissement: c.NOETS,
      lieuNaissAr: c.LIEUN,
      ecole:c.ecole,
       numAnonymat: c.NOANO,
       groupeAnonymat: c.NOETCC,
      centreAr: c.centreAr,
      centreFr: c.centreFr,
      centre: {
        numero: c.NOETCE,
        nomAr: c.centreAr,
        nomFr: c.centreFr,
        region: c.NOETCE ? c.NOETCE.substring(0, 2) : null
      },
      moyenne: c.MOYG,
      decision: c.Decision,
      notes: c.notes.map(n => ({
        note: n.note,
        lmata: n.lmata,
        lmatf: n.lmatf,
        coef: n.coef
      }))
    }));

    console.log('🔍 Sample formatted document:', formatted[0]);

    const inserted = await CandidateModel.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} candidates.`);

    // ✅ Create indexes for controller queries
    //await CandidateModel.collection.createIndex({ numDossier: 1 });
    //await CandidateModel.collection.createIndex({ nni: 1 });
    //await CandidateModel.collection.createIndex({ etablissement: 1 });

    console.log('⚡ Indexes created on numDossier, nni, etablissement');

    const mongoCount = await CandidateModel.countDocuments();
    console.log(`🔍 Total documents in MongoDB: ${mongoCount}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for BEPC with indexes created.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();