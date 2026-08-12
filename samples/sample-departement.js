const mongoose = require('mongoose');
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');

// MongoDB connection
mongoose.connect('mongodb://root:meimid@localhost:27017/concours?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const DepartementSchema = new mongoose.Schema({}, { strict: false });
const DepartementModel = mongoose.model('Departement', DepartementSchema, 'departement');

(async () => {
  try {
    const samples = await DepartementModel.find().limit(3).lean();

    if (samples.length === 0) {
      console.error('❌ Aucun document trouvé.');
      process.exit(1);
    }

    const fields = Object.keys(samples[0]);
    const csv = parse(samples, { fields });

    const filePath = path.join(__dirname, 'departement_sample.csv');
    fs.writeFileSync(filePath, csv);
    console.log(`✅ Exemple CSV avec ${samples.length} lignes généré : ${filePath}`);
  } catch (err) {
    console.error('❌ Erreur :', err);
  } finally {
    await mongoose.disconnect();
  }
})();