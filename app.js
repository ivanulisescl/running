// Estado de la aplicación
let sessions = [];
let currentAppVersion = '1.0.14'; // Versión actual de la app
let editingSessionId = null; // ID de la sesión que se está editando (null si no hay ninguna)
let currentStatsPeriod = 'all'; // Período actual para las estadísticas: 'all', 'week', 'month', 'year'
let charts = {}; // Objeto para almacenar las instancias de las gráficas
let equipmentList = []; // Lista de equipos disponibles

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadEquipment();
    loadSessions();
    loadSessionsFromProject();
    setupForm();
    setupNewSessionButton();
    setupNavigationButtons();
    setupStatsFilters();
    setupEquipmentSection();
    setupClearButton();
    setupMenu();
    setupSync();
    setupGarminImport();
    updateStats();
    setupPWA();
    setupVersionCheck();
    setTodayDate();
    updateSubmitButton();
});

// Hacer deleteEquipment y updateEquipment disponibles globalmente para onclick
window.deleteEquipment = function(index) {
    const eq = equipmentList[index];
    const name = eq ? getEquipmentName(eq) : '';
    if (confirm(`¿Estás seguro de que quieres eliminar "${name}"?`)) {
        equipmentList.splice(index, 1);
        saveEquipment();
        renderEquipmentList();
        updateEquipmentSelect();
    }
};
window.updateEquipment = function(index, field, value) {
    updateEquipment(index, field, value);
};

// Establecer fecha de hoy por defecto
function setTodayDate() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Configurar formulario
function setupForm() {
    const form = document.getElementById('sessionForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        addSession();
    });
    
    // Configurar botón cancelar
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            cancelForm();
        });
    }
}

