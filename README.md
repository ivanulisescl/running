# Running - PWA

Aplicación web progresiva (PWA) para controlar tus sesiones de entrenamiento de running.

## Características

- ✅ Registrar sesiones de entrenamiento (fecha, distancia, tiempo, tipo, desnivel)
- ✅ Importar sesiones desde Garmin Connect (archivos TCX/GPX)
- ✅ Ver historial de todas las sesiones
- ✅ Estadísticas básicas (total de sesiones, kilómetros, tiempo, ritmo promedio)
- ✅ Funciona offline (PWA)
- ✅ Instalable en dispositivos móviles y escritorio
- ✅ Diseño responsive y moderno

## Uso

1. Abre `index.html` en tu navegador
2. O sirve los archivos con un servidor local:
   ```bash
   # Con Python
   python -m http.server 8000
   
   # Con Node.js (http-server)
   npx http-server
   ```

3. Para instalar como PWA:
   - En Chrome/Edge: aparecerá un banner de instalación
   - En móvil: menú → "Agregar a pantalla de inicio"

## Importar desde Garmin Connect

1. Ve a Garmin Connect y exporta tus actividades como archivos TCX o GPX
2. En la aplicación, haz clic en "Seleccionar archivos TCX/GPX"
3. Selecciona uno o varios archivos exportados de Garmin Connect
4. Las sesiones se importarán automáticamente con:
   - Fecha y hora de la actividad
   - Distancia total
   - Tiempo total
   - Desnivel positivo y negativo (calculado desde los puntos de track)
   - Tipo de entrenamiento (detectado automáticamente cuando es posible)

**Nota**: Si ya existe una sesión con la misma fecha y distancia similar, no se duplicará.

## Estructura de archivos

- `index.html` - Estructura principal
- `styles.css` - Estilos y diseño
- `app.js` - Lógica de la aplicación
- `manifest.json` - Configuración PWA
- `service-worker.js` - Service Worker para funcionalidad offline

## Próximas mejoras sugeridas

- Gráficos de progreso
- Exportar datos (CSV, JSON)
- Objetivos y metas
- Recordatorios
- Integración directa con API de Garmin Connect (OAuth)
- Mapa de rutas
- Análisis avanzado de rendimiento

## Sincronizar entre dispositivos

Los datos se guardan en el navegador (localStorage) y además puedes usar un JSON en el proyecto para sincronizar:

1. **En el proyecto**: existe `data/sessions.json`. Al abrir la app, se cargan automáticamente las sesiones que haya en ese archivo y se fusionan con las del dispositivo.
2. **Exportar**: en la app, "Exportar a JSON" descarga `sessions.json`. Guarda ese archivo en `data/sessions.json` del proyecto y haz commit/push.
3. **En otro dispositivo**: clona el repo o haz pull, abre la app y las sesiones de `data/sessions.json` se cargan al iniciar. Si prefieres, usa "Importar desde JSON" y selecciona `data/sessions.json`.

Así puedes tener el mismo historial en todos los dispositivos usando el repositorio (o copiando el JSON por nube).

## Notas

Los datos se almacenan localmente en el navegador usando localStorage. Si limpias los datos del navegador, perderás las sesiones de ese dispositivo; si tienes `data/sessions.json` actualizado, puedes volver a importarlo.
