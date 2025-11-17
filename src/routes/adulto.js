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
        const { adulto, fecha, temp } = req.body;

        // 1. Validaciones de campos
        if (!adulto || temp === undefined) {
            return res.status(400).json({
                success: false,
                error: "Campos requeridos: adulto y temp"
            });
        }

        // Validar ID de adulto
        if (!mongoose.Types.ObjectId.isValid(adulto)) {
            return res.status(400).json({
                success: false,
                error: "ID de adulto inválido"
            });
        }

        // Validar temperatura
        if (typeof temp !== 'number' || temp <= 0) {
            return res.status(400).json({
                success: false,
                error: "La temperatura debe ser un número positivo"
            });
        }

        // 2. Verificar existencia del adulto
        const adultoExiste = await Adulto.findById(adulto).select("nombre");
        if (!adultoExiste) {
            return res.status(404).json({
                success: false,
                error: "Adulto no encontrado"
            });
        }

        // 3. Crear nuevo registro de temperatura
        const nuevaTemp = new Temp({
            adulto,
            fecha: fecha ? new Date(fecha) : new Date(), // Si no mandan fecha, usar la actual
            temp
        });

        await nuevaTemp.save();

        // 4. Preparar respuesta compatible con Android
        const responseData = {
            _id: nuevaTemp._id.toString(),
            adulto: {
                _id: adultoExiste._id.toString(),
                nombre: adultoExiste.nombre
            },
            fecha: nuevaTemp.fecha.toISOString(),
            temp: nuevaTemp.temp
        };

        res.status(201).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error("Error en registrar-temp:", error);
        res.status(500).json({
            success: false,
            error: "Error al registrar temperatura",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


router.get("/info-temp/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Validar ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "ID de adulto inválido"
            });
        }

        // 2. Buscar temperaturas
        const temperaturas = await Temp.find({ adulto: id })
            .populate("adulto", "nombre")
            .select("fecha temp adulto")
            .sort({ fecha: -1 });

        if (!temperaturas || temperaturas.length === 0) {
            return res.status(404).json({
                success: false,
                error: "No hay registros de temperatura para este adulto"
            });
        }

        // 3. Formatear respuesta para Android
        const data = temperaturas.map(t => ({
            _id: t._id.toString(),
            adulto: {
                _id: t.adulto._id.toString(),
                nombre: t.adulto.nombre
            },
            fecha: t.fecha.toISOString(),
            temp: t.temp
        }));

        res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Error en info-temp:", error);
        res.status(500).json({
            success: false,
            error: "Error al obtener temperaturas",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
router.get('/info-medicamento-compat/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json([]); // Array vacío para compatibilidad
        }

        const medicamentos = await Medicamento.find({ adulto: req.params.id })
            .populate('adulto', 'nombre _id')
            .sort({ fecha: -1 })
            .lean();

        const response = medicamentos.map(med => ({
            _id: med._id.toString(),
            medicina: med.medicina,
            descripcion: med.descripcion,
            tiempo: med.tiempo,
            fecha: med.fecha.getTime().toString(), // timestamp en ms como string
            adulto: {
                _id: med.adulto._id.toString(),
                nombre: med.adulto.nombre
            }
        }));

        res.status(200).json(response); // Devuelve directamente el array

    } catch (error) {
        console.error("Error en /info-medicamento-compat:", error);
        res.status(500).json([]); // Array vacío en caso de error
    }
});

//Ruta para registrar y obtener la ubicación
router.post("/registrar-ubicacion", async (req, res) => {
    try {
        // 1. RECIBIMOS SOLO LO BÁSICO
        // Ya no pedimos hora_acceso ni hora_salida al ESP32
        const { adulto, ubi, tiempo } = req.body;

        // 2. VALIDACIÓN DE DATOS
        if (!adulto || !ubi) {
            return res.status(400).json({ message: "Faltan datos requeridos: adulto o ubi" });
        }

        // Validar que el ID que envía el ESP32 tenga formato correcto de MongoDB
        if (!mongoose.Types.ObjectId.isValid(adulto)) {
            return res.status(400).json({ message: "El ID del adulto no tiene un formato válido" });
        }

        // 3. VERIFICAR EXISTENCIA DEL ADULTO
        const existeAdulto = await Adulto.findById(adulto);
        if (!existeAdulto) {
            return res.status(404).json({ message: "Adulto no encontrado en la base de datos" });
        }

        // 4. CÁLCULO DE FECHAS (Lógica del Servidor)
        // Calculamos las fechas aquí porque el servidor tiene la hora exacta, el ESP32 no.
        const ahora = new Date(); 
        const duracionSegundos = tiempo || 10; // Si por error llega vacío, asumimos 10 seg
        const salida = new Date(ahora.getTime() + (duracionSegundos * 1000)); // Sumamos segundos a la fecha actual

        // 5. GUARDAR EN MONGO
        const nuevaUbi = new Ubicacion({
            adulto,
            ubi,
            tiempo: duracionSegundos,
            hora_acceso: ahora,   // Fecha generada por el servidor
            hora_salida: salida   // Fecha calculada por el servidor
        });

        await nuevaUbi.save();

        res.status(201).json({ 
            message: "Ubicación registrada con éxito", 
            registro: {
                adulto: existeAdulto.nombre, // Devolvemos el nombre para confirmar
                lugar: ubi,
                hora: ahora
            }
        });

    } catch (error) {
        console.error("Error al registrar ubicación:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get("/info-ubicacion/:id", async (req, res) => {
    try {
        // Buscamos por ID de adulto
        const ubicaciones = await Ubicacion.find({ adulto: req.params.id })
            .populate("adulto", "nombre") 
            .select("ubi tiempo hora_acceso hora_salida adulto")
            .sort({ hora_acceso: -1 }); // <--- IMPORTANTE: Ordenar del más reciente al más antiguo

        // CORRECCIÓN: Validar si el array está vacío
        if (ubicaciones.length === 0) { 
            return res.status(404).json({ message: "No se encontraron registros para este adulto" });
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
        
        // --- 1. VERIFICAR PRIMERO ---
        const existeAdulto = await Adulto.findById(adulto);
         if (!existeAdulto) {
            return res.status(400).json({message: "El adulto no existe"});
         }

        // --- 2. GUARDAR DESPUÉS ---
        const nuevoGPS = new Gps({adulto, coordenadas, fecha_salida, fecha_regreso, tiempo_afuera});
        await nuevoGPS.save();

        res.status(201).json({error: "Ubicación registrada con éxito"});
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