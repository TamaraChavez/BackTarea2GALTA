const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const cors = require('cors');

// Inicialización de la aplicación Express
const app = express();
const port = 3001;

app.use(cors({
    origin: 'http://localhost:3000'
}));
app.use(bodyParser.json());
app.use(express.json());

const sqlConfig = {
    user: 'galta',
    password: '*Galta123',
    database: 'tiusr4pl_usuarios',
    server: 'tiusr4pl.cuc-carrera-ti.ac.cr',
    port: 8443,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // Para Azure
        trustServerCertificate: true, // Cambiar a false en producción
        instanceName: 'MSSQLSERVER2019' // Añade el nombre de la instancia aquí
    }
};

let sqlPool;

sql.connect(sqlConfig)
    .then(pool => {
        console.log('Conectado a SQL Server');
        sqlPool = pool;
    })
    .catch(err => {
        console.error('Error de conexión a SQL Server:', err);
    });

//USUARIOS
app.post('/usuarios', async (req, res) => {
    try {
        const { Usuario, Contrasena } = req.body;
        console.log("Intentando insertar usuario:", Usuario);


        const result = await sqlPool.query`EXEC CrearUsuario @Usuario=${Usuario}, @Contrasena=${Contrasena}`;

        console.log("Resultado de la inserción:", result);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Usuario agregado exitosamente' });
        } else {
            res.status(400).send({ message: 'No se pudo agregar el usuario.' });
        }
    } catch (err) {
        console.error("Error en la operación:", err);
        res.status(500).send({ message: err.message });
    }
});
app.post('/login', async (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!sqlPool) {
        return res.status(503).send({ message: 'Service Unavailable' });
    }

    try {
        const request = sqlPool.request();
        request.input('Usuario', sql.VarChar, usuario);
        request.input('Contrasena', sql.VarChar, contrasena);
        const result = await request.execute('IniciarSesion');

        if (result.recordset.length > 0 && result.recordset[0].AutenticacionExitosa) {
            res.json({ message: 'Autenticación exitosa.' });
        } else {
            res.status(401).json({ message: 'Autenticación fallida.' });
        }
    } catch (err) {
        console.error('Error durante la autenticación:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Inicia el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
