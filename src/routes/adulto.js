const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const Adulto = require("../models/Madulto");
const User = require("../models/Musuario"); 
const Temp = require("../models/Mtemperatura");
const Medic = require("../models/Mmedicamento");
const Ubicacion = require("../models/Mubicacion");
const Gps = require("../models/Mgps");
const Presion = require("../models/Mpresion");
const Medicamento = require("../models/Mmedicamento");

//Ruta para registrar y obtener adultos
router.post("/registro-adulto", async (req, res) => {
    try {
        const { nombre, edad, lim_presion, lim_tiempo_cuarto, userId } = req.body;

        //Función para verificar existencia de un usuario 
        const existeUser = await User.findById(userId);
         if (!existeUser) {
            return res.status(400).json({message: "El usuario no existe"});
         }

         const nuevoAdulto = new Adulto({
            nombre, edad, lim_presion, lim_tiempo_cuarto, usuario: userId
        });
        
        await nuevoAdulto.save();

        res.status(201).json({message: "Adulto registrado con éxito"});
    } catch (error){ 
        res.status(500).json({error: error.message});
    }

});

router.get("/info-adulto/:id", async (req, res) => {
    try { 
        const adultoId = req.params.id;

        // Buscar el adulto y poblar el usuario asociado
        const adulto = await Adulto.findById(adultoId)
            .populate({path: "usuario",
                select: "nombre correo"})
            .select("nombre edad lim_presion lim_tiempo_cuarto userId")
            .lean(); // Usar lean() para obtener un objeto JavaScript simple

        if (!adulto) {
            return res.status(404).json({ message: "Adulto no encontrado" });
        }

         adulto.userId = adulto.userId || [];

        // Consultar todas las colecciones relacionadas con el adultoId
        const [temperaturas, ubicaciones, presiones, medicamentos] = await Promise.all([
            Temp.find({ adulto: adultoId }).select("fecha temp"),
            Ubicacion.find({ adulto: adultoId }).select("ubi tiempo hora_acceso hora_salida"),
            Presion.find({ adulto: adultoId }).select("fecha pres_sistolica pres_diastolica"),
            Medic.find({ adulto: adultoId }).select("fecha medicina descripcion tiempo")
        ]);

        // Responder con la información completa
        res.status(200).json({
            adulto,
            temperaturas,
            ubicaciones,
            presiones,
            medicamentos
        });

    } catch (error) {
        res.status(500).json({ message: "Error al obtener los datos del adulto", error: error.message });
    }
});



