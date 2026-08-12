const Sequelize = require('sequelize');
const mongoose = require('mongoose');
const config = require('./config'); // adjust path if needed

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

// Define MongoDB Schema
const EtablissementBECSchema = new mongoose.Schema({
  numero: String, // NOETAB
  nomAr: String,  // LETABA
  nomFr: String,  // LETAB
  region: String  // NOREG
});

const EtablissementBECModel = mongoose.model('EtablissementBEC', EtablissementBECSchema, 'etablissementbec');

// Define Sequelize model
const EtablissementBEC = sequelize.define('etablissement_bepc', {
  NOREG: Sequelize.STRING,
  //Nodep: Sequelize.STRING,
  NOETAB: { type: Sequelize.STRING, primaryKey: true },
  LETAB: Sequelize.STRING,
  LETABA: Sequelize.STRING
}, {
  timestamps: false,
  freezeTableName: true
});

// Migration function
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    await connectMongo();

    // Drop existing collection to avoid duplicates
    await EtablissementBECModel.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection EtablissementBEC');

    const results = await EtablissementBEC.findAll({ order: [['LETABA', 'ASC']] });
    console.log('🔢 Total établissements from MySQL:', results.length);

    if (results.length === 0) {
      console.warn('⚠️ No data found in MySQL. Exiting.');
      process.exit(0);
    }

    const formatted = results.map(e => ({
      numero: e.NOETAB,
      nomAr: e.LETABA,
      nomFr: e.LETAB,
      region: e.NOREG
    }));

    console.log('🔍 Sample formatted document:', formatted[0]);

    const inserted = await EtablissementBECModel.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} établissements.`);

    // Create indexes
    await EtablissementBECModel.collection.createIndex({ numero: 1 });
    await EtablissementBECModel.collection.createIndex({ region: 1 });
    console.log('✅ Indexes created on numero and region');

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for EtablissementBEC.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();