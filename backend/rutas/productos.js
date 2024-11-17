function guardarProducto() {
    const codigo = document.getElementById('codigoProducto').value;
    const nombre = document.getElementById('nombreProducto').value;
    const precio = document.getElementById('precioProducto').value;
    const stock = document.getElementById('cantidadProducto').value;

    const producto = { codigo, nombre, precio, stock, userRole: 'admin'};

    fetch('http://localhost:3000/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto)
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        location.href = 'inventario.html';
    })
    .catch(error => console.error('Error al guardar producto:', error));
}
