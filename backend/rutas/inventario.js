document.addEventListener("DOMContentLoaded", function() {
    cargarProductos();
});

function cargarProductos() {
    const userRole=localStorage.getItem('userRole');
    fetch('http://127.0.0.1:3000/api/productos')
        .then(response => response.json())
        .then(data => {
            const tbody=document.getElementById("productos-lista");
            tbody.innerHTML = "";
            data.forEach(producto => {
                const row=document.createElement("tr");
                row.innerHTML = `
                    <td>${producto.codigo}</td>
                    <td>${producto.nombre}</td>
                    <td>${producto.stock}</td>
                    <td>${producto.precio}</td>
                    <td>
                        <button onclick="editarProducto(${producto.id})">Editar</button>
                        <button onclick="eliminarProducto(${producto.id})">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error('error al cargar productos:', error));
}
function eliminarProducto(id) {
    const userRole = localStorage.getItem('userRole'); 
    fetch(`http://localhost:3000/api/productos/${id}`, {
        method: 'DELETE',
        headers: { 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userRole }) 
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        cargarProductos();
    })
    .catch(error => console.error('error al eliminar producto:', error));
}

function editarProducto(id) {
    const codigo = prompt("nuevo codigo del producto:");
    const nombre = prompt("uevo nombre del producto:");
    const stock = prompt("nueva cantidad en stock:");
    const precio = prompt("muevo precio del producto:");
    
    if (codigo && nombre && stock && precio) {
        const userRole = localStorage.getItem('userRole'); 
        fetch(`http://localhost:3000/api/productos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, nombre, stock, precio, userRole }) 
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            cargarProductos();
        })
        .catch(error => console.error('Error al editar producto:', error));
    }
}


function editarProducto(id) {
    const codigo = prompt("Nuevo codigo del producto:");
    const nombre = prompt("Nuevo nombre del producto:");
    const stock = prompt("Nueva cantidad en stock:");
    const precio = prompt("Nuevo precio del producto:");
    
    if (codigo && nombre && stock && precio) {
        const userRole = localStorage.getItem('userRole');
        fetch(`http://localhost:3000/api/productos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, nombre, stock, precio, userRole })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            cargarProductos();
        })
        .catch(error => console.error('Error al editar producto:', error));
    }
}
