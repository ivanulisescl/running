// Estado de la aplicación
let sessions = [];
let currentAppVersion = '1.2.18'; // Versión actual de la app
let editingSessionId = null; // ID de la sesión que se está editando (null si no hay ninguna)
let currentStatsPeriod = 'all'; // Período actual para las estadísticas: 'all', 'week', 'month', 'year'
let historyViewMode = 'detailed'; // 'detailed' | 'compact' para el historial de sesiones
let historyTypeFilter = ''; // '' = todos, 'entrenamiento' | 'series' | 'carrera'
let charts = {}; // Objeto para almacenar las instancias de las gráficas
let equipmentList = []; // Lista de equipos disponibles
let marcas = []; // Mejores marcas por carrera (id = session id de tipo carrera)
let records = []; // Récords (incluidos en runmetrics.json)
const RUNMETRICS_FILENAME = 'runmetrics.json';
let totalDistanceSelectedYear = new Date().getFullYear(); // Año seleccionado para Distancia total (por mes)
let totalElevationSelectedYear = new Date().getFullYear(); // Año seleccionado para Desnivel acumulado (por mes)
let typeSelectedYear = new Date().getFullYear(); // Año seleccionado para Tipo de entrenamiento
let paceSelectedYear = new Date().getFullYear(); // Año seleccionado para Evolución del ritmo (por mes)
let activitiesSelectedMonth = (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
})(); // Mes seleccionado para Actividades (por día)

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadEquipment();
    loadSessions();
    loadMarcas();
    loadRecords();
    loadRunmetricsFromRepoIfEmpty();
    setupForm();
    setupNewSessionButton();
    setupNavigationButtons();
    setupStatsFilters();
    setupTotalDistanceYearSelector();
    setupTotalElevationYearSelector();
    setupTypeYearSelector();
    setupPaceYearSelector();
    setupActivitiesMonthSelector();
    setupEquipmentSection();
    setupMarcaForm();
    setupClearButton();
    setupHistoryViewToggle();
    setupHistoryTypeFilter();
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

// Secciones que se muestran/ocultan con los botones del header
const MAIN_SECTIONS = {
    newSession: { btnId: 'newSessionBtn', sectionId: 'sessionFormSection' },
    stats: { btnId: 'statsBtn', sectionId: 'statsSection' },
    history: { btnId: 'historyBtn', sectionId: 'historySection' },
    equipment: { btnId: 'equipmentBtn', sectionId: 'equipmentSection' },
    marcas: { btnId: 'marcasBtn', sectionId: 'marcasSection' },
    records: { btnId: 'recordsBtn', sectionId: 'recordsSection' }
};

function hideAllMainSections() {
    document.querySelectorAll('.main-section').forEach(el => {
        if (el) el.style.display = 'none';
    });
}

function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    hideAllMainSections();
    section.style.display = 'block';
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Esperar a que el layout aplique el display:block antes de hacer scroll
    requestAnimationFrame(() => {
        section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const isVisible = section.style.display !== 'none';
    if (isVisible) {
        section.style.display = 'none';
    } else {
        hideAllMainSections();
        section.style.display = 'block';
        scrollToSection(sectionId);
    }
}

function setActiveNavButton(activeBtnId) {
    ['newSessionBtn', 'statsBtn', 'historyBtn', 'equipmentBtn', 'marcasBtn', 'recordsBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('active', id === activeBtnId);
    });
}

// Configurar botón "Nueva sesión"
function setupNewSessionButton() {
    const newSessionBtn = document.getElementById('newSessionBtn');
    const sessionFormSection = document.getElementById('sessionFormSection');
    if (!newSessionBtn || !sessionFormSection) return;

    newSessionBtn.addEventListener('click', () => {
        if (editingSessionId !== null) {
            editingSessionId = null;
            resetForm();
        }
        const selectedEquipment = localStorage.getItem('selectedEquipment') || '';
        const equipoField = document.getElementById('equipo');
        if (equipoField) equipoField.value = selectedEquipment;
        toggleSection('sessionFormSection');
        setActiveNavButton(sessionFormSection.style.display !== 'none' ? 'newSessionBtn' : null);
    });
}

// Configurar botones de navegación (Estadísticas, Historial y Equipo)
function setupNavigationButtons() {
    const statsBtn = document.getElementById('statsBtn');
    const historyBtn = document.getElementById('historyBtn');
    const equipmentBtn = document.getElementById('equipmentBtn');
    const recordsBtn = document.getElementById('recordsBtn');
    const statsSection = document.getElementById('statsSection');
    const historySection = document.getElementById('historySection');
    const equipmentSection = document.getElementById('equipmentSection');
    const recordsSection = document.getElementById('recordsSection');

    if (statsBtn && statsSection) {
        statsBtn.addEventListener('click', () => {
            toggleSection('statsSection');
            setActiveNavButton(statsSection.style.display !== 'none' ? 'statsBtn' : null);
        });
    }
    if (historyBtn && historySection) {
        historyBtn.addEventListener('click', () => {
            toggleSection('historySection');
            setActiveNavButton(historySection.style.display !== 'none' ? 'historyBtn' : null);
        });
    }
    if (equipmentBtn && equipmentSection) {
        equipmentBtn.addEventListener('click', () => {
            toggleSection('equipmentSection');
            setActiveNavButton(equipmentSection.style.display !== 'none' ? 'equipmentBtn' : null);
        });
    }
    if (recordsBtn && recordsSection) {
        recordsBtn.addEventListener('click', () => {
            toggleSection('recordsSection');
            setActiveNavButton(recordsSection.style.display !== 'none' ? 'recordsBtn' : null);
            if (recordsSection.style.display !== 'none') renderRecords();
        });
    }
    const marcasBtn = document.getElementById('marcasBtn');
    const marcasSection = document.getElementById('marcasSection');
    if (marcasBtn && marcasSection) {
        marcasBtn.addEventListener('click', () => {
            toggleSection('marcasSection');
            setActiveNavButton(marcasSection.style.display !== 'none' ? 'marcasBtn' : null);
            renderMarcas();
        });
    }
}

function saveRecords() {
    localStorage.setItem('runningRecords', JSON.stringify(records));
}

function loadRecords() {
    const saved = localStorage.getItem('runningRecords');
    if (!saved) return;
    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            records = parsed;
            renderRecords();
        }
    } catch (_) {}
}

