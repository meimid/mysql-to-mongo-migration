const Sequelize = require('sequelize');
const mongoose = require('mongoose');
const config = require('./config'); // adapte le chemin si besoin

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
const Departement = sequelize.define('departement', {
  numero: { type: Sequelize.STRING, primaryKey: true },
  regionId: { type: Sequelize.STRING },
  nomAr: Sequelize.STRING,
  nomFr: Sequelize.STRING
}, {
  timestamps: false,
  freezeTableName: true
});

// MongoDB schema and model
const DepartementSchema = new mongoose.Schema({
  numero: String,
  regionId: String,
  nomAr: String,
  nomFr: String
});
DepartementSchema.index({ regionId: 1 });
DepartementSchema.index({ numero: 1 });

const DepartementModel = mongoose.model('Departement', DepartementSchema, 'departement');

// Migration function
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    await connectMongo();

    // Drop existing collection
    await DepartementModel.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection Departement');

    const results = await Departement.findAll({ order: [['nomFr', 'ASC']] });
    console.log('🔢 Total départements from MySQL:', results.length);

    const formatted = results.map(d => ({
      numero: d.numero,
      regionId: d.regionId,
      nomAr: d.nomAr,
      nomFr: d.nomFr
    }));

    const inserted = await DepartementModel.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} départements.`);

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for Departement.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();