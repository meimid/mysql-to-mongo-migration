const mongoose = require('mongoose');
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');

// Connexion MongoDB
mongoose.connect('mongodb://root:meimid@localhost:27017/concours?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const CncSchema = new mongoose.Schema({}, { strict: false });
const CncModel = mongoose.model('Cnc21', CncSchema, 'cnc21');

(async () => {
  try {
    const samples = await CncModel.find().limit(3).lean();

    if (samples.length === 0) {
      console.error('❌ Aucun document trouvé.');
      process.exit(1);
    }

    const fields = Object.keys(samples[0]);

    const csv = parse(samples, { fields });

    const filePath = path.join(__dirname, 'cnc21_sample.csv');
    fs.writeFileSync(filePath, csv);
    console.log(`✅ CSV de ${samples.length} lignes généré : ${filePath}`);
  } catch (err) {
    console.error('❌ Erreur:', err);
  } finally {
    await mongoose.disconnect();
  }
})();