function normalizeSessionFromExternal(s) {
    if (!s || typeof s !== 'object') return null;

    // Migración básica de tiempo
    if (!s.timeInMinutes && typeof s.time === 'number') {
        s.timeInMinutes = s.time;
        s.time = minutesToTime(s.time);
    } else if (!s.timeInMinutes && typeof s.time === 'string') {
        s.timeInMinutes = timeToMinutes(s.time);
    }

    if (s.elevationGain === undefined) s.elevationGain = 0;
    if (s.elevationLoss === undefined) s.elevationLoss = 0;
    if (s.equipo === undefined) s.equipo = '';
    if (!('localizacion' in s) || s.localizacion === undefined) {
        s.localizacion = (s.notes || '').trim();
    }
    return s;
}

function coerceRunmetricsPayload(data) {
    // Formato legacy: array de sesiones
    if (Array.isArray(data)) {
        return { sessionsArr: data, carrerasArr: [], recordsArr: [] };
    }

    // Formato nuevo: { sessions, carreras, records }
    if (data && typeof data === 'object') {
        const sessionsArr = Array.isArray(data.sessions)
            ? data.sessions
            : (Array.isArray(data.sesiones) ? data.sesiones : []);
        const carrerasArr = Array.isArray(data.carreras) ? data.carreras : [];
        const recordsArr = Array.isArray(data.records) ? data.records : [];

        if (!sessionsArr.length && !carrerasArr.length && !recordsArr.length) {
            throw new Error(`Archivo inválido: faltan sessions/carreras/records en ${RUNMETRICS_FILENAME}`);
        }

        return { sessionsArr, carrerasArr, recordsArr };
    }

    throw new Error(`Archivo inválido: formato no reconocido (${RUNMETRICS_FILENAME})`);
}

async function fetchRunmetricsFromRepo() {
    const cacheBust = '?t=' + Date.now();
    const res = await fetch('./' + RUNMETRICS_FILENAME + cacheBust, { cache: 'no-store' });
    if (!res.ok) throw new Error(`No se encontró ${RUNMETRICS_FILENAME} en el repositorio`);
    return await res.json();
}

// Si el dispositivo está vacío, trae runmetrics.json del repo como "seed"
async function loadRunmetricsFromRepoIfEmpty() {
    const hasLocal =
        (Array.isArray(sessions) && sessions.length > 0) ||
        (Array.isArray(marcas) && marcas.length > 0) ||
        (Array.isArray(records) && records.length > 0);
    if (hasLocal) return;

    try {
        const data = await fetchRunmetricsFromRepo();
        const { sessionsArr, carrerasArr, recordsArr } = coerceRunmetricsPayload(data);

        sessions = (sessionsArr || [])
            .map(normalizeSessionFromExternal)
            .filter(Boolean);
        marcas = (carrerasArr || []).filter(Boolean).map(m => ({ ...m }));
        records = (recordsArr || []).filter(Boolean).map(r => ({ ...r }));

        saveSessions();
        saveMarcas();
        saveRecords();

        renderSessions();
        renderEquipmentList();
        updateEquipmentSelect();
        updateStats();
        renderMarcas();
    } catch (_) {
        // Silencioso: no bloquear si no hay repo/online
    }
}

