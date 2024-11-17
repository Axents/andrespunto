document.getElementById('nuevoUsuarioForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const nombre=document.getElementById('nombre').value;
    const password=document.getElementById('password').value;
    const email=document.getElementById('email').value;
    userRole=localStorage.getItem('userRole');
    try {
        const response = await fetch('http://localhost:3000/api/usuarios/agregar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, password, email, userRole })
        });

        const data=await response.json();
        document.getElementById('mensaje').textContent = data.message;

        if (response.ok) {
            setTimeout(() => {
                window.location.href = 'usuarios.html';
            }, 2000);
        }
    } catch (error) {
        console.error('error al agregar usuario:', error);
    }
});
