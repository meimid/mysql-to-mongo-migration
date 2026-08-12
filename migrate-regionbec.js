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
const RegionBEC = sequelize.define('region_bepc', {
  Noreg: { type: Sequelize.STRING, primaryKey: true },
  LregF: Sequelize.STRING,
  LregA: Sequelize.STRING
}, {
  timestamps: false,
  freezeTableName: true
});

// MongoDB schema and model
const RegionBECSchema = new mongoose.Schema({
  numero: String,
  nomFr: String,
  nomAr: String
});
RegionBECSchema.index({ numero: 1 }); // index for queries

const RegionBECModel = mongoose.model('RegionBEC', RegionBECSchema, 'regionbec');

// Migration function
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    await connectMongo();

    // Drop existing collection
    await RegionBECModel.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection RegionBEC');

    const results = await RegionBEC.findAll({ order: [['LregA', 'ASC']] });
    console.log('🔢 Total regions from MySQL:', results.length);

    const formatted = results.map(r => ({
      numero: r.Noreg,
      nomFr: r.LregF,
      nomAr: r.LregA
    }));

    const inserted = await RegionBECModel.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} regions.`);

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for RegionBEC.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();