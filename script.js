const FORMSPREE_URL = 'https://formspree.io/f/xjkarojd';

// Base de datos - ahora se carga desde servidor
let employees = [];
let logs = [];
let autoInterval = null;

// 🚀 INICIALIZAR SISTEMA
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sistema iniciado desde VS Code');
    initializeSystem();
});

async function initializeSystem() {
    await loadData(); // Cargar datos desde servidor
    renderAll();
    startAutoCheck();
    updateTime();
    setInterval(updateTime, 1000);
    checkBirthdays();
    
    // Configurar formulario
    const addForm = document.getElementById('add-form');
    if (addForm) {
        addForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addNewEmployee();
        });
    }
    
    // Configurar búsqueda
    const searchInput = document.getElementById('employee-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterEmployees);
    }
}

// 🆕 FUNCIONES PARA CARGAR/GUARDAR DESDE SERVIDOR
async function loadData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    employees = data.employees || [];
    logs = data.logs || [];
    console.log('✅ Datos cargados desde servidor');
  } catch (error) {
    console.error('❌ Error cargando datos del servidor:', error);
    // Fallback a localStorage
    employees = JSON.parse(localStorage.getItem('employees')) || [
      {
        id: 1,
        nombre: 'Carlos Ambulo',
        email: 'carlos.ambulo@lnb.gob.pa',
        fecha_nacimiento: '1965-10-03'
      }
    ];
    logs = JSON.parse(localStorage.getItem('logs')) || [];
  }
}

async function saveData() {
  try {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees, logs })
    });
    console.log('✅ Datos guardados en servidor');
  } catch (error) {
    console.error('❌ Error guardando datos en servidor:', error);
    // Fallback a localStorage
    localStorage.setItem('employees', JSON.stringify(employees));
    localStorage.setItem('logs', JSON.stringify(logs));
  }
}

// 📧 FUNCIÓN PARA ENVIAR EMAILS - MODIFICADA PARA USAR SERVIDOR
async function sendBirthdayEmail(employee) {
    showNotification(`⏳ Enviando email a ${employee.nombre}...`, 'warning');
    
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee })
        });

        const result = await response.json();
        
        if (result.success) {
            addLog(`✅ Email enviado a ${employee.nombre}`, 'success', employee.id);
            showNotification(`🎉 Email enviado a ${employee.nombre.split(' ')[0]}!`, 'success');
            return true;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        addLog(`❌ Error enviando a ${employee.nombre}`, 'error', employee.id);
        showNotification(`❌ Error enviando a ${employee.nombre.split(' ')[0]}`, 'error');
        return false;
    }
}

// 🎯 RENDERIZAR INTERFAZ
function renderAll() {
    renderStats();
    renderTodayBirthdays();
    renderUpcomingBirthdays();
    renderActivityLogs();
    renderEmployeesList();
}

function renderStats() {
    const totalEmployees = document.getElementById('total-employees');
    const birthdaysToday = document.getElementById('birthdays-today');
    const sentToday = document.getElementById('sent-today');
    
    if (totalEmployees) totalEmployees.textContent = employees.length;
    
    const todayBirthdays = getTodayBirthdays();
    if (birthdaysToday) birthdaysToday.textContent = todayBirthdays.length;
    
    const sentTodayCount = logs.filter(log => 
        log.type === 'success' && isToday(new Date(log.timestamp))
    ).length;
    if (sentToday) sentToday.textContent = sentTodayCount;
}

