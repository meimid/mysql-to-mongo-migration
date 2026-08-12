const mongoose = require('mongoose');
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');

// Connexion MongoDB
mongoose.connect('mongodb://root:meimid@localhost:27017/concours?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const EtablissementSchema = new mongoose.Schema({}, { strict: false });
const EtablissementModel = mongoose.model('EtablissementCNC', EtablissementSchema, 'etablissementcnc');

(async () => {
  try {
    const samples = await EtablissementModel.find().limit(3).lean();
    if (samples.length === 0) {
      console.error('❌ Aucun document trouvé.');
      process.exit(1);
    }

    const fields = Object.keys(samples[0]);
    const csv = parse(samples, { fields });

    const filePath = path.join(__dirname, 'etablissementcnc_sample.csv');
    fs.writeFileSync(filePath, csv);
    console.log(`✅ Exemple CSV généré avec ${samples.length} lignes : ${filePath}`);
  } catch (err) {
    console.error('❌ Erreur :', err);
  } finally {
    await mongoose.disconnect();
  }
})();