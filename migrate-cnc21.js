const Sequelize = require('sequelize');
const mongoose = require('mongoose');
const config = require('./config'); // ajuste le chemin selon ton projet

// Connexion MySQL
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

// Connexion MongoDB
async function connectMongo() {
  await mongoose.connect(config.mongo.uri);
  console.log('✅ Connected to MongoDB');
}

// Définition du modèle Sequelize
//const Cnc21 = sequelize.define('rescnc_cnc21', {
const Cnc21 = sequelize.define('liste_candidats', {

  numDossier: { type: Sequelize.STRING, primaryKey: true },
  numDossierLong: Sequelize.STRING,
  nom: Sequelize.STRING,
  lieuNaiss: Sequelize.STRING,
  typeC: Sequelize.STRING,
  anneeNaiss: Sequelize.STRING,
  //nom_centre: Sequelize.STRING,
  Noetce: Sequelize.STRING,
  total: Sequelize.FLOAT,
  decision: Sequelize.STRING,
  //ecole_id: Sequelize.STRING
  Noets: Sequelize.STRING
}, {
  timestamps: false,
  freezeTableName: true
});

// Définition du schema MongoDB
const Cnc21Schema = new mongoose.Schema({
  numDossier: String,
  numDossierLong: String,
  nom: String,
  lieuNaiss: String,
  typeC: String,
  anneeNaiss: String,
  nomCentre: String,
  total: Number,
  decision: String,
  etablissement: String,

});
Cnc21Schema.index({ numDossier: 1 });
Cnc21Schema.index({ etablissement: 1 });
Cnc21Schema.index({ centreId: 1 });

const Cnc21Model = mongoose.model('Cnc21', Cnc21Schema, 'cnc21');


// Fonction de migration
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    await connectMongo();

    // Drop collection si elle existe
    await Cnc21Model.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection Cnc21');

    const results = await Cnc21.findAll({ order: [['numDossierLong', 'ASC']] });
    console.log('🔢 Total candidats CNC from MySQL:', results.length);

    const formatted = results.map(r => ({
      numDossier: r.numDossier,
      numDossierLong: r.numDossierLong,
      nom: r.nom,
      lieuNaiss: r.lieuNaiss,
      typeC: r.typeC,
      anneeNaiss: r.anneeNaiss,
      nomCentre: r.Noetce,
      total: r.total,
      decision: r.decision,
      etablissement: r.Noets
       //etablissement: r.Noetce
    }));

    const inserted = await Cnc21Model.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} candidats CNC.`);

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for Cnc21.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
