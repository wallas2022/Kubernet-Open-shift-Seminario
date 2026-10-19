# Entrega S08 Creación idempotente de reservas

Documento DOC-S08-01. Fecha 19 de octubre de 2026. Requisito RF05. Estado en revisión local, sin commit ni push.

## Resultado y alcance

S08 conecta la cantidad revisada con POST /reservas. El motor genera una clave por intención, congela evento y cantidad y guarda un registro pendiente en sessionStorage antes de enviar. Si no puede guardar y verificar ese registro, bloquea el envío. La credencial permanece en memoria; el registro contiene únicamente su huella SHA256, versión, evento, cantidad, clave de operación, fecha y estado.

CreationProvider mantiene un motor por aplicación y pestaña, independiente del formulario. Un bloqueo síncrono evita que dos clics durante el cálculo asíncrono de la huella creen dos intenciones. Navegar o recargar no autoriza una nueva intención si existe un registro pendiente, incluso si está corrupto. El transporte envía X-Api-Key e Idempotency-Key en encabezados y solo event_id y quantity en el cuerpo.

## Comportamiento y límites

Una confirmación válida muestra un estado básico de operación aceptada. El comprobante completo y la retirada del pendiente corresponden a S09. Los rechazos conocidos conservan el registro y bloquean una nueva intención de forma conservadora en esta entrega. Timeout, error de red, respuesta incompatible y fallo del servidor conservan la operación como incierta sin reintento automático. Si falla actualizar el estado incierto, permanece el registro original guardado antes del POST.

No se implementa recuperación ni salida completa. S10 deberá reutilizar la clave y el payload originales; S13 completará la limpieza con advertencia. El bloqueo es por pestaña, no una coordinación global entre pestañas o dispositivos. Intenciones independientes con claves diferentes pueden crear reservas distintas. La idempotencia del servidor se aplica a la combinación de cliente y clave.

## Verificación local

Se ejecutaron npm test, npm run build y npm run verify:secrets en Node 22 dentro de Docker. Pasaron las 34 pruebas Node, incluidos 12 casos nuevos del motor, la comprobación de tipos, la compilación y 12 controles de secretos. Los casos nuevos cubren doble clic antes de terminar la huella, payload inmutable, storage inaccesible o que pierde la escritura, registro existente o corrupto, cambio de identidad, entradas inválidas, timeout, interrupción y preservación del registro.

El ensayo scripts/verify-creation.mjs con respuestas interceptadas aprobó 74 comprobaciones en Chromium. Verificó 201 y 200, bloqueo de doble envío, persistencia anterior al POST, encabezados, rechazo por cupos, fallos de storage, respuesta perdida, respuesta incompatible, error 503, navegación y recarga sin reenvío. Incluyó foco, ausencia de desbordamiento a 1280 y 360 píxeles y búsqueda de la credencial sintética en almacenamiento, página, URL y registros.

El entorno real de prueba se define en frontend/testing/s08.compose.yaml. Usa PostgreSQL 18 exclusivo, capacidad inicial de 25 y API real de reservas; no inicia worker para poder contar outbox. Start-S08.ps1 prepara secretos aleatorios bajo .runtime/s08 excluido de Git. No debe ejecutarse el ensayo real contra la base habitual ni repetirse sin recrear su base efímera vacía.

El ensayo real aprobó 30 comprobaciones. Veinte repeticiones concurrentes de la clave y payload originales devolvieron 200 con el mismo UUID. Cambiar la cantidad manteniendo la clave devolvió 409 idempotency_conflict. Se descartó una respuesta después de obtener confirmación real y la interfaz conservó el pendiente tras recarga sin reenviar. Con 21 cupos restantes, 40 solicitudes concurrentes con claves distintas produjeron 21 creaciones y 19 rechazos por agotamiento.

La auditoría audit_s08.py comprobó directamente PostgreSQL: capacidad 25, disponibilidad cero, cantidad reservada 25, 23 reservas confirmadas y 23 registros outbox; cero reservas en estado pending y cero claves duplicadas por cliente. Las dos reservas de dos cupos y las 21 de un cupo explican los totales. PV06 y PV07 quedan verificados en este laboratorio exclusivo. La pérdida de respuesta se verifica solo como conservación y bloqueo; la recuperación explícita de PV08 sigue pendiente de S10.

## Reproducción y evidencia

Ejecutar frontend/testing/Start-S08.ps1 inicia el laboratorio exclusivo en localhost:5181. Para el ensayo real, verify-creation.mjs --real recibe un JSON con credential por stdin, nunca por argumentos o archivos de evidencia. S08_BROWSER_URL y S08_EVIDENCE_DIR configuran el destino. El navegador del contenedor puede usar browser_loopback.py como puente HTTP local para disponer de Web Crypto en un origen loopback. Este puente es una herramienta de pruebas y no pertenece al despliegue propuesto en S18.

Las evidencias están bajo evidencias/frontend-s08. Las pruebas con fixtures se identifican como intercepted-responses. Los fallos iniciales de infraestructura incluyeron falta de navegador en el contenedor Node y acceso al frontend mediante un alias sin contexto seguro; se resolvieron usando el contenedor documental con Chromium y el puente loopback. No acreditan fallos del backend ni éxito de pruebas de negocio.

## Revisión y publicación

Se entregan motor, integración React, pruebas, entorno aislado, fuente Markdown, Word y Mermaid editable. El Word conserva Times New Roman 12, texto negro, encabezados de tabla negros con letra blanca e índice actualizable. Los ensayos locales no acreditan despliegue Kubernetes, OpenShift, alta disponibilidad ni capacidad máxima. No habilitar esta función a participantes hasta completar S10 y S13.

La rama prevista es master y el destino documental registrado es origin/master. La entrega requiere aprobación expresa antes de commit y push, conforme a AGENTS.md. Los cambios preexistentes de otras fases quedan fuera de S08. No se autoriza el siguiente sprint mediante esta entrega.