function renderRecords() {
    const container = document.getElementById('recordsContent');
    if (!container) return;

    if (!Array.isArray(records) || records.length === 0) {
        container.innerHTML = `
            <p class="section-intro">Importa <strong>${RUNMETRICS_FILENAME}</strong> para cargar tus récords.</p>
            <p class="empty-state">No hay récords cargados.</p>
        `;
        return;
    }

    const rowsHtml = records.map(r => {
        const categoria = escapeHtml(String(r.categoria ?? '—'));
        const record = escapeHtml(String(r.record ?? '—'));
        const ritmo = escapeHtml(String(r.ritmo ?? '—'));
        const actividad = escapeHtml(String(r.actividad ?? '—'));
        const fecha = escapeHtml(String(r.fecha ?? '—'));
        return `
            <tr>
                <td>${categoria}</td>
                <td class="records-col-right">${record}</td>
                <td class="records-col-right">${ritmo}</td>
                <td>${actividad}</td>
                <td class="records-col-right">${fecha}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <p class="section-intro">Mejores marcas y distancias destacadas.</p>
        <div class="records-table-wrapper" role="region" aria-label="Tabla de récords">
            <table class="records-table">
                <thead>
                    <tr>
                        <th scope="col">Categoría</th>
                        <th scope="col" class="records-col-right">Récord</th>
                        <th scope="col" class="records-col-right">Ritmo</th>
                        <th scope="col">Actividad</th>
                        <th scope="col" class="records-col-right">Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
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
        hideAllMainSections();
        sessionFormSection.style.display = 'block';
        setActiveNavButton('newSessionBtn');
    }
}

// Ocultar formulario
function hideSessionForm() {
    const sessionFormSection = document.getElementById('sessionFormSection');
    if (sessionFormSection) {
        sessionFormSection.style.display = 'none';
        setActiveNavButton(null);
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
    const distance = parseFloat(parseFloat(document.getElementById('distance').value).toFixed(2));
    const timeHours = parseInt(document.getElementById('timeHours').value) || 0;
    const timeMinutes = parseInt(document.getElementById('timeMinutes').value) || 0;
    const timeSeconds = parseInt(document.getElementById('timeSeconds').value) || 0;
    const type = document.getElementById('type').value;
    const equipo = document.getElementById('equipo').value;
    const localizacion = document.getElementById('localizacion').value.trim();
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
                localizacion,
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
            localizacion,
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
    document.getElementById('timeHours').value = '';
    document.getElementById('timeMinutes').value = '';
    document.getElementById('timeSeconds').value = '';
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
    document.getElementById('distance').value = Number(session.distance).toFixed(2);
    const typeVal = (session.type === 'rodaje' || session.type === 'tirada-larga') ? 'entrenamiento' : (session.type === 'ritmo-carrera' ? 'carrera' : session.type);
    document.getElementById('type').value = ['entrenamiento', 'series', 'carrera'].includes(typeVal) ? typeVal : 'entrenamiento';
    document.getElementById('equipo').value = session.equipo || '';
    document.getElementById('localizacion').value = session.localizacion || '';
    document.getElementById('notes').value = session.notes || '';
    document.getElementById('elevationGain').value = session.elevationGain || '';
    document.getElementById('elevationLoss').value = session.elevationLoss || '';

    // Parsear tiempo hh:mm:ss a horas, minutos, segundos (vacío si es 0)
    const toVal = (n) => (n === 0 ? '' : n);
    const timeParts = session.time.split(':');
    if (timeParts.length === 3) {
        const h = parseInt(timeParts[0]) || 0, m = parseInt(timeParts[1]) || 0, s = parseInt(timeParts[2]) || 0;
        document.getElementById('timeHours').value = toVal(h);
        document.getElementById('timeMinutes').value = toVal(m);
        document.getElementById('timeSeconds').value = toVal(s);
    } else {
        const minutes = session.timeInMinutes || session.time || 0;
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        const secs = Math.round((minutes % 1) * 60);
        document.getElementById('timeHours').value = toVal(hours);
        document.getElementById('timeMinutes').value = toVal(mins);
        document.getElementById('timeSeconds').value = toVal(secs);
    }

    // Establecer modo edición
    editingSessionId = id;
    updateSubmitButton();
    
    showSessionForm();
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
    if (clearBtn) clearBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar TODAS las sesiones? Esta acción no se puede deshacer.')) {
            sessions = [];
            saveSessions();
            renderSessions();
            renderEquipmentList();
            updateStats();
        }
    });
}

function setupHistoryViewToggle() {
    const btnDetailed = document.getElementById('historyViewDetailed');
    const btnCompact = document.getElementById('historyViewCompact');
    if (!btnDetailed || !btnCompact) return;
    btnDetailed.addEventListener('click', () => {
        if (historyViewMode === 'detailed') return;
        historyViewMode = 'detailed';
        btnDetailed.classList.add('active');
        btnCompact.classList.remove('active');
        renderSessions();
    });
    btnCompact.addEventListener('click', () => {
        if (historyViewMode === 'compact') return;
        historyViewMode = 'compact';
        btnCompact.classList.add('active');
        btnDetailed.classList.remove('active');
        renderSessions();
    });
}

function setupHistoryTypeFilter() {
    const select = document.getElementById('historyTypeFilter');
    if (!select) return;
    select.addEventListener('change', () => {
        historyTypeFilter = select.value;
        renderSessions();
    });
}

// --- Marcas (mejores marcas por carrera) ---
function loadMarcas() {
    let saved = localStorage.getItem('runningCarreras');
    if (!saved) saved = localStorage.getItem('runningMarcas'); // migración desde nombre antiguo
    if (saved) {
        try {
            marcas = JSON.parse(saved);
        } catch (_) {
            marcas = [];
        }
    }
}

function saveMarcas() {
    localStorage.setItem('runningCarreras', JSON.stringify(marcas));
}

function getMarcaBySessionId(sessionId) {
    return marcas.find(m => m.id === sessionId);
}

function getCarreraSessions() {
    const normalizeType = (t) => (t === 'rodaje' || t === 'tirada-larga') ? 'entrenamiento' : (t === 'ritmo-carrera' ? 'carrera' : t);
    return sessions
        .filter(s => normalizeType(s.type) === 'carrera')
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderMarcas() {
    const container = document.getElementById('marcasList');
    if (!container) return;
    const carreras = getCarreraSessions();
    if (carreras.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay sesiones de tipo Carrera. Añade una carrera en Nueva sesión.</p>';
        return;
    }
    container.innerHTML = carreras.map(session => {
        const marca = getMarcaBySessionId(session.id);
        const location = getSessionLocation(session);
        const dateFormatted = formatDate(session.date);
        const timeDisplay = typeof session.time === 'string' ? session.time : minutesToTime(session.timeInMinutes || session.time);
        const timeInMinutes = session.timeInMinutes != null
            ? Number(session.timeInMinutes)
            : (typeof session.time === 'string' ? timeToMinutes(session.time) : Number(session.time));
        const paceText = (() => {
            const dist = Number(session.distance) || 0;
            const mins = Number(timeInMinutes) || 0;
            if (!(dist > 0) || !(mins > 0) || !isFinite(mins)) return '--:--';
            const totalSeconds = Math.round((mins / dist) * 60);
            const mm = Math.floor(totalSeconds / 60);
            const ss = totalSeconds % 60;
            return `${mm}:${String(ss).padStart(2, '0')}`;
        })();
        const raceName = (session.notes || '').trim() || (session.localizacion || '').trim() || 'Carrera';
        const puestoPct = (marca && marca.numParticipantes > 0 && marca.puestoGeneral != null)
            ? Math.round((marca.puestoGeneral / marca.numParticipantes) * 100)
            : null;
        const puestoCatPct = (marca && marca.participantesCategoria > 0 && marca.puestoCategoria != null)
            ? Math.round((marca.puestoCategoria / marca.participantesCategoria) * 100)
            : null;
        if (marca) {
            const puestoGeneralStr = marca.puestoGeneral != null
                ? (puestoPct != null ? `${marca.puestoGeneral} (${puestoPct}%)` : String(marca.puestoGeneral))
                : '—';
            const puestoCategoriaStr = marca.puestoCategoria != null
                ? (puestoCatPct != null ? `${marca.puestoCategoria} (${puestoCatPct}%)` : String(marca.puestoCategoria))
                : '—';
            return `
                <div class="marca-card" data-session-id="${session.id}">
                    <h3 class="marca-card-name">${escapeHtml(raceName)}</h3>
                    <div class="marca-card-meta">
                        <span class="marca-card-date">${dateFormatted}</span>
                        ${location ? `<span class="marca-card-location">${escapeHtml(location)}</span>` : ''}
                    </div>
                    <div class="marca-card-stats">
                        <span class="marca-card-stat marca-card-km"><strong>${session.distance}</strong> km</span>
                        <span class="marca-card-stat">Tiempo: <strong>${timeDisplay}</strong></span>
                        <span class="marca-card-stat">Ritmo: <strong>${paceText}</strong> /km</span>
                    </div>
                    <div class="marca-card-datos">
                        <div class="marca-card-dato"><span class="marca-dato-label">Participantes:</span><span>${marca.numParticipantes ?? '—'}</span></div>
                        <div class="marca-card-dato"><span class="marca-dato-label">Puesto general:</span><span>${puestoGeneralStr}</span></div>
                        <div class="marca-card-dato"><span class="marca-dato-label">Categoría:</span><span>${escapeHtml(marca.categoria || '—')}</span></div>
                        <div class="marca-card-dato"><span class="marca-dato-label">Part. categoría:</span><span>${marca.participantesCategoria ?? '—'}</span></div>
                        <div class="marca-card-dato"><span class="marca-dato-label">Puesto categoría:</span><span>${puestoCategoriaStr}</span></div>
                    </div>
                    <button type="button" class="btn btn-small btn-edit-marca" data-session-id="${session.id}">Editar</button>
                </div>
            `;
        }
        return `
            <div class="marca-card" data-session-id="${session.id}">
                <h3 class="marca-card-name">${escapeHtml(raceName)}</h3>
                <div class="marca-card-meta">
                    <span class="marca-card-date">${dateFormatted}</span>
                    ${location ? `<span class="marca-card-location">${escapeHtml(location)}</span>` : ''}
                </div>
                <div class="marca-card-stats">
                    <span class="marca-card-stat marca-card-km"><strong>${session.distance}</strong> km</span>
                    <span class="marca-card-stat">Tiempo: <strong>${timeDisplay}</strong></span>
                    <span class="marca-card-stat">Ritmo: <strong>${paceText}</strong> /km</span>
                </div>
                <button type="button" class="btn btn-primary btn-small btn-add-marca" data-session-id="${session.id}">Añadir marca</button>
            </div>
        `;
    }).join('');
    container.querySelectorAll('.btn-add-marca, .btn-edit-marca').forEach(btn => {
        btn.addEventListener('click', () => openMarcaForm(parseFloat(btn.getAttribute('data-session-id'))));
    });
}

function openMarcaForm(sessionId) {
    const container = document.getElementById('marcaFormContainer');
    const titleEl = document.getElementById('marcaFormTitle');
    document.getElementById('marcaSessionId').value = sessionId;
    const marca = getMarcaBySessionId(sessionId);
    if (marca) {
        titleEl.textContent = 'Editar marca';
        document.getElementById('marcaNumParticipantes').value = marca.numParticipantes ?? '';
        document.getElementById('marcaPuestoGeneral').value = marca.puestoGeneral ?? '';
        document.getElementById('marcaCategoria').value = marca.categoria ?? '';
        document.getElementById('marcaParticipantesCategoria').value = marca.participantesCategoria ?? '';
        document.getElementById('marcaPuestoCategoria').value = marca.puestoCategoria ?? '';
    } else {
        titleEl.textContent = 'Añadir marca';
        document.getElementById('marcaForm').reset();
        document.getElementById('marcaSessionId').value = sessionId;
    }
    container.style.display = 'block';
}

function setupMarcaForm() {
    const form = document.getElementById('marcaForm');
    const container = document.getElementById('marcaFormContainer');
    const cancelBtn = document.getElementById('marcaFormCancel');
    if (!form || !container) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const sessionId = parseFloat(document.getElementById('marcaSessionId').value);
        const numParticipantes = parseInt(document.getElementById('marcaNumParticipantes').value, 10) || null;
        const puestoGeneral = parseInt(document.getElementById('marcaPuestoGeneral').value, 10) || null;
        const categoria = (document.getElementById('marcaCategoria').value || '').trim() || null;
        const participantesCategoria = parseInt(document.getElementById('marcaParticipantesCategoria').value, 10) || null;
        const puestoCategoria = parseInt(document.getElementById('marcaPuestoCategoria').value, 10) || null;
        let marca = getMarcaBySessionId(sessionId);
        if (!marca) {
            marca = { id: sessionId };
            marcas.push(marca);
        }
        marca.numParticipantes = numParticipantes;
        marca.puestoGeneral = puestoGeneral;
        marca.categoria = categoria;
        marca.participantesCategoria = participantesCategoria;
        marca.puestoCategoria = puestoCategoria;
        saveMarcas();
        renderMarcas();
        container.style.display = 'none';
    });
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            container.style.display = 'none';
        });
    }
}

// Traer runmetrics.json del repositorio y reemplazar datos locales (botón Resetear)
async function resetFromRepository() {
    const syncStatus = document.getElementById('syncStatus');
    try {
        if (syncStatus) {
            syncStatus.style.display = 'block';
            syncStatus.innerHTML = `<p style="color: var(--primary-color);">Buscando <code>${RUNMETRICS_FILENAME}</code> en el repositorio...</p>`;
        }

        const data = await fetchRunmetricsFromRepo();
        const { sessionsArr, carrerasArr, recordsArr } = coerceRunmetricsPayload(data);

        sessions = (sessionsArr || [])
            .map(normalizeSessionFromExternal)
            .filter(Boolean);
        marcas = (carrerasArr || []).filter(Boolean).map(m => ({ ...m }));
        records = (recordsArr || []).filter(Boolean).map(r => ({ ...r }));

        saveSessions();
        saveMarcas();
        saveRecords();

        renderSessions();
        renderEquipmentList();
        updateEquipmentSelect();
        updateStats();
        renderMarcas();
        renderRecords();

        if (syncStatus) {
            syncStatus.style.display = 'block';
            syncStatus.innerHTML =
                `<p style="color: var(--secondary-color);">✅ Resetear hecho desde <code>${RUNMETRICS_FILENAME}</code>. ` +
                `Sesiones: ${sessions.length}. Carreras: ${marcas.length}. Récords: ${records.length}.</p>`;
            setTimeout(() => { syncStatus.style.display = 'none'; }, 5000);
        }
    } catch (err) {
        if (syncStatus) {
            syncStatus.style.display = 'block';
            syncStatus.innerHTML = `<p style="color: var(--danger-color);">❌ Error: ${err.message || 'Revisa la conexión'}</p>`;
            setTimeout(() => { syncStatus.style.display = 'none'; }, 5000);
        }
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
    const exportAllBtn = document.getElementById('exportAllBtnMenu');
    const importAllBtn = document.getElementById('importAllBtnMenu');
    const importAllInput = document.getElementById('importAllFile');
    const syncStatus = document.getElementById('syncStatus');

    if (exportAllBtn) exportAllBtn.addEventListener('click', () => {
        document.getElementById('menuDropdown').style.display = 'none';
        const payload = {
            app: 'RunMetrics',
            version: currentAppVersion,
            exportedAt: new Date().toISOString(),
            sessions: sessions || [],
            carreras: marcas || [],
            records: records || []
        };
        const data = JSON.stringify(payload, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = RUNMETRICS_FILENAME;
        a.click();
        URL.revokeObjectURL(url);
        if (syncStatus) {
            syncStatus.style.display = 'block';
            syncStatus.innerHTML = `<p style="color: var(--secondary-color);">✅ Exportado <code>${RUNMETRICS_FILENAME}</code>.</p>`;
            setTimeout(() => { syncStatus.style.display = 'none'; }, 3000);
        }
    });

    if (importAllBtn && importAllInput) importAllBtn.addEventListener('click', () => {
        document.getElementById('menuDropdown').style.display = 'none';
        importAllInput.click();
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

    if (importAllInput) importAllInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (syncStatus) {
            syncStatus.style.display = 'block';
            syncStatus.innerHTML = `<p style="color: var(--primary-color);">Procesando <code>${RUNMETRICS_FILENAME}</code>...</p>`;
        }
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Formato legacy: array de sesiones (reemplaza sesiones; no toca carreras/records)
            if (Array.isArray(data)) {
                sessions = data
                    .filter(Boolean)
                    .map(normalizeSessionFromExternal)
                    .filter(Boolean);
                saveSessions();
                renderSessions();
                renderEquipmentList();
                updateEquipmentSelect();
                updateStats();
                if (syncStatus) {
                    syncStatus.innerHTML = `<p style="color: var(--secondary-color);">✅ Sesiones reemplazadas: ${sessions.length}.</p>`;
                    setTimeout(() => { syncStatus.style.display = 'none'; }, 3000);
                }
                importAllInput.value = '';
                return;
            }

            // Formato runmetrics.json: { sessions, carreras, records }
            const { sessionsArr, carrerasArr, recordsArr } = coerceRunmetricsPayload(data);

            // Reemplazar TODO con el contenido del archivo (si alguna sección falta, se deja vacía)
            sessions = (sessionsArr || [])
                .filter(Boolean)
                .map(normalizeSessionFromExternal)
                .filter(Boolean);
            marcas = (carrerasArr || []).filter(Boolean).map(m => ({ ...m }));
            records = (recordsArr || []).filter(Boolean).map(r => ({ ...r }));

            saveSessions();
            saveMarcas();
            saveRecords();

            // Refresh UI
            renderSessions();
            renderEquipmentList();
            updateEquipmentSelect();
            updateStats();
            renderMarcas();
            const recordsSection = document.getElementById('recordsSection');
            if (recordsSection && recordsSection.style.display !== 'none') renderRecords();

            if (syncStatus) {
                syncStatus.innerHTML = `<p style="color: var(--secondary-color);">✅ Importado <code>${RUNMETRICS_FILENAME}</code> (reemplazado). Sesiones: ${sessions.length}. Carreras: ${marcas.length}. Récords: ${records.length}.</p>`;
                setTimeout(() => { syncStatus.style.display = 'none'; }, 5000);
            }
        } catch (err) {
            if (syncStatus) {
                syncStatus.style.display = 'block';
                syncStatus.innerHTML = `<p style="color: var(--danger-color);">❌ Error al leer <code>${RUNMETRICS_FILENAME}</code>: ${err.message || err}</p>`;
                setTimeout(() => { syncStatus.style.display = 'none'; }, 5000);
            }
        } finally {
            importAllInput.value = '';
        }
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
        let type = 'entrenamiento';
        if (tipoStr.includes('series') || tipoStr.includes('interval')) type = 'series';
        else if (tipoStr.includes('ritmo') || tipoStr.includes('tempo') || tipoStr.includes('carrera')) type = 'carrera';
        // "Entrenamiento en cinta" etc. -> entrenamiento por defecto

        const title = idxTitulo >= 0 ? (cols[idxTitulo] || '').trim() : '';
        const notes = title ? `Importado desde Garmin Connect: ${title}` : 'Importado desde Garmin Connect (CSV)';

        sessions.push({
            date,
            distance: parseFloat(distance.toFixed(2)),
            time: timeString,
            timeInMinutes,
            type,
            localizacion: title,
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

            // Tipo de actividad (intentar detectar desde el nombre o usar "entrenamiento" por defecto)
            const activityType = activity.getAttribute('Sport') || 'Running';
            let type = 'entrenamiento'; // Por defecto
            
            // Intentar detectar el tipo desde el nombre de la actividad
            const nameEl = activity.querySelector('Name');
            if (nameEl) {
                const name = nameEl.textContent.toLowerCase();
                if (name.includes('series') || name.includes('interval')) type = 'series';
                else if (name.includes('ritmo') || name.includes('tempo') || name.includes('carrera')) type = 'carrera';
            }

            if (totalDistance > 0 && seconds > 0) {
                const nameText = nameEl ? nameEl.textContent.trim() : '';
                sessions.push({
                    date: dateFormatted,
                    distance: parseFloat(totalDistance.toFixed(2)),
                    time: timeString,
                    timeInMinutes: seconds / 60,
                    type: type,
                    localizacion: nameText,
                    notes: `Importado desde Garmin Connect`,
                    elevationGain: Math.round(gain),
                    elevationLoss: Math.round(loss),
                    equipo: ''
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
            let type = 'entrenamiento';
            if (typeEl) {
                const typeText = typeEl.textContent.toLowerCase();
                if (typeText.includes('series') || typeText.includes('interval')) type = 'series';
                else if (typeText.includes('ritmo') || typeText.includes('tempo') || typeText.includes('carrera')) type = 'carrera';
            }

            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (totalDistance > 0 && seconds > 0) {
                const nameEl = track.querySelector('name');
                const nameText = nameEl ? nameEl.textContent.trim() : '';
                sessions.push({
                    date: dateFormatted,
                    distance: parseFloat(totalDistance.toFixed(2)),
                    time: timeString,
                    timeInMinutes: seconds / 60,
                    type: type,
                    localizacion: nameText,
                    notes: `Importado desde Garmin Connect (GPX)`,
                    elevationGain: Math.round(gain),
                    elevationLoss: Math.round(loss),
                    equipo: ''
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

// Obtener localización de una sesión (localizacion > Localidad > fallback desde notes)
function getSessionLocation(session) {
    const loc = (session.localizacion != null && String(session.localizacion).trim() !== '') ? String(session.localizacion).trim() : '';
    if (loc) return loc;

    const localidad = (session && session.Localidad != null && String(session.Localidad).trim() !== '')
        ? String(session.Localidad).trim()
        : '';
    if (localidad) return localidad;

    if (!session.notes || !session.notes.trim()) return '';
    const notes = session.notes.trim();
    if (notes.includes(':')) {
        const afterColon = notes.split(':')[1].trim();
        return afterColon ? afterColon.split(/\s+/)[0] : '';
    }
    return notes.split(/\s+/)[0] || '';
}

// Renderizar sesiones (modo detallado o compacto)
function renderSessions() {
    const container = document.getElementById('sessionsList');

    const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const normalizeType = (t) => (t === 'rodaje' || t === 'tirada-larga') ? 'entrenamiento' : (t === 'ritmo-carrera' ? 'carrera' : t);
    const filteredSessions = historyTypeFilter
        ? sortedSessions.filter(s => normalizeType(s.type) === historyTypeFilter)
        : sortedSessions;
    const isCompact = historyViewMode === 'compact';

    if (filteredSessions.length === 0) {
        container.innerHTML = sessions.length === 0
            ? '<p class="empty-state">No hay sesiones registradas aún. ¡Agrega tu primera sesión!</p>'
            : '<p class="empty-state">No hay sesiones de este tipo.</p>';
        return;
    }

    container.innerHTML = filteredSessions.map(session => {
        const formattedDate = formatDate(session.date);
        const location = getSessionLocation(session);

        if (isCompact) {
            return `
                <div class="session-item session-item-compact">
                    <span class="session-compact-date">${formattedDate}</span>
                    <span class="session-compact-location">${location ? escapeHtml(location) : '—'}</span>
                    <span class="session-compact-km">${session.distance} km</span>
                    <div class="session-actions session-actions-inline">
                        <button class="edit-btn edit-btn-icon" onclick="editSession(${session.id})" title="Editar">✏️</button>
                        <button class="delete-btn delete-btn-icon" onclick="deleteSession(${session.id})" title="Eliminar">🗑️</button>
                    </div>
                </div>
            `;
        }

        const timeInMinutes = session.timeInMinutes || (typeof session.time === 'string' ? timeToMinutes(session.time) : session.time);
        const paceMinPerKm = session.distance > 0 ? timeInMinutes / session.distance : 0;
        const paceMin = Math.floor(paceMinPerKm);
        const paceSec = Math.round((paceMinPerKm - paceMin) * 60);
        const pace = `${paceMin}:${String(paceSec).padStart(2, '0')}`;
        const timeDisplay = typeof session.time === 'string' ? session.time : minutesToTime(session.time);
        const typeLabels = {
            entrenamiento: 'Entrenamiento',
            series: 'Series',
            carrera: 'Carrera',
            rodaje: 'Entrenamiento',
            'tirada-larga': 'Entrenamiento',
            'ritmo-carrera': 'Carrera'
        };

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
    
    // Selector de año (Distancia total por mes) es independiente del período
    refreshTotalDistanceYearOptions();
    refreshTotalElevationYearOptions();
    refreshTypeYearOptions();
    refreshPaceYearOptions();

    // Actualizar gráficas
    updateCharts(filteredSessions);
}

// Actualizar todas las gráficas
function updateCharts(filteredSessions) {
    updateTotalDistanceYearChart();
    updateTotalElevationYearChart();
    updateTypeYearChart();
    updatePaceYearChart();
    updateActivitiesMonthChart();
}

function formatMonthValue(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function parseMonthValue(value) {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
    const [yy, mm] = value.split('-').map(Number);
    if (!yy || !mm) return null;
    const d = new Date(yy, mm - 1, 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function shiftMonth(d, deltaMonths) {
    const nd = new Date(d);
    nd.setDate(1);
    nd.setMonth(nd.getMonth() + deltaMonths);
    nd.setHours(0, 0, 0, 0);
    return nd;
}

function setupActivitiesMonthSelector() {
    const picker = document.getElementById('activitiesMonthPicker');
    if (!picker) return;

    const saved = localStorage.getItem('activitiesSelectedMonth'); // YYYY-MM
    const parsed = parseMonthValue(saved);
    if (parsed) activitiesSelectedMonth = parsed;

    picker.value = formatMonthValue(activitiesSelectedMonth);

    const prevBtn = document.getElementById('activitiesMonthPrev');
    const nextBtn = document.getElementById('activitiesMonthNext');

    const apply = (newMonth) => {
        activitiesSelectedMonth = newMonth;
        const v = formatMonthValue(activitiesSelectedMonth);
        picker.value = v;
        localStorage.setItem('activitiesSelectedMonth', v);
        updateActivitiesMonthChart();
    };

    picker.addEventListener('change', () => {
        const d = parseMonthValue(picker.value);
        if (d) apply(d);
    });

    if (prevBtn) prevBtn.addEventListener('click', () => apply(shiftMonth(activitiesSelectedMonth, -1)));
    if (nextBtn) nextBtn.addEventListener('click', () => apply(shiftMonth(activitiesSelectedMonth, 1)));
}

function updateActivitiesMonthChart() {
    const ctx = document.getElementById('activitiesChart');
    if (!ctx) return;

    const year = activitiesSelectedMonth.getFullYear();
    const month = activitiesSelectedMonth.getMonth(); // 0-11
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    const data = Array(daysInMonth).fill(0);

    (sessions || []).forEach(s => {
        if (!s || !s.date) return;
        const d = new Date(s.date + 'T00:00:00');
        if (d.getFullYear() !== year || d.getMonth() !== month) return;
        const dayIdx = d.getDate() - 1;
        if (dayIdx < 0 || dayIdx >= data.length) return;
        data[dayIdx] += s.distance || 0;
    });

    if (charts.activitiesChart) charts.activitiesChart.destroy();

    charts.activitiesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Km',
                data,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(255, 255, 255, 0.9)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${(ctx.raw || 0).toFixed(2)} km`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                },
                x: {
                    ticks: {
                        color: 'white',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 16
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                }
            }
        }
    });
}

