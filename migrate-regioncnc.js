const Sequelize = require('sequelize');
const mongoose = require('mongoose');
const config = require('./config'); // ajuste le chemin si besoin

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
const Region = sequelize.define('regions', {
  regionId: { type: Sequelize.STRING, primaryKey: true },
  nomAr: Sequelize.STRING,
  nomFr: Sequelize.STRING
}, {
  timestamps: false,
  freezeTableName: true
});

// Définition du schema MongoDB
const RegionSchema = new mongoose.Schema({
  numero: String,
  nomFr: String,
  nomAr: String
});
RegionSchema.index({ numero: 1 });

const RegionModel = mongoose.model('Region', RegionSchema, 'regioncnc');

// Fonction de migration
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    await connectMongo();

    // Drop collection si elle existe
    await RegionModel.collection.drop().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ Collection does not exist. Skipping drop.');
      } else {
        throw err;
      }
    });
    console.log('🗑️ Dropped existing collection RegionCNC');

    const results = await Region.findAll({
      where: { regionId: { [Sequelize.Op.ne]: '17' } },
      order: [['regionId', 'ASC']]
    });
    console.log('🔢 Total regions from MySQL:', results.length);

    const formatted = results.map(r => ({
      numero: r.regionId,
      nomFr: r.nomFr,
      nomAr: r.nomFr
    }));

    const inserted = await RegionModel.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} regions.`);

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for RegionCNC.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
