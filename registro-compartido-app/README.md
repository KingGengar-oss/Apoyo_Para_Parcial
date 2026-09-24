# Registro Compartido

Base de prueba para una app compartida de registros, impuestos, miembros, tablas, archivos y sincronizacion.

## Que incluye

- Interfaz responsive para celular y escritorio.
- Tablas editables con busqueda, columnas, filas, renombrado e importacion/exportacion CSV.
- Miembros con filtro por nombre, correo y rol.
- Registro de archivos local y accion de compartir simulada.
- Persistencia offline con `localStorage`.
- Cola local de sincronizacion para cambios hechos sin internet.
- Configuracion lista para conectar Supabase.
- Esquema SQL inicial para probar sincronizacion real.
- Service Worker para cachear la app cuando se publique por HTTPS, por ejemplo GitHub Pages.
- Respaldo y carga de datos en JSON.

## Como probar localmente

Puedes abrir `index.html` directo en el navegador. Para probar el modo instalable/offline con service worker:

```bash
python -m http.server 5173
```

Luego abre:

```text
http://localhost:5173/outputs/impuestos-compartidos/
```

Si descomprimes este proyecto y entras directo a la carpeta de la app, usa:

```text
http://localhost:5173/
```

## Como subir a GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube esta carpeta al repositorio.
3. En GitHub, entra a Settings -> Pages.
4. Publica desde la rama principal y la carpeta donde quede `index.html`.

## Backend real

La app ya trae `config.js` y `supabase-schema.sql`. Para activar pruebas reales:

1. Crea un proyecto en Supabase.
2. Ejecuta `supabase-schema.sql` en SQL Editor.
3. Pega tu URL y anon key en `config.js`.
4. Cambia `backend: "local"` por `backend: "supabase"`.

Lee `SETUP.md` para el paso a paso.

## Importante

Las politicas SQL incluidas son abiertas para demo. Antes de usar datos reales de clientes hay que agregar login, roles y reglas RLS privadas.
