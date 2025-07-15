const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if(!token) {
        return res.status(401).json({message: 'El token no ha sido proporcionado. Acceso denegado'});
    }
     
    try {
        const decodificado = jwt.verify(token.replace('Bearer ', ''), process.env.SECRET_KEY);    
        req.user = decodificado;
        next();
    } catch (error) {
        return res.status(403).json({message: 'Token inválido o expirado'});
    }
}

module.exports = {verificarToken}; 