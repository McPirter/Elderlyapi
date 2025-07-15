const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

router.post('/verificar-permanente', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        // Verificar si el token fue proporcionado correctamente
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ valid: false, message: "Token no proporcionado" });
        }
 
        const token = authHeader.split(" ")[1];  // Extraer el token
        const decodificado = jwt.verify(token, process.env.SECRET_KEY_PERMANENTE);

        // Buscar al usuario por ID y verificar si el token coincide
        const usuario = await Usuario.findById(decodificado.id).select("tokenPermanente departamento rol");

        if (!usuario || usuario.tokenPermanente !== token) {
            return res.status(401).json({ valid: false, message: "Token inválido" });
        }


    } catch (error) {
        res.status(401).json({ valid: false, message: "Token inválido o expirado" });
    }
});
