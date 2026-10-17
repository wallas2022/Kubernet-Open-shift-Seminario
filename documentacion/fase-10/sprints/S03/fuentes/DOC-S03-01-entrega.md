# Entrega de S03 cliente HTTP y resultados inciertos

Documento DOC-S03-01. Requisito RN07. Fecha 17 de octubre de 2026. Estado de entrega local para revisión. El usuario autorizó iniciar S03 mediante «autorizao S03». Esta entrega prepara la comunicación de las futuras pantallas, sin habilitar todavía acceso ni reservas en la interfaz.

## Objetivo y alcance

Se implementa un cliente HTTP con timeout inicial de 15 segundos, errores normalizados y clasificación conservadora del POST. Un fallo de espera no se presenta como reserva rechazada. Ninguna llamada se repite automáticamente. Se añaden validadores de respuestas, conexión con el lector de sesión y contrato de operación pendiente sin token. La persistencia y recuperación real se implementarán en S08 y S10.

## Análisis y casos de uso

CU S03 01 Consultar. Una futura pantalla solicita catálogo, disponibilidad o reserva autorizada. El cliente obtiene la credencial actual en memoria, valida identificadores y envía un GET local. Devuelve datos validados o un fallo de lectura, sin mostrar cuerpos arbitrarios del servidor.

CU S03 02 Enviar una intención. El controlador futuro proporciona clave de idempotencia, evento y cantidad. El cliente toma una copia de esos valores, envía un único POST y conserva la distinción entre 201 nueva y 200 repetida. El cuerpo debe coincidir con el evento y cantidad solicitados. S03 no genera la clave ni guarda la operación.

CU S03 03 Interrumpir o recibir un resultado ilegible. Una cancelación anterior al envío produce not-sent. Un POST ya enviado que pierde conexión, agota su espera o recibe una respuesta no verificable produce uncertain. Se devuelve el control sin repetir la solicitud. La recuperación manual con la misma intención se implementará en S10.

## Diseño de la solución

createApiClient ofrece métodos tipados por endpoint y permite configurar timeoutMs. useApiClient obtiene readCredential de SessionContext y crea el cliente sin retener una copia del token entre llamadas. El timeout abarca tanto la espera de headers como la lectura del cuerpo. Se limpian temporizadores y listeners al resolver. La cancelación aborta la espera del navegador; no demuestra cancelación de una transacción del servidor.

Las rutas solo contienen identificadores UUID validados y el prefijo /api. X-Api-Key e Idempotency-Key viajan en headers. La petición omite cookies y caché, suprime referrer y rechaza redirecciones. El cliente no escribe en almacenamiento ni registra valores privados. Un lector de credencial ausente o inválido impide el envío.

ApiResult contiene éxito con status y data, o fallo con kind, outcome y code. Los códigos se seleccionan de una lista controlada, comprobando el estado HTTP. Se interpretan error y detail, incluida la lista de validación 422, sin copiar mensajes ni inputs arbitrarios. HTML, cuerpo vacío y esquemas incompatibles se resuelven como fallos controlados. Los datos de éxito se reconstruyen con los campos permitidos.

| Situación | Lectura GET | Envío POST |
| --- | --- | --- |
| Validación local o cancelación previa | not-sent | not-sent |
| Respuesta válida y contrato correcto | Éxito 200 | Éxito 200 o 201 |
| Rechazo conocido 401 404 409 o 422 | read-failed | rejected |
| Timeout red cancelación posterior o protocolo | read-failed | uncertain |
| 5xx o error HTTP desconocido | read-failed | uncertain |

Un conflicto de idempotencia indica rechazo de ese envío, no ausencia de una operación anterior. El controlador futuro deberá resolverlo según el código y conservar la intención cuando corresponda. Retry-After en 429 o 503 solo aporta orientación en segundos, nunca programa otro envío. El contrato PendingOperation contiene versión, clave, evento, cantidad, huella, fecha y estado; no implementa todavía persistencia y no incluye credencial ni respuesta completa.

## Verificación ejecutada

Se ejecutaron npm test, npm run build y npm run verify:secrets en el contenedor Node 22 del proyecto. El navegador se ejecutó con la imagen Playwright 1.58.2. Las versiones y resultados exactos quedan en evidencias/frontend-s03. Los tests de timeout usan esperas reducidas configuradas para evitar demoras de 15 segundos en cada caso; el valor predeterminado del cliente es 15000 ms.

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Tests Node | 19 pruebas aprobadas | resultados.json |
| Tipos y compilación | Aprobados | resultados.json |
| Control de secretos | 12 controles aprobados | secrets.json |
| Chromium con respuestas interceptadas | 10 casos aprobados | http-browser.json |

Los tests incluyen lectura con credencial actual, rechazo de entradas locales, error y detail, HTML, vacío, JSON inválido, contratos de datos, 200 y 201, timeout durante headers y cuerpo, cancelación, Retry-After y ausencia de reintentos. Un servidor HTTP efímero simula pérdida de respuesta después de un efecto en un contador; confirma que el cliente clasifica el resultado como incierto y no repite el POST. Ese contador no equivale a un commit de PostgreSQL.

Chromium comprueba diez escenarios con respuestas interceptadas, headers sin credencial en URL o registros y una solicitud por acción. No se envían solicitudes al backend real. La primera ejecución del ensayo falló porque su interceptor coincidía también con la ruta del módulo del cliente; se restringió a /api en la raíz y la ejecución posterior pasó. El fallo inicial no se contabiliza como éxito.

## Límites y entrega

La vista sigue siendo el panel local de S02 y no consume el cliente todavía. Por ello la compilación de esa vista elimina el módulo HTTP no utilizado; los tests, el chequeo de tipos y la carga del módulo en Chromium verifican su implementación. No se realizó autenticación real, reserva, prueba de inventario ni recuperación con respuesta perdida después de un commit real. PV08 completo permanece en S10. Tampoco se entrega persistencia, bloqueo de doble envío de interfaz ni despliegue de producción.

Se entregan código, pruebas, evidencia sin credenciales, fuente Markdown, Word y Mermaid editable. El Word mantiene Times New Roman 12, texto negro, tablas con encabezados negros y blancos e índice actualizable. La entrega requiere aprobación expresa antes de commit y push a origin/master. S04 no está autorizado.

## Referencias

Contrato contrastado con aplicacion/reservas/api.py y store.py y con DOC-10-04. Documentación consultada: Fetch API, https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch y Request redirect, https://developer.mozilla.org/en-US/docs/Web/API/Request/redirect.
