const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    usuario: { type: String, required: true },
    correo: { type: String, required: true, unique: true },
    contra: { type: String, required: true },
    telefono: { type: String, required: true },
    roluser: {type: String, required: true},
    tokenPermanente: [{ type: String }], // Array de tokens
});

module.exports = mongoose.model('Usuario', UsuarioSchema);
