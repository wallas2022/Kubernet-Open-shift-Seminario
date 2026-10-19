# Entrega S11 Consulta autorizada de reservas

Documento DOC-S11-01. Fecha 19 de octubre de 2026. Requisito RF08. Estado en revisión local, sin commit ni push.

## Resultado y alcance

S11 incorpora Consultar una reserva por UUID desde el catálogo autenticado. Permite introducir el identificador de una reserva creada con la misma clave de laboratorio y consultar GET /reservas/{id}. La pantalla no ofrece historial ni lista de reservas y no ejecuta POST. Se conserva la validación por propietario del backend existente, sin cambios en la API ni en su autorización.

El formulario exige UUID completo con formato 8-4-4-4-12 y guiones, sin espacios ni sufijos. Un identificador inválido produce error local y no se envía. Se aceptan letras hexadecimales en mayúsculas; el contrato del cliente comprueba que el UUID devuelto corresponda al solicitado sin distinguir mayúsculas. La clave se transmite en X-Api-Key y nunca en URL o almacenamiento.

## Comprobante y estados

ReservationReceiptView extrae la presentación compartida del comprobante de S09. La consulta muestra UUID de reserva y evento, cantidad, estado Confirmada y fecha devuelta por el servidor, con zona local del navegador. El nombre del evento se incorpora únicamente cuando el UUID coincide con un evento del catálogo leído. Con catálogo vacío o sin coincidencia no se inventa nombre ni se sustituye el UUID del evento.

Una reserva ajena y una inexistente muestran exactamente No encontramos una reserva accesible con ese identificador. No se informa si el UUID pertenece a otro cliente. Un 401 elimina la credencial y vuelve al acceso. Red, error del servidor, HTML y respuesta incompatible producen un mensaje técnico sin reflejar detalles privados. Antes de una nueva consulta se retira el comprobante anterior; cambiar el identificador también lo retira, evitando atribuir datos antiguos a otra búsqueda.

El formulario permite una sola lectura activa. Deshabilita campo y botón durante la consulta y mantiene un bloqueo síncrono para doble clic. Volver al catálogo aborta la espera e impide aplicar respuestas tardías. La respuesta solo se aplica si la pantalla sigue montada y la credencial no cambió. El foco pasa al campo al entrar y ante error, y al encabezado del comprobante después de consultar correctamente.

## Verificación ejecutada

Pasaron las 43 pruebas Node existentes, comprobación de tipos, compilación Vite y 12 controles de secretos. El cliente HTTP ya cubría validación de UUID, contrato de reserva y correspondencia del recurso. La nueva interacción se verificó mediante navegador, sin agregar pruebas unitarias que dupliquen ese contrato.

verify-lookup.mjs aprobó 42 comprobaciones con respuestas controladas. Cubrió siete entradas inválidas sin GET de reserva, propietario autorizado, UUID en mayúsculas, fecha del servidor, foco, nombre del catálogo, catálogo vacío sin nombre inventado, errores ajeno e inexistente idénticos, fallo 503 con HTML, UUID incompatible en respuesta, doble clic mientras espera, navegación con respuesta tardía y expiración de credencial. Se comprobó que la consulta no elimina un registro pendiente ajeno a su función ni genera POST. Las capturas a 1280 y 360 píxeles no mostraron desbordamiento horizontal.

El ensayo real aprobó 29 comprobaciones contra API y PostgreSQL exclusivos con dos identidades. La preparación creó una reserva de dos cupos mediante la API de pruebas. La primera identidad consultó su UUID; la segunda recibió 404 para esa reserva. El propietario recibió también 404 para un UUID inexistente. Se verificó igualdad de código HTTP y cuerpo de error para ambos casos, además del mensaje genérico de interfaz. La interfaz de consulta produjo cero POST.

La primera ejecución real se detuvo porque creación y consulta serializan UTC con formatos ISO distintos. Se corrigió la comprobación para comparar el instante de ambas fechas, sin cambiar el contrato ni la fecha mostrada. El segundo ensayo reutilizó la clave idempotente de preparación y no creó otra reserva. audit_s11.py confirmó capacidad 25, disponibilidad 23, una reserva confirmada de dos cupos y un outbox, sin claves duplicadas. El worker no se inició para conservar el outbox auditable. PV11 queda verificado en este laboratorio local.

La extracción del comprobante compartido se verificó con 58 comprobaciones adicionales de regresión S09. Sus resultados están dentro de S11 y no sobrescriben evidencia publicada. Los ensayos no acreditan Kubernetes, OpenShift, entrega de correo ni una evaluación integral con lector de pantalla.

## Reproducción y límites

frontend/testing/Start-S11.ps1 inicia PostgreSQL y API exclusivos con dos identidades y frontend en localhost:5184. Los secretos aleatorios permanecen en .runtime/s11 excluido de Git. verify-lookup.mjs --real recibe credential y other como JSON por stdin. S11_FIXTURE_KEY permite reutilizar una clave de preparación existente; el valor predeterminado es s11-lookup-fixture-v1. Conservar la misma clave al repetir el ensayo evita crear otra reserva de preparación.

S11_BROWSER_URL y S11_EVIDENCE_DIR configuran destino y evidencia. browser_loopback.py 5184 permite acceso desde el navegador del contenedor con contexto seguro local. El puente no pertenece al despliegue. audit_s11.py comprueba únicamente la base exclusiva reservas_s11. Las bases anteriores y la habitual no se modificaron durante estos ensayos.

Se entregan consulta y comprobante compartido, entorno de prueba, evidencias, Markdown, Word y Mermaid editable. El Word mantiene Times New Roman 12, texto negro e índice actualizable. Consulta, acceso y conservación del comprobante no sustituyen la salida completa pendiente de S13. La función permanece en pruebas hasta ese cierre. S12 no se inicia y commit y push a origin/master requieren aprobación expresa según AGENTS.md.
