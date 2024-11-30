const express=require('express');
const bodyParser=require('body-parser');
const dotenv=require('dotenv');
const cors= require('cors');
const fs= require('fs');
const path = require('path');

const verificarAdmin= require('./backend/rutas/roles');

dotenv.config();

const ap= express();
const puerto= process.env.PORT || 3001;
const db= require('./backend/configuracion/base');
const { error } = require('console');

ap.use(cors());
ap.use(bodyParser.json());
ap.use(express.static('public'));
ap.use(express.json());
ap.use(express.urlencoded({ extended: true }));

ap.use('/api/usuarios', require('./backend/rutas/usuarios'));

ap.get('/api/productos', (req, res) => {
    const { codigo } = req.query;
    let cSql= 'select * from productos';
    
    if (codigo) {
        cSql+= ' where codigo = ?';
    }
    
    db.query(cSql, [codigo], (err, results) => {
        res.json(results);
    });
});

ap.post('/api/productos', verificarAdmin, (req, res) => {
    const { codigo, nombre, stock, precio } = req.body;
    const cSql2 = 'insert into productos (codigo, nombre, stock, precio) values (?, ?, ?, ?)';
    db.query(cSql2, [codigo, nombre, stock, precio], (err) => {
        res.json({ message: 'Producto agregado' });
    });
});

ap.put('/api/productos/:id', verificarAdmin, (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, stock, precio } = req.body;
    const cSql3 = 'update productos set codigo = ?, nombre = ?, stock = ?, precio = ? where id = ?';
    db.query(cSql3, [codigo, nombre, stock, precio, id], (err) => {
        res.json({ message: 'Producto actualizado' });
    });
});

ap.delete('/api/productos/:id', verificarAdmin, (req, res) => {
    const { id } = req.params;
    const cSql4 = 'delete from productos where id = ?';
    db.query(cSql4, [id], (err) => {
        res.json({ message: 'Producto eliminado' });
    });
});
ap.put('/api/productos/:codigo', async (req, res) => {
    const { codigo } = req.params;
    const { stock } = req.body;
    try {
        const result = await db.query('UPDATE productos SET stock = ? WHERE codigo = ?', [stock, codigo]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Producto actualizado exitosamente' });
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar producto', error });
    }
});


ap.post('/api/ventas', (req, res) => {
    const { productos, fecha, subtotal, impuestos, total, metodoPago, dineroIngresado,usuario_id } = req.body;
    const fechaFormateada = new Date(fecha).toISOString().slice(0, 19).replace('T', ' ');
    const cambio = dineroIngresado - total;
    console.log('usuario_id recibido:', usuario_id);
    
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al iniciar transacción' });
        }

        const cVenta = 'insert into ventas2 (fecha, subtotal, impuestos, total, metodo_pago, dinero_ingresado, cambio,usuario_id) values (?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(cVenta, [fechaFormateada, subtotal, impuestos, total, metodoPago, dineroIngresado, cambio, usuario_id], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    res.status(500).json({ error: 'Error al registrar la venta' });
                });
            }

            const ventaId = result.insertId;
            const cDetalle = `insert into detalle_ventas (venta_id, producto_id, cantidad, precio, producto_orden) values (?, ?, ?, ?, ?)`;

            const codigos = productos.map(prod => prod.codigo);
            db.query('select id, codigo, nombre, stock from productos where codigo in (?)', [codigos], (err, rows) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Error al obtener productos' });
                    });
                }

                const productoIds = {};
                rows.forEach(row => {
                    productoIds[row.codigo] = { id: row.id, nombre: row.nombre, stock: row.stock };
                });

                const dI = productos.map((prod, index) => {
                    return new Promise((resolve, reject) => {
                        const producto = productoIds[prod.codigo];
                        if (!producto) {
                            return reject(`Producto con código ${prod.codigo} no encontrado`);
                        }

                        if (producto.stock < prod.cantidad) {
                            return reject(`No hay suficiente stock para el producto ${producto.nombre}`);
                        }

                        db.query(
                            cDetalle,
                            [ventaId, producto.id, prod.cantidad, prod.precio, prod.producto_orden || index + 1],
                            (err) => {
                                if (err) return reject(err);

                                const nuevoStock = producto.stock - prod.cantidad;
                                db.query(
                                    'update productos set stock = ? where id = ?',
                                    [nuevoStock, producto.id],
                                    (err) => {
                                        if (err) return reject(err);
                                        resolve({
                                            nombre: producto.nombre,
                                            cantidad: prod.cantidad,
                                            precio: prod.precio,
                                            subtotal: prod.cantidad * prod.precio
                                        });
                                    }
                                );
                            }
                        );
                    });
                });

                Promise.all(dI)
                    .then(detalleVentas => {
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({ error: 'Error al confirmar la transacción' });
                                });
                            }

                            const ticketContent = `
                            Venta id: ${ventaId}
                            Fecha: ${fechaFormateada}
                            Mtodo de Pago: ${metodoPago}
                            Subtotal: $${subtotal.toFixed(2)}
                            Impuestos: $${impuestos.toFixed(2)}
                            Total: $${total.toFixed(2)}
                            Cambio: $${cambio.toFixed(2)}
                            
                            Detalle de productos:
                            ${detalleVentas.map(prod => `${prod.nombre} | ${prod.cantidad} | $${prod.precio.toFixed(2)} = $${prod.subtotal.toFixed(2)}`).join('\n')}
                            `;

                            const ticketPath = path.join(__dirname, 'tickets', `ticket_${ventaId}.txt`);
                            fs.writeFile(ticketPath, ticketContent, (err) => {
                                if (err) {
                                    console.error('Error al guardar el ticket:', err);
                                }
                            });

                            const ticket = {
                                ventaId,
                                fecha: fechaFormateada,
                                metodoPago,
                                subtotal,
                                impuestos,
                                total,
                                productos: detalleVentas
                            };
                            res.json({ message: 'Venta registrada con éxito', ticket });
                        });
                    })
                    .catch(error => {
                        db.rollback(() => {
                            res.status(500).json({ error });
                        });
                    });
            });
        });
    });
});

