# Guía para Instalar la PWA en tu Móvil

## Paso 1: Generar los Iconos

1. Abre el archivo `create-icons.html` en tu navegador
2. Haz clic en el botón "Descargar Iconos"
3. Guarda los archivos `icon-192.png` e `icon-512.png` en la carpeta del proyecto

## Paso 2: Subir los Iconos a GitHub

```bash
git add icon-192.png icon-512.png
git commit -m "Agregar iconos para PWA"
git push
```

## Paso 3: Configurar GitHub Pages con GitHub Actions

El proyecto ya incluye un workflow de GitHub Actions (`.github/workflows/deploy.yml`) que desplegará automáticamente tu PWA.

1. Ve a tu repositorio en GitHub: https://github.com/ivanulisescl/running
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, busca **Pages**
4. En "Source", selecciona **GitHub Actions** (no "Deploy from a branch")
5. Haz clic en **Save**
6. El workflow se ejecutará automáticamente en cada push a `main`
7. Puedes ver el progreso en la pestaña **Actions** de tu repositorio
8. Una vez completado, tu app estará disponible en: `https://ivanulisescl.github.io/running/`

## Paso 4: Instalar en tu Móvil

### Android (Chrome)

1. Abre Chrome en tu móvil
2. Ve a: `https://ivanulisescl.github.io/running/`
3. Toca el menú (tres puntos) en la esquina superior derecha
4. Selecciona **"Agregar a la pantalla de inicio"** o **"Instalar app"**
5. Confirma la instalación
6. La app aparecerá como una app independiente en tu pantalla de inicio

### iOS (Safari)

1. Abre Safari en tu iPhone/iPad
2. Ve a: `https://ivanulisescl.github.io/running/`
3. Toca el botón de compartir (cuadrado con flecha hacia arriba)
4. Desplázate y selecciona **"Agregar a pantalla de inicio"**
5. Personaliza el nombre si quieres y toca **"Agregar"**
6. La app aparecerá en tu pantalla de inicio

## Alternativa: Servidor Local para Pruebas

Si quieres probarlo localmente antes de desplegar:

### Opción 1: Python
```bash
python -m http.server 8000
```
Luego accede desde tu móvil usando la IP de tu computadora: `http://TU_IP:8000`

### Opción 2: Node.js (http-server)
```bash
npx http-server -p 8000
```

**Nota importante**: Para que la PWA funcione completamente, necesita HTTPS. GitHub Pages lo proporciona automáticamente. Si pruebas localmente, algunos navegadores pueden requerir HTTPS incluso para localhost.

## Verificar que Funciona

Una vez instalada, deberías poder:
- Abrir la app sin conexión (gracias al Service Worker)
- Verla como una app independiente (sin barra del navegador)
- Usar todas las funcionalidades normalmente
