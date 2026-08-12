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
const EtablissementSchema = new mongoose.Schema({
  numero: String,    // establishment code NOETAB
  nomAr: String,
  nomFr: String,
  region: String
});

const EtablissementModel = mongoose.model('EtablissementBAC', EtablissementSchema, 'etablissementbac');

// Define Sequelize model
//const EtablissementBAC = sequelize.define('rescnc_etab_bac', {
const EtablissementBAC = sequelize.define('ETAB', {
  NOREG: Sequelize.STRING,
  Nodep: Sequelize.STRING,
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
    await EtablissementModel.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection EtablissementBAC');

    const results = await EtablissementBAC.findAll({ order: [['LETABA', 'ASC']] });
    console.log('🔢 Total établissements from MySQL:', results.length);

    if (results.length === 0) {
      console.warn('⚠️ No data found in MySQL. Exiting.');
      process.exit(0);
    }

    const formatted = results.map(e => ({
      numero: e.NOETAB,   // use NOETAB as numero
      nomAr: e.LETABA,
      nomFr: e.LETAB,
      region: e.NOREG
    }));

    console.log('🔍 Sample formatted document:', formatted[0]);

    const inserted = await EtablissementModel.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} établissements.`);

    const mongoCount = await EtablissementModel.countDocuments();
    console.log(`🔍 Total documents in MongoDB: ${mongoCount}`);

    const mysqlCount = results.length;
    if (mongoCount !== mysqlCount) {
      console.warn(`⚠️ Difference detected: MySQL(${mysqlCount}) vs MongoDB(${mongoCount})`);
    } else {
      console.log('✅ All établissements migrated successfully with no difference.');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for EtablissementBAC.');
    process.exit(0); // clean exit
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();