function getAvailableStatsYears() {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set([currentYear]);
    (sessions || []).forEach(s => {
        if (!s || !s.date) return;
        const y = new Date(s.date + 'T00:00:00').getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
    });
    return { currentYear, years: Array.from(yearsSet).sort((a, b) => b - a) };
}

function setupTotalDistanceYearSelector() {
    const select = document.getElementById('totalDistanceYearSelect');
    if (!select) return;
    const saved = localStorage.getItem('totalDistanceSelectedYear');
    if (saved && /^\d{4}$/.test(saved)) totalDistanceSelectedYear = parseInt(saved, 10);
    select.addEventListener('change', () => {
        const y = parseInt(select.value, 10);
        if (!isNaN(y)) {
            totalDistanceSelectedYear = y;
            localStorage.setItem('totalDistanceSelectedYear', String(y));
            updateTotalDistanceYearChart();
        }
    });
}

function refreshTotalDistanceYearOptions() {
    const select = document.getElementById('totalDistanceYearSelect');
    if (!select) return;
    const { currentYear, years } = getAvailableStatsYears();
    if (!years.includes(totalDistanceSelectedYear)) totalDistanceSelectedYear = years[0] || currentYear;

    const existing = new Set(Array.from(select.options).map(o => parseInt(o.value, 10)));
    const shouldRebuild = years.length !== select.options.length || years.some(y => !existing.has(y));
    if (!shouldRebuild) {
        select.value = String(totalDistanceSelectedYear);
        return;
    }

    select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    select.value = String(totalDistanceSelectedYear);
}

