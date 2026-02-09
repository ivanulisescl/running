// Estado de la aplicación
let sessions = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    setupForm();
    setupClearButton();
    updateStats();
    setupPWA();
    setTodayDate();
});

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

// Agregar nueva sesión
function addSession() {
    const date = document.getElementById('date').value;
    const distance = parseFloat(document.getElementById('distance').value);
    const timeHours = parseInt(document.getElementById('timeHours').value) || 0;
    const timeMinutes = parseInt(document.getElementById('timeMinutes').value) || 0;
    const timeSeconds = parseInt(document.getElementById('timeSeconds').value) || 0;
    const type = document.getElementById('type').value;
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
        createdAt: new Date().toISOString()
    };

    sessions.push(session);
    saveSessions();
    renderSessions();
    updateStats();
    resetForm();
    
    // Feedback visual
    const form = document.getElementById('sessionForm');
    form.style.transform = 'scale(0.98)';
    setTimeout(() => {
        form.style.transform = 'scale(1)';
    }, 200);
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
}

// Eliminar sesión
function deleteSession(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta sesión?')) {
        sessions = sessions.filter(session => session.id !== id);
        saveSessions();
        renderSessions();
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
            updateStats();
        }
    });
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

        return `
            <div class="session-item">
                <div class="session-header">
                    <span class="session-date">${formattedDate}</span>
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
                </div>
                ${session.notes ? `<div class="session-notes">${escapeHtml(session.notes)}</div>` : ''}
                <button class="delete-btn" onclick="deleteSession(${session.id})">Eliminar</button>
            </div>
        `;
    }).join('');
}

// Actualizar estadísticas
function updateStats() {
    const totalSessions = sessions.length;
    const totalDistance = sessions.reduce((sum, s) => sum + s.distance, 0);
    
    // Calcular tiempo total en minutos (compatibilidad con datos antiguos)
    const totalTimeInMinutes = sessions.reduce((sum, s) => {
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
            return session;
        });
        saveSessions(); // Guardar datos migrados
        renderSessions();
    }
}

// Configurar PWA
function setupPWA() {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('Service Worker registrado:', registration);
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
