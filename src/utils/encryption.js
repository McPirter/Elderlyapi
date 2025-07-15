require("dotenv").config();
const bcrypt = require("bcrypt");

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Función para cifrar con Vigenère
function vigenereEncrypt(text, key) {
    text = text.toUpperCase();
    key = key.toUpperCase();
    let encryptedText = "";
    
    for (let i = 0, j = 0; i < text.length; i++) {
        const char = text[i];
        if (ALPHABET.includes(char)) {
            let textIndex = ALPHABET.indexOf(char);
            let keyIndex = ALPHABET.indexOf(key[j % key.length]);
            let encryptedChar = ALPHABET[(textIndex + keyIndex) % 26];
            encryptedText += encryptedChar;
            j++;
        } else {
            encryptedText += char; // Mantener caracteres no alfabéticos
        }
    }
    return encryptedText;
}

// Función para hashear con bcrypt
async function hashPassword(password) {
    const vigenereKey = process.env.VIGENERE_KEY;
    if (!vigenereKey) throw new Error("Clave Vigenère no definida en .env");

    const encryptedPassword = vigenereEncrypt(password, vigenereKey);
    const saltRounds = 10;
    return await bcrypt.hash(encryptedPassword, saltRounds);
}

// Función para verificar la contraseña en el login
async function verifyPassword(inputPassword, hashedPassword) {
    const vigenereKey = process.env.VIGENERE_KEY;
    if (!vigenereKey) throw new Error("Clave Vigenère no definida en .env");

    const encryptedInputPassword = vigenereEncrypt(inputPassword, vigenereKey);
    return await bcrypt.compare(encryptedInputPassword, hashedPassword);
}

module.exports = { hashPassword, verifyPassword };
