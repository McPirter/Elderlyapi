const mongoose = require('mongoose');

const MedicamentoSchema = new mongoose.Schema({
    adulto: { type: mongoose.Schema.Types.ObjectId, ref: 'Adulto', required: true },
    fecha: { type: Date, default: Date.now },
    medicina: { type: String, required: true },
    descripcion: { type: String },
    tiempo: { type: Number, required: true } // Tiempo en minutos u horas
});

MedicamentoSchema.index({ adulto: 1, medicina: "text" });


module.exports = mongoose.model('Medicamento', MedicamentoSchema);
