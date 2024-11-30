const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../configuracion/base');
const verificarAdmin = require('./roles');


router.post('/agregar', verificarAdmin, async (req, res) => {
    const { nombre, password, email, userRole } = req.body;

    if(userRole!== 'admin'){
        return res.status(403).json({
            message: 'no tienes acceso'
        })
    }
    if (!nombre || !password || !email) {
        return res.status(400).json({ message: 'completa todo' });
    }

    const hashedPassword=await bcrypt.hash(password,10);
    const roleId=2; 

    const query = 'insert into usuarios (nombre, password, email, role_id) values (?, ?, ?, ?)';
    
    db.query(query, [nombre,hashedPassword,email,roleId], (err) => {
        if (err) {
            return res.status(500).json({ message: 'error al agregar el usuario' });
        }
        res.json({ message: 'usuario agregado' });
    });
});


router.delete('/:id',verificarAdmin, (req, res) => {
    const {userRole}=req.body; 
    if (userRole !== 'admin') {
        return res.status(403).json({ message: 'permiso denegado' });
    }

    const {id} = req.params;
    const query = 'delete from usuarios where id = ?';

    db.query(query, [id], (err) => {
        if (err) {
            return res.status(500).json({ message: 'error al eliminar' });
        }
        res.json({ message: 'Usuario eliminado' });
    });
});
router.put('/:id', verificarAdmin, async (req, res) => {
    console.log(req.body); 

    const { userRole, nombre, email, role_id} = req.body;

    if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Solo admin puede realizar esta acción.' });
    }

    const { id } = req.params;

    const fieldsToUpdate = [];
    const values = [];

    if (nombre) {
        fieldsToUpdate.push('nombre = ?');
        values.push(nombre);
    }
    if (email) {
        fieldsToUpdate.push('email = ?');
        values.push(email);
    }
    if (role_id) {
        fieldsToUpdate.push('role_id = ?');
        values.push(role_id);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: 'No se han enviado datos para actualizar.' });
    }

    const query = `update usuarios set ${fieldsToUpdate.join(', ')} where id = ?`;
    values.push(id);

    db.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error al actualizar el usuario.', error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.json({ message: 'Usuario actualizado correctamente.' });
    });
});


router.post('/inicio', (req, res) => {
    const { nombre, password } = req.body;

    if (!nombre || !password) {
        return res.status(400).json({ message: 'falta usuario y contraseñas' });
    }

    const query=`select u.*, r.nombre as role from usuarios u join roles r on u.role_id = r.id  where u.nombre = ?
    `;

    db.query(query, [nombre], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'consulta mal' });
        }

        if (results.length===0) {
            return res.status(400).json({ message: 'usuario no encontrado' });
        }

        const usuario=results[0];

        const match=await bcrypt.compare(password, usuario.password);
        if (!match) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }
        res.json({
            message: 'Inicio de sesión exitoso',
            role: usuario.role,
            userId: usuario.id
        });

    });
});

router.post('/registro', async (req, res) => {
    const { nombre, password, email } = req.body;

    if (!nombre || !password || !email) {
        return res.status(400).json({ message: 'completa todo' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const roleQuery = 'select id from roles where nombre = "admin"';

    db.query(roleQuery, (err, roleResult) => {
        if (err || roleResult.length === 0) {
            return res.status(500).json({ message: 'error al asignar rol 1 de admin' });
        }

        const roleId=roleResult[0].id;
        const query='insert into usuarios (nombre, password, email, role_id) values (?, ?, ?, ?)';

        db.query(query, [nombre,hashedPassword,email,roleId], (err) => {
            if (err) {
                return res.status(500).json({ message: 'error al registrar el administrador' });
            }
            res.json({ message: 'Administrador registrado exitosamente' });
        });
    });
});
router.get('/', (req, res) => {
    const query = `select u.id, u.nombre, r.nombre as role from usuarios u
        join roles r on u.role_id = r.id
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'error al obtener los usuarios' });
        }
        res.json(results);
    });
});
module.exports = router;
