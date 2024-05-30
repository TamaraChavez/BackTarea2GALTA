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
//USUARIOS
sql.connect(sqlConfig)
    .then(pool => {
        console.log('Conectado a SQL Server');
        sqlPool = pool;
    })
    .catch(err => {
        console.error('Error de conexión a SQL Server:', err);
    });

    app.put('/usuarios/:id', async (req, res) => {
        try {
            
            const { Usuario, Contrasena } = req.body;
            console.log("Intentando modificar usuario con nombre de usuario:", Usuario);
    
            const result = await sqlPool.query`EXEC ModificarUsuario @Usuario=${Usuario}, @Contrasena=${Contrasena}`;
    
            console.log("Resultado de la modificación:", result);
            if (result.rowsAffected[0] > 0) {
                res.json({ message: 'Usuario modificado exitosamente' });
            } else {
                res.status(400).send({ message: 'No se pudo modificar el usuario.' });
            }
        } catch (err) {
            console.error("Error en la operación:", err);
            res.status(500).send({ message: err.message });
        }
    });
    app.delete('/usuarios/:id', async (req, res) => {
        try {
            const { id } = req.params;
            console.log("Intentando eliminar usuario con ID:", id);
    
            const result = await sqlPool.query`EXEC EliminarUsuario @Id=${id}`;
    
            console.log("Resultado de la eliminación:", result);
            if (result.rowsAffected[0] > 0) {
                res.json({ message: 'Usuario eliminado exitosamente' });
            } else {
                res.status(400).send({ message: 'No se pudo eliminar el usuario.' });
            }
        } catch (err) {
            console.error("Error en la operación:", err);
            res.status(500).send({ message: err.message });
        }
    });

app.get('/usuarios', async (req, res) => {
    try {
        // Realiza la consulta para obtener todos los usuarios
        const result = await sqlPool.query`SELECT * FROM Usuarios`;

        // Revisa si se obtuvieron resultados
        if (result.recordset.length > 0) {
            res.json(result.recordset);
        } else {
            res.status(404).send({ message: 'No se encontraron usuarios.' });
        }
    } catch (err) {
        console.error("Error en la operación:", err);
        res.status(500).send({ message: err.message });
    }
});
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

    // Validar la contraseña para asegurarse de que tenga mayúsculas, minúsculas y al menos un carácter especial
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/;
    if (!passwordRegex.test(contrasena)) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos una letra mayúscula, una letra minúscula y un carácter especial.' });
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
