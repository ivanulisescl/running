// Estado de la aplicación
let sessions = [];
let currentAppVersion = '1.2.33'; // Versión actual de la app
let editingSessionId = null; // ID de la sesión que se está editando (null si no hay ninguna)
let currentStatsPeriod = 'all'; // Período actual para las estadísticas: 'all', 'week', 'month', 'year'
let historyViewMode = 'detailed'; // 'detailed' | 'compact' para el historial de sesiones
let historyTypeFilter = ''; // '' = todos, 'entrenamiento' | 'series' | 'carrera'
let charts = {}; // Objeto para almacenar las instancias de las gráficas
let equipmentList = []; // Lista de equipos disponibles
let marcas = []; // Mejores marcas por carrera (id = session id de tipo carrera)
let records = []; // Récords (incluidos en runmetrics.json)
const RUNMETRICS_FILENAME = 'runmetrics.json';
let planningPlans = []; // Planificaciones por carrera
let selectedPlanningPlanId = null; // ID del plan seleccionado
const PLANNING_PLANS_STORAGE_KEY = 'runningPlanningPlans';
const PLANNING_SELECTED_PLAN_STORAGE_KEY = 'runningPlanningSelectedPlanId';
let planningEditingPlanId = null; // ID del plan en edición (null = nuevo)
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
    loadPlanningPlans();
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
    setupPlanningSection();
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
    records: { btnId: 'recordsBtn', sectionId: 'recordsSection' },
    planning: { btnId: 'planningBtn', sectionId: 'planningSection' }
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
    ['newSessionBtn', 'statsBtn', 'historyBtn', 'equipmentBtn', 'marcasBtn', 'recordsBtn', 'planningBtn'].forEach(id => {
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
    const planningBtn = document.getElementById('planningBtn');
    const statsSection = document.getElementById('statsSection');
    const historySection = document.getElementById('historySection');
    const equipmentSection = document.getElementById('equipmentSection');
    const recordsSection = document.getElementById('recordsSection');
    const planningSection = document.getElementById('planningSection');

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
    if (planningBtn && planningSection) {
        planningBtn.addEventListener('click', () => {
            toggleSection('planningSection');
            setActiveNavButton(planningSection.style.display !== 'none' ? 'planningBtn' : null);
            if (planningSection.style.display !== 'none') renderPlanning();
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

        const hasPlanning = !!(data.planning && typeof data.planning === 'object');
        if (!sessionsArr.length && !carrerasArr.length && !recordsArr.length && !hasPlanning) {
            throw new Error(`Archivo inválido: faltan sessions/carreras/records/planning en ${RUNMETRICS_FILENAME}`);
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
        (Array.isArray(records) && records.length > 0) ||
        (Array.isArray(planningPlans) && planningPlans.length > 0);
    if (hasLocal) return;

    try {
        const data = await fetchRunmetricsFromRepo();
        const { sessionsArr, carrerasArr, recordsArr } = coerceRunmetricsPayload(data);

        sessions = (sessionsArr || [])
            .map(normalizeSessionFromExternal)
            .filter(Boolean);
        marcas = (carrerasArr || []).filter(Boolean).map(m => ({ ...m }));
        records = (recordsArr || []).filter(Boolean).map(r => ({ ...r }));
        if (data && typeof data === 'object' && data.planning && typeof data.planning === 'object') {
            const plansRaw = Array.isArray(data.planning.plans) ? data.planning.plans : [];
            planningPlans = plansRaw.map(normalizePlanningPlan).filter(Boolean);
            selectedPlanningPlanId = data.planning.selectedPlanId ? Number(data.planning.selectedPlanId) : null;
            if (!selectedPlanningPlanId || !planningPlans.some(p => p.id === selectedPlanningPlanId)) {
                selectedPlanningPlanId = planningPlans.length ? planningPlans[planningPlans.length - 1].id : null;
            }
        }
        if (data && typeof data === 'object' && Array.isArray(data.equipment)) {
            equipmentList = data.equipment.map(item => {
                const name = typeof item === 'string' ? item : (item.name || '');
                const estado = typeof item === 'object' && item.estado ? item.estado : 'Activo';
                const kilometros = typeof item === 'object' && typeof item.kilometros === 'number' ? item.kilometros : 0;
                const desde = typeof item === 'object' && item.desde && /^\d{4}-\d{2}-\d{2}$/.test(String(item.desde))
                    ? item.desde
                    : (getDefaultDesdeForEquipmentName(name) || new Date().toISOString().split('T')[0]);
                const limiteKm = typeof item === 'object' && typeof item.limiteKm === 'number' && item.limiteKm > 0
                    ? item.limiteKm
                    : getDefaultLimiteKmForEquipmentName(name);
                return { name, kilometros, estado, desde, limiteKm };
            });
        }

        saveSessions();
        saveMarcas();
        saveRecords();
        savePlanningPlans();
        if (data && typeof data === 'object' && Array.isArray(data.equipment)) saveEquipment();

        renderSessions();
        renderEquipmentList();
        updateEquipmentSelect();
        updateStats();
        renderMarcas();
        renderPlanning();
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

// Fechas "desde" por defecto para equipos conocidos (nombre contiene la clave)
const EQUIPMENT_DESDE_DEFAULTS = [
    { match: (n) => /nimbus\s*25|25\s*negras/i.test(n), desde: '2023-07-30' },
    { match: (n) => /nimbus\s*26|26\s*azules/i.test(n), desde: '2024-09-24' },
    { match: (n) => /hokka|bondi\s*9/i.test(n), desde: '2025-08-02' }
];

function getDefaultDesdeForEquipmentName(name) {
    const n = (name || '').trim();
    for (const { match, desde } of EQUIPMENT_DESDE_DEFAULTS) {
        if (match(n)) return desde;
    }
    return null;
}

function getEquipmentDesde(eq) {
    const item = typeof eq === 'object' && eq !== null ? eq : null;
    if (item && item.desde && /^\d{4}-\d{2}-\d{2}$/.test(String(item.desde))) return item.desde;
    const name = getEquipmentName(eq);
    return getDefaultDesdeForEquipmentName(name) || '1970-01-01';
}

// Límite de km por defecto: Nimbus negras 700, resto 800
const EQUIPMENT_LIMITE_KM_DEFAULT = 800;
function getDefaultLimiteKmForEquipmentName(name) {
    const n = (name || '').trim();
    if (/nimbus\s*25|25\s*negras/i.test(n)) return 700;
    return EQUIPMENT_LIMITE_KM_DEFAULT;
}

function getEquipmentLimiteKm(eq) {
    const item = typeof eq === 'object' && eq !== null ? eq : null;
    if (item && typeof item.limiteKm === 'number' && item.limiteKm > 0) return item.limiteKm;
    return getDefaultLimiteKmForEquipmentName(getEquipmentName(eq));
}

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
                const desde = getDefaultDesdeForEquipmentName(name) || new Date().toISOString().split('T')[0];
                const limiteKm = getDefaultLimiteKmForEquipmentName(name);
                return { name, kilometros: 0, estado, desde, limiteKm };
            }
            if (item.kilometros === undefined || typeof item.kilometros !== 'number') item.kilometros = 0;
            if (!item.estado) item.estado = 'Activo';
            if (!item.desde) item.desde = getDefaultDesdeForEquipmentName(item.name) || new Date().toISOString().split('T')[0];
            if (typeof item.limiteKm !== 'number' || item.limiteKm <= 0) item.limiteKm = getDefaultLimiteKmForEquipmentName(item.name);
            return item;
        });
        saveEquipment();
    } else {
        // Equipos iniciales por defecto (desde: cuándo se empezó a usar)
        equipmentList = [
            { name: 'Asics Gel Nimbus 25 Negras', kilometros: 0, estado: 'Retirado', desde: '2023-07-30', limiteKm: 700 },
            { name: 'Asics Gel Nimbus 26 Azules', kilometros: 0, estado: 'Retirado', desde: '2024-09-24', limiteKm: 800 },
            { name: 'Hokka Bondi 9 Grises', kilometros: 0, estado: 'Activo por defecto', desde: '2025-08-02', limiteKm: 800 }
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
    
    const hoy = new Date().toISOString().split('T')[0];
    const desde = getDefaultDesdeForEquipmentName(equipmentName) || hoy;
    const limiteKm = getDefaultLimiteKmForEquipmentName(equipmentName);
    equipmentList.push({ name: equipmentName, kilometros: 0, estado: 'Activo', desde, limiteKm });
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
        const desde = getDefaultDesdeForEquipmentName(eq) || new Date().toISOString().split('T')[0];
        const limiteKm = getDefaultLimiteKmForEquipmentName(eq);
        equipmentList[index] = { name: eq, kilometros: 0, estado: 'Activo', desde, limiteKm };
    }
    const item = equipmentList[index];
    if (field === 'estado') item.estado = value;
    saveEquipment();
    updateEquipmentSelect();
}

// Renderizar lista de equipos (orden: de más reciente a más antigua por "desde")
function renderEquipmentList() {
    const container = document.getElementById('equipmentList');
    if (!container) return;
    
    if (equipmentList.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay equipos registrados. Añade tu primer equipo.</p>';
        return;
    }
    
    const withIndex = equipmentList.map((equipment, index) => ({ equipment, index }));
    withIndex.sort((a, b) => getEquipmentDesde(b.equipment).localeCompare(getEquipmentDesde(a.equipment)));
    
    container.innerHTML = withIndex.map(({ equipment, index }) => {
        const name = getEquipmentName(equipment);
        const stats = getEquipmentStatsFromSessions(name);
        const estado = typeof equipment === 'object' ? (equipment.estado || 'Activo') : 'Activo';
        const info = parseEquipmentInfo(name);
        const desdeIso = getEquipmentDesde(equipment);
        const desdeLabel = desdeIso && desdeIso !== '1970-01-01' ? formatDate(desdeIso) : '—';
        const limiteKm = getEquipmentLimiteKm(equipment);
        const kmRealizados = stats.kilometros;
        const progressPct = limiteKm > 0 ? Math.min(100, (kmRealizados / limiteKm) * 100) : 0;
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
                    <div class="equipment-desde">
                        <span class="desde-label">Desde:</span>
                        <span class="desde-value">${escapeHtml(desdeLabel)}</span>
                    </div>
                    <div class="equipment-progress-wrap" title="${escapeHtml(kmRealizados.toFixed(1))} / ${escapeHtml(String(limiteKm))} km">
                        <div class="equipment-progress-bar" role="progressbar" aria-valuenow="${progressPct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
                            <div class="equipment-progress-fill" style="width: ${progressPct.toFixed(1)}%"></div>
                            <span class="equipment-progress-pct">${progressPct.toFixed(0)}%</span>
                        </div>
                        <div class="equipment-progress-labels">
                            <span class="equipment-progress-limit">Límite: ${escapeHtml(String(limiteKm))} km</span>
                        </div>
                    </div>
                    <div class="equipment-stats-row">
                        <div class="equipment-stat">
                            <span class="equipment-stat-label">Kilómetros:</span>
                            <span class="equipment-stat-value">${stats.kilometros.toFixed(1)}</span>
                        </div>
                        <div class="equipment-stat">
                            <span class="equipment-stat-label">Nº actividades:</span>
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
                        <div class="marca-card-stat marca-card-km">
                            <span class="marca-card-stat-label">Distancia:</span>
                            <span class="marca-card-stat-value"><strong>${session.distance}</strong> km</span>
                        </div>
                        <div class="marca-card-stat">
                            <span class="marca-card-stat-label">Tiempo:</span>
                            <span class="marca-card-stat-value"><strong>${timeDisplay}</strong></span>
                        </div>
                        <div class="marca-card-stat">
                            <span class="marca-card-stat-label">Ritmo:</span>
                            <span class="marca-card-stat-value"><strong>${paceText}</strong><span class="marca-card-stat-unit">/km</span></span>
                        </div>
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
                    <div class="marca-card-stat marca-card-km">
                        <span class="marca-card-stat-label">Distancia:</span>
                        <span class="marca-card-stat-value"><strong>${session.distance}</strong> km</span>
                    </div>
                    <div class="marca-card-stat">
                        <span class="marca-card-stat-label">Tiempo:</span>
                        <span class="marca-card-stat-value"><strong>${timeDisplay}</strong></span>
                    </div>
                    <div class="marca-card-stat">
                        <span class="marca-card-stat-label">Ritmo:</span>
                        <span class="marca-card-stat-value"><strong>${paceText}</strong><span class="marca-card-stat-unit">/km</span></span>
                    </div>
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

        if (data && typeof data === 'object' && data.planning && typeof data.planning === 'object') {
            const plansRaw = Array.isArray(data.planning.plans) ? data.planning.plans : [];
            planningPlans = plansRaw.map(normalizePlanningPlan).filter(Boolean);
            selectedPlanningPlanId = data.planning.selectedPlanId ? Number(data.planning.selectedPlanId) : null;
            if (!selectedPlanningPlanId || !planningPlans.some(p => p.id === selectedPlanningPlanId)) {
                selectedPlanningPlanId = planningPlans.length ? planningPlans[planningPlans.length - 1].id : null;
            }
        } else {
            planningPlans = [];
            selectedPlanningPlanId = null;
        }
        if (data && typeof data === 'object' && Array.isArray(data.equipment)) {
            equipmentList = data.equipment.map(item => {
                const name = typeof item === 'string' ? item : (item.name || '');
                const estado = typeof item === 'object' && item.estado ? item.estado : 'Activo';
                const kilometros = typeof item === 'object' && typeof item.kilometros === 'number' ? item.kilometros : 0;
                const desde = typeof item === 'object' && item.desde && /^\d{4}-\d{2}-\d{2}$/.test(String(item.desde))
                    ? item.desde
                    : (getDefaultDesdeForEquipmentName(name) || new Date().toISOString().split('T')[0]);
                const limiteKm = typeof item === 'object' && typeof item.limiteKm === 'number' && item.limiteKm > 0
                    ? item.limiteKm
                    : getDefaultLimiteKmForEquipmentName(name);
                return { name, kilometros, estado, desde, limiteKm };
            });
            saveEquipment();
        }

        saveSessions();
        saveMarcas();
        saveRecords();
        savePlanningPlans();

        renderSessions();
        renderEquipmentList();
        updateEquipmentSelect();
        updateStats();
        renderMarcas();
        renderRecords();
        renderPlanning();

        if (syncStatus) {
            syncStatus.style.display = 'block';
            syncStatus.innerHTML =
                `<p style="color: var(--secondary-color);">✅ Resetear hecho desde <code>${RUNMETRICS_FILENAME}</code>. ` +
                `Sesiones: ${sessions.length}. Carreras: ${marcas.length}. Récords: ${records.length}. Planificaciones: ${planningPlans.length}. Equipos: ${equipmentList.length}.</p>`;
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
            records: records || [],
            planning: {
                plans: planningPlans || [],
                selectedPlanId: selectedPlanningPlanId || null
            },
            equipment: (equipmentList || []).map(eq => {
                const name = getEquipmentName(eq);
                const stats = getEquipmentStatsFromSessions(name);
                const item = typeof eq === 'object' && eq !== null ? { ...eq } : { name: String(eq), kilometros: 0, estado: 'Activo' };
                if (!item.desde) item.desde = getEquipmentDesde(eq);
                if (typeof item.limiteKm !== 'number' || item.limiteKm <= 0) item.limiteKm = getEquipmentLimiteKm(eq);
                item.numActividades = stats.actividades;
                return item;
            })
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
            if (data && typeof data === 'object' && data.planning && typeof data.planning === 'object') {
                const plansRaw = Array.isArray(data.planning.plans) ? data.planning.plans : [];
                planningPlans = plansRaw.map(normalizePlanningPlan).filter(Boolean);
                selectedPlanningPlanId = data.planning.selectedPlanId ? Number(data.planning.selectedPlanId) : null;
                if (!selectedPlanningPlanId || !planningPlans.some(p => p.id === selectedPlanningPlanId)) {
                    selectedPlanningPlanId = planningPlans.length ? planningPlans[planningPlans.length - 1].id : null;
                }
            } else {
                planningPlans = [];
                selectedPlanningPlanId = null;
            }
            if (data && typeof data === 'object' && Array.isArray(data.equipment)) {
                equipmentList = data.equipment.map(item => {
                    const name = typeof item === 'string' ? item : (item.name || '');
                    const estado = typeof item === 'object' && item.estado ? item.estado : 'Activo';
                    const kilometros = typeof item === 'object' && typeof item.kilometros === 'number' ? item.kilometros : 0;
                    const desde = typeof item === 'object' && item.desde && /^\d{4}-\d{2}-\d{2}$/.test(String(item.desde))
                        ? item.desde
                        : (getDefaultDesdeForEquipmentName(name) || new Date().toISOString().split('T')[0]);
                    const limiteKm = typeof item === 'object' && typeof item.limiteKm === 'number' && item.limiteKm > 0
                        ? item.limiteKm
                        : getDefaultLimiteKmForEquipmentName(name);
                    return { name, kilometros, estado, desde, limiteKm };
                });
            }

            saveSessions();
            saveMarcas();
            saveRecords();
            savePlanningPlans();
            if (data && typeof data === 'object' && Array.isArray(data.equipment)) saveEquipment();

            // Refresh UI
            renderSessions();
            renderEquipmentList();
            updateEquipmentSelect();
            updateStats();
            renderMarcas();
            const recordsSection = document.getElementById('recordsSection');
            if (recordsSection && recordsSection.style.display !== 'none') renderRecords();
            renderPlanning();

            if (syncStatus) {
                syncStatus.innerHTML = `<p style="color: var(--secondary-color);">✅ Importado <code>${RUNMETRICS_FILENAME}</code> (reemplazado). Sesiones: ${sessions.length}. Carreras: ${marcas.length}. Récords: ${records.length}. Planificaciones: ${planningPlans.length}. Equipos: ${equipmentList.length}.</p>`;
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
                    <div class="session-compact-row session-compact-row-date">${formattedDate}</div>
                    <div class="session-compact-row session-compact-row-info">
                        <span class="session-compact-location">${location ? escapeHtml(location) : '—'}</span>
                        <span class="session-compact-km">${session.distance} km</span>
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
    // Si planificación está abierta, refrescar el marcado de entrenado
    const planningSection = document.getElementById('planningSection');
    if (planningSection && planningSection.style.display !== 'none') renderPlanning();
}

function normalizePlanningSessionType(type) {
    const t = String(type || '').toLowerCase().trim();
    if (t === 'series' || t === 'serie') return 'series';
    if (t === 'carrera') return 'carrera';
    return 'entrenamiento';
}

const PLANNING_RACE_KEY = 'RACE';
function planningKey(weekIndex, dayIndex) {
    return `W${weekIndex}D${dayIndex}`;
}

function normalizePlanningCell(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const plannedKm = raw.plannedKm === null || raw.plannedKm === undefined ? null : Number(raw.plannedKm);
    const type = normalizePlanningSessionType(raw.type);
    if (plannedKm !== null && (!Number.isFinite(plannedKm) || plannedKm < 0)) return null;
    return { plannedKm, type };
}

function normalizePlanningSchedule(rawSchedule, weeks, daysPerWeek) {
    if (!Array.isArray(rawSchedule)) return null;
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) return null;
    if (!Number.isFinite(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) return null;

    const schedule = [];
    for (let w = 0; w < weeks; w++) {
        const row = rawSchedule[w];
        if (!Array.isArray(row)) return null;
        const outRow = [];
        for (let d = 0; d < daysPerWeek; d++) {
            const cell = normalizePlanningCell(row[d] || {});
            if (!cell) return null;
            outRow.push(cell);
        }
        schedule.push(outRow);
    }
    return schedule;
}

function normalizePlanningPlan(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = Number(raw.id);
    const raceName = typeof raw.raceName === 'string' ? raw.raceName.trim() : '';
    const weeks = Number(raw.weeks);
    const daysPerWeek = Number(raw.daysPerWeek ?? (Array.isArray(raw.dayTemplates) ? raw.dayTemplates.length : (raw.schedule?.[0]?.length)));
    const startDate = typeof raw.startDate === 'string' ? raw.startDate : '';
    const raceDate = typeof raw.raceDate === 'string' ? raw.raceDate : '';
    const raceDistanceKm = (raw.raceDistanceKm === null || raw.raceDistanceKm === undefined || raw.raceDistanceKm === '')
        ? null
        : Number(raw.raceDistanceKm);
    if (!Number.isFinite(id) || id <= 0) return null;
    if (!raceName) return null;
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) return null;
    if (!Number.isFinite(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raceDate)) return null;
    if (raceDistanceKm !== null && (!Number.isFinite(raceDistanceKm) || raceDistanceKm < 0)) return null;

    // schedule (nuevo formato). Migrar desde dayTemplates o desde legacy.
    let schedule = null;
    if (Array.isArray(raw.schedule)) {
        schedule = normalizePlanningSchedule(raw.schedule, weeks, daysPerWeek);
    }
    if (!schedule && Array.isArray(raw.dayTemplates)) {
        // Migración de formato anterior "template": repetir en todas las semanas
        const templates = raw.dayTemplates
            .map((t, idx) => {
                const plannedKm = t?.plannedKm === null || t?.plannedKm === undefined ? 0 : Number(t.plannedKm);
                const type = normalizePlanningSessionType(t?.type);
                if (!Number.isFinite(plannedKm) || plannedKm < 0) return null;
                return { plannedKm, type };
            })
            .filter(Boolean);
        if (templates.length !== daysPerWeek) return null;
        schedule = Array.from({ length: weeks }, () => templates.map(c => ({ ...c })));
    }
    if (!schedule) {
        // legacy: daysPerWeek + sessionType
        const sessionType = normalizePlanningSessionType(raw.sessionType);
        const baseRow = Array.from({ length: daysPerWeek }, () => ({ plannedKm: 0, type: sessionType }));
        schedule = Array.from({ length: weeks }, () => baseRow.map(c => ({ ...c })));
    }

    // assignments: { key -> sessionId }
    const assignmentsRaw = raw.assignments && typeof raw.assignments === 'object' ? raw.assignments : {};
    const assignments = {};
    Object.keys(assignmentsRaw).forEach(k => {
        const v = Number(assignmentsRaw[k]);
        if (Number.isFinite(v) && v > 0) assignments[k] = v;
    });

    return {
        id,
        raceName,
        weeks,
        daysPerWeek,
        startDate,
        raceDate,
        raceDistanceKm: raceDistanceKm === null ? null : Number(raceDistanceKm.toFixed(1)),
        schedule,
        assignments
    };
}

function hardcodedHalfMarathon12w3dSchedule() {
    // Plan 12 semanas × 3 días (tabla de referencia del usuario). Semana 12: taper + 21.1 km.
    const day1 = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.0, 8.0, 8.0, 8.0, 6.5];
    const day2 = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.0, 8.0, 8.0, 8.0, 3.0];
    const day3 = [7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 21.1];
    return Array.from({ length: 12 }, (_, i) => ([
        { plannedKm: day1[i], type: 'entrenamiento' },
        { plannedKm: day2[i], type: 'series' },
        { plannedKm: day3[i], type: i === 11 ? 'carrera' : 'entrenamiento' }
    ]));
}

function hardcodedHalfMarathon14w3dSchedule() {
    // Plan 14 semanas × 3 días (editable después).
    const day1 = [7.3, 6.0, 6.0, 6.5, 8.0, 8.0, 6.0, 7.5, 7.5, 8.0, 8.0, 8.0, 8.0, 6.5];
    const day2 = [7.2, 6.0, 6.0, 6.5, 6.0, 6.0, 3.0, 7.5, 7.5, 8.0, 8.0, 8.0, 8.0, 3.0];
    const day3 = [6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 11.8, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 21.1];
    return Array.from({ length: 14 }, (_, i) => ([
        { plannedKm: day1[i], type: 'entrenamiento' },
        { plannedKm: day2[i], type: 'series' },
        { plannedKm: day3[i], type: 'entrenamiento' }
    ]));
}

function generateBaseSchedule(weeks, daysPerWeek, raceDistanceKm) {
    const W = Math.max(1, Math.min(52, Number(weeks) || 1));
    const D = Math.max(1, Math.min(7, Number(daysPerWeek) || 1));
    const dist = (raceDistanceKm === null || raceDistanceKm === undefined || raceDistanceKm === '')
        ? null
        : Number(raceDistanceKm);

    // Plan 12 semanas × 3 días (tabla de referencia del usuario)
    if (W === 12 && D === 3 && (dist === null || Math.abs(dist - 21.1) < 0.3)) {
        return hardcodedHalfMarathon12w3dSchedule();
    }
    // Plan 14 semanas × 3 días
    if (W === 14 && D === 3 && (dist === null || Math.abs(dist - 21.1) < 0.3)) {
        return hardcodedHalfMarathon14w3dSchedule();
    }

    // Genérico: progresión suave, último día más largo. Mínimos razonables para no proponer 3–4 km.
    const MIN_KM_SHORT = 5;   // mínimo por día corto (evita 3.7 km en semana 1)
    const MIN_KM_LONG = 6;    // mínimo tirada larga
    const baseWeekly = Math.max(20, computeBaselineWeeklyKm()); // base mínima 20 km/sem para semana 1
    const schedule = [];
    for (let w = 0; w < W; w++) {
        const factor = Math.min(1.55, 1 + 0.05 * w);
        const weeklyKm = baseWeekly * factor;
        const row = [];
        for (let d = 0; d < D; d++) {
            const isLong = d === D - 1;
            let km = isLong ? weeklyKm * 0.38 : (weeklyKm * 0.62) / Math.max(1, D - 1);
            km = isLong ? Math.max(MIN_KM_LONG, km) : Math.max(MIN_KM_SHORT, km);
            row.push({
                plannedKm: Number(km.toFixed(1)),
                type: (d === 1 && D >= 3) ? 'series' : 'entrenamiento'
            });
        }
        schedule.push(row);
    }
    // Si hay distancia de carrera, aproximar el último día de la última semana
    if (dist && schedule.length) {
        schedule[W - 1][D - 1].plannedKm = Number(dist.toFixed(1));
        schedule[W - 1][D - 1].type = 'carrera';
    }
    return schedule;
}

function loadPlanningPlans() {
    const saved = localStorage.getItem(PLANNING_PLANS_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                planningPlans = parsed.map(normalizePlanningPlan).filter(Boolean);
            }
        } catch (_) {
            planningPlans = [];
        }
    }
    const selected = localStorage.getItem(PLANNING_SELECTED_PLAN_STORAGE_KEY);
    selectedPlanningPlanId = selected ? Number(selected) : null;
    if (!selectedPlanningPlanId || !planningPlans.some(p => p.id === selectedPlanningPlanId)) {
        selectedPlanningPlanId = planningPlans.length ? planningPlans[planningPlans.length - 1].id : null;
    }
}

function savePlanningPlans() {
    localStorage.setItem(PLANNING_PLANS_STORAGE_KEY, JSON.stringify(planningPlans));
    if (selectedPlanningPlanId) {
        localStorage.setItem(PLANNING_SELECTED_PLAN_STORAGE_KEY, String(selectedPlanningPlanId));
    } else {
        localStorage.removeItem(PLANNING_SELECTED_PLAN_STORAGE_KEY);
    }
}

function getSelectedPlanningPlan() {
    if (!selectedPlanningPlanId) return null;
    return planningPlans.find(p => p.id === selectedPlanningPlanId) || null;
}

function setupPlanningSection() {
    const select = document.getElementById('planningPlanSelect');
    const newBtn = document.getElementById('planningNewBtn');
    const editBtn = document.getElementById('planningEditBtn');
    const delBtn = document.getElementById('planningDeleteBtn');
    const formCard = document.getElementById('planningFormCard');
    const cancelBtn = document.getElementById('planningCancelBtn');
    const form = document.getElementById('planningForm');
    const scheduleGrid = document.getElementById('planningScheduleGrid');
    const generateBtn = document.getElementById('planningGenerateBtn');
    const formTitle = document.getElementById('planningFormTitle');
    const submitBtn = document.getElementById('planningSubmitBtn');

    if (!select || !newBtn || !editBtn || !delBtn || !formCard || !cancelBtn || !form || !scheduleGrid || !generateBtn || !formTitle || !submitBtn) return;

    const startInput = document.getElementById('planningStartDate');
    const raceInput = document.getElementById('planningRaceDate');
    const daysPerWeekInput = document.getElementById('planningDaysPerWeek');
    const weeksInput = document.getElementById('planningWeeks');
    const distanceInput = document.getElementById('planningRaceDistanceKm');

    // Defaults de fechas
    const today = new Date().toISOString().split('T')[0];
    if (startInput && !startInput.value) startInput.value = today;
    if (raceInput && !raceInput.value) {
        const d = new Date();
        d.setDate(d.getDate() + 56); // 8 semanas por defecto
        raceInput.value = d.toISOString().split('T')[0];
    }

    const readScheduleFromGrid = () => {
        const W = Math.max(1, Math.min(52, Number(weeksInput?.value) || 1));
        const D = Math.max(1, Math.min(7, Number(daysPerWeekInput?.value) || 1));
        const schedule = Array.from({ length: W }, () => Array.from({ length: D }, () => ({ plannedKm: 0, type: 'entrenamiento' })));
        const cells = Array.from(scheduleGrid.querySelectorAll('.planning-schedule-cell'));
        cells.forEach(cell => {
            const w = Number(cell.getAttribute('data-week'));
            const d = Number(cell.getAttribute('data-day'));
            const kmRaw = cell.querySelector('input')?.value;
            const typeRaw = cell.querySelector('select')?.value;
            if (!Number.isFinite(w) || !Number.isFinite(d)) return;
            if (w < 1 || w > W || d < 1 || d > D) return;
            const plannedKm = (kmRaw === '' || kmRaw === null || kmRaw === undefined) ? 0 : Number(kmRaw);
            schedule[w - 1][d - 1] = {
                plannedKm: Number.isFinite(plannedKm) ? plannedKm : 0,
                type: normalizePlanningSessionType(typeRaw)
            };
        });
        return schedule;
    };

    const renderScheduleGrid = (W, D, schedule) => {
        const weeks = Math.max(1, Math.min(52, Number(W) || 1));
        const days = Math.max(1, Math.min(7, Number(D) || 1));
        const safeSchedule = normalizePlanningSchedule(schedule, weeks, days) || generateBaseSchedule(weeks, days, distanceInput?.value || null);

        const theadDays = Array.from({ length: days }, (_, i) => `<th>Día ${i + 1}</th>`).join('');
        const tbody = Array.from({ length: weeks }, (_, wi) => {
            const tds = Array.from({ length: days }, (_, di) => {
                const cell = safeSchedule[wi]?.[di] || { plannedKm: 0, type: 'entrenamiento' };
                const km = (cell.plannedKm ?? 0);
                const type = normalizePlanningSessionType(cell.type);
                return `
                    <td>
                        <div class="planning-schedule-cell" data-week="${wi + 1}" data-day="${di + 1}">
                            <input type="number" step="0.1" min="0" value="${escapeHtml(String(km))}">
                            <select>
                                <option value="entrenamiento" ${type === 'entrenamiento' ? 'selected' : ''}>Entrenamiento</option>
                                <option value="series" ${type === 'series' ? 'selected' : ''}>Series</option>
                                <option value="carrera" ${type === 'carrera' ? 'selected' : ''}>Carrera</option>
                            </select>
                        </div>
                    </td>
                `;
            }).join('');
            return `<tr><td class="planning-schedule-weekcell">Semana ${wi + 1}</td>${tds}</tr>`;
        }).join('');

        scheduleGrid.innerHTML = `
            <div class="planning-schedule-grid">
                <table class="planning-schedule-table">
                    <thead>
                        <tr>
                            <th>Semana</th>
                            ${theadDays}
                        </tr>
                    </thead>
                    <tbody>
                        ${tbody}
                    </tbody>
                </table>
            </div>
        `;
    };

    const currentDims = () => {
        const W = Math.max(1, Math.min(52, Number(weeksInput?.value) || 1));
        const D = Math.max(1, Math.min(7, Number(daysPerWeekInput?.value) || 1));
        return { W, D };
    };

    // Inicializar grid con valores por defecto
    const initW = weeksInput?.value ? Number(weeksInput.value) : 12;
    const initD = daysPerWeekInput?.value ? Number(daysPerWeekInput.value) : 3;
    renderScheduleGrid(initW, initD, null);

    const refreshSelect = () => {
        select.innerHTML = `<option value="">— Selecciona una planificación —</option>` +
            planningPlans
                .slice()
                .sort((a, b) => a.raceDate.localeCompare(b.raceDate))
                .map(p => {
                    const label = `${p.raceName} · ${p.startDate} → ${p.raceDate}`;
                    const selectedAttr = (p.id === selectedPlanningPlanId) ? 'selected' : '';
                    return `<option value="${p.id}" ${selectedAttr}>${escapeHtml(label)}</option>`;
                })
                .join('');
    };

    refreshSelect();

    select.addEventListener('change', () => {
        const v = select.value ? Number(select.value) : null;
        selectedPlanningPlanId = (v && Number.isFinite(v)) ? v : null;
        savePlanningPlans();
        if (selectedPlanningPlanId) formCard.style.display = 'none';
        planningEditingPlanId = null;
        renderPlanning();
    });

    const openFormForNew = () => {
        planningEditingPlanId = null;
        form.reset();
        formTitle.textContent = 'Nueva planificación';
        submitBtn.textContent = 'Crear planificación';
        if (startInput) startInput.value = today;
        if (raceInput) {
            const d = new Date();
            d.setDate(d.getDate() + 56);
            raceInput.value = d.toISOString().split('T')[0];
        }
        if (weeksInput && !weeksInput.value) weeksInput.value = '12';
        if (daysPerWeekInput && !daysPerWeekInput.value) daysPerWeekInput.value = '3';
        renderScheduleGrid(currentDims().W, currentDims().D, null);
        formCard.style.display = 'block';
        select.value = '';
        selectedPlanningPlanId = null;
        savePlanningPlans();
        renderPlanning();
    };

    const openFormForEdit = (plan) => {
        if (!plan) return;
        planningEditingPlanId = plan.id;
        formTitle.textContent = 'Editar planificación';
        submitBtn.textContent = 'Guardar cambios';
        document.getElementById('planningRaceName').value = plan.raceName || '';
        weeksInput.value = String(plan.weeks || 1);
        daysPerWeekInput.value = String(plan.daysPerWeek || (plan.schedule?.[0]?.length || 1));
        if (startInput) startInput.value = plan.startDate || today;
        if (raceInput) raceInput.value = plan.raceDate || today;
        if (distanceInput) distanceInput.value = plan.raceDistanceKm === null || plan.raceDistanceKm === undefined ? '' : String(plan.raceDistanceKm);
        renderScheduleGrid(plan.weeks, plan.daysPerWeek, plan.schedule);
        formCard.style.display = 'block';
    };

    newBtn.addEventListener('click', () => {
        openFormForNew();
    });

    editBtn.addEventListener('click', () => {
        const plan = getSelectedPlanningPlan();
        if (!plan) return alert('Selecciona una planificación para editar.');
        openFormForEdit(plan);
    });

    cancelBtn.addEventListener('click', () => {
        formCard.style.display = 'none';
        planningEditingPlanId = null;
        refreshSelect();
        renderPlanning();
    });

    delBtn.addEventListener('click', () => {
        const plan = getSelectedPlanningPlan();
        if (!plan) {
            alert('Selecciona una planificación para eliminar.');
            return;
        }
        if (!confirm(`¿Eliminar la planificación "${plan.raceName}"?`)) return;
        planningPlans = planningPlans.filter(p => p.id !== plan.id);
        selectedPlanningPlanId = planningPlans.length ? planningPlans[planningPlans.length - 1].id : null;
        savePlanningPlans();
        refreshSelect();
        renderPlanning();
    });

    const rerenderPreserving = () => {
        const prev = readScheduleFromGrid();
        const { W, D } = currentDims();
        // Intentar preservar el máximo solapamiento; para celdas nuevas, 0/entrenamiento
        const next = Array.from({ length: W }, (_, wi) =>
            Array.from({ length: D }, (_, di) =>
                prev?.[wi]?.[di]
                    ? { plannedKm: Number(prev[wi][di].plannedKm) || 0, type: normalizePlanningSessionType(prev[wi][di].type) }
                    : { plannedKm: 0, type: 'entrenamiento' }
            )
        );
        renderScheduleGrid(W, D, next);
    };

    if (weeksInput) {
        weeksInput.addEventListener('change', rerenderPreserving);
        weeksInput.addEventListener('input', rerenderPreserving);
    }
    if (daysPerWeekInput) {
        daysPerWeekInput.addEventListener('change', rerenderPreserving);
        daysPerWeekInput.addEventListener('input', rerenderPreserving);
    }

    generateBtn.addEventListener('click', () => {
        const { W, D } = currentDims();
        const dist = distanceInput?.value || null;
        const base = generateBaseSchedule(W, D, dist);
        renderScheduleGrid(W, D, base);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const raceName = (document.getElementById('planningRaceName')?.value || '').trim();
        const weeks = Number(document.getElementById('planningWeeks')?.value || '');
        const daysPerWeek = Number(document.getElementById('planningDaysPerWeek')?.value || '');
        const startDate = (document.getElementById('planningStartDate')?.value || '').trim();
        const raceDate = (document.getElementById('planningRaceDate')?.value || '').trim();
        const raceDistanceKmRaw = (document.getElementById('planningRaceDistanceKm')?.value || '').trim();
        const raceDistanceKm = raceDistanceKmRaw ? Number(raceDistanceKmRaw) : null;

        if (!raceName) return alert('Indica el nombre de la carrera.');
        if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) return alert('Semanas de entrenamiento inválidas.');
        if (!Number.isFinite(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) return alert('Días por semana inválidos.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return alert('Fecha de comienzo inválida.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raceDate)) return alert('Día de carrera inválido.');
        if (raceDistanceKm !== null && (!Number.isFinite(raceDistanceKm) || raceDistanceKm <= 0)) {
            return alert('Distancia de carrera inválida (si la rellenas, debe ser > 0).');
        }

        const start = new Date(startDate + 'T00:00:00');
        const race = new Date(raceDate + 'T00:00:00');
        if (race < start) return alert('El día de la carrera no puede ser anterior al comienzo del entrenamiento.');

        const schedule = readScheduleFromGrid();
        // Validación mínima: km no negativos y tipos válidos
        for (let w = 0; w < weeks; w++) {
            for (let d = 0; d < daysPerWeek; d++) {
                const cell = schedule?.[w]?.[d];
                if (!cell) return alert('Plan por semanas inválido.');
                const km = Number(cell.plannedKm);
                if (!Number.isFinite(km) || km < 0) return alert('Hay kilómetros inválidos (usa valores >= 0).');
            }
        }

        const id = planningEditingPlanId ? Number(planningEditingPlanId) : Date.now();
        const existing = planningEditingPlanId ? (planningPlans.find(p => p.id === id) || null) : null;

        // Si cambian semanas/días, podar asignaciones fuera de rango
        const assignments = { ...(existing?.assignments || {}) };
        Object.keys(assignments).forEach(k => {
            if (k === PLANNING_RACE_KEY) return;
            const m = /^W(\d+)D(\d+)$/.exec(k);
            if (!m) return;
            const wk = Number(m[1]);
            const dy = Number(m[2]);
            if (wk > weeks || dy > daysPerWeek) delete assignments[k];
        });

        const plan = normalizePlanningPlan({
            id,
            raceName,
            weeks,
            daysPerWeek,
            startDate,
            raceDate,
            raceDistanceKm: raceDistanceKm === null ? null : raceDistanceKm,
            schedule,
            assignments
        });
        if (!plan) return alert('No se pudo crear la planificación (datos inválidos).');

        if (planningEditingPlanId && existing) {
            planningPlans = planningPlans.map(p => (p.id === existing.id ? plan : p));
        } else {
            planningPlans.push(plan);
        }
        selectedPlanningPlanId = plan.id;
        planningEditingPlanId = null;
        savePlanningPlans();
        formCard.style.display = 'none';
        refreshSelect();
        renderPlanning();
    });

    // Delegación de eventos para asignar/quitar sesiones a días planificados
    const view = document.getElementById('planningView');
    if (view && !view.__planningBound) {
        view.__planningBound = true;
        view.addEventListener('click', (ev) => {
            const btn = ev.target?.closest?.('button');
            if (!btn) return;
            const key = btn.getAttribute('data-key');
            const plan = getSelectedPlanningPlan();
            if (!plan || !key) return;

            if (btn.classList.contains('planning-assign-btn')) {
                const row = btn.closest('.planning-session');
                const sel = row ? row.querySelector('select[data-key="' + key + '"]') : null;
                const sessionId = sel && sel.value ? Number(sel.value) : null;
                if (!sessionId || !Number.isFinite(sessionId)) {
                    alert('Selecciona una sesión para asignar.');
                    return;
                }
                // No permitir reutilizar la misma sesión en otro día del mismo plan
                const used = Object.keys(plan.assignments || {}).some(k => k !== key && Number(plan.assignments[k]) === sessionId);
                if (used) {
                    alert('Esa sesión ya está asignada a otro día de esta planificación.');
                    return;
                }
                plan.assignments = plan.assignments || {};
                plan.assignments[key] = sessionId;
                savePlanningPlans();
                renderPlanning();
            }

            if (btn.classList.contains('planning-unassign-btn')) {
                if (plan.assignments && plan.assignments[key]) {
                    delete plan.assignments[key];
                    savePlanningPlans();
                    renderPlanning();
                }
            }
        });
    }
}

function startOfWeekMonday(dateObj) {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=domingo
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function addDays(dateObj, n) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + n);
    d.setHours(0, 0, 0, 0);
    return d;
}

function toIsoDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function computeBaselineWeeklyKm() {
    // Promedio de km/semana en las últimas 4 semanas (lun-dom). Si no hay, valor base.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = addDays(today, -28);
    const totals = new Map();

    (sessions || []).forEach(s => {
        if (!s || !s.date) return;
        const d = new Date(String(s.date).slice(0, 10) + 'T00:00:00');
        if (Number.isNaN(d.getTime()) || d < start || d > today) return;
        const wk = toIsoDate(startOfWeekMonday(d));
        totals.set(wk, (totals.get(wk) || 0) + (Number(s.distance) || 0));
    });

    const vals = Array.from(totals.values()).filter(v => Number.isFinite(v) && v > 0);
    if (!vals.length) return 15; // base razonable si no hay histórico
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.max(8, avg);
}

function getSessionTimeDisplay(s) {
    if (!s) return '—';
    if (typeof s.time === 'string') return s.time;
    if (typeof s.timeInMinutes === 'number') return minutesToTime(s.timeInMinutes);
    if (typeof s.time === 'number') return minutesToTime(s.time);
    return '—';
}

function getSessionElevationText(s) {
    const up = Number(s?.elevationGain) || 0;
    const down = Number(s?.elevationLoss) || 0;
    if (!up && !down) return '';
    return ` · +${up.toFixed(0)}m / -${down.toFixed(0)}m`;
}

