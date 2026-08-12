const mongoose = require('mongoose');
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');

// MongoDB connection
mongoose.connect('mongodb://root:meimid@localhost:27017/concours?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const RegionSchema = new mongoose.Schema({}, { strict: false });
const RegionModel = mongoose.model('RegionBEC', RegionSchema, 'regionbec');

(async () => {
  try {
    const samples = await RegionModel.find().limit(3).lean();
    if (samples.length === 0) {
      console.error('❌ No data found in regionbec collection.');
      process.exit(1);
    }

    const fields = Object.keys(samples[0]);
    const csv = parse(samples, { fields });

    const filePath = path.join(__dirname, 'regionbec_sample.csv');
    fs.writeFileSync(filePath, csv);
    console.log(`✅ CSV generated with ${samples.length} samples: ${filePath}`);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
  }
})();