function setupTotalElevationYearSelector() {
    const select = document.getElementById('totalElevationYearSelect');
    if (!select) return;
    const saved = localStorage.getItem('totalElevationSelectedYear');
    if (saved && /^\d{4}$/.test(saved)) totalElevationSelectedYear = parseInt(saved, 10);
    select.addEventListener('change', () => {
        const y = parseInt(select.value, 10);
        if (!isNaN(y)) {
            totalElevationSelectedYear = y;
            localStorage.setItem('totalElevationSelectedYear', String(y));
            updateTotalElevationYearChart();
        }
    });
}

function refreshTotalElevationYearOptions() {
    const select = document.getElementById('totalElevationYearSelect');
    if (!select) return;
    const { currentYear, years } = getAvailableStatsYears();
    if (!years.includes(totalElevationSelectedYear)) totalElevationSelectedYear = years[0] || currentYear;

    const existing = new Set(Array.from(select.options).map(o => parseInt(o.value, 10)));
    const shouldRebuild = years.length !== select.options.length || years.some(y => !existing.has(y));
    if (!shouldRebuild) {
        select.value = String(totalElevationSelectedYear);
        return;
    }

    select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    select.value = String(totalElevationSelectedYear);
}

function setupTypeYearSelector() {
    const select = document.getElementById('typeYearSelect');
    if (!select) return;
    const saved = localStorage.getItem('typeSelectedYear');
    if (saved && /^\d{4}$/.test(saved)) typeSelectedYear = parseInt(saved, 10);
    select.addEventListener('change', () => {
        const y = parseInt(select.value, 10);
        if (!isNaN(y)) {
            typeSelectedYear = y;
            localStorage.setItem('typeSelectedYear', String(y));
            updateTypeYearChart();
        }
    });
}

