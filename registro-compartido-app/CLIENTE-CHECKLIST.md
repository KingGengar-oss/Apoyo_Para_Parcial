# Checklist para levantar requisitos con el cliente

Usa esta lista antes de tocar codigo. Asi puedes convertir lo que el cliente pide en tablas, permisos y pantallas concretas.

## Usuarios y permisos

- Quienes entran a la app.
- Que roles existen: administrador, contador, cliente u otros.
- Que puede ver cada rol.
- Que puede editar cada rol.
- Si un cliente puede ver solo sus propios datos o tambien datos generales.
- Si necesitas historial de cambios por usuario.

## Tablas

Por cada tabla pide:

- Nombre de la tabla.
- Columnas exactas.
- Tipos de datos: texto, fecha, dinero, estado, archivo, nota.
- Campos obligatorios.
- Estados permitidos, por ejemplo pendiente, recibido, pagado, revision.
- Filtros necesarios.
- Si se puede importar/exportar CSV o Excel.

## Archivos

- Que tipos de archivo se subiran.
- Tamano maximo aproximado.
- Si los archivos son privados por cliente.
- Si se comparten con usuarios especificos.
- Si se guardan en Supabase Storage, Google Drive o ambos.

## Drive

- Cada cliente conecta su propio Drive o se usa un Drive central.
- Que carpetas se crean.
- Si la app solo exporta archivos o tambien lee archivos existentes.
- Si los archivos deben organizarse por cliente, mes o impuesto.

## Offline

- Que debe funcionar sin internet.
- Si se permite editar sin internet.
- Que pasa si dos personas editan lo mismo.
- Cual dato gana en conflicto: ultimo cambio, administrador o revision manual.

## Reportes

- Que reportes necesita descargar.
- Formatos: CSV, Excel, PDF.
- Periodos: mensual, trimestral, anual.
- Si el reporte debe tener logo o formato contable.

## Seguridad

- Si habra datos sensibles.
- Si se necesita doble factor.
- Si un administrador puede entrar a datos de clientes.
- Tiempo que deben guardarse archivos y registros.
