const Sequelize = require('sequelize');
const mongoose = require('mongoose');
const config = require('./config'); // adapte le chemin selon ton projet

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
//const EtablissementCNC = sequelize.define('rescnc_centre', {
const EtablissementCNC = sequelize.define('etablissement', {
  numero: { type: Sequelize.STRING, primaryKey: true },
  departement: Sequelize.STRING,
  nomAr: Sequelize.STRING,
  nomFr: Sequelize.STRING
}, {
  timestamps: false,
  freezeTableName: true
});

// MongoDB schema and model
const EtablissementCNCSchema = new mongoose.Schema({
  numero: String,
  departement: String,
  nomAr: String,
  nomFr: String
});
EtablissementCNCSchema.index({ departement: 1 }); // index for fast queries

const EtablissementCNCModel = mongoose.model('EtablissementCNC', EtablissementCNCSchema, 'etablissementcnc');

// Migration function
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    await connectMongo();

    // Drop existing collection
    await EtablissementCNCModel.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection EtablissementCNC');

    const results = await EtablissementCNC.findAll({ order: [['nomFr', 'ASC']] });
    console.log('🔢 Total centres from MySQL:', results.length);

    const formatted = results.map(r => ({
      numero: r.numero,
      departement: r.departement,
      nomAr: r.nomAr,
      nomFr: r.nomFr
    }));

    const inserted = await EtablissementCNCModel.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} centres.`);

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for EtablissementCNC.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
