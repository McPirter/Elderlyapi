const mongoose = require('mongoose');

const GPSSchema = new mongoose.Schema({
    adulto: { type: mongoose.Schema.Types.ObjectId, ref: 'Adulto', required: true },
    coordenadas: { type: String, required: true }, // Formato latitud, longitud
    fecha_salida: { type: Date, required: true },
    fecha_regreso: { type: Date },
    tiempo_afuera: { type: Number }
});

GPSSchema.index({ adulto: 1, coordenadas : "2dsphere" });


module.exports = mongoose.model('GPS', GPSSchema);
