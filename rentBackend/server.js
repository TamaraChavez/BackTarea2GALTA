
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
    user: 'sa',
    password: '1598753',
    database: 'RentCar',
    server: 'localhost',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // Para Azure
        trustServerCertificate: true // Cambiar a false en producción
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
        const { Usuario, Contrasena, NombreCompleto } = req.body;
        console.log("Intentando insertar usuario:", Usuario);


        const result = await sqlPool.query`EXEC CrearUsuario @Usuario=${Usuario}, @Contrasena=${Contrasena}, @NombreCompleto=${NombreCompleto}`;

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

    try {

        const result = await sqlPool.request()`EXEC IniciarSesion @Usuario=${usuario}, @Contrasena=${contrasena}`;

        if (result.recordset[0].AutenticacionExitosa) {
            res.json({ message: 'Autenticación exitosa.' });
        } else {
            res.status(401).json({ message: 'Autenticación fallida.' });
        }
    } catch (err) {
        console.error('Error durante la autenticación:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

//VEHICULOS
app.post('/vehiculos', async (req, res) => {
    const { idTipoVehiculo, idColor, idCombustible, año, idMarca, idTransmision,placa , Estado = 'Disponible' } = req.body;
    console.log("INSERT VEHICULOS");
    console.log(req.body);
    console.log(idTipoVehiculo);
    console.log(idColor);
    console.log(idCombustible);
    console.log(año);
    console.log("placa:"+placa);
    console.log(idMarca);
    console.log(idTransmision);

    try {

        const result = await sqlPool.request()
            .input('IDTipo', sql.VarChar, idTipoVehiculo)
            .input('Color', sql.NVarChar, idColor)
            .input('TipoCombustible', sql.NVarChar, idCombustible)
            .input('Año', sql.Int, año)
            .input('Marca', sql.NVarChar, idMarca)
            .input('IdTransmision', sql.NVarChar, idTransmision)
            .input('Placa', sql.VarChar, placa)
            .input('Estado', sql.VarChar, Estado)
            .execute('RegistrarVehiculo');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Vehículo registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar el vehículo' });
        }
    } catch (err) {
        console.error('Error durante el registro del vehículo:', err);
        res.status(500).json({ message: err.message });
    }
});


app.delete('/vehiculos/:id', async (req, res) => {
    const { id } = req.params;

    try {

        const result = await sqlPool.request()
            .input('Identificacion', sql.VarChar, id)
            .execute('EliminarVehiculo');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Vehículo eliminado exitosamente' });
        } else {
            res.status(404).json({ message: 'Vehículo no encontrado' });
        }
    } catch (err) {
        console.error('Error al eliminar el vehículo:', err);
        res.status(500).json({ message: err.message });
    }
});
// VEHICULOS - Consultar vehículos
app.get('/vehiculos', async (req, res) => {
    const { estado,placa, tipoVehiculo, marca, transmision, color, combustible } = req.query;
    console.log("SELECT VEHICULOS")
    console.log(req.query)
    try {
        const result = await sqlPool.request()
            .input('Estado', sql.NVarChar, estado || null)
            .input('Placa', sql.NVarChar, placa || null)
            .input('TipoVehiculo', sql.NVarChar, tipoVehiculo || null)
            .input('Marca', sql.NVarChar, marca || null)
            .input('Transmision', sql.NVarChar, transmision || null)
            .input('Color', sql.NVarChar, color || null)
            .input('Combustible', sql.NVarChar, combustible || null)
            .execute('ConsultarVehiculo');

        if (result.recordset.length > 0) {
            res.json(result.recordset);
        } else {
            res.status(404).json({ message: 'No se encontraron vehículos con los criterios especificados.' });
        }
    } catch (err) {
        console.error('Error al consultar vehículos:', err);
        res.status(500).json({ message: 'Error interno del servidor.', details: err.message });
    }
});
app.get('/vehiculos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await sqlPool.request()
            .input('IDVehiculo', sql.VarChar, id)
            .execute('ConsultarVehiculo'); // Ensure this stored procedure is designed to handle a single ID input

        if (result.recordset.length > 0) {
            res.json(result.recordset[0]); // Return only the first record for a specific ID
        } else {
            res.status(404).json({ message: 'Vehículo no encontrado' });
        }
    } catch (err) {
        console.error('Error al consultar vehículo:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

app.put('/vehiculos/:id', async (req, res) => {
    const { id } = req.params;
    const { IDTipo, Color, TipoCombustible, Año, Marca, IdTransmision,Placa, Estado } = req.body;

    console.log('MODIFICAR VEHICULO');
    console.log(req.params);
    console.log(req.body);
    console.log("placa: "+Placa);
    try {
        const result = await sqlPool.request()
            .input('IDVehiculo', sql.VarChar, id)
            .input('IDTipo', sql.Int, IDTipo)
            .input('Color', sql.Int, Color)
            .input('TipoCombustible', sql.Int, TipoCombustible)
            .input('Año', sql.Int, Año)
            .input('Marca', sql.Int, Marca)
            .input('IdTransmision', sql.Int, IdTransmision)
            .input('Placa', sql.NVarChar, Placa)
            .input('Estado', sql.NVarChar, Estado)
            .execute('ModificarVehiculo');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Vehículo modificado exitosamente' });
        } else {
            res.status(404).json({ message: 'Vehículo no encontrado' });
        }
    } catch (err) {
        console.error('Error al modificar el vehículo:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});






//CATALOGOS
//SEGUROS
app.get('/seguros', async (req, res) => {
    console.log('SELECT seguros');
    try {

        const result = await sqlPool.request()
            .query('SELECT * FROM Seguro');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar seguros:', err);
        res.status(500).json({ message: err.message });
    }
});
//PAIS
app.get('/pais', async (req, res) => {
    console.log('SELECT PAISES');
    try {

        const result = await sqlPool.request()
            .query('SELECT * FROM PaisResidencia');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar paises:', err);
        res.status(500).json({ message: err.message });
    }
});
app.post('/pais', async (req, res) => {
    const { nombrePais } = req.body;
    console.log('Insert Pais')
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .query(`INSERT INTO paisResidencia (nombrePais) VALUES ('${nombrePais}')`);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Pais registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar el pais' });
        }
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al insertar paises:', err);
        res.status(500).json({ message: err.message });
    }
});
app.delete('/pais/:idPais', async (req, res) => {
    const { idPais } = req.params;
    try {
        const result = await sqlPool.request()
            .query(`Delete from paisResidencia where idPais = '${idPais}' `);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Pais eliminado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo eliminar el pais' });
        }
        console.log(result.recordset);
    } catch (error) {
        console.error('Error al borrar paises:', err);
        res.status(500).json({ message: err.message });
    }
});


app.get('/pais/:idPais', async (req, res) => {
    const { idPais } = req.params;
    console.log('SELECT Paises');
    try {
        const result = await sqlPool.request()
            .query(`SELECT * FROM paisReferencia WHERE idPais = '${idPais}'`);
        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar paises:', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/pais/:idPais', async (req, res) => {
    const { idPais } = req.params;
    const { nombrePais } = req.body;
    console.log('MODIFICAR Pais');
    console.log(req.params);
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .input('IdPais', sql.Int, idPais)
            .input('NombrePais', sql.VarChar, nombrePais)
            .query('UPDATE paisResidencia set nombrePais = @NombrePais where idPais= @IdPais');
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Pais modificado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo modificar el pais' });
        }
    } catch (err) {
        console.error('Error durante el registro del pais:', err);
        res.status(500).json({ message: err.message });
    }

})


//MARCAS CRUD
app.get('/marcas', async (req, res) => {
    console.log('SELECT MARCAS');
    try {
        const result = await sqlPool.request()
            .query('SELECT * FROM marca');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar marcas:', err);
        res.status(500).json({ message: err.message });
    }
});
app.post('/marcas', async (req, res) => {
    const { nombreMarca } = req.body;
    console.log('Insert Marca')
    console.log(req.body);
    try {

        const result = await sqlPool.request()
            .query(`INSERT INTO marca (nombreMarca) VALUES ('${nombreMarca}')`);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Marca registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar la marca' });
        }
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al insertar marcas:', err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/marcas/:idMarca', async (req, res) => {
    const { idMarca } = req.params;
    try {
        const result = await sqlPool.request()
            .query(`Delete from marca where idMarca = '${idMarca}' `);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Marca eliminado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo eliminar la marca' });
        }
        console.log(result.recordset);
    } catch (error) {
        console.error('Error al borrar marcas:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/marcas/:idMarca', async (req, res) => {
    const { idMarca } = req.params;
    console.log('SELECT MARCAS');
    try {
        const result = await sqlPool.request()
            .query(`SELECT * FROM marca WHERE idMarca = '${idMarca}'`);
        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar marcas:', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/marcas/:idMarca', async (req, res) => {
    const { idMarca } = req.params;
    const { nombreMarca } = req.body;
    console.log('MODIFICAR MARCA');
    console.log(req.params);
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .input('IdMarca', sql.Int, idMarca)
            .input('NombreMarca', sql.VarChar, nombreMarca)
            .query('UPDATE marca set nombreMarca = @NombreMarca where idMarca= @IdMarca');
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Marca modificado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo modificar la marca' });
        }
    } catch (err) {
        console.error('Error durante el registro de la marca:', err);
        res.status(500).json({ message: err.message });
    }

})
//COLOR CRUD
app.get('/color', async (req, res) => {

    console.log('SELECT COLORES');
    try {
        const result = await sqlPool.request()
            .query('SELECT * FROM Color');

        res.json(result.recordset);

    } catch (err) {
        console.error('Error al consultar colores:', err);
        res.status(500).json({ message: err.message });
    }
});

app.post('/color', async (req, res) => {
    const { nombreColor } = req.body;
    console.log('Insert color')
    console.log(req.body);

    try {

        const result = await sqlPool.request()
            .query(`INSERT INTO Color (nombreColor) VALUES ('${nombreColor}')`);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Vehículo registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar el vehículo' });
        }

        console.log(result.recordset);
    } catch (err) {
        console.error('Error al insertar colores:', err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/color/:idColor', async (req, res) => {
    const { idColor } = req.params;
    try {
        const result = await sqlPool.request()
            .query(`Delete from Color where idColor = '${idColor}' `);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Color eliminado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo eliminar el color' });
        }
        console.log(result.recordset);
    } catch (error) {
        console.error('Error al borrar colores:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/color/:idColor', async (req, res) => {
    const { idColor } = req.params;
    console.log('SELECT COLORES');
    try {
        const result = await sqlPool.request()
            .query(`SELECT * FROM Color WHERE idColor = '${idColor}'`);
        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar colores:', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/color/:idColor', async (req, res) => {
    const { idColor } = req.params;
    const { nombreColor } = req.body;
    console.log('MODIFICAR COLOR');
    console.log(req.params);
    console.log(req.body);

    try {
        const result = await sqlPool.request()
            .input('IdColor', sql.Int, idColor)
            .input('NombreColor', sql.VarChar, nombreColor)
            .query('UPDATE Color set nombreColor = @NombreColor where idColor= @IdColor');
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Color modificado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo modificar el color' });
        }
    } catch (err) {
        console.error('Error durante el registro del vehículo:', err);
        res.status(500).json({ message: err.message });
    }

})
// CRUD COMBUSTIBLE
app.get('/combustibles', async (req, res) => {

    console.log('SELECT Combustibles');
    try {
        const result = await sqlPool.request()
            .query('SELECT * FROM Combustible');

        res.json(result.recordset);

    } catch (err) {
        console.error('Error al consultar combustibles:', err);
        res.status(500).json({ message: err.message });
    }
});

app.post('/combustibles', async (req, res) => {
    const { nombreCombustible } = req.body;
    console.log('Insert combustible')
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .query(`INSERT INTO Combustible (nombreCombustible) VALUES ('${nombreCombustible}')`);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Combustible registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar el combustible' });
        }

        console.log(result.recordset);
    } catch (err) {
        console.error('Error al insertar combustibles:', err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/combustibles/:idCombustible', async (req, res) => {
    const { idCombustible } = req.params;
    try {
        const result = await sqlPool.request()
            .query(`Delete from Combustible where idCombustible = '${idCombustible}' `);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Combustible eliminado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo eliminar el combustible' });
        }
        console.log(result.recordset);
    } catch (error) {
        console.error('Error al borrar combustibles:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/combustibles/:idCombustible', async (req, res) => {
    const { idCombustible } = req.params;
    console.log('SELECT Combustibles');
    try {
        const result = await sqlPool.request()
            .query(`SELECT * FROM Combustible WHERE idCombustible = '${idCombustible}'`);
        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar combustibles:', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/combustibles/:idCombustible', async (req, res) => {
    const { idCombustible } = req.params;
    const { nombreCombustible } = req.body;
    console.log('MODIFICAR Combustible');
    console.log(req.params);
    console.log(req.body);

    try {
        const result = await sqlPool.request()
            .input('IdCombustible', sql.Int, idCombustible)
            .input('NombreCombustible', sql.VarChar, nombreCombustible)
            .query('UPDATE Combustible set nombreCombustible = @NombreCombustible where idCombustible= @IdCombustible');
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Combustible modificado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo modificar el combustible' });
        }
    } catch (err) {
        console.error('Error durante el registro del combustible:', err);
        res.status(500).json({ message: err.message });
    }

})

//CRUD TIPO VEHICULO 
app.get('/tipoVehiculo', async (req, res) => {
    console.log('SELECT TIPOVEHICULOS');
    try {
        const result = await sqlPool.request()
            .query('SELECT * FROM tipoVehiculo');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar tipoVehiculo:', err);
        res.status(500).json({ message: err.message });
    }
});

app.post('/tipoVehiculo', async (req, res) => {
    const { nombre, montoPorHora } = req.body;
    try {
        const result = await sqlPool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('montoPorHora', sql.Decimal, montoPorHora)
            .query('INSERT INTO tipoVehiculo (nombre, montoPorHora) VALUES (@nombre, @montoPorHora)');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Tipo de vehiculo registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar el Tipo de vehiculo' });
        }
    } catch (err) {
        console.error('Error al insertar tipos de vehiculo:', err);
        res.status(500).json({ message: err.message });
    }
});


app.delete('/tipoVehiculo/:idTipoVehiculo', async (req, res) => {
    const { idTipo } = req.params;
    console.log("DELETE TIPO VEHICULO");
    console.log(idTipoVehiculo);
    try {
        const result = await sqlPool.request()
            .query(`Delete from tipoVehiculo where idTipo = '${idTipo}' `);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Tipo vehiculo eliminado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo eliminar el Tipo de Vehiculo' });
        }
        console.log(result.recordset);
    } catch (error) {
        console.error('Error al borrar tipos de vehiculos:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/tipoVehiculo/:idTipoVehiculo', async (req, res) => {
    const {idTipoVehiculo} =req.params;
    console.log('SELECT ToposVehiculos');
    try {
        const result = await sqlPool.request()
            .query(`SELECT * FROM tipoVehiculo WHERE idTipo = '${idTipo}'`);
        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar tipo de vehiculo:', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/tipoVehiculo/:idTipo', async (req, res) => {
    const { idTipo } = req.params;
    const { nombre, montoPorHora } = req.body;
    console.log('MODIFICAR TIPOVEHICULO');
    console.log(req.params);
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .input('IdTipo', sql.Int, idTipo)
            .input('Nombre', sql.VarChar, nombre)
            .input('MontoPorHora', sql.VarChar, montoPorHora)
            .query('UPDATE tipoVehiculo set nombre = @Nombre, montoPorHora =  @MontoPorHora where idTipoVehiculo= @IdTipoVehiculo'); 
            if (result.rowsAffected[0] > 0) {
                res.json({ message: 'Tipo Vehiculo modificado exitosamente' });
            } else {
                res.status(400).json({ message: 'No se pudo modificar el tipo de vehiculo' });
            }
        } catch (err) {
            console.error('Error durante el registro del tipo del vehiculo:', err);
            res.status(500).json({ message: err.message });
        }
})
// CRUD TRANSMISION 
app.get('/transmision', async (req, res) => {

    console.log('SELECT TRANSMISIONES');

    try {
        const result = await sqlPool.request()
            .query('SELECT * FROM Transmision');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar trasmision:', err);
        res.status(500).json({ message: err.message });
    }
});


app.post('/transmision', async (req, res) => {
    const { tipoTransmision } = req.body;
    console.log('Insert Transmision')
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .query(`INSERT INTO Transmision (tipoTransmision) VALUES ('${tipoTransmision}')`);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Transmision registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar la transmision' });
        }

        console.log(result.recordset);
    } catch (err) {
        console.error('Error al insertar transmision:', err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/transmision/:idTransmision', async (req, res) => {
    const { idTransmision } = req.params;
    try {
        const result = await sqlPool.request()
            .query(`Delete from Transmision where idTransmision = '${idTransmision}' `);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Transmision eliminado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo eliminar la transmision' });
        }
        console.log(result.recordset);
    } catch (error) {
        console.error('Error al borrar transimisiobessi:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/transmision/:idTransmision', async (req, res) => {
    const { idTransmision } = req.params;
    console.log('SELECT Transmision');
    try {
        const result = await sqlPool.request()
            .query(`SELECT * FROM Transmision WHERE idTransmision = '${idTransmision}'`);
        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar la transmision:', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/transmision/:idTransmision', async (req, res) => {
    const { idTransmision } = req.params;
    const { tipoTransmision } = req.body;
    console.log('MODIFICAR Transmision');
    console.log(req.params);
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .input('IdTransmision', sql.Int, idTransmision)
            .input('TipoTransmision', sql.VarChar, tipoTransmision)
            .query('UPDATE Transmision set tipoTransmision = @TipoTransmision WHERE idTransmision = @IdTransmision');
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Tipo Transmision modificado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo modificar la transmsion' });
        }
    } catch (err) {
        console.error('Error durante el registro de transmision:', err);
        res.status(500).json({ message: err.message });
    }
})

// CRUD Seguro 
app.get('/seguro', async (req, res) => {

    console.log('SELECT SEGUROS');

    try {
        const result = await sqlPool.request()
            .query('SELECT * FROM Seguro');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar seguro:', err);
        res.status(500).json({ message: err.message });
    }
});


app.post('/seguro', async (req, res) => {
    const { tipoSeguro, montoSeguro } = req.body;
    console.log('Insert Seguro')
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .query(`INSERT INTO Seguro (tipoSeguro, montoSeguro) VALUES ('${tipoSeguro}','${montoSeguro}')`);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Seguro registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar el seguro' });
        }

        console.log(result.recordset);
    } catch (err) {
        console.error('Error al insertar seguros:', err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/seguro/:idSeguro', async (req, res) => {
    const { idSeguro } = req.params;
    try {
        const result = await sqlPool.request()
            .query(`Delete from Seguro where idSeguro = '${idSeguro}' `);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Seguro eliminado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo eliminar el seguro' });
        }
        console.log(result.recordset);
    } catch (error) {
        console.error('Error al borrar seguros:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/seguro/:idSeguro', async (req, res) => {
    const {idSeguro} =req.params;
    console.log('SELECT Seguro');
    try {
        const result = await sqlPool.request()
        .query(`SELECT * FROM Seguro WHERE idSeguro = '${idSeguro}'`);
        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar el seguro:', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/seguro/:idSeguro', async (req, res) => {
    const { idSeguro } = req.params;
    const { tipoSeguro, montoSeguro } = req.body;
    console.log('MODIFICAR Seguros');
    console.log(req.params);
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .input('IdSeguro', sql.Int, idSeguro)
            .input('TipoSeguro', sql.VarChar, tipoSeguro)
            .input('MontoSeguro', sql.Decimal, montoSeguro)
            .query('UPDATE Seguro set tipoSeguro = @TipoSeguro, montoSeguro = @MontoSeguro WHERE idSeguro= @IdSeguro'); 
            if (result.rowsAffected[0] > 0) {
                res.json({ message: 'Seguro modificado exitosamente' });
            } else {
                res.status(400).json({ message: 'No se pudo modificar la seguro' });
            }
        } catch (err) {
            console.error('Error durante el registro de seguro:', err);
            res.status(500).json({ message: err.message });
        }
})
//CRUD TIPO TARJETA
// Ruta para obtener todos los tipos de tarjeta
app.get('/tipoTarjetas', async (req, res) => {
    console.log('Obteniendo todos los tipos de tarjeta');
    try {
      const result = await sqlPool.request()
      .query('SELECT * FROM TipoTarjeta');
      res.json(result.recordset);
    } catch (err) {
      console.error('Error al consultar tipos de tarjeta:', err);
      res.status(500).json({ message: err.message });
    }
  });
  
  // Ruta para agregar un nuevo tipo de tarjeta
  app.post('/tipoTarjetas', async (req, res) => {
    const { tipo } = req.body;
    console.log('Insertando tipo de tarjeta:', tipo);
    try {
      const result = await sqlPool.request()
        .input('tipo', sql.NVarChar, tipo)
        .query('INSERT INTO TipoTarjeta (tipo) VALUES (@tipo)');
      if (result.rowsAffected[0] > 0) {
        res.json({ message: 'Tipo de tarjeta registrado exitosamente' });
      } else {
        res.status(400).json({ message: 'No se pudo registrar el tipo de tarjeta' });
      }
    } catch (err) {
      console.error('Error al insertar tipo de tarjeta:', err);
      res.status(500).json({ message: err.message });
    }
  });
  
  // Ruta para eliminar un tipo de tarjeta por su ID
  app.delete('/tipoTarjetas/:idTipoTarjeta', async (req, res) => {
    const { idTipoTarjeta } = req.params;
    console.log('Eliminando tipo de tarjeta con ID:', idTipoTarjeta);
    try {
      const result = await sqlPool.request()
        .input('idTipoTarjeta', sql.Int, idTipoTarjeta)
        .query('DELETE FROM TipoTarjeta WHERE idTipoTarjeta = @idTipoTarjeta');
      if (result.rowsAffected[0] > 0) {
        res.json({ message: 'Tipo de tarjeta eliminado exitosamente' });
      } else {
        res.status(400).json({ message: 'No se pudo eliminar el tipo de tarjeta' });
      }
      console.log(result.recordset);
    } catch (err) {
      console.error('Error al eliminar tipo de tarjeta:', err);
      res.status(500).json({ message: err.message });
    }
  });
  
  // Ruta para obtener un tipo de tarjeta por su ID
  app.get('/tipoTarjetas/:idTipoTarjeta', async (req, res) => {
    const { idTipoTarjeta } = req.params;
    console.log('Obteniendo tipo de tarjeta con ID:', idTipoTarjeta);
    try {
        const result = await sqlPool.request()
        .input('idTipoTarjeta', sql.Int, idTipoTarjeta)
        .query('SELECT * FROM TipoTarjeta WHERE idTipoTarjeta = @idTipoTarjeta');
      res.json(result.recordset);
      console.log(result.recordset);
    } catch (err) {
      console.error('Error al obtener tipo de tarjeta por ID:', err);
      res.status(500).json({ message: err.message });
    }
  });
  
  // Ruta para modificar un tipo de tarjeta por su ID
  app.put('/tipoTarjetas/:idTipoTarjeta', async (req, res) => {
    const { idTipoTarjeta } = req.params;
    const { tipo } = req.body;
    console.log(req.params);
    console.log(req.body);
    console.log('Modificando tipo de tarjeta con ID:', idTipoTarjeta);
    try {
        const result = await sqlPool.request()
        .input('idTipoTarjeta', sql.Int, idTipoTarjeta)
        .input('tipo', sql.NVarChar, tipo)
        .query('UPDATE TipoTarjeta SET tipo = @tipo WHERE idTipoTarjeta = @idTipoTarjeta');
      if (result.rowsAffected[0] > 0) {
        res.json({ message: 'Tipo de tarjeta modificado exitosamente' });
      } else {
        res.status(400).json({ message: 'No se pudo modificar el tipo de tarjeta' });
      }
    } catch (err) {
      console.error('Error al modificar tipo de tarjeta:', err);
      res.status(500).json({ message: err.message });
    }
  });
  

//CRUD TIPO CLIENTE
app.get('/tipoClientes', async (req, res) => {
    console.log('SELECT tipoCliente');
    try {
        const result = await sqlPool.request()
            .query('SELECT * FROM TipoCliente');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar Tipo Cliente:', err);
        res.status(500).json({ message: err.message });
    }
});

app.post('/tipoClientes', async (req, res) => {
    const { tipoCliente } = req.body;
    console.log('Insert TipoCliente')
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .query(`INSERT INTO TipoCliente (tipoCliente) VALUES ('${tipoCliente}')`);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Tipo Cliente registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar el tipo Cliente' });
        }
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al insertar tipo Cliente:', err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/tipoClientes/:idTipoCliente', async (req, res) => {
    const { idTipoCliente } = req.params;
    try {
        const result = await sqlPool.request()
            .query(`Delete from TipoCliente where idTipoCliente = '${idTipoCliente}' `);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Tipo Cliente eliminado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo eliminar el tipo cliente' });
        }
        console.log(result.recordset);
    } catch (error) {
        console.error('Error al borrar tipos clientes:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/tipoClientes/:idTipoCliente', async (req, res) => {
    const {idTipoCliente} =req.params;
    console.log('SELECT TIPO CLIENTE');
    try {
        const result = await sqlPool.request()
        .query(`SELECT * FROM TipoCliente WHERE idTipoCliente = '${idTipoCliente}'`);
        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar el tipo Cliente:', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/tipoClientes/:idTipoCliente', async (req, res) => {
    const { idTipoCliente } = req.params;
    const { tipoCliente } = req.body;
    console.log('MODIFICAR Tipo Cliente');
    console.log(req.params);
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .input('IdTipo', sql.Int, idTipoCliente)
            .input('TipoCliente', sql.VarChar, tipoCliente)
            .query('UPDATE TipoCliente set tipoCliente = @TipoCliente WHERE idTipoCliente= @IdTipo'); 
            if (result.rowsAffected[0] > 0) {
                res.json({ message: 'Tipo Cliente modificado exitosamente' });
            } else {
                res.status(400).json({ message: 'No se pudo modificar el tipo Cliente' });
            }
        } catch (err) {
            console.error('Error durante el registro de tipo cliente:', err);
            res.status(500).json({ message: err.message });
        }
})

//CRUD TARJETA
app.post('/tarjetas', async (req, res) => {
    const { numeroTarjeta, PIN, CVV, fechaVencimiento, idCliente, idTipoTarjeta } = req.body;
    console.log("INSERT Tarjetas");
    console.log(req.body);
    console.log(numeroTarjeta);
    console.log(PIN);
    console.log(CVV);
    console.log(idCliente);
    console.log(idTipoTarjeta);
    try {
        const result = await sqlPool.request()
            .input('Numero', sql.VarChar, numeroTarjeta)
            .input('Pin', sql.Int, PIN)
            .input('Cvv', sql.Int, CVV)
            .input('Fecha', sql.Date, fechaVencimiento)
            .input('IdCliente', sql.Int, idCliente)
            .input('IdTipoTarjeta', sql.Int, idTipoTarjeta)
            .query('INSERT INTO Tarjetas (NumeroTarjeta, PIN, CVV, FechaVencimiento, idCliente, idTipoTarjeta) VALUES (@Numero, @Pin, @Cvv, @Fecha, @IdCliente, @IdTipoTarjeta)');
        
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Tarjeta registrada exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar la tarjeta' });
        }
    } catch (err) {
        console.error('Error durante el registro de la tarjeta:', err);
        res.status(500).json({ message: err.message });
    }
});


app.delete('/tarjetas/:numeroTarjeta', async (req, res) => {
    const { numeroTarjeta } = req.params;
    try {
        const result = await sqlPool.request()
            .input('Numero', sql.VarChar, numeroTarjeta)
            .query('DELETE FROM Tarjetas WHERE numeroTarjeta = @Numero ');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Tarjeta eliminada exitosamente' });
        } else {
            res.status(404).json({ message: 'Tarjeta no encontrado' });
        }
    } catch (err) {
        console.error('Error al eliminar la tarjeta:', err);
        res.status(500).json({ message: err.message });
    }
});
app.get('/tarjetas', async (req, res) => {
    console.log('Obteniendo todas las tarjetas');
    try {
      const result = await sqlPool.request()
      .query('SELECT * FROM Tarjetas');
      res.json(result.recordset);
    } catch (err) {
      console.error('Error al consultar tarjetas:', err);
      res.status(500).json({ message: err.message });
    }
  });

app.get('/tarjetas/:idCliente', async (req, res) => {
    const { idCliente } = req.params;
    console.log('Obteniendo tarjetas con ID:', idCliente);
    try {
        const result = await sqlPool.request()
        .input('idCliente', sql.Int, idCliente)
        .query('SELECT * FROM Tarjetas WHERE idCliente = @idCliente');
        if (result.recordset.length > 0) {
            res.json(result.recordset);
            console.log(result.recordset);
        } else {
            res.status(404).json({ message: 'No se encontraron vehículos con los criterios especificados.' });
        }
      
    } catch (err) {
      console.error('Error al obtener tarjeta por ID:', err);
      res.status(500).json({ message: err.message });
    }
  });
  app.get('/tarjetas-s/:numeroTarjeta', async (req, res) => {
    const { numeroTarjeta } = req.params;
    console.log('Obteniendo tarjetas con ID:', numeroTarjeta);
    try {
        const result = await sqlPool.request()
        .input('numeroTarjeta', sql.VarChar, numeroTarjeta)
        .query('SELECT * FROM Tarjetas WHERE NumeroTarjeta = @numeroTarjeta');
        if (result.recordset.length > 0) {
            res.json(result.recordset);
            console.log(result.recordset);
        } else {
            res.status(404).json({ message: 'No se encontraron vehículos con los criterios especificados.' });
        }
      
    } catch (err) {
      console.error('Error al obtener tarjeta por ID:', err);
      res.status(500).json({ message: err.message });
    }
  });
  app.put('/tarjetas/:numeroTarjeta', async (req, res) => {
    const { numeroTarjeta } = req.params;
    const { PIN, CVV, fechaVencimiento, idCliente, idTipoTarjeta } = req.body;
    console.log(req.params);
    console.log(req.body);
    console.log('Modificando tarjeta con número:', numeroTarjeta);
    try {
        const result = await sqlPool.request()
            .input('NumeroTarjeta', sql.VarChar, numeroTarjeta)
            .input('PIN', sql.Int, PIN)
            .input('CVV', sql.Int, CVV)
            .input('FechaVencimiento', sql.Date, fechaVencimiento)
            .input('IdCliente', sql.Int, idCliente)
            .input('IdTipoTarjeta', sql.Int, idTipoTarjeta)
            .query('UPDATE Tarjetas SET PIN = @PIN, CVV = @CVV, FechaVencimiento = @FechaVencimiento, IdCliente = @IdCliente, IdTipoTarjeta = @IdTipoTarjeta WHERE NumeroTarjeta = @NumeroTarjeta');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Tarjeta modificada exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo modificar la tarjeta' });
        }
    } catch (err) {
        console.error('Error al modificar tarjeta:', err);
        res.status(500).json({ message: err.message });
    }
});


//CLIENTES
//SELECT *
app.get('/clientes', async (req, res) => {
    const { tipoCliente, identificacion } = req.query;
    console.log('SELECT Clientes');

    console.log(req.query);
    try {

        const result = await sqlPool.request()
            .input('Identificacion', sql.NVarChar, identificacion || null)
            .input('TipoCliente', sql.NVarChar, tipoCliente || null)
            .execute('ConsultarCliente');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar clientes:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/clientesID', async (req, res) => {
    const { identificacion } = req.query;
    console.log('SELECT Clientes por identificación:', identificacion);

    if (!identificacion) {
        return res.status(400).json({ message: "Identificación es requerida" });
    }

    try {
        const result = await sqlPool.request()
            .input('Identificacion', sql.VarChar, identificacion)
            .query('SELECT * FROM Clientes WHERE id = @identificacion');

        const cliente = result.recordset[0];
        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }
        res.json(cliente);
    } catch (err) {
        console.error('Error al consultar cliente:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});

app.get('/clientesTipo', async (req, res) => {
    const { tipoCliente } = req.query;
    console.log('SELECT Clientes');
    console.log(req);
    console.log(req.query);
    try {

        const result = await sqlPool.request()
            .input('Identificacion', null)
            .input('TipoCliente', sql.NVarChar, tipoCliente)
            .execute('ConsultarCliente');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar clientes:', err);
        res.status(500).json({ message: err.message });
    }
});
//INSERT
app.post('/clientes', async (req, res) => {
    const { nombre, apellidos, identificacion, telefono, paisResidencia, direccion, tipoCliente } = req.body;

    console.log('INSERT CLIENTE');
    console.log(req.body);
    console.log('Nombre:', nombre);
    console.log('Apellidos:', apellidos);
    console.log('Identificacion:', identificacion);
    console.log('Telefono:', telefono);
    console.log('PaisResidencia:', paisResidencia);
    console.log('Direccion:', direccion);
    console.log('TipoCliente:', tipoCliente);
    try {
        console.log('INSERT CLIENTE EXITOSO');
        const result = await sqlPool.request()
            .input('Nombre', sql.NVarChar, nombre)
            .input('Apellidos', sql.NVarChar, apellidos)
            .input('Identificacion', sql.BigInt, identificacion)
            .input('Telefono', sql.VarChar, telefono)
            .input('PaisResidencia', sql.VarChar, paisResidencia)
            .input('Direccion', sql.NVarChar, direccion)
            .input('TipoCliente', sql.NVarChar, tipoCliente)
            .execute('AgregarCliente');

        res.json({ message: 'Cliente agregado exitosamente'});
    } catch (err) {
        console.error('Error al agregar el cliente:', err);
        if (err.number === 50000) {
            res.status(400).json({ message: err.originalError.info.message});
        } else {
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }
});
app.delete('/clientes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await sql.connect(sqlConfig);
        const result = await sqlPool.request()
            .input('Identificacion', sql.VarChar, id)
            .execute('EliminarCliente');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Cliente eliminado exitosamente' });
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (err) {
        console.error('Error al eliminar el cliente:', err);
        res.status(500).json({ message: err.message });
    }
});
app.put('/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellidos, identificacion, telefono, paisResidencia, direccion, tipoCliente } = req.body;
    console.log("MODIFICAR CLIENTE");
    console.log(req.params);
    console.log(req.body);
    try {
        const result = await sqlPool.request()
            .input('ID', sql.Int, id)
            .input('Nombre', sql.NVarChar, nombre)
            .input('Apellidos', sql.NVarChar, apellidos)
            .input('Identificacion', sql.VarChar, identificacion)
            .input('Telefono', sql.VarChar, telefono)
            .input('PaisResidencia', sql.VarChar, String(paisResidencia))
            .input('Direccion', sql.NVarChar, direccion)
            .input('TipoCliente', sql.NVarChar, String(tipoCliente))
            .execute('ModificarCliente');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Cliente modificado con éxito' });
        } else {
            res.status(404).send('Cliente no encontrado');
        }
    } catch (err) {
        console.error('Error al modificar el cliente:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});

// ALQUILERES

// ALQUILERES - Alquileres sin detalles de alquiler
app.get('/alquiler', async (req, res) => {
    try {
        const result = await sqlPool.request()
            .query(`
                SELECT 
                    A.idAlquiler,
                    A.idCliente,
                    A.fechaAlquiler,
                    A.fechaEntrega,
                    A.idVehiculo,
                  
                    A.monto,
                    A.idSeguro
                FROM 
                    Alquiler A
                LEFT JOIN 
                    detallesAlquiler D ON A.idAlquiler = D.idAlquiler
                WHERE 
                    D.idDetallesAlquiler IS NULL
            `);

        if (result.recordset.length > 0) {
            res.json(result.recordset);
        } else {
            res.status(404).json({ message: 'No se encontraron alquileres sin detalles.' });
        }
    } catch (err) {
        console.error('Error al consultar alquileres sin detalles:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});

// ALQUILERES - Detalles de alquiler
app.get('/alquilerDetalles', async (req, res) => {
    try {
        const result = await sqlPool.request()
            .query(`
                SELECT 
                    A.idAlquiler,
                    A.idCliente,
                    A.fechaAlquiler,
                    A.fechaEntrega,
                    A.idVehiculo,
                    A.monto,
                    A.idSeguro,
                    D.idDetallesAlquiler,
                    D.fechaDevolucion,
                    D.montoTotal
                FROM 
                    Alquiler A
                INNER JOIN 
                    detallesAlquiler D ON A.idAlquiler = D.idAlquiler
            `);
        if (result.recordset.length > 0) {
            res.json(result.recordset);
        } else {
            res.status(404).json({ message: 'No se encontraron detalles de alquiler.' });
        }
    } catch (err) {
        console.error('Error al consultar los detalles de alquiler:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});
app.post('/realizarAlquiler', async (req, res) => {
    const { idCliente, idVehiculo, fechaEntrega, horaEntrega, idSeguro } = req.body;
    console.log("realizarAlquiler")
    console.log(req.body)
    console.log('Received fechaEntrega:', fechaEntrega);
    console.log('Received horaEntrega:', horaEntrega);
    const fechaAlquiler = new Date();
     const partesFecha = fechaEntrega.split('-');
     const partesHora = horaEntrega.split(':'); 
 
     
     const entregaDateTime = new Date(Date.UTC(
         parseInt(partesFecha[0], 10), // año
         parseInt(partesFecha[1], 10) - 1, // mes (Mes empieza en 0 asi que se le resta 1)
         parseInt(partesFecha[2], 10), // dia
         parseInt(partesHora[0], 10), // hora
         parseInt(partesHora[1], 10), // minuto
     ));
    
    console.log('fechaAlquiler:', fechaAlquiler);
    console.log('entregaDateTime:', entregaDateTime);

    if (isNaN(entregaDateTime.getTime())) {
        return res.status(400).json({ message: 'fechaEntrega o horaEntrega Invalidas' });
    }

    const rentalHours = Math.abs(entregaDateTime - fechaAlquiler) / 36e5;

    try {

        const montoResult = await sqlPool.request()
            .input('idVehiculo', sql.Int, idVehiculo)
            .input('horas', sql.Int, Math.ceil(rentalHours))
            .input('idSeguro', sql.Int, idSeguro || null)
            .execute('CalcularCostoAlquiler');

        const monto = montoResult.recordset[0].CostoTotal;
        console.log('Ejecutando realizarAlquiler con los sig parametros:', {
            idCliente,
            fechaAlquiler: fechaAlquiler.toISOString(),
            fechaEntrega: entregaDateTime.toISOString(),
            idVehiculo,
            monto,
            idSeguro
        });
        const result = await sqlPool.request()
            .input('idCliente', sql.Int, idCliente)
            .input('fechaAlquiler', sql.DateTime, fechaAlquiler)
            .input('fechaEntrega', sql.DateTime, entregaDateTime)
            .input('idVehiculo', sql.Int, idVehiculo)
            .input('monto', sql.Decimal(10, 2), monto)
            .input('idSeguro', sql.Int, idSeguro)
            .execute('RealizarAlquiler');

            if (result.rowsAffected.length > 0) {
                const idAlquiler = result.recordset[0].idAlquiler;  // Asumiendo que el SP devuelve esto
                res.json({ message: 'Alquiler realizado exitosamente', idAlquiler });
            } else {
                res.status(400).json({ message: 'No se pudo realizar el alquiler' });
            }
    } catch (error) {
        console.error('Error al realizar el alquiler:', error);
        res.status(500).json({ message: error.message });
    }
});


app.post('/finalizarAlquiler', async (req, res) => {
    const { idAlquiler} = req.body;
    const fechaDevolucion = new Date();
    if (!idAlquiler || !fechaDevolucion) {
        return res.status(400).json({ message: "Por favor, proporcione idAlquiler y fechaDevolucion." });
    }

    try {
       
        const devolucionDate = new Date(fechaDevolucion);

        const result = await sqlPool.request()
            .input('idAlquiler', sql.Int, idAlquiler)
            .input('fechaDevolucion', sql.DateTime, devolucionDate)
            .execute('FinalizarAlquiler');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Alquiler finalizado correctamente', detalles: result.recordset });
        } else {
            res.status(404).json({ message: 'No se encontró el alquiler especificado o no se pudo actualizar.' });
        }
    } catch (err) {
        console.error('Error al finalizar el alquiler:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});
app.get('/generarReciboAlquiler/:idAlquiler', async (req, res) => {
    const { idAlquiler } = req.params;
    console.log("RECIBO")
    if (!idAlquiler) {
        return res.status(400).json({ message: "Por favor, proporcione el idAlquiler." });
    }

    try {
        const result = await sqlPool.request()
            .input('idAlquiler', sql.Int, idAlquiler)
            .execute('GenerarReciboAlquiler');

        if (result.recordset.length > 0) {
            res.json({ message: 'Recibo generado correctamente', recibo: result.recordset[0] });
            console.log("Recibo generado correctamente")
        } else {
            res.status(404).json({ message: 'No se encontró el alquiler especificado.' });
        }
    } catch (err) {
        console.error('Error al generar el recibo de alquiler:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});





// Inicia el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
