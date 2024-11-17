async function obtenerProducto(codigo) {
    try {
        const li1 = await fetch(`http://127.0.0.1:3000/api/productos/codigo/${codigo}`);
        if (!li1.ok) throw new Error('Producto no encontrado');
        const producto = await li1.json();
        return producto;
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        return null;
    }
}

async function agregarProductoALaVenta() {
    const c = document;
    const codigo = c.getElementById('codigoProducto').value;
    const cantidad = parseFloat(c.getElementById('cantidadProducto').value);

    if (!codigo || isNaN(cantidad) || cantidad <= 0) {
        alert('ingresa codigo y cantids');
        return null;
    }

    const producto = await obtenerProducto(codigo);
    if (!producto) {
        alert('producto no encontrado en inventario');
        return null;
    }

    const precio = parseFloat(producto.precio);
    if (isNaN(precio)) {
        alert('precio incorrecto');
        return null;
    }

    const listaProductos = c.getElementById('listaProductos');
    const fila = c.createElement('tr');

    const importe = precio * cantidad;

    fila.innerHTML = `
        <td>${producto.codigo}</td>
        <td>${cantidad}</td>
        <td>Unid</td>
        <td>${producto.nombre}</td>
        <td>$${precio.toFixed(2)}</td>
        <td>$${importe.toFixed(2)}</td>
    `;

    listaProductos.appendChild(fila);
    actualizarTotales();
}

