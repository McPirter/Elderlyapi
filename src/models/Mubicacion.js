const mongoose = require('mongoose');

const UbicacionSchema = new mongoose.Schema({
    // Definimos adulto como un Array de ObjectIds
    adulto: { type: [mongoose.Schema.Types.ObjectId], ref: 'Adulto', required: true },
    ubi: { type: String, required: true },
    tiempo: { type: Number, required: true },
    hora_acceso: { type: Date, required: true },
    hora_salida: { type: Date }
});

// --- CORRECCIÓN AQUÍ ---
// Borra la línea anterior y usa índices separados:

// 1. Índice simple para buscar rápido por adulto (funciona con arrays automáticamente)
UbicacionSchema.index({ adulto: 1 }); 

// 2. (Opcional) Índice de texto si necesitas búsquedas complejas en la ubicación
// Si solo buscas coincidencias exactas, quita esto también. 
// Pero si lo quieres dejar, ponlo separado:
UbicacionSchema.index({ ubi: "text" });

module.exports = mongoose.model('Ubicacion', UbicacionSchema);