function refreshTypeYearOptions() {
    const select = document.getElementById('typeYearSelect');
    if (!select) return;
    const { currentYear, years } = getAvailableStatsYears();
    if (!years.includes(typeSelectedYear)) typeSelectedYear = years[0] || currentYear;

    const existing = new Set(Array.from(select.options).map(o => parseInt(o.value, 10)));
    const shouldRebuild = years.length !== select.options.length || years.some(y => !existing.has(y));
    if (!shouldRebuild) {
        select.value = String(typeSelectedYear);
        return;
    }

    select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    select.value = String(typeSelectedYear);
}

function setupPaceYearSelector() {
    const select = document.getElementById('paceYearSelect');
    if (!select) return;
    const saved = localStorage.getItem('paceSelectedYear');
    if (saved && /^\d{4}$/.test(saved)) paceSelectedYear = parseInt(saved, 10);
    select.addEventListener('change', () => {
        const y = parseInt(select.value, 10);
        if (!isNaN(y)) {
            paceSelectedYear = y;
            localStorage.setItem('paceSelectedYear', String(y));
            updatePaceYearChart();
        }
    });
}

function refreshPaceYearOptions() {
    const select = document.getElementById('paceYearSelect');
    if (!select) return;
    const { currentYear, years } = getAvailableStatsYears();
    if (!years.includes(paceSelectedYear)) paceSelectedYear = years[0] || currentYear;

    const existing = new Set(Array.from(select.options).map(o => parseInt(o.value, 10)));
    const shouldRebuild = years.length !== select.options.length || years.some(y => !existing.has(y));
    if (!shouldRebuild) {
        select.value = String(paceSelectedYear);
        return;
    }

    select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    select.value = String(paceSelectedYear);
}

