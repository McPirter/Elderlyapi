const jwt = require('jsonwebtoken');

const generarToken = (user, recordarDisp) => { 
    const tempToken = jwt.sign({
        rol: user.roluser,telefono: user.telefono},
        process.env.SECRET_KEY, 
        {expiresIn: "1h"}
    );

    let tokenPermanente;
 
    if (recordarDisp) {
        tokenPermanente = jwt.sign({
            rol: user.roluser, 
            telefono: user.telefono},
            process.env.SECRET_KEY_PERMANENTE, 
            {expiresIn: "1y"}
        );
    }

    return {tempToken, tokenPermanente};
}; 

module.exports = {generarToken};