async function iniciarCaja() {
    const fecha=new Date().toISOString().split('T')[0];
    const doc = document;
    const montoInicial=parseFloat(doc.getElementById('montoInicial').value) || 0;
    
    const ta= await fetch('http://127.0.0.1:3000/api/iniciar-caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, montoInicial })
    });
    
    const inf=await ta.json();
    alert(inf.message);
}
const doc = document;

async function agregarRegistro() {
    const descripcion = prompt("descripcion");
    const monto= parseFloat(prompt("cantidad")) || 0;
    const tipo= prompt("e o s").toLowerCase();
    const fecha= new Date().toISOString().split('T')[0];
    const i=1; 

    if (descripcion && monto && (tipo=== 'entrada' || tipo=== 'salida')) {
        const ta2=await fetch('http://127.0.0.1:3000/api/agregar-registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descripcion, monto, tipo, fecha, i })
        });

        const inf=await ta2.json();
        alert(inf.message);
        actualizarTabla(); 
    }
}

function calcularTotales() {
    const montoInicial=parseFloat(doc.getElementById('montoInicial').value) || 0;
    const ventasTotales=parseFloat(doc.getElementById('ventasTotales').value) || 0;
    const gastos=parseFloat(doc.getElementById('gastos').value) || 0;

    const totalEfectivo = ventasTotales * 0.6; 
    doc.getElementById('totalEfectivo').textContent = totalEfectivo.toFixed(2);
    const totalTarjeta = ventasTotales * 0.4;  
    doc.getElementById('totalTarjeta').textContent = totalTarjeta.toFixed(2);
    const diferencia = (montoInicial + totalEfectivo + totalTarjeta) - gastos;
    

    doc.getElementById('diferencia').textContent = diferencia.toFixed(2);
}

async function realizarCorte() {
    const fecha=new Date().toISOString().split('T')[0];
    const totalEfectivo=parseFloat(doc.getElementById('totalEfectivo').textContent) || 0;
    const totalTarjeta=parseFloat(doc.getElementById('totalTarjeta').textContent) || 0;
    const diferencia=parseFloat(doc.getElementById('diferencia').textContent) || 0;
    const i2=1;

    const r=await fetch('http://127.0.0.1:3000/api/realizar-corte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, totalEfectivo, totalTarjeta, diferencia, i2 })
    });

    const ta=await r.json();
    alert(ta.message);
}

async function obtenerCortes() {
    const r = await fetch('http://127.0.0.1:3000/api/cortes');
    const cortes = await r.json();
      console.log(cortes);
}

function actualizarTabla() {
    //pendienton
    
    console.log("tabla actu");
}

doc.getElementById('btnIniciarCaja').addEventListener('click', iniciarCaja);
doc.getElementById('btnAgregarRegistro').addEventListener('click', agregarRegistro);
doc.getElementById('btnRealizarCorte').addEventListener('click', realizarCorte);
doc.getElementById('btnObtenerCortes').addEventListener('click', obtenerCortes);
