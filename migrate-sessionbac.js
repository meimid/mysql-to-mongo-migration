const Sequelize = require('sequelize');
const mongoose = require('mongoose');
const config = require('./config'); // Adjust path if needed

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

// Sequelize model
const SessionBac = sequelize.define('session_bac', {
  id: { type: Sequelize.INTEGER, primaryKey: true },
  //etablissement_id: Sequelize.STRING,
  nni: Sequelize.STRING,
  numDossier: Sequelize.STRING,
  serie: Sequelize.STRING,
  typec: Sequelize.STRING,
  nomAr: Sequelize.STRING,
  nomFr: Sequelize.STRING,
  lieuNaissAr: Sequelize.STRING,
  lieuNaissFr: Sequelize.STRING,
  dateNaiss: Sequelize.DATE,
  centreAr: Sequelize.STRING,
  centreFr: Sequelize.STRING,
  numAnonymat: Sequelize.STRING,
  //NOETCC: Sequelize.STRING,
  groupeAnonymat: Sequelize.STRING,
  moyenne: Sequelize.DOUBLE,
  Decision: Sequelize.STRING,
  LMATF: Sequelize.STRING,
  coeficient: Sequelize.INTEGER,
  Maxinote: Sequelize.DOUBLE,
  Noteecrite: Sequelize.DOUBLE,
  noteS1: Sequelize.FLOAT,
  noteS2: Sequelize.FLOAT,
  noteRetenue: Sequelize.FLOAT,
  nomMatiereF: Sequelize.STRING,
  nomMatiereA: Sequelize.STRING,
  typec: Sequelize.STRING,
  ecoleAr: Sequelize.STRING,
  ecole: Sequelize.STRING
}, {
  timestamps: false,
  freezeTableName: true
});

// MongoDB schema and model (defined here to avoid import errors)
const SessionBacSchema = new mongoose.Schema({
  id: Number,
  //etablissement_id: String,
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
});

// ✅ Add indexes for efficient queries
SessionBacSchema.index({ num_dossier: 1 });
SessionBacSchema.index({ nni: 1 });
SessionBacSchema.index({ etablissement_id: 1 });

const SessionBacModel = mongoose.model('SessionBac', SessionBacSchema, 'sessionbac');

// Migration function
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    await connectMongo();

    // Drop existing collection
    await SessionBacModel.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection SessionBac');

    const results = await SessionBac.findAll({ order: [['id', 'ASC']] });
    console.log('🔢 Total records from MySQL:', results.length);

    const formatted = results.map(r => ({
      id: r.id,
      //etablissement_id: r.etablissement_id,
      nni: r.nni,
      numDossier: r.numDossier,
      serie: r.serie,
      type_c: r.typec,
      nomAr: r.nomAr,
      nomFr: r.nomFr,
      lieuNaissAr: r.lieuNaissAr,
      lieuNaissFr: r.lieuNaissFr,
      dateNaiss: r.dateNaiss,
      centreAr: r.centreAr,
      centreFr: r.centreFr,
      numAnonymat: r.numAnonymat,
      groupeAnonymat: r.groupeAnonymat, // r.NOETCC,

      moyenne: r.moyenne,
      decision: r.Decision,
      LMATF: r.LMATF,
      coeficient: r.coeficient,
      Maxinote: r.Maxinote,
      Noteecrite: r.Noteecrite,
      noteS1: r.noteS1,
      noteS2: r.noteS2,
      noteRetenue: r.noteRetenue,
      nomMatiereF: r.nomMatiereF,
      nomMatiereA: r.nomMatiereA,
      type: r.type,
      ecoleAr: r.ecoleAr,
      ecole: r.ecole
    }));

    const inserted = await SessionBacModel.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} records.`);

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for SessionBac.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
