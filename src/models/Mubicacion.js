const mongoose = require('mongoose');

const UbicacionSchema = new mongoose.Schema({
    adulto: { type: mongoose.Schema.Types.ObjectId, ref: 'Adulto', required: true },
    ubi: { type: String, required: true },
    tiempo: { type: Number, required: true },
    hora_acceso: { type: Date, required: true },
    hora_salida: { type: Date }
});

UbicacionSchema.index({ adulto: 1, ubi: "text" });

module.exports = mongoose.model('Ubicacion', UbicacionSchema);
