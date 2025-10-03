const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configurar SMTP de Zimbra
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.lnb.gob.pa',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'cumpleanos@lnb.gob.pa',
    pass: process.env.SMTP_PASS || 'CUMPLEAÑOS_1'
  }
});

// Base de datos en archivo
const DATA_FILE = 'data.json';

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error cargando datos:', error);
  }
  return { employees: [], logs: [] };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error guardando datos:', error);
  }
}

// 🕛 ENVÍO AUTOMÁTICO DIARIO A LAS 12:00 PM
cron.schedule('0 12 * * *', async () => {
  console.log('🕛 Ejecutando envío automático de cumpleaños...');
  
  const data = loadData();
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDate = today.getDate();
  
  const todayBirthdays = data.employees.filter(emp => {
    const birthDate = new Date(emp.fecha_nacimiento);
    return (birthDate.getMonth() + 1) === todayMonth && 
           birthDate.getDate() === todayDate;
  });
  
  if (todayBirthdays.length === 0) {
    console.log('🕛 No hay cumpleaños hoy');
    return;
  }
  
  // Filtrar solo los no enviados hoy
  const unsent = todayBirthdays.filter(emp => {
    const sentToday = data.logs.some(log => 
      log.employeeId === emp.id && 
      log.type === 'success' &&
      new Date(log.timestamp).toDateString() === today.toDateString()
    );
    return !sentToday;
  });
  
  if (unsent.length === 0) {
    console.log('🕛 Todos los cumpleaños ya fueron enviados hoy');
    return;
  }
  
  console.log(`🕛 Enviando ${unsent.length} emails automáticamente...`);
  
  for (let employee of unsent) {
    try {
      await sendEmail(employee);
      
      // Registrar envío exitoso
      data.logs.push({
        timestamp: new Date().toISOString(),
        message: `✅ Email enviado automáticamente a ${employee.nombre}`,
        type: 'success',
        employeeId: employee.id
      });
      
      saveData(data);
      
      console.log(`✅ Email automático enviado a: ${employee.nombre}`);
      
      // Esperar 2 segundos entre envíos
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error enviando a ${employee.nombre}:`, error);
    }
  }
  
  console.log('🕛 Envío automático completado');
});

// Función para enviar email
async function sendEmail(employee) {
  const mailOptions = {
    from: '"Sistema de Cumpleaños LNB" <cumpleanos@lnb.gob.pa>',
    to: employee.email,
    subject: `🎉 ¡Feliz Cumpleaños ${employee.nombre.split(' ')[0]}!`,
    text: `¡Feliz cumpleaños ${employee.nombre}!

En nombre de todo el equipo, queremos desearte un día lleno de alegría, momentos especiales y celebración.

Que este nuevo año de vida esté cargado de éxito, salud y felicidad.

¡Felicidades! 🎂🎉

---
Atentamente,
Sistema de Cumpleaños LNB`
  };

  return await transporter.sendMail(mailOptions);
}

// RUTAS DE LA API
app.get('/api/data', (req, res) => {
  res.json(loadData());
});

app.post('/api/save', (req, res) => {
  saveData(req.body);
  res.json({ success: true });
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { employee } = req.body;
    const result = await sendEmail(employee);
    
    // Guardar en logs
    const data = loadData();
    data.logs.push({
      timestamp: new Date().toISOString(),
      message: `✅ Email enviado a ${employee.nombre}`,
      type: 'success', 
      employeeId: employee.id
    });
    saveData(data);
    
    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Error enviando email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir la aplicación
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`🕛 Envío automático programado para las 12:00 PM diario`);
  console.log(`📧 Configurado con: cumpleanos@lnb.gob.pa`);
});