// Gráfica de barras: Distancia total por mes del año seleccionado (independiente del filtro de período)
function updateTotalDistanceYearChart() {
    const ctx = document.getElementById('totalDistanceChart');
    if (!ctx) return;
    
    const labels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    (sessions || []).forEach(s => {
        if (!s || !s.date) return;
        const d = new Date(s.date + 'T00:00:00');
        if (d.getFullYear() !== totalDistanceSelectedYear) return;
        data[d.getMonth()] += s.distance || 0;
    });
    
    if (charts.totalDistanceChart) {
        charts.totalDistanceChart.destroy();
    }
    
    charts.totalDistanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Km (${totalDistanceSelectedYear})`,
                data: data,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(255, 255, 255, 0.9)',
                borderWidth: 1
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
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                },
                x: {
                    ticks: { color: 'white', maxRotation: 45 },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                }
            }
        }
    });
}

// Gráfica de barras: Desnivel acumulado (+/-) por mes del año seleccionado (independiente del filtro de período)
function updateTotalElevationYearChart() {
    const ctx = document.getElementById('totalElevationChart');
    if (!ctx) return;

    const labels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const gainData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const lossData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    (sessions || []).forEach(s => {
        if (!s || !s.date) return;
        const d = new Date(s.date + 'T00:00:00');
        if (d.getFullYear() !== totalElevationSelectedYear) return;
        const m = d.getMonth();
        gainData[m] += s.elevationGain || 0;
        lossData[m] += s.elevationLoss || 0;
    });

    if (charts.totalElevationChart) {
        charts.totalElevationChart.destroy();
    }

    charts.totalElevationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: `Desnivel + (m) (${totalElevationSelectedYear})`,
                data: gainData,
                backgroundColor: 'rgba(16, 185, 129, 0.85)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 2
            }, {
                label: `Desnivel - (m) (${totalElevationSelectedYear})`,
                data: lossData.map(v => -v),
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                borderColor: 'rgb(239, 68, 68)',
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
                    ticks: { color: 'white', maxRotation: 45 },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' }
                }
            }
        }
    });
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
    
    if (charts.distanceChart) {
        charts.distanceChart.destroy();
    }
    
    charts.distanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Distancia (km)',
                data: distances,
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

// Gráfica de tipos de entrenamiento (pie chart) por año (independiente del filtro de período)
function updateTypeYearChart() {
    const ctx = document.getElementById('typeChart');
    if (!ctx) return;
    
    const typeCounts = {
        'entrenamiento': 0,
        'series': 0,
        'carrera': 0
    };
    
    (sessions || []).forEach(session => {
        if (!session || !session.date) return;
        const d = new Date(session.date + 'T00:00:00');
        if (d.getFullYear() !== typeSelectedYear) return;
        const t = (session.type === 'rodaje' || session.type === 'tirada-larga') ? 'entrenamiento' : (session.type === 'ritmo-carrera' ? 'carrera' : session.type);
        if (typeCounts.hasOwnProperty(t)) typeCounts[t]++;
    });
    
    const labels = ['Entrenamiento', 'Series', 'Carrera'];
    const data = [
        typeCounts['entrenamiento'],
        typeCounts['series'],
        typeCounts['carrera']
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

function getSessionTimeMinutes(session) {
    if (!session) return 0;
    if (typeof session.timeInMinutes === 'number' && !isNaN(session.timeInMinutes)) return session.timeInMinutes;
    if (typeof session.time === 'string') return timeToMinutes(session.time);
    if (typeof session.time === 'number') return session.time;
    return 0;
}

// Evolución del ritmo por mes del año seleccionado (independiente del filtro de período)
function updatePaceYearChart() {
    const ctx = document.getElementById('paceChart');
    if (!ctx) return;

    const labels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const totalKmByMonth = Array(12).fill(0);
    const totalMinByMonth = Array(12).fill(0);

    (sessions || []).forEach(s => {
        if (!s || !s.date) return;
        const d = new Date(s.date + 'T00:00:00');
        if (d.getFullYear() !== paceSelectedYear) return;
        const km = s.distance || 0;
        if (km <= 0) return;
        const minutes = getSessionTimeMinutes(s);
        if (minutes <= 0) return;
        const m = d.getMonth();
        totalKmByMonth[m] += km;
        totalMinByMonth[m] += minutes;
    });

    const paceMinPerKm = totalKmByMonth.map((km, i) => (km > 0 ? (totalMinByMonth[i] / km) : null));

    if (charts.paceChart) charts.paceChart.destroy();

    charts.paceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Ritmo (min/km) (${paceSelectedYear})`,
                data: paceMinPerKm,
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
                    ticks: {
                        color: 'white',
                        callback: (value) => {
                            const v = typeof value === 'number' ? value : parseFloat(value);
                            if (!isFinite(v)) return value;
                            const mins = Math.floor(v);
                            const secs = Math.round((v - mins) * 60);
                            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                        }
                    },
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
                backgroundColor: 'rgba(16, 185, 129, 0.85)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 2
            }, {
                label: 'Desnivel - (m)',
                data: elevationLoss.map(v => -v), // Negativo para mostrar hacia abajo
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                borderColor: 'rgb(239, 68, 68)',
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
            // Migrar: campo localizacion desde notes si no existe
            if (!('localizacion' in session) || session.localizacion === undefined) {
                session.localizacion = (session.notes || '').trim();
            }
            return session;
        });
        saveSessions(); // Guardar datos migrados
        renderSessions();
    }
}

