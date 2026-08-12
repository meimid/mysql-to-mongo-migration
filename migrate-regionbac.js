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
  await mongoose.connect(config.mongo.uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('✅ Connected to MongoDB');
}

// Define MongoDB Schema
const RegionSchema = new mongoose.Schema({
  numero: String,
  nomAr: String,
  nomFr: String
});

const RegionModel = mongoose.model('RegionBAC', RegionSchema, 'regionbac'); // explicit collection name

// Define Sequelize model
//const RegionBAC = sequelize.define('rescnc_freg_bac', {
const RegionBAC = sequelize.define('FREG', {

  Noreg: { type: Sequelize.STRING, primaryKey: true },
  Lregf: Sequelize.STRING,
  LregA: Sequelize.STRING
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

        // Drop existing collection
        await RegionModel.collection.drop().catch(err => {
          if (err.code === 26) {
            console.log('⚠️ Collection does not exist. Skipping drop.');
          } else {
            throw err;
          }
        });


    const results = await RegionBAC.findAll({ order: [['Noreg', 'ASC']] });
    console.log('🔢 Total regions from MySQL:', results.length);

    if (results.length === 0) {
      console.warn('⚠️ No data found in MySQL. Exiting.');
      process.exit(0);
    }



    const formatted = results.map(r => ({
      numero: r.Noreg,
      nomAr: r.LregA,
      nomFr: r.Lregf
    }));

    console.log('🔍 Sample formatted document:', formatted[0]);

    const inserted = await RegionModel.insertMany(formatted, { ordered: false });
    console.log(`✅ Migration completed. Inserted: ${inserted.length} regions.`);

    const mongoCount = await RegionModel.countDocuments();
    console.log(`🔍 Total documents in MongoDB: ${mongoCount}`);

    const mysqlCount = results.length;
    if (mongoCount !== mysqlCount) {
      console.warn(`⚠️ Difference detected: MySQL(${mysqlCount}) vs MongoDB(${mongoCount})`);
    } else {
      console.log('✅ All regions migrated successfully with no difference.');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected MongoDB');

    await sequelize.close();
    console.log('✅ Disconnected MySQL');

    console.log('🎉 Migration script finished for RegionBAC.');
    process.exit(0); // ✅ Clean exit
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
