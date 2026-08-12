const mongoose = require('mongoose');
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');

// MongoDB connection
mongoose.connect('mongodb://root:meimid@localhost:27017/concours?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const BacSchema = new mongoose.Schema({}, { strict: false });
const BacModel = mongoose.model('Bac21', BacSchema, 'bac21');

(async () => {
  try {
    const samples = await BacModel.find().limit(3).lean();
    if (samples.length === 0) {
      console.error('❌ No data found.');
      process.exit(1);
    }

    const fields = Object.keys(samples[0]);
    const csv = parse(samples, { fields });

    const filePath = path.join(__dirname, 'bac21_sample.csv');
    fs.writeFileSync(filePath, csv);
    console.log(`✅ CSV with ${samples.length} real samples generated: ${filePath}`);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    mongoose.disconnect();
  }
})();