# Entrega de S07 cantidad y revisión de reserva

Documento DOC-S07-01. Requisito RF04. Fecha 18 de octubre de 2026. Estado de entrega local para revisión. Tras publicar S06 como da21e75 y dejar S07 pendiente de autorización, el usuario respondió «aprobado». Se autorizó trabajo local de S07; el commit y push de esta entrega requieren aprobación posterior.

## Objetivo y alcance

Construir la preparación de cantidad P03 con validación estricta, revisión de evento y unidades y confirmación explícita. El participante puede corregir o cancelar antes de enviar. La confirmación de S07 es local: no genera una reserva ni ejecuta POST. La persistencia de intención, idempotencia y envío real corresponden a S08.

## Análisis y casos de uso

CU S07 01 Preparar cantidad. Con disponibilidad válida y positiva, Reservar abre un campo con etiqueta Cantidad de cupos. El participante introduce un entero entre 1 y 100, que tampoco debe superar los cupos de esa lectura. Cero cupos, lectura en curso o información desactualizada impiden abrir una nueva preparación.

CU S07 02 Corregir datos inválidos. Cero, 101, decimales, signos, texto, espacios, ceros iniciales y notación exponencial se rechazan sin conversiones. El mensaje se asocia al campo y el foco vuelve a la entrada. Un valor mayor que los cupos leídos produce un mensaje específico. Los valores booleanos o numéricos recibidos fuera del campo se rechazan en el validador.

CU S07 03 Revisar. Revisar cantidad valida la entrada y muestra nombre del evento, UUID y unidades antes de confirmar. Volver a editar conserva la entrada. Cancelar preparación descarta la revisión sin solicitudes de red. Una nueva preparación comienza en 1.

CU S07 04 Confirmar cantidad. Confirmar cantidad cambia únicamente el estado local a Cantidad revisada y explica que no se ha enviado ninguna reserva. Enviar reserva permanece deshabilitado. Modificar cantidad permite volver a editar. Este estado no se presenta como comprobante ni como reserva confirmada.

CU S07 05 Actualizar los cupos. Actualizar disponibilidad descarta la preparación y cualquier revisión anterior. Después de una nueva lectura válida, el participante debe preparar y revisar otra vez. Si los cupos pasan a cero, Reservar queda bloqueado. Recargar elimina la preparación y exige reingreso de la clave.

## Diseño e implementación

validateQuantity recibe unknown y disponibilidad numérica. Solo acepta cadenas decimales canónicas de 1 a 100 y no convierte otros tipos. Distingue formato inválido, cupos insuficientes y disponibilidad inutilizable. Esta comprobación mejora la experiencia; no sustituye la validación transaccional del servidor ni garantiza inventario futuro.

ReservationDraft mantiene entrada, fase, error y revisión solo en memoria. La fase permite editing, review y confirmed. La revisión copia y congela evento y cantidad validados, sin clave API ni clave de idempotencia. El componente no importa ni invoca el transporte HTTP. El campo es texto con inputMode numeric para permitir comprobar el formato sin las conversiones de un control numérico del navegador.

AvailabilityPage habilita Reservar únicamente con estado ready y cupos positivos. Al actualizar, cierra la preparación antes de iniciar la lectura. El componente se identifica por la lectura vigente, de modo que una lectura nueva no reutiliza una revisión anterior. Las cancelaciones restauran el foco al título del evento; la revisión y confirmación local enfocan su encabezado. Los errores usan alert y un vínculo descriptivo con el campo.

## Verificación ejecutada

Se ejecutaron npm test, npm run build y npm run verify:secrets en Node 22.23.2 y npm 10.9.8. Chromium 145.0.7632.6 se ejecutó mediante Playwright 1.58.2. El servidor local se reinició para servir el código integrado en localhost:5180.

| Comprobación | Resultado observado | Evidencia |
| --- | --- | --- |
| Regresión Node y validación de cantidad | 22 pruebas aprobadas | resultados.json |
| Tipos y compilación integrada | Aprobados | resultados.json |
| Controles de secretos | 12 controles aprobados | secrets.json |
| Formulario con respuestas controladas | 28 comprobaciones aprobadas | quantity-controlled.json |
| Formulario con lecturas reales | 20 comprobaciones aprobadas | quantity-real.json |
| Regresión de disponibilidad S06 | 21 comprobaciones aprobadas | regresion-disponibilidad/availability-controlled.json |

PV05 se verificó mediante pruebas de reglas y un recorrido automatizado de interfaz, con revisión visual de capturas. Las tres pruebas nuevas de Node cubren límites 1 y 100, formatos ambiguos y tipos no textuales, y cupos insuficientes o inválidos. Las otras 19 pruebas corresponden a regresión de base, sesión y transporte.

El navegador comprobó entrada inválida, límites válidos cuando proceden, correspondencia de evento y cantidad, foco, corrección, cancelación, nueva preparación, actualización que invalida la revisión, cero cupos y recarga. Se verificó que revisar y confirmar localmente no aumenta el número de solicitudes HTTP ni produce POST. Las capturas a 1280 y 360 píxeles no presentaron desbordamiento horizontal.

El ensayo real usó catálogo y disponibilidad del laboratorio, comprobó los formatos inválidos y preparó 1 y 100 con cupos suficientes. Confirmó la cantidad solo localmente. La clave se recibió por stdin desde memoria, sin guardarla en evidencia ni argumentos. La regresión de S06 se guardó dentro de S07 sin sobrescribir las evidencias publicadas. Los registros confirman cero POST y cero reservas creadas en ambos ensayos del formulario.

## Límites y revisión

No se implementó el envío de S08 ni la generación de Idempotency-Key, persistencia de operación, comprobante o recuperación. El botón Enviar reserva deshabilitado hace visible este límite. No hubo cambios en el backend, reservas ni modificaciones de inventario. La disponibilidad leída puede cambiar y deberá volver a ser validada por el servidor al enviar una reserva en los sprints posteriores.

Las pruebas automatizadas y capturas no equivalen a una evaluación integral con lector de pantalla ni al cierre de S16 o S17. El usuario puede revisar el recorrido en localhost:5180: acceder, consultar disponibilidad, pulsar Reservar, revisar y confirmar cantidad. El resultado debe indicar que todavía no se ha enviado una reserva.

Se entregan código, reglas y pruebas, ensayo reproducible, guías, evidencia sin credenciales, informe Markdown y Word y Mermaid editable S07-cantidad-confirmacion.mmd. El Word mantiene Times New Roman 12, texto negro, encabezados de tabla negros con texto blanco e índice actualizable. La entrega queda pendiente de aprobación para commit y push a origin/master. S08 no está autorizado.
