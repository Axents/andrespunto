
const d = document;
async function submitForm(event) {
    event.preventDefault();

    const nombre = d.getElementById('nombre').value;
    const password = d.getElementById('password').value;
    const email = d.getElementById('email').value;
    const isRegistering = d.getElementById('email-group').style.display === 'block';

    let url = 'http://localhost:3000/api/usuarios/inicio';
    const requestData = { nombre, password };

    if (isRegistering) {
        url = 'http://localhost:3000/api/usuarios/registro';
        requestData.email = email;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });

    const data = await response.json();
    d.getElementById('message').textContent = data.message;

    if (response.ok && !isRegistering) {
        if (data.role === 'admin') {
            localStorage.setItem('userRole',data.role);

            window.location.href = 'ventas.html';
        } else {

            window.location.href = 'ventas.html';
            localStorage.setItem('userRole',data.role);


        }
    }
}
async function actualizarUsuario(userId) {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        alert('solo los admin tienen permiso');
        return;
    }

    const nuevoNombre = prompt('nuevo nombre')?.trim();
    const nuevoEmail = prompt('nuevo email')?.trim();
    const nuevoRoleId = prompt('Nuevo id')?.trim();

    if (!nuevoNombre && !nuevoEmail && !nuevoRoleId) {
        alert('no hay cambios');
        return;
    }

    const requestBody = { userRole };
    if (nuevoNombre) requestBody.nombre = nuevoNombre;
    if (nuevoEmail) requestBody.email = nuevoEmail;
    if (nuevoRoleId) requestBody.role_id = nuevoRoleId;

    try {
        const response = await fetch(`http://localhost:3000/api/usuarios/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        alert(data.message);
        if (response.ok) {
            cargarUsuarios();
        }
    } catch (error) {
        console.error('rror al actualizar el usuario', error);
        alert(' error al intentar actualizar el usuario.');
    }
}


async function cargarUsuarios() {
    try {
        const response = await fetch('http://localhost:3000/api/usuarios');
        const usuarios = await response.json();

        const tbody = document.querySelector('table tbody');
        tbody.innerHTML = '';

        usuarios.forEach((usuario) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${usuario.id}</td>
                <td>${usuario.nombre}</td>
                <td>${usuario.role}</td>
                <td>
                    <button onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
                    <button onclick="openEditModal(${usuario.id}, '${usuario.nombre}', '${usuario.email}')">Editar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
    }
}
function openEditModal(userId, currentName, currentEmail) {
    const nuevoNombre = prompt(`Nombre actual: ${currentName}\nnuevo usurio`);
    const nuevoEmail = prompt(`Email actual: ${currentEmail}\nnuevo email`);
    const nuevoRoleId = prompt('nuevo rol');

    if (!nuevoNombre && !nuevoEmail && !nuevoRoleId) {
        alert('No se han realizado cambios.');
        return;
    }

    actualizarUsuario(userId, nuevoNombre, nuevoEmail, nuevoRoleId);
}


async function eliminarUsuario(userId) {
    const userRole = localStorage.getItem('userRole');

    if (userRole !== 'admin') {
        alert('solo admin');
        return;
    }

    const confirmed = confirm('¿Estás seguro de que deseas eliminar este usuario?');
    if (!confirmed) return;

    try {
        const response = await fetch(`http://localhost:3000/api/usuarios/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body:  JSON.stringify({ userRole }) 
        });

        const data = await response.json();
        alert(data.message);
        cargarUsuarios(); 
    } catch (error) {
        console.error('Error al eliminar el usuario:', error);
    }
}

d.addEventListener('DOMContentLoaded', cargarUsuarios);


function detras() {
    const isRegistering = d.getElementById('email-group').style.display === 'block';
    d.getElementById('email-group').style.display = isRegistering ? 'none' : 'block';
    d.getElementById('form-title').textContent = isRegistering ? 'Inicio' : 'Registro de Admin';
    d.getElementById('authButton').textContent = isRegistering ? 'Ingresar' : 'Registrar';
    d.getElementById('form-message').textContent = isRegistering ? 'Puedes ingresar' : 'Crea la cuenta del administrador';
    d.getElementById('message').textContent = '';
}