//Rutas para registrar y obtener temperatura
router.post("/registrar-temp", async (req, res) => {
    try {
        const {adulto, fecha, temp} = req.body;

        const existeAdulto = await Adulto.findById(adulto);
         if (!existeAdulto) {
            return res.status(400).json({message: "El adulto no existe"});
         }

        const nuevaTemp = new Temp({adulto, fecha, temp});
        await nuevaTemp.save();

        res.status(201).json({error: "Temperatura registrada con éxito"});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

router.get("/info-temp/:id", async (req, res) => {
    try {
        const temperaturas = await Temp.find({adulto: req.params.id})
            .populate("adulto", "nombre") // Solo traer campos necesarios del adulto
            .select("fecha temp adulto");

        if (!temperaturas) { 
            return res.status(404).json({ message: "Adulto no encontrado" });
        }

        res.status(200).json(temperaturas);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los datos", error: error.message});
    }
});



//Ruta para registrar y obtener el medicamento
// Registrar nuevo recordatorio
router.post('/registrar-medicamento', async (req, res) => {
    try {
        const { adulto, medicina, descripcion, tiempo } = req.body;

        // Validaciones mejoradas
        if (!adulto || !medicina || tiempo === undefined) {
            return res.status(400).json({ 
                success: false,
                error: "Campos requeridos: adulto, medicina y tiempo" 
            });
        }

        if (!mongoose.Types.ObjectId.isValid(adulto)) {
            return res.status(400).json({ 
                success: false,
                error: "ID de adulto inválido" 
            });
        }

        if (typeof tiempo !== 'number' || tiempo <= 0) {
            return res.status(400).json({ 
                success: false,
                error: "El tiempo debe ser un número positivo" 
            });
        }

        // Verificar existencia del adulto y obtener datos básicos
        const adultoExiste = await Adulto.findById(adulto).select('nombre');
        if (!adultoExiste) {
            return res.status(404).json({ 
                success: false,
                error: "Adulto no encontrado" 
            });
        }

        // Crear nuevo medicamento
        const nuevoMedicamento = new Medic({
            adulto,
            medicina,
            descripcion: descripcion || null,
            tiempo
        });

        await nuevoMedicamento.save();
        
        // Preparar respuesta compatible con Android
        const responseData = {
            _id: nuevoMedicamento._id.toString(),
            adulto: {
                _id: adultoExiste._id.toString(),
                nombre: adultoExiste.nombre
            },
            medicina: nuevoMedicamento.medicina,
            descripcion: nuevoMedicamento.descripcion,
            tiempo: nuevoMedicamento.tiempo,
            fecha: nuevoMedicamento.fecha.toISOString()
        };

        res.status(201).json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error("Error en registrar-medicamento:", error);
        res.status(500).json({ 
            success: false,
            error: "Error al registrar recordatorio",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Obtener recordatorios por adulto
router.get('/info-medicamento/:id', async (req, res) => {
    try {
        // Validar ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                data: [],
                message: "ID inválido"
            });
        }

        // Buscar medicamentos y poblar datos del adulto
        const medicamentos = await Medicamento.find({ adulto: req.params.id })
            .populate('adulto', 'nombre _id')
            .sort({ fecha: -1 })
            .lean();

        // Formatear la respuesta para ser consistente
        const formattedMedicamentos = medicamentos.map(med => ({
            _id: med._id,
            medicina: med.medicina,
            descripcion: med.descripcion || null,
            tiempo: med.tiempo,
            fecha: med.fecha.toISOString(),
            adulto: {
                _id: med.adulto._id,
                nombre: med.adulto.nombre
            }
        }));

        // Respuesta exitosa siempre con estructura consistente
        res.status(200).json({
            success: true,
            data: formattedMedicamentos,
            count: formattedMedicamentos.length
        });

    } catch (error) { 
        console.error("Error en /info-medicamento:", error);
        
        // Respuesta de error pero manteniendo la estructura de data como array
        res.status(500).json({
            success: false,
            data: [],
            error: "Error al obtener recordatorios",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

//Ruta para registrar y obtener la ubicación
router.post("/registrar-ubicacion", async (req, res) => {
    try {
        const {adulto, ubi, tiempo, hora_acceso, hora_salida} = req.body;

        const nuevaUbi = new Ubicacion({adulto, ubi, tiempo, hora_acceso, hora_salida});
        await nuevaUbi.save();

        const existeAdulto = await Adulto.findById(adulto);
         if (!existeAdulto) {
            return res.status(400).json({message: "El adulto no existe"});
         }

        res.status(201).json({error: "Ubicación registrada con éxito"});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

router.get("/info-ubicacion/:id", async (req, res) => {
    try {
        const ubicaciones = await Ubicacion.find({adulto: req.params.id})
            .populate("adulto", "nombre") // Solo traer campos necesarios del adulto
            .select("ubi tiempo hora_acceso hora_salida adulto");

        if (!ubicaciones) { 
            return res.status(404).json({ message: "Adulto no encontrado" });
        }

        res.status(200).json(ubicaciones);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los datos", error: error.message});
    }
});



//Ruta para registrar y obtener la presión
router.post("/registrar-presion", async (req, res) => {
    try {
        const {adulto, fecha, pres_sistolica, pres_diastolica} = req.body;

        const nuevaPresion = new Presion({adulto, fecha, pres_sistolica, pres_diastolica});
        await nuevaPresion.save();

        const existeAdulto = await Adulto.findById(adulto);
         if (!existeAdulto) {
            return res.status(400).json({message: "El adulto no existe"});
         }

        res.status(201).json({error: "Presión registrada con éxito"});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

router.get("/info-presion/:id", async (req, res) => {
    try {
        const presiones = await Presion.find({adulto: req.params.id})
            .populate("adulto", "nombre") // Solo traer campos necesarios del adulto
            .select("fecha pres_sistolica pres_diastolica adulto");

        if (!presiones) { 
            return res.status(404).json({ message: "Adulto no encontrado" });
        }

        res.status(200).json(presiones);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los datos", error: error.message});
    }
});



//Ruta para registrar y obtener el GPS
router.post("/registrar-gps", async (req, res) => {
    try {
        const {adulto, coordenadas, fecha_salida, fecha_regreso, tiempo_afuera} = req.body;

        const nuevoGPS = new Gps({adulto, coordenadas, fecha_salida, fecha_regreso, tiempo_afuera});
        await nuevoGPS.save();

        const existeAdulto = await Adulto.findById(adulto);
         if (!existeAdulto) {
            return res.status(400).json({message: "El adulto no existe"});
         }

        res.status(201).json({error: "Ubicación registrado con éxito"});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

router.get("/info-gps/:id", async (req, res) => {
    try {
        const gps = await Gps.find({adulto: req.params.id})
            .populate("adulto", "nombre") // Solo traer campos necesarios del adulto
            .select("coordenadas fecha_salida fecha_regreso tiempo_afuera adulto");

        if (!gps) { 
            return res.status(404).json({ message: "Adulto no encontrado" });
        }

        res.status(200).json(gps);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los datos", error: error.message});
    }
});

module.exports = router;