function sessionOptionLabel(s) {
    const date = s?.date ? String(s.date).slice(0, 10) : '';
    const km = Number(s?.distance) || 0;
    const time = getSessionTimeDisplay(s);
    const type = normalizePlanningSessionType(s?.type);
    return `${date} · ${km.toFixed(2)} km · ${time} · ${type}`;
}

function getSessionsInRange(startDateIso, endDateIso) {
    const start = new Date(startDateIso + 'T00:00:00');
    const end = new Date(endDateIso + 'T23:59:59');
    return (sessions || [])
        .filter(s => s && s.date)
        .map(s => ({ ...s, _d: new Date(String(s.date).slice(0, 10) + 'T00:00:00') }))
        .filter(s => s._d instanceof Date && !Number.isNaN(s._d.getTime()) && s._d >= start && s._d <= end)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function renderPlanning() {
    const container = document.getElementById('planningView');
    const select = document.getElementById('planningPlanSelect');
    const delBtn = document.getElementById('planningDeleteBtn');
    if (!container) return;

    // Mantener el selector en sync aunque el estado cambie por import/reset
    if (select) {
        const expectedOptions = (planningPlans?.length || 0) + 1;
        if (select.options.length !== expectedOptions) {
            select.innerHTML = `<option value="">— Selecciona una planificación —</option>` +
                (planningPlans || [])
                    .slice()
                    .sort((a, b) => a.raceDate.localeCompare(b.raceDate))
                    .map(p => {
                        const label = `${p.raceName} · ${p.startDate} → ${p.raceDate}`;
                        const selectedAttr = (p.id === selectedPlanningPlanId) ? 'selected' : '';
                        return `<option value="${p.id}" ${selectedAttr}>${escapeHtml(label)}</option>`;
                    })
                    .join('');
        }
    }

    const plan = getSelectedPlanningPlan();
    if (delBtn) delBtn.disabled = !plan;
    if (select && plan) select.value = String(plan.id);
    if (select && !plan) select.value = '';

    if (!plan) {
        if (charts.planningSummaryChart) {
            charts.planningSummaryChart.destroy();
            charts.planningSummaryChart = null;
        }
        container.innerHTML = `<p class="empty-state">Crea o selecciona una planificación para ver tu semana a semana.</p>`;
        return;
    }

    const start = new Date(plan.startDate + 'T00:00:00');
    const race = new Date(plan.raceDate + 'T00:00:00');
    const schedule = normalizePlanningSchedule(plan.schedule, plan.weeks, plan.daysPerWeek) || generateBaseSchedule(plan.weeks, plan.daysPerWeek, plan.raceDistanceKm);
    const weeks = Array.from({ length: plan.weeks }, (_, idx) => {
        const weekIndex = idx + 1;
        const weekStart = addDays(start, idx * 7);
        const weekEnd = addDays(weekStart, 6);
        const plannedKm = (schedule[idx] || []).reduce((sum, c) => sum + (Number(c?.plannedKm) || 0), 0);
        return { weekIndex, weekStart, weekEnd, plannedKm: Number(plannedKm.toFixed(1)) };
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const planSessions = getSessionsInRange(plan.startDate, plan.raceDate);
    const allSessions = (sessions || [])
        .filter(s => s && s.id)
        .map(s => ({ ...s, _d: new Date(String(s.date).slice(0, 10) + 'T00:00:00') }))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const sessionById = new Map(allSessions.map(s => [Number(s.id), s]));

    const assignments = plan.assignments || {};
    const usedSessionIds = new Set(Object.keys(assignments).map(k => Number(assignments[k])).filter(v => Number.isFinite(v) && v > 0));

    let plannedCount = 0;      // nº de días planificados (entrenamiento/series/carrera dentro de la semana)
    let doneCount = 0;         // nº de días con sesión asignada
    let plannedKmTotal = 0;    // suma de km planificados (solo días con km)
    let actualKmTotal = 0;     // suma de km hechos (sesiones asignadas)

    weeks.forEach(w => {
        for (let dayIdx = 0; dayIdx < plan.daysPerWeek; dayIdx++) {
            const t = schedule[w.weekIndex - 1]?.[dayIdx] || { plannedKm: 0, type: 'entrenamiento' };
            plannedCount++;
            plannedKmTotal += Number(t.plannedKm) || 0;
            const key = planningKey(w.weekIndex, dayIdx + 1);
            const sid = Number(assignments[key]);
            if (sid && sessionById.has(sid)) {
                doneCount++;
                actualKmTotal += Number(sessionById.get(sid).distance) || 0;
            }
        }
    });

    const progress = plannedCount ? Math.round((doneCount / plannedCount) * 100) : 0;
    const startLabel = formatDate(plan.startDate);
    const raceLabel = formatDate(plan.raceDate);

    // Realizado por semana (km) para la gráfica
    const actualKmByWeek = Array.from({ length: plan.weeks }, () => 0);
    weeks.forEach(w => {
        for (let dayIdx = 0; dayIdx < plan.daysPerWeek; dayIdx++) {
            const key = planningKey(w.weekIndex, dayIdx + 1);
            const sid = Number(assignments[key]);
            if (sid && sessionById.has(sid)) {
                actualKmByWeek[w.weekIndex - 1] += Number(sessionById.get(sid).distance) || 0;
            }
        }
    });
    const raceSid = Number(assignments[PLANNING_RACE_KEY]);
    if (raceSid && sessionById.has(raceSid)) {
        const raceKm = Number(sessionById.get(raceSid).distance) || 0;
        if (plan.weeks > 0) actualKmByWeek[plan.weeks - 1] += raceKm;
    }

    const summaryHtml = `
        <div class="planning-summary">
            <div class="planning-kpi">
                <div class="planning-kpi-value">${escapeHtml(String(progress))}%</div>
                <div class="planning-kpi-label">Completado</div>
            </div>
            <div class="planning-kpi">
                <div class="planning-kpi-value">${escapeHtml(String(doneCount))}/${escapeHtml(String(plannedCount))}</div>
                <div class="planning-kpi-label">Sesiones</div>
            </div>
            <div class="planning-kpi">
                <div class="planning-kpi-value">${escapeHtml(plannedKmTotal.toFixed(1))} km</div>
                <div class="planning-kpi-label">Plan (aprox.)</div>
            </div>
            <div class="planning-kpi">
                <div class="planning-kpi-value">${escapeHtml(actualKmTotal.toFixed(1))} km</div>
                <div class="planning-kpi-label">Hecho</div>
            </div>
        </div>
    `;

    const buildOptionsHtml = (allowedIdsSet, currentId) => {
        const opts = [`<option value="">— Selecciona sesión —</option>`];
        allSessions.forEach(s => {
            const sid = Number(s.id);
            if (!sid) return;
            const usedElsewhere = usedSessionIds.has(sid) && sid !== currentId;
            if (usedElsewhere) return;
            if (allowedIdsSet && !allowedIdsSet.has(sid) && sid !== currentId) return;
            const selected = sid === currentId ? 'selected' : '';
            opts.push(`<option value="${sid}" ${selected}>${escapeHtml(sessionOptionLabel(s))}</option>`);
        });
        return opts.join('');
    };

    const weeksHtml = weeks.map(w => {
        const range = `${w.weekStart.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} – ${w.weekEnd.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
        const overdue = w.weekEnd < today;

        // Sesiones disponibles para esta semana (por rango de fecha)
        const allowedIds = new Set(
            planSessions
                .filter(s => s._d >= w.weekStart && s._d <= w.weekEnd)
                .map(s => Number(s.id))
                .filter(v => Number.isFinite(v) && v > 0)
        );

        let weekPlannedKm = 0;
        let weekActualKm = 0;

        const sessionsHtml = Array.from({ length: plan.daysPerWeek }, (_, di) => {
            const t = schedule[w.weekIndex - 1]?.[di] || { plannedKm: 0, type: 'entrenamiento' };
            const key = planningKey(w.weekIndex, di + 1);
            const assignedId = Number(assignments[key]) || null;
            const assignedSession = assignedId ? sessionById.get(assignedId) : null;
            const isDone = !!assignedSession;
            if (t.plannedKm) weekPlannedKm += Number(t.plannedKm) || 0;
            if (assignedSession) weekActualKm += Number(assignedSession.distance) || 0;

            const klass = isDone ? 'planning-done' : (overdue ? 'planning-missed' : '');
            const statusText = isDone ? 'Finalizado' : (overdue ? 'Pendiente' : 'Por hacer');

            const plannedText = `Plan: ${(Number(t.plannedKm) || 0).toFixed(1)} km`;
            const actualText = assignedSession
                ? `Hecho: ${(Number(assignedSession.distance) || 0).toFixed(2)} km · ${escapeHtml(getSessionTimeDisplay(assignedSession))}${escapeHtml(getSessionElevationText(assignedSession))}`
                : '';

            const assignControls = assignedSession
                ? `
                    <div class="planning-assign">
                        <span class="planning-session-actual">${escapeHtml(String(assignedSession.date).slice(0, 10))}</span>
                        <button type="button" class="btn btn-secondary btn-small planning-unassign-btn" data-key="${escapeHtml(key)}">Quitar</button>
                    </div>
                `
                : `
                    <div class="planning-assign">
                        <select data-key="${escapeHtml(key)}">
                            ${buildOptionsHtml(allowedIds.size ? allowedIds : null, null)}
                        </select>
                        <button type="button" class="btn btn-primary btn-small planning-assign-btn" data-key="${escapeHtml(key)}">Asignar</button>
                    </div>
                `;

            return `
                <div class="planning-session ${klass}">
                    <div class="planning-session-left">
                        <div class="planning-session-date">Día ${escapeHtml(String(di + 1))}</div>
                        <div class="planning-session-sub">
                            <span class="planning-badge">${escapeHtml(t.type)}</span>
                            <span>${escapeHtml(`· ${plannedText}`)}${actualText ? ` · ${actualText}` : ''}</span>
                        </div>
                    </div>
                    <div class="planning-status">${escapeHtml(statusText)}</div>
                    ${assignControls}
                </div>
            `;
        }).join('');

        return `
            <div class="planning-week">
                <div class="planning-week-header">
                    <div>
                        <div class="planning-week-title">Semana ${escapeHtml(String(w.weekIndex))}</div>
                        <div class="planning-week-meta">${escapeHtml(range)}</div>
                    </div>
                    <div class="planning-week-km">${escapeHtml(weekActualKm.toFixed(1))}/${escapeHtml(weekPlannedKm.toFixed(1))} km</div>
                </div>
                <div class="planning-sessions">
                    ${sessionsHtml}
                </div>
            </div>
        `;
    }).join('');

    // Carrera (asignable también)
    const raceAssignedId = Number(assignments[PLANNING_RACE_KEY]) || null;
    const raceSession = raceAssignedId ? sessionById.get(raceAssignedId) : null;
    const raceAllowedIds = new Set(
        planSessions
            .filter(s => String(s.date).slice(0, 10) === plan.raceDate)
            .map(s => Number(s.id))
            .filter(v => Number.isFinite(v) && v > 0)
    );
    const raceControls = raceSession
        ? `
            <div class="planning-assign">
                <span class="planning-session-actual">${escapeHtml(String(raceSession.date).slice(0, 10))}</span>
                <button type="button" class="btn btn-secondary btn-small planning-unassign-btn" data-key="${escapeHtml(PLANNING_RACE_KEY)}">Quitar</button>
            </div>
        `
        : `
            <div class="planning-assign">
                <select data-key="${escapeHtml(PLANNING_RACE_KEY)}">
                    ${buildOptionsHtml(raceAllowedIds.size ? raceAllowedIds : null, null)}
                </select>
                <button type="button" class="btn btn-primary btn-small planning-assign-btn" data-key="${escapeHtml(PLANNING_RACE_KEY)}">Asignar</button>
            </div>
        `;
    const raceRow = `
        <div class="planning-week">
            <div class="planning-week-header">
                <div>
                    <div class="planning-week-title">Carrera</div>
                    <div class="planning-week-meta">${escapeHtml(formatDate(plan.raceDate))}</div>
                </div>
                <div class="planning-week-km">${raceSession ? escapeHtml((Number(raceSession.distance) || 0).toFixed(2)) + ' km' : '—'}</div>
            </div>
            <div class="planning-sessions">
                <div class="planning-session ${raceSession ? 'planning-done' : ''}">
                    <div class="planning-session-left">
                        <div class="planning-session-date">${escapeHtml(plan.raceName)}</div>
                        <div class="planning-session-sub">
                            <span class="planning-badge">carrera</span>
                            <span>${raceSession ? escapeHtml(`· Hecho: ${(Number(raceSession.distance) || 0).toFixed(2)} km · ${getSessionTimeDisplay(raceSession)}${getSessionElevationText(raceSession)}`) : 'Asigna la sesión de carrera cuando la tengas.'}</span>
                        </div>
                    </div>
                    <div class="planning-status">${raceSession ? 'Finalizado' : '—'}</div>
                    ${raceControls}
                </div>
            </div>
        </div>
    `;

    const chartLabels = weeks.map(w => String(w.weekIndex));
    const chartPlanned = weeks.map(w => w.plannedKm);
    const chartRealized = actualKmByWeek.map(k => Number(k.toFixed(1)));
    const chartDiffPct = chartPlanned.map((p, i) => {
        if (!p || p <= 0) return null;
        const r = chartRealized[i] || 0;
        return Number((((r - p) / p) * 100).toFixed(1));
    });

    if (charts.planningSummaryChart) {
        charts.planningSummaryChart.destroy();
        charts.planningSummaryChart = null;
    }
    container.innerHTML = `
        <p class="section-intro"><strong>${escapeHtml(plan.raceName)}</strong> · ${escapeHtml(startLabel)} → ${escapeHtml(raceLabel)} · ${escapeHtml(String(plan.weeks))} semanas · ${escapeHtml(String(plan.daysPerWeek))} días/sem.${plan.raceDistanceKm ? ` · ${escapeHtml(String(plan.raceDistanceKm))} km` : ''}</p>
        ${summaryHtml}
        <div class="planning-chart-wrap">
            <canvas id="planningSummaryChart" aria-label="Resumen por semana: planificado, realizado y diferencia porcentual"></canvas>
        </div>
        ${weeksHtml}
        ${raceRow}
    `;

    updatePlanningSummaryChart(plan.raceName, chartLabels, chartPlanned, chartRealized, chartDiffPct);
}

// Gráfica de resumen semanal en Planificación: planificado, realizado y diferencia %
function updatePlanningSummaryChart(raceName, labels, plannedKm, realizedKm, diffPct) {
    const canvas = document.getElementById('planningSummaryChart');
    if (!canvas) return;
    if (charts.planningSummaryChart) {
        charts.planningSummaryChart.destroy();
        charts.planningSummaryChart = null;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxKm = Math.max(...plannedKm, ...realizedKm, 1);
    const suggestedMaxKm = Math.ceil(maxKm / 5) * 5 + 5;
    const valsPct = diffPct.filter(v => v != null);
    const minPct = valsPct.length ? Math.min(...valsPct) : 0;
    const maxPct = valsPct.length ? Math.max(...valsPct) : 0;
    const rangePct = Math.max(10, Math.ceil(Math.max(-minPct, maxPct) / 5) * 5 + 5);
    const y1Min = -rangePct;
    const y1Max = rangePct;

    charts.planningSummaryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Planificado',
                    data: plannedKm,
                    type: 'bar',
                    yAxisID: 'y',
                    backgroundColor: 'rgba(148, 163, 184, 0.85)',
                    borderColor: 'rgb(100, 116, 139)',
                    borderWidth: 1,
                    barPercentage: 0.75,
                    categoryPercentage: 0.8,
                    order: 2
                },
                {
                    label: 'Realizado',
                    data: realizedKm,
                    type: 'bar',
                    yAxisID: 'y',
                    backgroundColor: 'rgba(52, 211, 153, 0.85)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1,
                    barPercentage: 0.75,
                    categoryPercentage: 0.8,
                    order: 1
                },
                {
                    label: 'Diferencia %',
                    data: diffPct,
                    type: 'line',
                    yAxisID: 'y1',
                    borderColor: 'rgb(96, 165, 250)',
                    backgroundColor: 'rgba(96, 165, 250, 0.15)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: 'rgb(96, 165, 250)',
                    pointBorderColor: 'rgba(255, 255, 255, 0.9)',
                    pointBorderWidth: 1.5,
                    borderWidth: 2.5,
                    spanGaps: false,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: `Entrenamiento ${raceName || 'Plan'}`,
                    color: 'rgba(255, 255, 255, 0.95)',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'top',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.95)',
                        font: { size: 12 },
                        padding: 14,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    titleColor: 'rgba(255, 255, 255, 0.95)',
                    bodyColor: 'rgba(255, 255, 255, 0.9)',
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        title: (items) => items.length && items[0].label != null ? `Semana ${items[0].label}` : '',
                        label: function (ctx) {
                            const v = ctx.raw;
                            if (ctx.dataset.yAxisID === 'y1') {
                                return v != null ? `Diferencia: ${Number(v).toFixed(1)}%` : '';
                            }
                            return v != null ? `${ctx.dataset.label}: ${Number(v).toFixed(1)} km` : '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.85)',
                        maxRotation: 0,
                        font: { size: 11 },
                        autoSkip: true,
                        maxTicksLimit: 18
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.12)' }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'km',
                        color: 'rgba(255, 255, 255, 0.85)',
                        font: { size: 12 }
                    },
                    beginAtZero: true,
                    suggestedMax: suggestedMaxKm,
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.85)',
                        stepSize: suggestedMaxKm <= 25 ? 5 : 10
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.12)' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: '%',
                        color: 'rgba(255, 255, 255, 0.85)',
                        font: { size: 12 }
                    },
                    min: y1Min,
                    max: y1Max,
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.85)',
                        stepSize: 5,
                        callback: (v) => (v != null ? `${v}%` : '')
                    },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
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
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(255, 255, 255, 0.9)',
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
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(255, 255, 255, 0.9)',
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