ap.get('/api/productos/codigo/:codigo', (req, res) => {
    const { codigo } = req.params;
    const cSql5 = 'select * from productos where codigo = ?';
    db.query(cSql5, [codigo], (err, results) => {
        res.json(results[0]);
    });
});

ap.post('/api/iniciar-caja', (req, res) => {
    const { fecha, montoInicial } = req.body;

    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al iniciar transacción de caja' });
        }

        const sql6 = `insert into inicio_caja (fecha, monto_inicial) values (?, ?)`;
        db.query(sql6, [fecha, montoInicial], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    res.status(500).json({ error: 'Error al iniciar la caja' });
                });
            }

            const inicioCajaId = result.insertId;

            const { descripcion, monto, tipo } = req.body; 
            const sql7 = `insert into registros_caja (descripcion, monto, tipo, fecha, inicio_caja_id) values (?, ?, ?, ?, ?)`;

            db.query(sql7, [descripcion, monto, tipo, fecha, inicioCajaId], (err) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Error al agregar registro de caja' });
                    });
                }

                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Error al confirmar la transacción de caja' });
                        });
                    }
                    res.json({ message: 'Caja iniciada correctamente' });
                });
            });
        });
    });
});


ap.post('/api/agregar-registro', (req, res) => {
    const { descripcion, monto, tipo, fecha, inicioCajaId } = req.body;
    const sql7 = `insert into registros_caja (descripcion, monto, tipo, fecha, inicio_caja_id) values (?, ?, ?, ?, ?)`;

    db.query(sql7, [descripcion, monto, tipo, fecha, inicioCajaId], (err) => {
        res.send({ message: 'Registro agregado correctamente' });
    });

});
ap.post('/api/realizar-corte', (req, res) => {
    const { fecha, totalEfectivo, totalTarjeta, diferencia, inicioCajaId } = req.body;
    const sql8 = `insert into corte_caja (fecha, total_efectivo, total_tarjeta, diferencia, inicio_caja_id) values (?, ?, ?, ?, ?)`;

    db.query(sql8, [fecha, totalEfectivo, totalTarjeta, diferencia, inicioCajaId], (err) => {
        res.send({ message: 'correcto' });
    });
});

ap.get('/api/cortes', (req, res) => {
    const sql = `select * from corte_caja order by fecha desc`;
    db.query(sql, (err, results) => {
        res.send(results);
    });
});

ap.get('/api/ventas-por-periodo', (req, res) => {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ error: 'faltan fechas en la solicitud' });
    }

    db.query(`
        select 
            v.fecha, 
            p.nombre as producto, 
            dv.cantidad, 
            p.precio, 
            (dv.cantidad * p.precio) as total
        from 
            ventas2 v
        inner join 
            detalle_ventas dv on v.id = dv.venta_id
        inner join 
            productos p on dv.producto_id = p.id
        where 
            v.fecha between ? and ?
        order by 
            v.fecha;
    `, [fechaInicio, fechaFin], (err, resultados_ventas) => {
        if (err) {
            return res.status(500).json({ error: 'error al obtener los datos de ventas', detalles: err });
        }

        db.query(`
            select 
                sum(dv.cantidad * p.precio) as total_general
            from 
                ventas2 v
            inner join 
                detalle_ventas dv on v.id = dv.venta_id
            inner join 
                productos p on dv.producto_id = p.id
            where 
                v.fecha between ? and ?;
        `, [fechaInicio, fechaFin], (err, resultados_suma) => {
            if (err) {
                return res.status(500).json({ error: 'error al obtener la suma total', detalles: err });
            }

            if (resultados_ventas.length === 0) {
                return res.status(404).json({ error: 'no se encontraron ventas para el rango de fechas especificado' });
            }

            const total_general = parseFloat(resultados_suma[0]?.total_general) || 0;

            res.json({
                ventas: resultados_ventas,
                total_general: total_general
            });
        });
    });
});

