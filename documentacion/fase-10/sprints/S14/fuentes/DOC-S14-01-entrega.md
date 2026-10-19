# Entrega S14 Copia del identificador y actualización de cupos

## Propósito y resultado

S14 implementa RF11 para conservar el identificador y obtener una lectura posterior a la confirmación. La entrega está en revisión local y requiere aprobación expresa antes de commit y push. Copiar y actualizar no crean otra reserva.

## Comportamiento implementado

El comprobante compartido ofrece Copiar identificador y un campo de solo lectura con el UUID completo. La interfaz anuncia éxito únicamente cuando writeText termina correctamente. Si el navegador no dispone de portapapeles o rechaza el permiso, selecciona el identificador y explica cómo copiarlo mediante el menú del dispositivo, Ctrl+C o ⌘C. El campo también permite selección manual desde el inicio. La resolución tardía de una copia no actualiza un comprobante desmontado o sustituido.

Tras una confirmación válida 201 o 200, la vista del evento actualiza automáticamente su disponibilidad una vez por UUID. No repite el POST ni resta unidades por cálculo local: muestra los valores devueltos por GET. Conserva el comprobante si la lectura falla y permite actualizar manualmente. Un 503 identifica la lectura anterior como desactualizada; un 404 retira la disponibilidad y permite conservar el UUID confirmado. La lectura es informativa y no garantiza inventario.

La confirmación recuperada en su pantalla dispone de una consulta de cupos propia y un botón para repetir únicamente esa lectura. La consulta por UUID reutiliza las acciones de copia del mismo comprobante. Se mantiene el comportamiento existente de reingreso ante 401; S14 no modifica la política de identidad.

## Verificación ejecutada

Pasaron las 52 pruebas Node existentes, la verificación TypeScript, la compilación de producción y los 12 controles de secretos. Los registros están en evidencias/frontend-s14. Estas pruebas se ejecutaron nuevamente para S14 y no constituyen resultados históricos copiados de S13.

Pasaron 46 comprobaciones de navegador. La matriz verifica respuestas de creación 201 y repetición 200, copia exacta, rechazo de permiso, API de portapapeles ausente, actualización automática y manual, errores 503 y 404 y ausencia de otro POST. Comprueba la selección completa y el foco del campo cuando falla la copia. Las respuestas de negocio son fixtures explícitos, no operaciones PostgreSQL reales. El escenario native utiliza el portapapeles real del Chromium aislado con permisos concedidos.

Las capturas registran la selección manual en 360 píxeles y la conservación del comprobante ante error de cupos. No equivalen a una revisión integral adaptable o de accesibilidad; esas aceptaciones pertenecen a S15 a S17. Las comprobaciones de copia y actualización completan la parte aplicable a RF11 de PV03 y PV06 en entorno controlado.

## Evidencias y límites

El script reproducible es frontend/scripts/verify-copy.mjs. El informe copy-controlled.json registra cada comprobación y la versión del navegador. node-tests.txt, build.txt y secrets.txt conservan los resultados de las verificaciones de base. El ensayo utiliza la imagen mcr.microsoft.com/playwright:v1.58.2-noble y el frontend del laboratorio exclusivo S12. No modifica su base de datos porque intercepta las solicitudes de negocio.

La primera ejecución en el contenedor de desarrollo falló por falta de Chromium. Una ejecución posterior encontró un filtro de interceptación demasiado amplio en el ensayo; se corrigió para interceptar solo rutas que comienzan en /api/. Esos intentos no se contabilizan como exitosos. Se reinició Vite para cargar los cambios del directorio compartido.

No se ejecutó una nueva creación real ni auditoría PostgreSQL para S14. Tampoco se acredita Kubernetes, OpenShift, carga, lector de pantalla ni compatibilidad con todos los navegadores. También se comprobaron el identificador y la acción de copia del comprobante consultado, y la actualización después de recuperar, tanto correcta como fallida.

## Entrega para revisión

Se entregan implementación, prueba de navegador, Markdown, Word y Mermaid editable. El Word conserva Times New Roman 12, texto negro, encabezados de tabla negros con letra blanca cuando hay tablas e índice actualizable. La publicación queda bajo control del usuario conforme a AGENTS.md. S15 no iniciado.