function renderTodayBirthdays() {
    const container = document.getElementById('today-birthdays');
    if (!container) return;
    
    const todayBirthdays = getTodayBirthdays();
    
    if (todayBirthdays.length === 0) {
        container.innerHTML = '<div class="loading">🎉 No hay cumpleaños hoy</div>';
        return;
    }

    container.innerHTML = todayBirthdays.map(emp => {
        const sent = logs.some(log => 
            log.employeeId === emp.id && 
            log.type === 'success' && 
            isToday(new Date(log.timestamp))
        );
        
        return `
            <div class="employee-card ${sent ? '' : 'today'}">
                <strong>${emp.nombre}</strong>
                <div style="color: #666; margin: 5px 0;">${emp.email}</div>
                <button class="btn ${sent ? 'btn-secondary' : 'btn-success'}" onclick="sendBirthday(${emp.id})" ${sent ? 'disabled' : ''}>
                    ${sent ? '✅ Enviado' : '📧 Enviar Felicitación'}
                </button>
            </div>
        `;
    }).join('');
}

function renderUpcomingBirthdays() {
    const container = document.getElementById('upcoming-birthdays');
    if (!container) return;
    
    const upcoming = getUpcomingBirthdays(7);
    
    if (upcoming.length === 0) {
        container.innerHTML = '<div class="loading">📅 No hay cumpleaños próximos</div>';
        return;
    }

    container.innerHTML = upcoming.map(emp => {
        const days = emp.daysUntil;
        const daysText = days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`;
        
        return `
            <div class="employee-card">
                <strong>${emp.nombre.split(' ')[0]}</strong>
                <div style="color: #666;">${daysText}</div>
                <div style="color: #888; font-size: 0.8rem;">${emp.email}</div>
            </div>
        `;
    }).join('');
}

function renderActivityLogs() {
    const container = document.getElementById('activity-logs');
    if (!container) return;
    
    const recentLogs = logs.slice(-6).reverse();
    
    if (recentLogs.length === 0) {
        container.innerHTML = '<div class="loading">📝 No hay actividad reciente</div>';
        return;
    }

    container.innerHTML = recentLogs.map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const icon = log.type === 'success' ? '✅' : log.type === 'error' ? '❌' : 'ℹ️';
        return `<div class="log-entry">${icon} ${time} - ${log.message}</div>`;
    }).join('');
}

// 🗂️ FUNCIONES PARA LA TABLA DE EMPLEADOS
function renderEmployeesList() {
    const container = document.getElementById('employees-table-body');
    const countElement = document.getElementById('employee-count');
    
    if (!container) return;
    
    if (employees.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 1.2rem; margin-bottom: 10px;">👥</div>
                    <strong>No hay empleados registrados</strong>
                    <div style="margin-top: 10px;">Usa el botón "Agregar Empleado" para comenzar</div>
                </td>
            </tr>
        `;
    } else {
        container.innerHTML = employees.map(emp => {
            const fecha = new Date(emp.fecha_nacimiento).toLocaleDateString('es-ES');
            const edad = calculateAge(emp.fecha_nacimiento);
            
            return `
                <tr>
                    <td><strong>${emp.nombre}</strong></td>
                    <td>${emp.email}</td>
                    <td>${fecha}</td>
                    <td>${edad} años</td>
                    <td class="table-actions-cell">
                        <button class="btn btn-danger" onclick="deleteEmployee(${emp.id})" title="Eliminar empleado">
                            🗑️ Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Actualizar contador
    if (countElement) {
        countElement.textContent = `${employees.length} empleado${employees.length !== 1 ? 's' : ''}`;
    }
}

function calculateAge(birthdate) {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// 🔄 FUNCIONES DEL SISTEMA
function checkBirthdays() {
    const todayBirthdays = getTodayBirthdays();
    
    if (todayBirthdays.length > 0) {
        addLog(`🔍 Encontrados ${todayBirthdays.length} cumpleaños hoy`, 'info');
        showNotification(`🎉 ¡Hay ${todayBirthdays.length} cumpleaños hoy!`, 'success');
        
        if (document.getElementById('auto-mode')?.checked) {
            setTimeout(() => {
                sendAllBirthdays();
            }, 2000);
        }
    } else {
        addLog('🔍 No hay cumpleaños hoy', 'info');
    }
    
    renderAll();
}

async function sendBirthday(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
        await sendBirthdayEmail(employee);
        renderAll();
    }
}

async function sendAllBirthdays() {
    const todayBirthdays = getTodayBirthdays();
    const unsent = todayBirthdays.filter(emp => 
        !logs.some(log => 
            log.employeeId === emp.id && 
            log.type === 'success' && 
            isToday(new Date(log.timestamp))
        )
    );
    
    if (unsent.length === 0) {
        showNotification('✅ No hay cumpleaños pendientes', 'success');
        return;
    }
    
    showNotification(`🚀 Enviando ${unsent.length} emails...`, 'warning');
    
    for (let i = 0; i < unsent.length; i++) {
        const employee = unsent[i];
        await sendBirthdayEmail(employee);
        
        // Esperar entre envíos
        if (i < unsent.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// 👥 GESTIÓN DE EMPLEADOS - FUNCIONES CORREGIDAS
async function addNewEmployee() {
    const nameInput = document.getElementById('new-name');
    const emailInput = document.getElementById('new-email');
    const birthdateInput = document.getElementById('new-birthdate');
    
    if (!nameInput || !emailInput || !birthdateInput) {
        showNotification('❌ Error: No se pueden encontrar los campos del formulario', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const birthdate = birthdateInput.value;
    
    console.log('Datos del formulario:', { name, email, birthdate });
    
    // Validaciones básicas
    if (!name || !email || !birthdate) {
        showNotification('❌ Por favor completa todos los campos', 'error');
        return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('❌ Por favor ingresa un email válido', 'error');
        return;
    }
    
    // Validar fecha (no puede ser en el futuro)
    const birthDate = new Date(birthdate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (birthDate > today) {
        showNotification('❌ La fecha de nacimiento no puede ser futura', 'error');
        return;
    }
    
    // Verificar si el email ya existe
    const emailExists = employees.some(emp => emp.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
        showNotification('❌ Este email ya está registrado', 'error');
        return;
    }
    
    // Crear nuevo empleado
    const newEmployee = {
        id: Math.max(...employees.map(e => e.id), 0) + 1,
        nombre: name,
        email: email,
        fecha_nacimiento: birthdate
    };
    
    employees.push(newEmployee);
    await saveData(); // 🆕 Cambio: ahora es async
    
    // Mostrar confirmación
    showNotification(`✅ Empleado "${name}" agregado correctamente`, 'success');
    addLog(`👥 ${name} agregado al sistema`, 'info', newEmployee.id);
    
    // Limpiar formulario y volver a la tabla
    nameInput.value = '';
    emailInput.value = '';
    birthdateInput.value = '';
    
    // Volver a la vista de tabla
    showTableView();
}

async function deleteEmployee(id) {
    const employee = employees.find(emp => emp.id === id);
    if (employee && confirm(`¿Estás seguro de que quieres eliminar a ${employee.nombre}?`)) {
        employees = employees.filter(emp => emp.id !== id);
        await saveData(); // 🆕 Cambio: ahora es async
        addLog(`🗑️ ${employee.nombre} eliminado`, 'info');
        showNotification('✅ Empleado eliminado correctamente', 'success');
        renderAll();
    }
}

// 📊 FUNCIONES DE LA TABLA
function filterEmployees() {
    const searchTerm = document.getElementById('employee-search').value.toLowerCase();
    const rows = document.querySelectorAll('#employees-table-body tr');
    
    rows.forEach(row => {
        if (row.cells.length < 2) return;
        
        const name = row.cells[0].textContent.toLowerCase();
        const email = row.cells[1].textContent.toLowerCase();
        const visible = name.includes(searchTerm) || email.includes(searchTerm);
        row.style.display = visible ? '' : 'none';
    });
}

function sortEmployees(field) {
    employees.sort((a, b) => {
        if (field === 'nombre') {
            return a.nombre.localeCompare(b.nombre);
        } else if (field === 'fecha_nacimiento') {
            return new Date(a.fecha_nacimiento) - new Date(b.fecha_nacimiento);
        } else if (field === 'id') {
            return a.id - b.id;
        }
        return 0;
    });
    
    saveData();
    renderEmployeesList();
}

// 🪟 FUNCIONES MODAL - CORREGIDAS
function showTableView() {
    const tableView = document.getElementById('table-view');
    const formView = document.getElementById('form-view');
    
    if (tableView) tableView.style.display = 'block';
    if (formView) formView.style.display = 'none';
    
    renderEmployeesList();
}

function showAddForm() {
    const tableView = document.getElementById('table-view');
    const formView = document.getElementById('form-view');
    
    if (tableView) tableView.style.display = 'none';
    if (formView) formView.style.display = 'block';
    
    // Limpiar el formulario
    const form = document.getElementById('add-form');
    if (form) form.reset();
}

function openModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'flex';
        showTableView(); // Asegurar que se muestre la tabla al abrir
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ⚙️ UTILIDADES
function getTodayBirthdays() {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();
    
    return employees.filter(emp => {
        const birthDate = new Date(emp.fecha_nacimiento);
        const birthMonth = birthDate.getMonth() + 1;
        const birthDay = birthDate.getDate();
        
        return birthMonth === todayMonth && birthDay === todayDate;
    });
}

function getUpcomingBirthdays(days = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return employees.map(emp => {
        const birthDate = new Date(emp.fecha_nacimiento);
        const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        if (nextBirthday < today) {
            nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
        }
        
        const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        
        return {
            ...emp,
            nextBirthday,
            daysUntil
        };
    }).filter(emp => emp.daysUntil <= days)
      .sort((a, b) => a.daysUntil - b.daysUntil);
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function addLog(message, type = 'info', employeeId = null) {
    logs.push({
        timestamp: new Date().toISOString(),
        message: message,
        type: type,
        employeeId: employeeId
    });
    
    if (logs.length > 50) {
        logs = logs.slice(-50);
    }
    
    saveData(); // 🆕 Guardar en servidor
}

function startAutoCheck() {
    // Limpiar intervalo anterior si existe
    if (autoInterval) {
        clearInterval(autoInterval);
    }
    
    autoInterval = setInterval(() => {
        const autoMode = document.getElementById('auto-mode');
        if (autoMode && autoMode.checked) {
            checkBirthdays();
        }
    }, 300000); // 5 minutos
}

function updateTime() {
    const next = new Date();
    next.setMinutes(next.getMinutes() + 5);
    next.setSeconds(0);
    
    const now = new Date();
    const diff = next - now;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    const nextCheckElement = document.getElementById('next-check');
    if (nextCheckElement) {
        nextCheckElement.textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 🔔 SISTEMA DE NOTIFICACIONES
function showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    if (!notifications) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notifications.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// 📧 FUNCIÓN DE PRUEBA
async function sendTestEmail() {
    const testEmployee = employees[0]; // Usar el primer empleado
    if (testEmployee) {
        await sendBirthdayEmail(testEmployee);
    } else {
        showNotification('❌ No hay empleados para probar', 'error');
    }
}

function exportToExcel() {
    showNotification('📊 Preparando exportación de datos...', 'warning');
    
    // Simular exportación
    setTimeout(() => {
        const dataStr = "data:text/csv;charset=utf-8," + 
            "Nombre,Email,Fecha Nacimiento,Edad\n" +
            employees.map(emp => 
                `"${emp.nombre}","${emp.email}","${emp.fecha_nacimiento}",${calculateAge(emp.fecha_nacimiento)}`
            ).join("\n");
        
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(dataStr));
        link.setAttribute("download", "empleados.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('✅ Datos exportados correctamente', 'success');
    }, 1000);
}

// Cerrar modal al hacer clic fuera
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
});