ap.post('/clientes', (req, res) => {
    const { nombre, apellidos, telefono, email, direccion } = req.body;
    const query = 'CALL insertar_cliente(?, ?, ?, ?, ?)';
    db.query(query, [nombre, apellidos, telefono, email, direccion], (err, results) => {
        if (err) return res.status(500).send(err);
        res.status(201).send({ message: 'Cliente insertado correctamente', results });
    });
});

ap.put('/clientes/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, apellidos, telefono, email, direccion } = req.body;
    const query = 'CALL actualizar_cliente(?, ?, ?, ?, ?, ?)';
    db.query(query, [id, nombre, apellidos, telefono, email, direccion], (err, results) => {
        if (err) return res.status(500).send(err);
        res.status(200).send({ message: 'Cliente actualizado correctamente', results });
    });
});

ap.delete('/clientes/:id', (req, res) => {
    const { id }=req.params;
    const query='call eliminar_cliente(?)';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.status(200).send({ message: 'cliente eliminado', results });
    });
});

ap.post('/api/generar-ventas', (req, res) => {
    const { cantidadVentas }=req.body;
    if(!cantidadVentas || isNaN(cantidadVentas) || cantidadVentas<=0){
        return res.status(400).json({error: 'numero valido'});

    }
    const query=`call insertar_ventas_aleatorias(?)`;
    db.query(query, [cantidadVentas], (err, results) => {
        if (err) {
          console.error('error', err);
          return res.status(500).json({ error: 'eror interno del servidor' });
        }
        res.status(200).json({ message: `${cantidadVentas} ventas generadas exitosamente.` });
  });
});

ap.get('/reporteVentasMes/:mes', (req, res) => {
    const mes = req.params.mes;

    if (!mes || isNaN(mes) || mes<1 || mes>12) {
        return res.status(400).json({ error: 'mes no existe' });
    }

    const query = `
        select v.id AS idVenta, v.fecha, v.subtotal, v.impuestos,
        v.total, v.metodo_pago, v.dinero_ingresado, v.cambio, d.producto_id,
        d.cantidad, d.precio from ventas2 v
        join detalle_ventas d on v.id = d.venta_id
        where month(v.fecha) = ?;
    `;

    db.query(query, [mes], (err, results) => {
        if (err) {
            console.error('rror de consulta:', err);
            return res.status(500).json({ error: 'error de  reporte' });
        }
        res.status(200).json(results);
    });
});


ap.get('/reporte/:mes',(req,res)=>{
    const mes=req.params.mes;
    if(!mes || isNaN(mes) || mes<1 ||mes>12){
        return res.status(400).json({error: 'error 1y 12'});
    }
    const c=`select * from reporteVentasMes where month(fecha)=?;`;
    db.c(query,[mes],(err,results)=>{
        if(err){
            console.error('error de la vista',err);
            return res.status(500).json({error: 'error de reporte'});

        }
        res.status(200).json(results);
    });
});

ap.get('/reporteT',(req,res)=>{
    
    const c=`select p.nombre as producto, sum(case when month(v.fecha) between 1 and 3 then d.cantidad else 0 end) as trim_1,
    sum(case when month(v.fecha) between 4 and 6 then d.cantidad else 0 end) as trim_2, sum(case when month(v.fecha) between 7 and 9 then d.cantidad else 0 end) as trim_3,
    sum(case when month(v.fecha) between 10 and 12 then d.cantidad else 0 end) as trim_4
    from detalle_ventas d join ventas2 v on v.id = d.venta2_id join
    productos p on p.id = d.producto_id
    where year(v.fecha)=2024 group by p.nombre;`;
    db.query(c,(err,results)=>{
        if(err){
            console.error('error de la vista',err);
            return res.status(500).json({error: 'error de reporte'});

        }
        res.status(200).json(results);
    });
});


ap.listen(puerto, () => {
    console.log(`${puerto}`);
});