// Aplicar actualización: forzar recarga con la nueva versión (evita caché HTTP)
function applyUpdate() {
    sessionStorage.setItem('updateReloadTime', String(Date.now()));
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
        });
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        }).finally(goToFreshPage);
    } else {
        goToFreshPage();
    }
}

function goToFreshPage() {
    const url = window.location.origin + window.location.pathname + '?nocache=' + Date.now();
    window.location.href = url;
}

// Aviso de nueva versión (evita recarga automática y parpadeo 14/15)
function showUpdateBanner(serverVersion) {
    const key = 'updateBannerDismissed';
    if (sessionStorage.getItem(key)) return;
    let el = document.getElementById('updateBanner');
    if (!el) {
        el = document.createElement('div');
        el.id = 'updateBanner';
        el.className = 'update-banner';
        el.innerHTML = '<span class="update-banner-text">Nueva versión disponible<span id="updateBannerVersion"></span>. </span><button type="button" class="update-banner-btn" id="updateBannerBtn">Actualizar ahora</button>';
        document.body.insertBefore(el, document.body.firstChild);
        document.getElementById('updateBannerBtn').addEventListener('click', () => {
            sessionStorage.removeItem('updateReloadTime');
            applyUpdate();
        });
    }
    const verEl = document.getElementById('updateBannerVersion');
    if (verEl) verEl.textContent = serverVersion ? ` (v${serverVersion})` : '';
    el.style.display = 'flex';
}

// Configurar verificación de versiones (sin recarga automática para evitar parpadeo)
function setupVersionCheck() {
    const versionElement = document.getElementById('currentVersion');
    if (!versionElement) return;

    versionElement.textContent = `v${currentAppVersion}`;

    // No intentar applyUpdate justo después de una recarga por actualización (evita bucle)
    const reloadTime = sessionStorage.getItem('updateReloadTime');
    if (reloadTime && (Date.now() - parseInt(reloadTime, 10)) < 45000) {
        versionElement.textContent = `v${currentAppVersion} ✓`;
        versionElement.style.color = 'var(--secondary-color)';
        return;
    }
    sessionStorage.removeItem('updateReloadTime');

    fetch('./version.json?' + Date.now(), { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(versionData => {
            if (!versionData || !versionData.version) return;
            const serverVersion = versionData.version;
            if (compareVersions(serverVersion, currentAppVersion) > 0) {
                showUpdateBanner(serverVersion);
                return;
            }
            versionElement.textContent = `v${currentAppVersion} ✓`;
            versionElement.style.color = 'var(--secondary-color)';
        })
        .catch(() => {});

    setInterval(() => {
        fetch('./version.json?' + Date.now(), { cache: 'no-store' })
            .then(res => res.ok ? res.json() : null)
            .then(versionData => {
                if (!versionData || !versionData.version) return;
                const serverVersion = versionData.version;
                if (compareVersions(serverVersion, currentAppVersion) > 0) showUpdateBanner(serverVersion);
            })
            .catch(() => {});
    }, 3600000);
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
                    registration.update();
                    // No recargar automáticamente: evita parpadeo 14/15. Mostrar aviso y que el usuario pulse Actualizar.
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        showUpdateBanner();
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
        <p>¿Instalar RunCode como app?</p>
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