// Configurar botón "Nueva sesión"
function setupNewSessionButton() {
    const newSessionBtn = document.getElementById('newSessionBtn');
    const sessionFormSection = document.getElementById('sessionFormSection');
    
    if (!newSessionBtn || !sessionFormSection) return;
    
    newSessionBtn.addEventListener('click', () => {
        // Si está editando, cancelar edición
        if (editingSessionId !== null) {
            editingSessionId = null;
            resetForm();
        }
        
        // Mostrar formulario
        sessionFormSection.style.display = 'block';
        
    // Establecer equipo por defecto desde localStorage
    const selectedEquipment = localStorage.getItem('selectedEquipment') || '';
    const equipoField = document.getElementById('equipo');
    if (equipoField) {
        equipoField.value = selectedEquipment;
    }
        
        // Scroll al formulario
        sessionFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// Configurar botones de navegación (Estadísticas, Historial y Equipo)
function setupNavigationButtons() {
    const statsBtn = document.getElementById('statsBtn');
    const historyBtn = document.getElementById('historyBtn');
    const equipmentBtn = document.getElementById('equipmentBtn');
    const statsSection = document.getElementById('statsSection');
    const historySection = document.getElementById('historySection');
    const equipmentSection = document.getElementById('equipmentSection');
    
    if (statsBtn && statsSection) {
        statsBtn.addEventListener('click', () => {
            statsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    
    if (historyBtn && historySection) {
        historyBtn.addEventListener('click', () => {
            historySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    
    if (equipmentBtn && equipmentSection) {
        equipmentBtn.addEventListener('click', () => {
            equipmentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

// Estados posibles de un equipo
const EQUIPO_ESTADOS = ['Activo', 'Retirado', 'Activo por defecto'];

// Cargar equipos desde localStorage
function loadEquipment() {
    const saved = localStorage.getItem('runningEquipment');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Migrar formato antiguo (array de strings) a nuevo (array de objetos)
        equipmentList = parsed.map(item => {
            if (typeof item === 'string') {
                const name = item;
                let estado = 'Activo';
                if (name.startsWith('Asics')) estado = 'Retirado';
                if (name.startsWith('Hokka')) estado = 'Activo por defecto';
                return { name, kilometros: 0, estado };
            }
            if (item.kilometros === undefined || typeof item.kilometros !== 'number') item.kilometros = 0;
            if (!item.estado) item.estado = 'Activo';
            return item;
        });
        saveEquipment();
    } else {
        // Equipos iniciales por defecto
        equipmentList = [
            { name: 'Asics Gel Nimbus 25 Negras', kilometros: 0, estado: 'Retirado' },
            { name: 'Asics Gel Nimbus 26 Azules', kilometros: 0, estado: 'Retirado' },
            { name: 'Hokka Bondi 9 Grises', kilometros: 0, estado: 'Activo por defecto' }
        ];
        saveEquipment();
    }
}

// Guardar equipos en localStorage
function saveEquipment() {
    localStorage.setItem('runningEquipment', JSON.stringify(equipmentList));
}

// Configurar sección de equipos
function setupEquipmentSection() {
    renderEquipmentList();
    updateEquipmentSelect();
    
    // Si no hay equipo seleccionado, usar "Activo por defecto"
    if (!localStorage.getItem('selectedEquipment')) {
        const defaultEq = equipmentList.find(eq => typeof eq === 'object' && eq.estado === 'Activo por defecto');
        if (defaultEq) localStorage.setItem('selectedEquipment', getEquipmentName(defaultEq));
    }
    
    const addBtn = document.getElementById('addEquipmentBtn');
    const input = document.getElementById('newEquipmentInput');
    
    if (addBtn && input) {
        addBtn.addEventListener('click', () => {
            addNewEquipment();
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addNewEquipment();
            }
        });
    }
}

// Añadir nuevo equipo
function addNewEquipment() {
    const input = document.getElementById('newEquipmentInput');
    const equipmentName = input.value.trim();
    
    if (!equipmentName) {
        alert('Por favor ingresa un nombre para el equipo');
        return;
    }
    
    if (equipmentList.some(eq => getEquipmentName(eq) === equipmentName)) {
        alert('Este equipo ya existe');
        return;
    }
    
    equipmentList.push({ name: equipmentName, kilometros: 0, estado: 'Activo' });
    saveEquipment();
    renderEquipmentList();
    updateEquipmentSelect();
    
    input.value = '';
}

function getEquipmentName(eq) {
    return typeof eq === 'string' ? eq : eq.name;
}


// Parsear información del equipo desde el nombre
function parseEquipmentInfo(equipmentName) {
    // Formato esperado: "Marca Modelo Color" o "Marca Modelo Número Color"
    // Ejemplos: "Asics Gel Nimbus 25 Negras", "Hokka Bondi 9 Grises"
    const parts = equipmentName.trim().split(/\s+/);
    
    if (parts.length < 3) {
        // Si no tiene suficiente información, devolver todo como nombre
        return {
            marca: parts[0] || '',
            modelo: parts.slice(1).join(' ') || '',
            color: ''
        };
    }
    
    // La marca suele ser la primera palabra
    const marca = parts[0];
    
    // El color suele ser la última palabra
    const color = parts[parts.length - 1];
    
    // El modelo es todo lo que está en medio
    const modelo = parts.slice(1, parts.length - 1).join(' ');
    
    return { marca, modelo, color };
}

// Calcular kilómetros y actividades de un equipo desde las sesiones
function getEquipmentStatsFromSessions(equipmentName) {
    const matchingSessions = sessions.filter(s => (s.equipo || '').trim() === equipmentName.trim());
    const kilometros = matchingSessions.reduce((sum, s) => sum + (s.distance || 0), 0);
    const actividades = matchingSessions.length;
    return { kilometros, actividades };
}

// Actualizar un equipo (solo estado; kilómetros y actividades se calculan desde sesiones)
function updateEquipment(index, field, value) {
    if (index < 0 || index >= equipmentList.length) return;
    const eq = equipmentList[index];
    if (typeof eq === 'string') {
        equipmentList[index] = { name: eq, kilometros: 0, estado: 'Activo' };
    }
    const item = equipmentList[index];
    if (field === 'estado') item.estado = value;
    saveEquipment();
    updateEquipmentSelect();
}

// Renderizar lista de equipos
function renderEquipmentList() {
    const container = document.getElementById('equipmentList');
    if (!container) return;
    
    if (equipmentList.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay equipos registrados. Añade tu primer equipo.</p>';
        return;
    }
    
    container.innerHTML = equipmentList.map((equipment, index) => {
        const name = getEquipmentName(equipment);
        const stats = getEquipmentStatsFromSessions(name);
        const estado = typeof equipment === 'object' ? (equipment.estado || 'Activo') : 'Activo';
        const info = parseEquipmentInfo(name);
        const estadoOptions = EQUIPO_ESTADOS.map(e => 
            `<option value="${escapeHtml(e)}" ${e === estado ? 'selected' : ''}>${escapeHtml(e)}</option>`
        ).join('');
        return `
            <div class="equipment-card">
                <div class="equipment-card-header">
                    <h3 class="equipment-marca">${escapeHtml(info.marca)}</h3>
                    <button class="equipment-delete-btn" onclick="deleteEquipment(${index})" title="Eliminar">×</button>
                </div>
                <div class="equipment-card-body">
                    <div class="equipment-modelo">${escapeHtml(info.modelo)}</div>
                    ${info.color ? `<div class="equipment-color">
                        <span class="color-label">Color:</span>
                        <span class="color-value">${escapeHtml(info.color)}</span>
                    </div>` : ''}
                    <div class="equipment-stats-row">
                        <div class="equipment-stat">
                            <span class="equipment-stat-label">Kilómetros:</span>
                            <span class="equipment-stat-value">${stats.kilometros.toFixed(1)}</span>
                        </div>
                        <div class="equipment-stat">
                            <span class="equipment-stat-label">Actividades:</span>
                            <span class="equipment-stat-value">${stats.actividades}</span>
                        </div>
                    </div>
                    <div class="equipment-estado">
                        <span class="estado-label">Estado:</span>
                        <select class="equipment-estado-select" onchange="updateEquipment(${index}, 'estado', this.value)">
                            ${estadoOptions}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Actualizar select de equipos en el formulario
function updateEquipmentSelect() {
    const select = document.getElementById('equipo');
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Sin especificar</option>';
    
    equipmentList.forEach(equipment => {
        const name = getEquipmentName(equipment);
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
    
    if (currentValue && equipmentList.some(eq => getEquipmentName(eq) === currentValue)) {
        select.value = currentValue;
    } else {
        // Seleccionar "Activo por defecto" si existe
        const defaultEq = equipmentList.find(eq => typeof eq === 'object' && eq.estado === 'Activo por defecto');
        if (defaultEq) select.value = getEquipmentName(defaultEq);
    }
}

// Mostrar formulario (para usar desde editSession)
function showSessionForm() {
    const sessionFormSection = document.getElementById('sessionFormSection');
    if (sessionFormSection) {
        sessionFormSection.style.display = 'block';
    }
}

// Ocultar formulario
function hideSessionForm() {
    const sessionFormSection = document.getElementById('sessionFormSection');
    if (sessionFormSection) {
        sessionFormSection.style.display = 'none';
    }
}

// Cancelar formulario (cerrar sin guardar)
function cancelForm() {
    editingSessionId = null;
    resetForm();
    hideSessionForm();
}

// Convertir tiempo hh:mm:ss a minutos
function timeToMinutes(timeString) {
    const parts = timeString.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 60 + minutes + seconds / 60;
}

// Convertir minutos a formato hh:mm:ss
function minutesToTime(minutes) {
    const totalSeconds = Math.round(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Validar formato de tiempo hh:mm:ss
function validateTimeFormat(timeString) {
    const pattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    return pattern.test(timeString);
}

// Agregar nueva sesión o actualizar sesión existente
function addSession() {
    const date = document.getElementById('date').value;
    const distance = parseFloat(document.getElementById('distance').value);
    const timeHours = parseInt(document.getElementById('timeHours').value) || 0;
    const timeMinutes = parseInt(document.getElementById('timeMinutes').value) || 0;
    const timeSeconds = parseInt(document.getElementById('timeSeconds').value) || 0;
    const type = document.getElementById('type').value;
    const equipo = document.getElementById('equipo').value;
    const notes = document.getElementById('notes').value.trim();
    const elevationGain = parseFloat(document.getElementById('elevationGain').value) || 0;
    const elevationLoss = parseFloat(document.getElementById('elevationLoss').value) || 0;

    if (!date || !distance) {
        alert('Por favor completa todos los campos requeridos');
        return;
    }

    // Validar que al menos haya algún tiempo ingresado
    if (timeHours === 0 && timeMinutes === 0 && timeSeconds === 0) {
        alert('Por favor ingresa un tiempo válido');
        return;
    }

    // Validar rangos
    if (timeHours < 0 || timeHours > 23) {
        alert('Las horas deben estar entre 0 y 23');
        return;
    }
    if (timeMinutes < 0 || timeMinutes > 59) {
        alert('Los minutos deben estar entre 0 y 59');
        return;
    }
    if (timeSeconds < 0 || timeSeconds > 59) {
        alert('Los segundos deben estar entre 0 y 59');
        return;
    }

    // Formatear tiempo como hh:mm:ss
    const timeString = `${String(timeHours).padStart(2, '0')}:${String(timeMinutes).padStart(2, '0')}:${String(timeSeconds).padStart(2, '0')}`;
    const timeInMinutes = timeToMinutes(timeString);

    if (editingSessionId !== null) {
        // Actualizar sesión existente
        const sessionIndex = sessions.findIndex(s => s.id === editingSessionId);
        if (sessionIndex !== -1) {
            sessions[sessionIndex] = {
                ...sessions[sessionIndex],
                date,
                distance,
                time: timeString,
                timeInMinutes,
                type,
                notes,
                elevationGain,
                elevationLoss,
                equipo: equipo || '' // Usar el equipo del formulario
            };
            saveSessions();
            renderSessions();
            renderEquipmentList();
            updateStats();
            resetForm();
            editingSessionId = null;
            updateSubmitButton();
            
            // Feedback visual
            const form = document.getElementById('sessionForm');
            form.style.transform = 'scale(0.98)';
            setTimeout(() => {
                form.style.transform = 'scale(1)';
            }, 200);
        }
    } else {
        // Crear nueva sesión
        const session = {
            id: Date.now(),
            date,
            distance,
            time: timeString, // Guardar en formato hh:mm:ss
            timeInMinutes, // Guardar también en minutos para cálculos
            type,
            notes,
            elevationGain,
            elevationLoss,
            equipo: equipo || '', // Campo para el equipo utilizado
            createdAt: new Date().toISOString()
        };
        
        // Guardar el equipo seleccionado para próximas sesiones
        if (equipo) {
            localStorage.setItem('selectedEquipment', equipo);
        }

        sessions.push(session);
        saveSessions();
        renderSessions();
        renderEquipmentList();
        updateStats();
        resetForm();
        
        // Feedback visual
        const form = document.getElementById('sessionForm');
        form.style.transform = 'scale(0.98)';
        setTimeout(() => {
            form.style.transform = 'scale(1)';
        }, 200);
    }
}

// Resetear formulario
function resetForm() {
    document.getElementById('sessionForm').reset();
    setTodayDate();
    // Resetear campos de tiempo a 0
    document.getElementById('timeHours').value = 0;
    document.getElementById('timeMinutes').value = 0;
    document.getElementById('timeSeconds').value = 0;
    // Limpiar campos de desnivel
    document.getElementById('elevationGain').value = '';
    document.getElementById('elevationLoss').value = '';
    // Establecer equipo por defecto desde localStorage
    const selectedEquipment = localStorage.getItem('selectedEquipment') || '';
    const equipoField = document.getElementById('equipo');
    if (equipoField) {
        equipoField.value = selectedEquipment;
    }
    editingSessionId = null;
    updateSubmitButton();
    // Ocultar formulario después de guardar
    hideSessionForm();
}

// Actualizar texto del botón de submit según si está editando o creando
function updateSubmitButton() {
    const submitBtn = document.querySelector('#sessionForm button[type="submit"]');
    if (submitBtn) {
        if (editingSessionId !== null) {
            submitBtn.textContent = 'Guardar Cambios';
            submitBtn.classList.add('btn-editing');
        } else {
            submitBtn.textContent = 'Guardar Sesión';
            submitBtn.classList.remove('btn-editing');
        }
    }
}

// Editar sesión
function editSession(id) {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    // Cargar datos en el formulario
    document.getElementById('date').value = session.date;
    document.getElementById('distance').value = session.distance;
    document.getElementById('type').value = session.type;
    document.getElementById('equipo').value = session.equipo || '';
    document.getElementById('notes').value = session.notes || '';
    document.getElementById('elevationGain').value = session.elevationGain || '';
    document.getElementById('elevationLoss').value = session.elevationLoss || '';

    // Parsear tiempo hh:mm:ss a horas, minutos, segundos
    const timeParts = session.time.split(':');
    if (timeParts.length === 3) {
        document.getElementById('timeHours').value = parseInt(timeParts[0]) || 0;
        document.getElementById('timeMinutes').value = parseInt(timeParts[1]) || 0;
        document.getElementById('timeSeconds').value = parseInt(timeParts[2]) || 0;
    } else {
        // Fallback para datos antiguos
        const minutes = session.timeInMinutes || session.time || 0;
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        const secs = Math.round((minutes % 1) * 60);
        document.getElementById('timeHours').value = hours;
        document.getElementById('timeMinutes').value = mins;
        document.getElementById('timeSeconds').value = secs;
    }

    // Establecer modo edición
    editingSessionId = id;
    updateSubmitButton();
    
    // Mostrar formulario
    showSessionForm();

    // Scroll al formulario
    const sessionFormSection = document.getElementById('sessionFormSection');
    if (sessionFormSection) {
        sessionFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Eliminar sesión
function deleteSession(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta sesión?')) {
        sessions = sessions.filter(session => session.id !== id);
        // Si se estaba editando esta sesión, cancelar edición
        if (editingSessionId === id) {
            editingSessionId = null;
            resetForm();
        }
        saveSessions();
        renderSessions();
        renderEquipmentList();
        updateStats();
    }
}

// Configurar botón de limpiar todo
function setupClearButton() {
    const clearBtn = document.getElementById('clearAll');
    clearBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar TODAS las sesiones? Esta acción no se puede deshacer.')) {
            sessions = [];
            saveSessions();
            renderSessions();
            renderEquipmentList();
            updateStats();
        }
    });
}

// Traer el último JSON del repositorio y reemplazar datos locales (botón Resetear)
function resetFromRepository() {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.style.display = 'block';
        syncStatus.innerHTML = '<p style="color: var(--primary-color);">Buscando último JSON en el repositorio...</p>';
    }
    const cacheBust = '?t=' + Date.now();
    const opts = { cache: 'no-store' };

    fetch('./data/sessions.json' + cacheBust, opts)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (Array.isArray(data)) return data;
            return fetch('./sessions.json' + cacheBust, opts).then(r => r.ok ? r.json() : null);
        })
        .then(data => {
            if (!Array.isArray(data)) {
                if (syncStatus) {
                    syncStatus.style.display = 'block';
                    syncStatus.innerHTML = '<p style="color: var(--danger-color);">❌ No se encontró JSON en el repositorio o está vacío.</p>';
                    setTimeout(() => { syncStatus.style.display = 'none'; }, 5000);
                }
                return;
            }
            sessions = data.map(s => {
                if (s.equipo === undefined) s.equipo = '';
                return s;
            });
            saveSessions();
            renderSessions();
            renderEquipmentList();
            updateStats();
            updateEquipmentSelect();
            if (syncStatus) {
                syncStatus.style.display = 'block';
                syncStatus.innerHTML = '<p style="color: var(--secondary-color);">✅ Resetear hecho. Se han cargado ' + sessions.length + ' sesión(es) del repositorio.</p>';
                setTimeout(() => { syncStatus.style.display = 'none'; }, 5000);
            }
        })
        .catch(err => {
            if (syncStatus) {
                syncStatus.style.display = 'block';
                syncStatus.innerHTML = '<p style="color: var(--danger-color);">❌ Error al obtener el JSON: ' + (err.message || 'Revisa la conexión') + '</p>';
                setTimeout(() => { syncStatus.style.display = 'none'; }, 5000);
            }
        });
}

// Cargar sesiones desde data/sessions.json o sessions.json del proyecto (sincronización)
function loadSessionsFromProject() {
    // Intentar cargar desde data/sessions.json primero
    fetch('./data/sessions.json?' + Date.now())
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                mergeSessions(data);
            }
            // También intentar cargar desde sessions.json en la raíz
            return fetch('./sessions.json?' + Date.now());
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                mergeSessions(data);
            }
        })
        .catch(() => {});
}

// Fusionar sesiones desde un array externo (añade nuevas y actualiza equipo en existentes)
function mergeSessions(externalSessions) {
    const existingById = new Map(sessions.map(s => [s.id, s]));
    let merged = false;
    
    externalSessions.forEach(session => {
        if (session.id == null) return;
        if (session.equipo === undefined) session.equipo = '';
        const local = existingById.get(session.id);
        if (!local) {
            sessions.push(session);
            existingById.set(session.id, session);
            merged = true;
        } else {
            // Actualizar campos del repositorio en la sesión local (ej. equipo)
            if ((session.equipo || '').trim() !== (local.equipo || '').trim()) {
                local.equipo = session.equipo || '';
                merged = true;
            }
        }
    });
    
    if (merged) {
        saveSessions();
        renderSessions();
        renderEquipmentList();
        updateStats();
        console.log('✅ Sesiones sincronizadas con el proyecto');
    }
}


// Configurar menú desplegable
function setupMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    
    if (!menuBtn || !menuDropdown) {
        console.error('No se encontraron elementos del menú');
        return;
    }
    
    // Asegurar que el menú esté oculto al inicio
    menuDropdown.style.display = 'none';
    
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const currentDisplay = menuDropdown.style.display;
        const computedDisplay = window.getComputedStyle(menuDropdown).display;
        const isVisible = currentDisplay === 'block' || computedDisplay === 'block';
        
        console.log('Menú clickeado. Display actual:', currentDisplay, 'Computed:', computedDisplay, 'Visible:', isVisible);
        
        if (isVisible) {
            menuDropdown.style.display = 'none';
        } else {
            menuDropdown.style.display = 'block';
        }
        
        console.log('Display después del cambio:', menuDropdown.style.display);
    });
    
    // Prevenir que el menú se cierre al hacer clic dentro
    menuDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (menuDropdown && menuBtn) {
            const clickedInsideMenu = menuDropdown.contains(e.target);
            const clickedOnButton = e.target === menuBtn || menuBtn.contains(e.target);
            
            if (!clickedInsideMenu && !clickedOnButton) {
                menuDropdown.style.display = 'none';
            }
        }
    });
}

// Configurar exportar/importar JSON para sincronización
function setupSync() {
    const exportBtn = document.getElementById('exportJsonBtnMenu');
    const importBtn = document.getElementById('importJsonBtnMenu');
    const importInput = document.getElementById('importJsonFile');
    const syncStatus = document.getElementById('syncStatus');

    exportBtn.addEventListener('click', () => {
        document.getElementById('menuDropdown').style.display = 'none';
        const data = JSON.stringify(sessions, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sessions.json';
        a.click();
        URL.revokeObjectURL(url);
        syncStatus.style.display = 'block';
        syncStatus.innerHTML = '<p style="color: var(--secondary-color);">✅ Descargado. Guarda el archivo en <code>data/sessions.json</code> del proyecto y haz commit para sincronizar.</p>';
        setTimeout(() => {
            syncStatus.style.display = 'none';
        }, 5000);
    });

    importBtn.addEventListener('click', () => {
        document.getElementById('menuDropdown').style.display = 'none';
        importInput.click();
    });

    const resetFromRepoBtn = document.getElementById('resetFromRepoBtn');
    if (resetFromRepoBtn) {
        resetFromRepoBtn.addEventListener('click', () => {
            document.getElementById('menuDropdown').style.display = 'none';
            resetFromRepository();
        });
    }

    const forceUpdateBtn = document.getElementById('forceUpdateBtn');
    if (forceUpdateBtn) {
        forceUpdateBtn.addEventListener('click', () => {
            document.getElementById('menuDropdown').style.display = 'none';
            applyUpdate();
        });
    }

    importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        syncStatus.style.display = 'block';
        syncStatus.innerHTML = '<p style="color: var(--primary-color);">Procesando...</p>';
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!Array.isArray(data)) throw new Error('El JSON debe ser un array de sesiones');
            const existingIds = new Set(sessions.map(s => s.id));
            let added = 0;
            data.forEach(session => {
                if (session.id != null && !existingIds.has(session.id)) {
                    sessions.push(session);
                    existingIds.add(session.id);
                    added++;
                }
            });
            if (added > 0) {
                saveSessions();
                renderSessions();
                renderEquipmentList();
                updateStats();
            }
                syncStatus.style.display = 'block';
            syncStatus.innerHTML = `<p style="color: var(--secondary-color);">✅ ${added} sesión(es) importada(s) desde el JSON.</p>`;
            setTimeout(() => {
                syncStatus.style.display = 'none';
            }, 5000);
        } catch (err) {
            syncStatus.style.display = 'block';
            syncStatus.innerHTML = `<p style="color: var(--danger-color);">❌ Error al leer el JSON: ${err.message}</p>`;
            setTimeout(() => {
                syncStatus.style.display = 'none';
            }, 5000);
        }
        importInput.value = '';
    });
}

// Configurar importación desde Garmin Connect
function setupGarminImport() {
    const importBtn = document.getElementById('importGarminBtnMenu');
    const fileInput = document.getElementById('garminFile');
    const importStatus = document.getElementById('importStatus');

    importBtn.addEventListener('click', () => {
        document.getElementById('menuDropdown').style.display = 'none';
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        importStatus.style.display = 'block';
        importStatus.innerHTML = '<p style="color: var(--primary-color);">Procesando archivos...</p>';

        let importedCount = 0;
        let errorCount = 0;

        for (const file of files) {
            try {
                const text = await file.text();
                const isCsv = file.name.toLowerCase().endsWith('.csv');
                const importedSessions = isCsv ? parseGarminCSV(text) : parseGarminFile(text, file.name);
                
                if (importedSessions.length > 0) {
                    importedSessions.forEach(session => {
                        // Verificar si ya existe una sesión con la misma fecha y distancia similar
                        const exists = sessions.some(s => 
                            s.date === session.date && 
                            Math.abs(s.distance - session.distance) < 0.1
                        );
                        
                        if (!exists) {
                            session.id = Date.now() + Math.random();
                            sessions.push(session);
                            importedCount++;
                        }
                    });
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error('Error procesando archivo:', error);
                errorCount++;
            }
        }

        if (importedCount > 0) {
            saveSessions();
            renderSessions();
            renderEquipmentList();
            updateStats();
            importStatus.style.display = 'block';
            importStatus.innerHTML = `<p style="color: var(--secondary-color);">✅ ${importedCount} sesión(es) importada(s) correctamente${errorCount > 0 ? `. ${errorCount} archivo(s) con errores.` : ''}</p>`;
            setTimeout(() => {
                importStatus.style.display = 'none';
            }, 5000);
        } else {
            importStatus.style.display = 'block';
            importStatus.innerHTML = `<p style="color: var(--danger-color);">❌ No se pudieron importar sesiones. Verifica que los archivos sean TCX, GPX o CSV (Activities.csv) válidos de Garmin Connect.</p>`;
            setTimeout(() => {
                importStatus.style.display = 'none';
            }, 5000);
        }

        // Limpiar el input
        fileInput.value = '';
    });
}

// Parsear archivo TCX o GPX de Garmin
function parseGarminFile(fileContent, fileName) {
    const sessions = [];
    
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, 'text/xml');
        
        // Verificar errores de parsing
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Error al parsear el archivo XML');
        }

        // Determinar el tipo de archivo
        if (xmlDoc.documentElement.tagName === 'TrainingCenterDatabase' || xmlDoc.querySelector('TrainingCenterDatabase')) {
            // Es un archivo TCX
            return parseTCX(xmlDoc);
        } else if (xmlDoc.documentElement.tagName === 'gpx' || xmlDoc.querySelector('gpx')) {
            // Es un archivo GPX
            return parseGPX(xmlDoc);
        } else {
            throw new Error('Formato de archivo no reconocido');
        }
    } catch (error) {
        console.error('Error parseando archivo Garmin:', error);
        return [];
    }
}

// Parsear CSV de Garmin Connect (Activities.csv)
function parseGarminCSV(fileContent) {
    const sessions = [];
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return sessions;

    // Parsear una línea CSV respetando campos entre comillas
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                inQuotes = !inQuotes;
            } else if ((c === ',' && !inQuotes) || (c === '\n' && !inQuotes)) {
                result.push(current.trim());
                current = '';
            } else {
                current += c;
            }
        }
        result.push(current.trim());
        return result;
    }

    const header = parseCSVLine(lines[0]).map(h => (h || '').replace(/^\uFEFF/, '').trim());
    const colIndex = (name) => {
        const n = (name || '').toLowerCase();
        const i = header.findIndex(h => h && h.toLowerCase() === n);
        return i >= 0 ? i : -1;
    };
    const idxFecha = colIndex('Fecha');
    const idxDistancia = colIndex('Distancia');
    const idxTiempo = colIndex('Tiempo');
    const idxTipo = colIndex('Tipo de actividad');
    const idxAscenso = colIndex('Ascenso total');
    const idxDescenso = colIndex('Descenso total');
    const idxTitulo = colIndex('Título');

    if (idxFecha < 0 || idxDistancia < 0 || idxTiempo < 0) {
        console.warn('CSV no tiene columnas Fecha, Distancia o Tiempo');
        return sessions;
    }

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length <= Math.max(idxFecha, idxDistancia, idxTiempo)) continue;

        const fechaStr = (cols[idxFecha] || '').trim();
        const distanciaStr = (cols[idxDistancia] || '').replace(',', '.').trim();
        const tiempoStr = (cols[idxTiempo] || '').trim();

        if (!fechaStr || !distanciaStr || !tiempoStr) continue;

        const distance = parseFloat(distanciaStr);
        if (isNaN(distance) || distance <= 0) continue;

        // Fecha: "2026-02-04 17:41:14" -> date YYYY-MM-DD
        const date = fechaStr.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

        // Tiempo: "00:38:24" o "00:02:38.4" -> hh:mm:ss (sin decimales)
        const timeParts = tiempoStr.replace(',', '.').split(':');
        if (timeParts.length < 3) continue;
        const hours = parseInt(timeParts[0], 10) || 0;
        const minutes = parseInt(timeParts[1], 10) || 0;
        const secParts = (timeParts[2] || '0').split('.');
        const seconds = Math.floor(parseFloat(secParts[0]) || 0);
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        const timeInMinutes = hours * 60 + minutes + seconds / 60;

        // Desnivel: número o "--"
        const parseElev = (val) => {
            if (val === undefined || val === null) return 0;
            const v = String(val).trim().replace(',', '.');
            if (v === '' || v === '--') return 0;
            const n = parseInt(v, 10);
            return isNaN(n) ? 0 : Math.max(0, n);
        };
        const elevationGain = parseElev(cols[idxAscenso]);
        const elevationLoss = parseElev(cols[idxDescenso]);

        // Tipo: mapear a nuestros tipos
        const tipoStr = (cols[idxTipo] || '').toLowerCase();
        let type = 'rodaje';
        if (tipoStr.includes('series') || tipoStr.includes('interval')) type = 'series';
        else if (tipoStr.includes('tirada') || tipoStr.includes('larga') || tipoStr.includes('long')) type = 'tirada-larga';
        else if (tipoStr.includes('ritmo') || tipoStr.includes('tempo') || tipoStr.includes('carrera')) type = 'ritmo-carrera';
        // "Carrera" y "Entrenamiento en cinta" -> rodaje por defecto

        const title = idxTitulo >= 0 ? (cols[idxTitulo] || '').trim() : '';
        const notes = title ? `Importado desde Garmin Connect: ${title}` : 'Importado desde Garmin Connect (CSV)';

        sessions.push({
            date,
            distance: parseFloat(distance.toFixed(2)),
            time: timeString,
            timeInMinutes,
            type,
            notes,
            elevationGain,
            elevationLoss,
            equipo: ''
        });
    }

    return sessions;
}

// Parsear archivo TCX
function parseTCX(xmlDoc) {
    const sessions = [];
    const activities = xmlDoc.querySelectorAll('Activity');
    
    activities.forEach(activity => {
        try {
            // Fecha de la actividad
            const idElement = activity.querySelector('Id');
            if (!idElement) return;
            
            const dateStr = idElement.textContent;
            const date = new Date(dateStr);
            const dateFormatted = date.toISOString().split('T')[0];

            // Distancia total (en metros, convertir a km)
            const distanceElements = activity.querySelectorAll('DistanceMeters');
            let totalDistance = 0;
            distanceElements.forEach(el => {
                totalDistance += parseFloat(el.textContent) || 0;
            });
            totalDistance = totalDistance / 1000; // Convertir a km

            // Tiempo total (en segundos)
            const totalTimeSeconds = activity.querySelector('TotalTimeSeconds');
            if (!totalTimeSeconds) return;
            
            const seconds = parseFloat(totalTimeSeconds.textContent) || 0;
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            // Desnivel (en metros)
            const elevationGain = activity.querySelector('ElevationGain') || 
                                 activity.querySelector('MaximumElevation');
            const elevationLoss = activity.querySelector('ElevationLoss') || 
                                activity.querySelector('MinimumElevation');
            
            let gain = 0;
            let loss = 0;
            
            // Calcular desnivel desde los puntos de track
            const trackPoints = activity.querySelectorAll('Trackpoint');
            if (trackPoints.length > 0) {
                let prevElevation = null;
                trackPoints.forEach(point => {
                    const elevationEl = point.querySelector('AltitudeMeters');
                    if (elevationEl) {
                        const elevation = parseFloat(elevationEl.textContent);
                        if (prevElevation !== null) {
                            const diff = elevation - prevElevation;
                            if (diff > 0) gain += diff;
                            else loss += Math.abs(diff);
                        }
                        prevElevation = elevation;
                    }
                });
            } else {
                // Usar valores directos si existen
                if (elevationGain) gain = parseFloat(elevationGain.textContent) || 0;
                if (elevationLoss) loss = parseFloat(elevationLoss.textContent) || 0;
            }

            // Tipo de actividad (intentar detectar desde el nombre o usar "rodaje" por defecto)
            const activityType = activity.getAttribute('Sport') || 'Running';
            let type = 'rodaje'; // Por defecto
            
            // Intentar detectar el tipo desde el nombre de la actividad
            const nameEl = activity.querySelector('Name');
            if (nameEl) {
                const name = nameEl.textContent.toLowerCase();
                if (name.includes('series') || name.includes('interval')) type = 'series';
                else if (name.includes('tirada') || name.includes('long')) type = 'tirada-larga';
                else if (name.includes('ritmo') || name.includes('tempo')) type = 'ritmo-carrera';
            }

            if (totalDistance > 0 && seconds > 0) {
                sessions.push({
                    date: dateFormatted,
                    distance: parseFloat(totalDistance.toFixed(2)),
                    time: timeString,
                    timeInMinutes: seconds / 60,
                    type: type,
                    notes: `Importado desde Garmin Connect`,
                    elevationGain: Math.round(gain),
                    elevationLoss: Math.round(loss)
                });
            }
        } catch (error) {
            console.error('Error procesando actividad TCX:', error);
        }
    });

    return sessions;
}

// Parsear archivo GPX
function parseGPX(xmlDoc) {
    const sessions = [];
    const tracks = xmlDoc.querySelectorAll('trk');
    
    tracks.forEach(track => {
        try {
            // Fecha (buscar en metadata o en el primer punto)
            let date = new Date();
            const metadata = xmlDoc.querySelector('metadata time');
            const firstTime = track.querySelector('time');
            
            if (metadata) {
                date = new Date(metadata.textContent);
            } else if (firstTime) {
                date = new Date(firstTime.textContent);
            }
            
            const dateFormatted = date.toISOString().split('T')[0];

            // Calcular distancia y tiempo desde los puntos de track
            const trackSegments = track.querySelectorAll('trkseg');
            let totalDistance = 0;
            let startTime = null;
            let endTime = null;
            let elevations = [];

            trackSegments.forEach(segment => {
                const points = segment.querySelectorAll('trkpt');
                let prevPoint = null;

                points.forEach((point, index) => {
                    const lat = parseFloat(point.getAttribute('lat'));
                    const lon = parseFloat(point.getAttribute('lon'));
                    const timeEl = point.querySelector('time');
                    const elevationEl = point.querySelector('ele');

                    if (timeEl) {
                        const pointTime = new Date(timeEl.textContent);
                        if (!startTime) startTime = pointTime;
                        endTime = pointTime;
                    }

                    if (elevationEl) {
                        elevations.push(parseFloat(elevationEl.textContent));
                    }

                    // Calcular distancia usando fórmula de Haversine
                    if (prevPoint) {
                        const prevLat = parseFloat(prevPoint.getAttribute('lat'));
                        const prevLon = parseFloat(prevPoint.getAttribute('lon'));
                        totalDistance += haversineDistance(prevLat, prevLon, lat, lon);
                    }
                    prevPoint = point;
                });
            });

            totalDistance = totalDistance / 1000; // Convertir a km

            // Calcular tiempo total
            let seconds = 0;
            if (startTime && endTime) {
                seconds = (endTime - startTime) / 1000;
            }

            // Calcular desnivel
            let gain = 0;
            let loss = 0;
            for (let i = 1; i < elevations.length; i++) {
                const diff = elevations[i] - elevations[i - 1];
                if (diff > 0) gain += diff;
                else loss += Math.abs(diff);
            }

            // Tipo de actividad
            const typeEl = track.querySelector('type');
            let type = 'rodaje';
            if (typeEl) {
                const typeText = typeEl.textContent.toLowerCase();
                if (typeText.includes('series') || typeText.includes('interval')) type = 'series';
                else if (typeText.includes('tirada') || typeText.includes('long')) type = 'tirada-larga';
                else if (typeText.includes('ritmo') || typeText.includes('tempo')) type = 'ritmo-carrera';
            }

            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (totalDistance > 0 && seconds > 0) {
                sessions.push({
                    date: dateFormatted,
                    distance: parseFloat(totalDistance.toFixed(2)),
                    time: timeString,
                    timeInMinutes: seconds / 60,
                    type: type,
                    notes: `Importado desde Garmin Connect (GPX)`,
                    elevationGain: Math.round(gain),
                    elevationLoss: Math.round(loss)
                });
            }
        } catch (error) {
            console.error('Error procesando track GPX:', error);
        }
    });

    return sessions;
}

// Calcular distancia entre dos puntos usando fórmula de Haversine
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Renderizar sesiones
function renderSessions() {
    const container = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay sesiones registradas aún. ¡Agrega tu primera sesión!</p>';
        return;
    }

    // Ordenar por fecha (más recientes primero)
    const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sortedSessions.map(session => {
        // Calcular ritmo usando tiempo en minutos (compatibilidad con datos antiguos)
        const timeInMinutes = session.timeInMinutes || (typeof session.time === 'string' ? timeToMinutes(session.time) : session.time);
        const pace = (timeInMinutes / session.distance).toFixed(2);
        const formattedDate = formatDate(session.date);
        const timeDisplay = typeof session.time === 'string' ? session.time : minutesToTime(session.time);
        
        const typeLabels = {
            rodaje: 'Rodaje',
            series: 'Series',
            'tirada-larga': 'Tirada larga',
            'ritmo-carrera': 'Ritmo carrera'
        };

        // Extraer la primera palabra de las notas como lugar
        // Si contiene ":", tomar la primera palabra después de ":"
        // Si no contiene ":", tomar la primera palabra
        let location = '';
        if (session.notes && session.notes.trim()) {
            const notes = session.notes.trim();
            if (notes.includes(':')) {
                // Para sesiones importadas: tomar primera palabra después de ":"
                const afterColon = notes.split(':')[1].trim();
                if (afterColon) {
                    location = afterColon.split(/\s+/)[0];
                }
            } else {
                // Para sesiones manuales: tomar primera palabra
                location = notes.split(/\s+/)[0];
            }
        }

        return `
            <div class="session-item">
                <div class="session-header">
                    <div class="session-header-left">
                        <span class="session-date">${formattedDate}</span>
                        ${location ? `<span class="session-location">📍 ${escapeHtml(location)}</span>` : ''}
                    </div>
                    <span class="session-type">${typeLabels[session.type] || session.type}</span>
                </div>
                <div class="session-details">
                    <div class="session-detail">
                        <span class="session-detail-label">Distancia</span>
                        <span class="session-detail-value">${session.distance} km</span>
                    </div>
                    <div class="session-detail">
                        <span class="session-detail-label">Tiempo</span>
                        <span class="session-detail-value">${timeDisplay}</span>
                    </div>
                    <div class="session-detail">
                        <span class="session-detail-label">Ritmo</span>
                        <span class="session-detail-value">${pace} min/km</span>
                    </div>
                    ${session.elevationGain > 0 || session.elevationLoss > 0 ? `
                    <div class="session-detail">
                        <span class="session-detail-label">Desnivel</span>
                        <span class="session-detail-value">
                            ${session.elevationGain > 0 ? `+${session.elevationGain}m` : ''}
                            ${session.elevationGain > 0 && session.elevationLoss > 0 ? ' / ' : ''}
                            ${session.elevationLoss > 0 ? `-${session.elevationLoss}m` : ''}
                        </span>
                    </div>
                    ` : ''}
                    ${(session.equipo || '').trim() ? `
                    <div class="session-detail session-detail-equipo">
                        <span class="session-detail-label">Equipo</span>
                        <span class="session-detail-value">${escapeHtml((session.equipo || '').trim())}</span>
                    </div>
                    ` : ''}
                </div>
                ${session.notes ? `
                <div class="session-notes-row">
                    <span class="session-notes">${escapeHtml(session.notes)}</span>
                </div>` : ''}
                <div class="session-actions">
                    <button class="edit-btn" onclick="editSession(${session.id})">Editar</button>
                    <button class="delete-btn" onclick="deleteSession(${session.id})">Eliminar</button>
                </div>
            </div>
        `;
    }).join('');
}

// Filtrar sesiones por período
function filterSessionsByPeriod(period) {
    if (period === 'all') {
        return sessions;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate;
    
    switch (period) {
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 1);
            break;
        case 'year':
            startDate = new Date(today);
            startDate.setFullYear(today.getFullYear() - 1);
            break;
        default:
            return sessions;
    }
    
    return sessions.filter(session => {
        const sessionDate = new Date(session.date + 'T00:00:00');
        return sessionDate >= startDate && sessionDate <= today;
    });
}

// Configurar filtros de estadísticas
function setupStatsFilters() {
    const filterButtons = document.querySelectorAll('.stats-filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover clase active de todos los botones
            filterButtons.forEach(b => b.classList.remove('active'));
            // Añadir clase active al botón clickeado
            btn.classList.add('active');
            // Actualizar período actual
            currentStatsPeriod = btn.getAttribute('data-period');
            // Actualizar estadísticas
            updateStats();
        });
    });
}

// Actualizar estadísticas
function updateStats() {
    // Filtrar sesiones según el período seleccionado
    const filteredSessions = filterSessionsByPeriod(currentStatsPeriod);
    
    const totalSessions = filteredSessions.length;
    const totalDistance = filteredSessions.reduce((sum, s) => sum + s.distance, 0);
    
    // Calcular tiempo total en minutos (compatibilidad con datos antiguos)
    const totalTimeInMinutes = filteredSessions.reduce((sum, s) => {
        if (s.timeInMinutes) return sum + s.timeInMinutes;
        if (typeof s.time === 'string') return sum + timeToMinutes(s.time);
        return sum + s.time;
    }, 0);
    
    const avgPace = totalDistance > 0 ? (totalTimeInMinutes / totalDistance).toFixed(2) : '--';
    const totalTimeFormatted = minutesToTime(totalTimeInMinutes);

    document.getElementById('totalSessions').textContent = totalSessions;
    document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
    document.getElementById('totalTime').textContent = totalTimeFormatted;
    document.getElementById('avgPace').textContent = avgPace;
    
    // Actualizar gráficas
    updateCharts(filteredSessions);
}

// Actualizar todas las gráficas
function updateCharts(filteredSessions) {
    updateDistanceChart(filteredSessions);
    updateFrequencyChart(filteredSessions);
    updateTypeChart(filteredSessions);
    updatePaceChart(filteredSessions);
    updateElevationChart(filteredSessions);
}

// Gráfica de evolución de distancia
function updateDistanceChart(sessions) {
    const ctx = document.getElementById('distanceChart');
    if (!ctx) return;
    
    // Ordenar sesiones por fecha
    const sortedSessions = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedSessions.map(s => {
        const date = new Date(s.date + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    });
    
    const distances = sortedSessions.map(s => s.distance);
    
    // Calcular distancia acumulada
    let accumulated = 0;
    const accumulatedDistances = distances.map(d => {
        accumulated += d;
        return accumulated;
    });
    
    if (charts.distanceChart) {
        charts.distanceChart.destroy();
    }
    
    charts.distanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Distancia por sesión (km)',
                data: distances,
                borderColor: 'rgba(255, 255, 255, 0.9)',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Distancia acumulada (km)',
                data: accumulatedDistances,
                borderColor: 'rgba(255, 255, 255, 0.6)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                tension: 0.4,
                borderDash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                }
            }
        }
    });
}

// Gráfica de frecuencia de sesiones
function updateFrequencyChart(sessions) {
    const ctx = document.getElementById('frequencyChart');
    if (!ctx) return;
    
    // Agrupar por semana o mes según el período
    const period = currentStatsPeriod === 'week' ? 'week' : 'month';
    const grouped = {};
    
    sessions.forEach(session => {
        const date = new Date(session.date + 'T00:00:00');
        let key;
        
        if (period === 'week') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
        } else {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        grouped[key] = (grouped[key] || 0) + 1;
    });
    
    const labels = Object.keys(grouped).sort().map(key => {
        const date = new Date(key + (period === 'week' ? 'T00:00:00' : '-01T00:00:00'));
        if (period === 'week') {
            return `Sem ${date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}`;
        } else {
            return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        }
    });
    
    const frequencies = labels.map(label => {
        const key = Object.keys(grouped).sort()[labels.indexOf(label)];
        return grouped[key];
    });
    
    if (charts.frequencyChart) {
        charts.frequencyChart.destroy();
    }
    
    charts.frequencyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sesiones',
                data: frequencies,
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                borderColor: 'rgba(255, 255, 255, 0.9)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white', stepSize: 1 },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                }
            }
        }
    });
}

// Gráfica de tipos de entrenamiento (pie chart)
function updateTypeChart(sessions) {
    const ctx = document.getElementById('typeChart');
    if (!ctx) return;
    
    const typeCounts = {
        'rodaje': 0,
        'series': 0,
        'tirada-larga': 0,
        'ritmo-carrera': 0
    };
    
    sessions.forEach(session => {
        if (typeCounts.hasOwnProperty(session.type)) {
            typeCounts[session.type]++;
        }
    });
    
    const labels = ['Rodaje', 'Series', 'Tirada larga', 'Ritmo carrera'];
    const data = [
        typeCounts['rodaje'],
        typeCounts['series'],
        typeCounts['tirada-larga'],
        typeCounts['ritmo-carrera']
    ];
    
    if (charts.typeChart) {
        charts.typeChart.destroy();
    }
    
    charts.typeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(255, 255, 255, 0.8)',
                    'rgba(255, 255, 255, 0.6)',
                    'rgba(255, 255, 255, 0.4)',
                    'rgba(255, 255, 255, 0.2)'
                ],
                borderColor: 'rgba(255, 255, 255, 0.9)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: 'white', padding: 15 }
                }
            }
        }
    });
}

// Gráfica de evolución del ritmo
function updatePaceChart(sessions) {
    const ctx = document.getElementById('paceChart');
    if (!ctx) return;
    
    // Ordenar sesiones por fecha
    const sortedSessions = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedSessions.map(s => {
        const date = new Date(s.date + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    });
    
    const paces = sortedSessions.map(s => {
        const timeInMinutes = s.timeInMinutes || (typeof s.time === 'string' ? timeToMinutes(s.time) : s.time);
        return s.distance > 0 ? (timeInMinutes / s.distance).toFixed(2) : null;
    }).filter(p => p !== null);
    
    const validLabels = labels.filter((_, i) => sortedSessions[i].distance > 0);
    
    if (charts.paceChart) {
        charts.paceChart.destroy();
    }
    
    charts.paceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: validLabels,
            datasets: [{
                label: 'Ritmo (min/km)',
                data: paces,
                borderColor: 'rgba(255, 255, 255, 0.9)',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    reverse: true, // Menor ritmo es mejor, así que invertimos el eje
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                }
            }
        }
    });
}

// Gráfica de desnivel acumulado
function updateElevationChart(sessions) {
    const ctx = document.getElementById('elevationChart');
    if (!ctx) return;
    
    // Ordenar sesiones por fecha
    const sortedSessions = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedSessions.map(s => {
        const date = new Date(s.date + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    });
    
    const elevationGain = sortedSessions.map(s => s.elevationGain || 0);
    const elevationLoss = sortedSessions.map(s => s.elevationLoss || 0);
    
    if (charts.elevationChart) {
        charts.elevationChart.destroy();
    }
    
    charts.elevationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Desnivel + (m)',
                data: elevationGain,
                backgroundColor: 'rgba(80, 200, 120, 0.6)',
                borderColor: 'rgba(80, 200, 120, 0.9)',
                borderWidth: 2
            }, {
                label: 'Desnivel - (m)',
                data: elevationLoss.map(v => -v), // Negativo para mostrar hacia abajo
                backgroundColor: 'rgba(231, 76, 60, 0.6)',
                borderColor: 'rgba(231, 76, 60, 0.9)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                }
            }
        }
    });
}

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Guardar sesiones en localStorage
function saveSessions() {
    localStorage.setItem('runningSessions', JSON.stringify(sessions));
}

// Cargar sesiones de localStorage
function loadSessions() {
    const saved = localStorage.getItem('runningSessions');
    if (saved) {
        sessions = JSON.parse(saved);
        // Migrar datos antiguos: convertir tiempo en minutos a formato hh:mm:ss
        sessions = sessions.map(session => {
            if (!session.timeInMinutes && typeof session.time === 'number') {
                // Es un dato antiguo con tiempo en minutos
                session.timeInMinutes = session.time;
                session.time = minutesToTime(session.time);
            } else if (!session.timeInMinutes && typeof session.time === 'string') {
                // Ya está en formato hh:mm:ss, calcular minutos
                session.timeInMinutes = timeToMinutes(session.time);
            }
            // Asegurar que los desniveles existan
            if (session.elevationGain === undefined) session.elevationGain = 0;
            if (session.elevationLoss === undefined) session.elevationLoss = 0;
            // Asegurar que el campo equipo exista
            if (session.equipo === undefined) session.equipo = '';
            return session;
        });
        saveSessions(); // Guardar datos migrados
        renderSessions();
    }
}

// Aplicar actualización: forzar recarga con la nueva versión
function applyUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
        });
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        }).finally(() => {
            window.location.reload(true);
        });
    } else {
        window.location.reload(true);
    }
}

// Configurar verificación de versiones
function setupVersionCheck() {
    const versionElement = document.getElementById('currentVersion');
    if (!versionElement) return;

    // Mostrar versión actual
    versionElement.textContent = `v${currentAppVersion}`;

    // Verificar versión desde el servidor (sin caché para no recibir 1.0.10 viejo)
    fetch('./version.json?' + Date.now(), { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(versionData => {
            if (!versionData || !versionData.version) return;
            
            const serverVersion = versionData.version;
            
            // Comparar versiones (formato semver: x.y.z)
            if (compareVersions(serverVersion, currentAppVersion) > 0) {
                // Hay una nueva versión: actualizar directamente
                applyUpdate();
                return;
            }
            // Está actualizado
            versionElement.textContent = `v${currentAppVersion} ✓`;
            versionElement.style.color = 'var(--secondary-color)';
        })
        .catch(() => {
            versionElement.textContent = `v${currentAppVersion}`;
        });

    // Verificar periódicamente (cada hora) y actualizar automáticamente si hay nueva versión
    setInterval(() => {
        fetch('./version.json?' + Date.now(), { cache: 'no-store' })
            .then(res => res.ok ? res.json() : null)
            .then(versionData => {
                if (versionData && versionData.version) {
                    const serverVersion = versionData.version;
                    if (compareVersions(serverVersion, currentAppVersion) > 0) {
                        applyUpdate();
                    }
                }
            })
            .catch(() => {});
    }, 3600000); // Cada hora
}

// Comparar versiones (retorna: 1 si v1 > v2, -1 si v1 < v2, 0 si iguales)
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLength; i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }
    return 0;
}

// Configurar PWA
function setupPWA() {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('Service Worker registrado:', registration);
                    registration.update(); // Buscar nueva versión al cargar
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        window.location.reload(); // Recargar cuando el nuevo SW tome control
                    });
                })
                .catch(error => {
                    console.log('Error al registrar Service Worker:', error);
                });
        });
    }

    // Manejar instalación de PWA
    let deferredPrompt;
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
        <p>¿Instalar Running como app?</p>
        <button class="btn btn-primary btn-small" id="installBtn">Instalar</button>
        <button class="btn btn-danger btn-small" id="cancelInstall">Cancelar</button>
    `;
    document.body.appendChild(installPrompt);

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installPrompt.classList.add('show');
    });

    document.getElementById('installBtn')?.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('Resultado de instalación:', outcome);
            deferredPrompt = null;
            installPrompt.classList.remove('show');
        }
    });

    document.getElementById('cancelInstall')?.addEventListener('click', () => {
        installPrompt.classList.remove('show');
    });
}
