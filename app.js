// Estado de la aplicación
let sessions = [];
let currentAppVersion = '1.0.3'; // Versión actual de la app

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    loadSessionsFromProject();
    setupForm();
    setupClearButton();
    setupMenu();
    setupSync();
    setupGarminImport();
    updateStats();
    setupPWA();
    setupVersionCheck();
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

// Fusionar sesiones desde un array externo
function mergeSessions(externalSessions) {
    const existingIds = new Set(sessions.map(s => s.id));
    let merged = false;
    
    externalSessions.forEach(session => {
        if (session.id != null && !existingIds.has(session.id)) {
            sessions.push(session);
            existingIds.add(session.id);
            merged = true;
        }
    });
    
    if (merged) {
        saveSessions();
        renderSessions();
        updateStats();
        console.log(`✅ ${merged ? externalSessions.length : 0} sesiones cargadas desde el proyecto`);
    }
}

// Configurar menú desplegable
function setupMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = menuDropdown.style.display === 'block';
        menuDropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
            menuDropdown.style.display = 'none';
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
            elevationLoss
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

    // Verificar versión desde el servidor y actualizar automáticamente si hay nueva
    fetch('./version.json?' + Date.now())
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
        fetch('./version.json?' + Date.now())
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
