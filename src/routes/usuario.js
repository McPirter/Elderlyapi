const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const { hashPassword, verifyPassword } = require("../utils/encryption");
const {generarToken} = require("../utils/token");
const User = require("../models/Musuario"); // Asegúrate de que el modelo sea correcto
const Adulto = require("../models/Madulto");

// Ruta de registro
router.post("/register", async (req, res) => {
    try {
        const { usuario, correo, contra, telefono, roluser } = req.body;
        const hashedPassword = await hashPassword(contra);

        const newUser = new User({ usuario, correo, contra: hashedPassword, telefono, roluser });
        await newUser.save();

        res.status(201).json({ message: "Usuario registrado con éxito" ,userId: newUser._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta de login
router.post("/login", async (req, res) => {
    try {
        const { usuario, contra, recordarDisp } = req.body;
        const user = await User.findOne({ usuario });

        // Si el usuario no existe o la contraseña es incorrecta
        if (!user || !(await verifyPassword(contra, user.contra))) {
            return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }

        const {tempToken, tokenPermanente} = generarToken(user, recordarDisp);
        
        if (recordarDisp) {
            user.tokenPermanente = user.tokenPermanente.concat(tokenPermanente);
            await user.save();
        }

        const adulto = await Adulto.findOne({ usuario: user._id });

        res.status(200).json({
            message: "Usuario encontrado",
            tempToken,
            tokenPermanente,
            rol: user.roluser,
            userId: user._id,
            adultoId: adulto ? adulto._id : null
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// src/routes/adulto.js
router.get("/por-usuario/:userId", async (req, res) => {
    try {
        const adultos = await Adulto.find({ usuario: req.params.userId });
        res.status(200).json(adultos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener adultos", error: error.message });
    }
});



module.exports = router;