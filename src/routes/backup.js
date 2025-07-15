const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");

// Ruta para generar y descargar un respaldo de la BD
router.get("/backup", async (req, res) => {
    try {
        const backupDir = path.join(__dirname, "../backups");
        const backupFile = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}`;
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        const dbName = "Elderly"; // Cambia por tu base de datos

        // Asegurar que el directorio de backups exista
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

        // Comando para generar el respaldo
        const dumpCommand = `mongodump --uri="${mongoUri}" --db=${dbName} --out=${backupDir}/${backupFile}`;

        exec(dumpCommand, (error, stdout, stderr) => {
            if (error) {
                console.error("Error al generar el respaldo:", stderr);
                return res.status(500).json({ error: "Error al generar el respaldo" });
            }

            console.log("Respaldo generado con éxito");

            // Crear un archivo ZIP con el respaldo
            const zipFilePath = path.join(backupDir, `${backupFile}.zip`);
            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            output.on("close", () => {
                console.log(`Archivo ZIP creado: ${zipFilePath}`);
                res.download(zipFilePath, `${backupFile}.zip`, (err) => {
                    if (err) console.error("Error al enviar el archivo:", err);
                    // Opcional: eliminar el archivo después de enviarlo
                    fs.unlinkSync(zipFilePath);
                });
            });

            archive.on("error", (err) => res.status(500).json({ error: err.message }));
            archive.pipe(output);
            archive.directory(`${backupDir}/${backupFile}`, false);
            archive.finalize();
        });
    } catch (error) {
        console.error("Error en la ruta de respaldo:", error);
        res.status(500).json({ error: "Error al generar el respaldo" });
    }
});

module.exports = router;
