const mongoose = require('mongoose');

const AdultoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    edad: { type: Number, required: true },
    lim_presion: { type: Number, required: true },
    lim_tiempo_cuarto: { type: Number, required: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
    // Ahora referencia al campo 'usuario' en lugar del ObjectId
});

AdultoSchema.index({ nombre: 1 }, { unique: true });

module.exports = mongoose.model('Adulto', AdultoSchema);