function actualizarTotales() {
    const c = document;
    const filas = c.querySelectorAll('#listaProductos tr');
    let subtotal = 0;

    filas.forEach(fila => {
        const importe = parseFloat(fila.cells[5].textContent.replace('$', ''));
        subtotal += importe;
    });
    const impuestos = subtotal * 0.16;  
    const total = subtotal + impuestos;

    c.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    c.getElementById('impuestos').textContent = `$${impuestos.toFixed(2)}`;
    c.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

c = document;

// pendienton la imagen
c.getElementById('codigoProducto').addEventListener('change', async function () {
    const producto = await obtenerProducto(this.value);
    const imagen = c.getElementById('imagenProducto');
    
    if (producto) {
        const imagePath = `/frontend/images/${producto.codigo}.png`;
        
        
        const imageExists = await fetch(imagePath).then(res => res.ok).catch(() => false);
        
        if (imageExists) {
            imagen.src = imagePath;
            imagen.style.display = 'block';
        } else {
            console.warn('Imagen no encontrada:', imagePath);
            imagen.style.display = 'none';
        }
    } else {
        imagen.style.display = 'none';
    }
});
let ventaRegistrada=false;
async function registrarVenta() {
    if (ventaRegistrada) {
        alert('La venta ya ha sido registrada. Finaliza y genera el ticket.');
        return;
    }

    const productosVendidos = [];
    const listaFilas = document.querySelectorAll('#listaProductos tr');
    const metodoPago = document.getElementById('metodoPago').value;
    const dineroIngresado = parseFloat(document.getElementById('dineroIngresado').value || 0);
    
    if (isNaN(dineroIngresado) || dineroIngresado <= 0) {
        alert('Por favor ingresa un monto válido de dinero');
        return;
    }
    if (listaFilas.length === 0) {
        alert('Agrega al menos un producto a la venta');
        return;
    }

    for (const fila of listaFilas) {
        const codigo = fila.cells[0].textContent;
        const cantidad = parseInt(fila.cells[1].textContent, 10);  
        const precio = parseFloat(fila.cells[4].textContent.replace('$', ''));

        if (codigo && cantidad && precio && !isNaN(cantidad) && !isNaN(precio)) {
            const producto = await obtenerProducto(codigo);
            if (producto) {
                const stockDisponible = producto.stock;
                if (stockDisponible < cantidad) {
                    alert(`No hay suficiente stock de ${producto.nombre}.`);
                    return;
                }

                productosVendidos.push({
                    producto_orden: productosVendidos.length + 1,
                    codigo,
                    cantidad, 
                    precio
                });

                const nuevaCantidad = stockDisponible - cantidad;
                await actualizarInventario(codigo, nuevaCantidad);
            } else {
                alert(`Producto con código ${codigo} no encontrado.`);
                return;
            }
        } else {
            console.error('Error en los datos del producto:', fila);
        }
    }

    const subtotal = productosVendidos.reduce((acc, prod) => acc + (prod.cantidad * prod.precio), 0);
    const impuestos = subtotal * 0.16;  
    const total = subtotal + impuestos;
    const cambio = dineroIngresado - total; 

    if (productosVendidos.length === 0) {
        alert('No hay productos válidos para registrar la venta');
        return;
    }

    const venta = {
        productos: productosVendidos,
        fecha: new Date().toISOString().slice(0, 19).replace('T', ' '),
        subtotal,
        impuestos,
        total,
        metodoPago,
        dineroIngresado,
        cambio
    };

    try {
        const response = await fetch('http://127.0.0.1:3000/api/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(venta)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al registrar la venta: ${errorText}`);
        }
        alert('Venta registrada exitosamente');
        ventaRegistrada = true;
    } catch (error) {
        console.error('Error con la venta:', error);
    }
}




async function finalizarVenta() {
    const metodoPago = c.getElementById('metodoPago').value;
    const dineroIngresado = parseFloat(c.getElementById('dineroIngresado').value);

    if (isNaN(dineroIngresado) || dineroIngresado <= 0) {
        alert('Por favor ingresa un monto válido de dinero');
        return;
    }

    const productosVendidos = [];
    const listaFilas = c.querySelectorAll('#listaProductos tr');

    if (listaFilas.length === 0) {
        alert('Agrega al menos un producto a la venta');
        return;
    }

    for (const fila of listaFilas) {
        const codigo = fila.cells[0].textContent;
        const cantidad = parseInt(fila.cells[1].textContent, 10);
        const precio = parseFloat(fila.cells[4].textContent.replace('$', '').trim());

        const producto = await obtenerProducto(codigo);
        const nombreProducto = producto ? producto.nombre : 'Desconocido';

        if (codigo && cantidad && precio && !isNaN(cantidad) && !isNaN(precio)) {
            productosVendidos.push({
                producto_orden: productosVendidos.length + 1,
                codigo,
                nombre: nombreProducto,  
                cantidad,
                precio,
                metodoPago
            });
        }
    }

    if (productosVendidos.length === 0) {
        alert('No se encontraron productos válidos');
        return;
    }

    const subtotal = productosVendidos.reduce((acc, prod) => acc + (prod.cantidad * prod.precio), 0);
    const impuestos = subtotal * 0.16;
    const total = subtotal + impuestos;

    if (dineroIngresado < total) {
        alert('El dinero ingresado es insuficiente');
        return;
    }

    const cambio = dineroIngresado - total;

    const detalleVenta = c.getElementById('detalleVenta');
    detalleVenta.innerHTML = `
        <h2>Ticket de Venta</h2>
        <p>Venta No: ${Math.floor(Math.random() * 1000)}</p>
        <p>Fecha: ${new Date().toLocaleString()}</p>
        <p>Método de Pago: ${metodoPago}</p>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Impuestos: $${impuestos.toFixed(2)}</p>
        <p>Total: $${total.toFixed(2)}</p>
        <p>Dinero Ingresado: $${dineroIngresado.toFixed(2)}</p>
        <p>Cambio: $${cambio.toFixed(2)}</p>
        <h3>Productos:</h3>
    `;

    
    
    productosVendidos.forEach(prod => {
        detalleVenta.innerHTML += `<p>${prod.nombre} | ${prod.codigo} | ${prod.cantidad} | $${prod.precio.toFixed(2)} = $${(prod.cantidad * prod.precio).toFixed(2)}</p>`;
    });

    try {
        const response = await fetch('http://127.0.0.1:3000/api/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productos: productosVendidos,
                fecha: new Date().toISOString(),
                subtotal,
                impuestos,
                total,
                metodoPago,
                dineroIngresado,
                cambio
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al registrar la venta: ${errorText}`);
        }

        alert('Venta registrada exitosamente');
    } catch (error) {
        console.error('Error con la venta:', error);
    }
}



function mostrarDetalleVenta(ticketData) {
    const detalleVentaDiv = c.getElementById('detalleVenta');
    const { ventaId, fecha, metodoPago, subtotal, impuestos, total, dineroIngresado, cambio, productos } = ticketData.ticket;

    let detalleHTML = `
        <h3>Ticket de Venta</h3>
        <p><strong>Venta No:</strong> ${ventaId}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Método de Pago:</strong> ${metodoPago}</p>
        <p><strong>Subtotal:</strong> $${Number(subtotal).toFixed(2)}</p>
        <p><strong>Impuestos:</strong> $${Number(impuestos).toFixed(2)}</p>
        <p><strong>Total:</strong> $${Number(total).toFixed(2)}</p>
        <p><strong>Dinero Ingresado:</strong> $${Number(dineroIngresado).toFixed(2)}</p>
        <p><strong>Cambio:</strong> $${Number(cambio).toFixed(2)}</p>
        <h4>Productos</h4>
        <ul>
    `;

    productos.forEach((producto) => {
        detalleHTML += `
            <li>${producto.codigo} | ${producto.cantidad} | $${Number(producto.precio).toFixed(2)} = $${(producto.cantidad * producto.precio).toFixed(2)}</li>
        `;
    });

    detalleHTML += '</ul>';
    detalleVentaDiv.innerHTML = detalleHTML;
}


function generarTicket(ticketData) {
    const { ventaId, fecha, metodoPago, subtotal, impuestos, total, dineroIngresado, cambio, productos } = ticketData.ticket;

    const ticketHTML = `
        <html>
            <head>
                <title>Ticket de Venta</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    h3 { text-align: center; }
                    p, ul { font-size: 0.9em; margin: 5px 0; }
                    ul { padding-left: 20px; }
                </style>
            </head>
            <body>
                <h3>Ticket de Venta</h3>
                <p><strong>Venta No:</strong> ${ventaId}</p>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Método de Pago:</strong> ${metodoPago}</p>
                <p><strong>Subtotal:</strong> $${Number(subtotal).toFixed(2)}</p>
                <p><strong>Impuestos:</strong> $${Number(impuestos).toFixed(2)}</p>
                <p><strong>Total:</strong> $${Number(total).toFixed(2)}</p>
                <p><strong>Dinero Ingresado:</strong> $${Number(dineroIngresado).toFixed(2)}</p>
                <p><strong>Cambio:</strong> $${Number(cambio).toFixed(2)}</p>
                <h4>Productos</h4>
                <ul>
                    ${productos.map(prod => `
                        <li>${prod.nombre} | ${prod.codigo} | ${prod.cantidad} | $${Number(prod.precio).toFixed(2)} = $${(prod.cantidad * prod.precio).toFixed(2)}</li>
                    `).join('')}
                </ul>
            </body>
        </html>
    `;

    
    const newWindow = window.open('', '_blank');
    newWindow.c.write(ticketHTML);
    newWindow.c.close();
}

async function agregarProductoALaVenta() {
    const codigo = c.getElementById('codigoProducto').value;
    const cantidad = parseFloat(c.getElementById('cantidadProducto').value);

    if (!codigo || isNaN(cantidad) || cantidad <= 0) {
        alert('ingresa codigo y cantidad');
        return null;
    }

    const producto = await obtenerProducto(codigo);
    if (!producto) {
        alert('producto no encontrado en inventario');
        return null;
    }

    const precio = parseFloat(producto.precio);
    if (isNaN(precio)) {
        alert('precio incorrecto');
        return null;
    }

    const listaProductos = c.getElementById('listaProductos');
    const fila = c.createElement('tr');

    const importe = precio * cantidad;

    fila.innerHTML = `
        <td>${producto.codigo}</td>
        <td>${cantidad}</td>
        <td>Unid</td>
        <td>${producto.nombre}</td>
        <td>$${precio.toFixed(2)}</td>
        <td>$${importe.toFixed(2)}</td>
    `;

    listaProductos.appendChild(fila);
    actualizarTotales();
    mostrarEnTicket(producto, cantidad, precio, importe);
}

function mostrarEnTicket(producto, cantidad, precio, importe) {
    const detalleVenta = c.getElementById('detalleVenta');
    const ticketProducto = c.createElement('p');
    ticketProducto.innerHTML = `
        ${producto.nombre} | ${cantidad} | $${precio.toFixed(2)} = $${importe.toFixed(2)}
    `;
    detalleVenta.appendChild(ticketProducto);
}
//a
async function actualizarInventario(codigo, cantidadVendida) {
    try {
        const response = await fetch(`http://127.0.0.1:3000/api/productos/${codigo}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidad: cantidadVendida })
        });
        if (!response.ok) {
            throw new Error('Error al actualizar el inventario');
        }
    } catch (error) {
        console.error('Error actualizando inventario:', error);
    }
}
