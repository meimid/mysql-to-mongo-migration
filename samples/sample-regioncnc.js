const mongoose = require('mongoose');
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');

// Connexion MongoDB
mongoose.connect('mongodb://root:meimid@localhost:27017/concours?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const RegionSchema = new mongoose.Schema({}, { strict: false });
const RegionModel = mongoose.model('RegionCNC', RegionSchema, 'regioncnc');

(async () => {
  try {
    const samples = await RegionModel.find().limit(3).lean();
    if (samples.length === 0) {
      console.error('❌ No data found in regioncnc collection.');
      process.exit(1);
    }

    const fields = Object.keys(samples[0]);
    const csv = parse(samples, { fields });

    const filePath = path.join(__dirname, 'regioncnc_sample.csv');
    fs.writeFileSync(filePath, csv);
    console.log(`✅ CSV with ${samples.length} samples generated at ${filePath}`);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    mongoose.disconnect();
  }
})();