# Guia de arranque real

Esta app ya puede funcionar de dos formas:

1. **Modo local**, para pruebas sin cuentas ni base de datos.
2. **Modo Supabase**, para compartir datos entre celulares y empezar a probar sincronizacion real.

## 1. Abrir en VS Code

Descomprime el zip, abre la carpeta en VS Code y ejecuta:

```bash
python -m http.server 5173
```

Abre:

```text
http://localhost:5173/
```

## 2. Subir a GitHub Pages

1. Crea un repo nuevo en GitHub.
2. Sube todos los archivos a la raiz del repo.
3. Entra a `Settings > Pages`.
4. Selecciona `Deploy from a branch`.
5. Branch: `main`.
6. Folder: `/root`.
7. Guarda y espera el enlace publico.

## 3. Activar Supabase

1. Crea un proyecto en Supabase.
2. Entra a `SQL Editor`.
3. Copia y ejecuta `supabase-schema.sql`.
4. En Supabase, entra a `Project Settings > API`.
5. Copia `Project URL` y `anon public key`.
6. Abre `config.js`.
7. Cambia:

```js
backend: "supabase"
```

8. Pega:

```js
url: "https://TU-PROYECTO.supabase.co",
anonKey: "TU-ANON-KEY-PUBLICA"
```

9. Sube el cambio a GitHub.

## Nota de seguridad

El esquema trae politicas abiertas solo para demo. Sirven para validar que dos telefonos se sincronicen. Antes de cargar datos reales de clientes hay que activar login, roles y politicas RLS con `auth.uid()`.

## 4. Drive

Drive necesita un proyecto de Google Cloud, OAuth Client ID y autorizacion por usuario. La app ya tiene el espacio en `config.js`, pero no debe usarse con datos reales hasta configurar OAuth y permisos.
