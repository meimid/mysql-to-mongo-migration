const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csvtojson');

// Connexion MongoDB
mongoose.connect('mongodb://root:meimid@localhost:27017/concours?authSource=admin');

// Ton schéma
const SessionBacSchema = new mongoose.Schema({
  // pas besoin de _id ou __v ici
  num_dossier: String,
  nom_fr: String,
  // ajoute tes champs principaux ici...
});

const SessionBacModel = mongoose.model('SessionBac', SessionBacSchema, 'sessionbac');

(async () => {
  try {
    console.log('🗑️ Suppression des données existantes...');
    await SessionBacModel.deleteMany({});

    console.log('📥 Lecture du CSV...');
    const data = await csv().fromFile('./sessionbac_import.csv');

    console.log(`✅ Import de ${data.length} documents...`);
    await SessionBacModel.insertMany(data, { ordered: false });

    console.log('🎉 Données réimportées avec succès.');
  } catch (error) {
    console.error('❌ Erreur pendant l’import :', error);
  } finally {
    mongoose.disconnect();
  }
})();
