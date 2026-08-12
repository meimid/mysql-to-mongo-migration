const mongoose = require('mongoose');
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');

// Connexion MongoDB
mongoose.connect('mongodb://root:meimid@localhost:27017/concours?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const BepcSchema = new mongoose.Schema({}, { strict: false });
const BepcModel = mongoose.model('BEPC', BepcSchema, 'bepc');

(async () => {
  try {
    const samples = await BepcModel.find().limit(3).lean();

    if (samples.length === 0) {
      console.error('❌ No data found.');
      process.exit(1);
    }

    const fields = Object.keys(samples[0]);

    const csv = parse(samples, { fields });

    const filePath = path.join(__dirname, 'bepc_sample.csv');
    fs.writeFileSync(filePath, csv);
    console.log(`✅ CSV avec ${samples.length} lignes généré : ${filePath}`);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
  }
})();