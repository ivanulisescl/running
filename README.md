# Running - PWA

Aplicación web progresiva (PWA) para controlar tus sesiones de entrenamiento de running.

## Características

- ✅ Registrar sesiones de entrenamiento (fecha, distancia, tiempo, tipo)
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

## Estructura de archivos

- `index.html` - Estructura principal
- `styles.css` - Estilos y diseño
- `app.js` - Lógica de la aplicación
- `manifest.json` - Configuración PWA
- `service-worker.js` - Service Worker para funcionalidad offline

## Próximas mejoras sugeridas

- Gráficos de progreso
- Exportar datos (CSV, JSON)
- Importar datos
- Objetivos y metas
- Recordatorios
- Integración con wearables
- Mapa de rutas
- Análisis avanzado de rendimiento

## Notas

Los datos se almacenan localmente en el navegador usando localStorage. Si limpias los datos del navegador, perderás tus sesiones guardadas.
