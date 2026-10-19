# Entrega S09 Comprobante de reserva confirmada

Documento DOC-S09-01. Fecha 19 de octubre de 2026. Requisito RF06. Estado en revisión local, sin commit ni push.

## Resultado y alcance

S09 incorpora el comprobante de una reserva confirmada. Muestra UUID de la reserva, UUID del evento, cantidad, estado Confirmada y fecha de creación recibida del servidor, con hora y zona local del navegador. Una respuesta 201 se identifica como reserva creada y una respuesta 200 como operación recuperada, correspondiente a una reserva ya confirmada. No se anuncia correo enviado.

El motor valida de nuevo la respuesta antes de aceptar el resultado: exige 201 o 200, contrato de reserva válido, evento coincidente y cantidad idéntica a la intención. Copia únicamente los campos admitidos y congela el comprobante en memoria. Un resultado incompatible conserva el pendiente como incierto y no muestra comprobante.

## Persistencia y presentación

El pendiente se retira únicamente tras una confirmación válida y si el registro coincide exactamente con el guardado antes del POST. Se verifica que removeItem haya eliminado el registro. Un fallo de limpieza o un registro reemplazado no ocultan una reserva confirmada: el comprobante permanece con una advertencia para evitar reenviarla. No se elimina un registro ajeno o modificado durante el envío.

ReservationReceipt está fuera del bloque que depende de la disponibilidad. Por ello, actualizar cupos y recibir 503 o 404 no oculta el UUID ni los demás datos confirmados. El componente mueve el foco a su encabezado y presenta un anuncio de estado. No ejecuta lecturas ni nuevos POST por mostrar el comprobante. Se mantiene el bloqueo de otra intención durante la vida del motor de esta sesión.

El comprobante no se guarda en storage y se pierde al recargar. Esta entrega no incluye consulta por UUID, copia al portapapeles, actualización automática posterior, recuperación de una operación incierta ni salida completa. Esas funciones corresponden a S10, S11, S13 y S14. Una respuesta 200 se verifica mediante repetición controlada en pruebas; no se añadió un botón de reenvío al usuario.

## Verificación ejecutada

Pasaron 37 pruebas Node, comprobación de tipos, compilación Vite y 12 controles de secretos. Tres pruebas nuevas cubren comprobante inmutable para 201 y 200, descarte de campos adicionales, rechazo de confirmaciones incompatibles y preservación de comprobante ante fallo de limpieza o reemplazo del pendiente. Se adaptaron las pruebas anteriores al retiro del pendiente válido de S09.

El ensayo verify-receipt.mjs aprobó 58 comprobaciones con respuestas controladas en Chromium 145. Cubrió datos del comprobante, etiquetas para 201 y 200, fecha exacta en el elemento time, foco, doble clic, retiro del pendiente, fallo de removeItem, respuestas de cantidad o fecha inválidas, fallos posteriores 503 y 404 y ausencia de credencial en página, storage, URL y registros. Las capturas a 1280 y 360 píxeles no mostraron desbordamiento horizontal.

El ensayo real aprobó 28 comprobaciones contra API y PostgreSQL exclusivos de S09. Creó dos reservas de dos cupos. Para verificar 200, el intermediario de pruebas recibió primero 201, repitió explícitamente la misma clave y payload y entregó el 200 a la interfaz. El UUID de la repetición coincidió con el original. Esta técnica verifica el comprobante y no implementa la recuperación de S10.

audit_s09.py confirmó en PostgreSQL capacidad 25, disponibilidad 21, dos reservas confirmadas, cuatro cupos reservados y dos registros outbox, sin claves duplicadas por cliente. No se inició worker, para conservar el outbox auditable. No se modificó la base de S08 ni la habitual. Los resultados no acreditan entrega de correo, Kubernetes, OpenShift ni capacidad máxima.

## Reproducción y entrega

frontend/testing/Start-S09.ps1 prepara secretos aleatorios excluidos de Git y arranca s09.compose.yaml en localhost:5182 con base efímera reservas_s09. El ensayo real recibe credential mediante JSON por stdin. No repetirlo sobre una base ya utilizada; requiere el entorno exclusivo inicialmente vacío. browser_loopback.py 5182 permite al navegador del contenedor acceder con contexto seguro loopback. El puente solo sirve al laboratorio y no forma parte del despliegue de S18.

Las evidencias están bajo evidencias/frontend-s09, con informes separados de respuestas controladas y API real. Se entregan fuentes, comprobante React, motor actualizado, pruebas, scripts, Word y Mermaid editable. El Word mantiene Times New Roman 12, texto negro e índice actualizable; las tablas que se incorporen deben conservar encabezado negro con letra blanca.

La entrega requiere revisión y aprobación expresa antes de commit y push a origin/master, conforme a AGENTS.md. S10 no se inicia con esta entrega. La función sigue destinada a pruebas hasta completar recuperación y salida segura en S10 y S13.
