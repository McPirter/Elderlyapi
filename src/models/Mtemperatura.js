const mongoose = require('mongoose');

const TemperaturaSchema = new mongoose.Schema({
    adulto: { type: mongoose.Schema.Types.ObjectId, ref: 'Adulto', required: true },
    fecha: { type: Date, default: Date.now },
    temp: { type: Number, required: true }
});

TemperaturaSchema.index({ adulto: 1, temp: 1 });
 

module.exports = mongoose.model('Temperatura', TemperaturaSchema);
