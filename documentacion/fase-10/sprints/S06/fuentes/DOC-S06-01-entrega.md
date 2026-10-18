# Entrega de S06 disponibilidad de un evento

Documento DOC-S06-01. Requisito RF03. Fecha 17 de octubre de 2026. Estado de entrega local para revisión. Después de publicar S05 como 9f23657 e indicar que S06 requería autorización, el usuario respondió «aprobado». Se inició el trabajo local de S06; esta entrega requiere aprobación independiente antes de commit y push.

## Objetivo y alcance

Permitir seleccionar un evento del catálogo y consultar su disponibilidad mediante GET /api/eventos/{id}/disponibilidad. Mostrar identificador, capacidad, cupos y momento de lectura; actualizar por acción explícita y diferenciar falta de cupos, evento inexistente y error técnico. La lectura es informativa y no garantiza inventario. El formulario y el envío de reservas pertenecen a sprints posteriores.

## Análisis y casos de uso

CU S06 01 Consultar un evento. El participante pulsa Consultar disponibilidad en una tarjeta. La pantalla conserva su nombre de catálogo y consulta el endpoint individual por UUID. Mientras espera no muestra como nuevos los cupos antiguos de la tarjeta. Una respuesta válida presenta id, capacity y available del evento solicitado y el momento de lectura con zona horaria del navegador.

CU S06 02 Actualizar los cupos. El participante pulsa Actualizar disponibilidad. La acción se bloquea durante la espera y no permite peticiones duplicadas. Una lectura correcta reemplaza valores y fecha. Si falla una actualización, los datos anteriores y su fecha se conservan con aviso de Disponibilidad desactualizada. Sin lectura previa, el error no inventa números.

CU S06 03 Encontrar cero cupos o un evento no disponible. Cero se presenta como un valor válido con aviso Sin cupos y la reserva bloqueada. Un 404 retira cualquier lectura anterior y muestra Evento no disponible, con retorno al catálogo. No se presenta un 404 como cero cupos ni se permite continuar con datos previos de ese evento.

CU S06 04 Volver o cambiar de evento. Volver al catálogo conserva su lectura con su fecha y restablece el foco al título. Seleccionar otro evento crea una vista independiente. Se abortan lecturas de la vista anterior y sus respuestas tardías no pueden sobrescribir la selección nueva. Un 401 elimina la sesión y solicita reingreso. Recargar también exige la clave.

## Diseño e implementación

CatalogPage mantiene el evento seleccionado en memoria y abre AvailabilityPage con una clave de componente basada en su UUID. El catálogo no se actualiza automáticamente al volver: sus cupos siguen correspondiendo a la fecha que muestra. El nombre del evento procede de esa lectura del catálogo; los números de disponibilidad proceden siempre del endpoint individual.

useAvailability coordina data, loadedAt y estados loading, ready, refreshing, error y not-found. Usa el cliente HTTP de S03, que valida el UUID y comprueba que la respuesta corresponde al evento solicitado. Una referencia de solicitud impide lecturas simultáneas; AbortController y la comprobación de instancia activa evitan aplicar resultados tardíos. La preparación de StrictMode no se convierte en una consulta duplicada.

La pantalla presenta carga, errores anunciados, fecha, datos reales y controles Actualizar disponibilidad y Volver al catálogo. Se mantiene texto visible que explica que leer cupos no garantiza inventario. Reservar permanece deshabilitado con cero cupos. También sigue deshabilitado con cupos positivos porque el formulario y el envío todavía no están implementados; no se simula una reserva ni se declara habilitada una acción futura.

## Verificación ejecutada

Se ejecutaron npm test, npm run build y npm run verify:secrets en Node 22.23.2 y npm 10.9.8. Chromium 145.0.7632.6 se ejecutó mediante Playwright 1.58.2. El código integrado se sirvió desde Vite en localhost:5180.

| Comprobación | Resultado observado | Evidencia |
| --- | --- | --- |
| Regresión Node de base y transporte | 19 pruebas aprobadas | resultados.json |
| Tipos y compilación integrada | Aprobados | resultados.json |
| Controles de secretos | 12 controles aprobados | secrets.json |
| Disponibilidad controlada | 21 comprobaciones aprobadas | availability-controlled.json |
| Disponibilidad contra API real | 6 comprobaciones aprobadas | availability-real.json |
| Regresión del catálogo de S05 | 28 comprobaciones aprobadas | regresion-catalogo/catalog-controlled.json |

PV03 y PV04 se comprobaron con fixtures explícitos y lecturas reales en su alcance de disponibilidad. Los casos controlados usan cupos individuales distintos de los de la tarjeta y comprueban la fuente correcta. Incluyen cero, 404 después de una lectura válida, 401, 503, red caída, HTML y contrato inválido. Verifican fecha conservada ante fallo, retiro de datos en 404, actualización única y respuesta tardía de un evento anterior sin alterar el nuevo.

Las capturas de escritorio y móvil se realizaron a 1280 y 360 píxeles sin desbordamiento horizontal. Se comprobaron foco al título del evento y al volver al catálogo. Esto no cierra la evaluación integral de accesibilidad de S17 ni la adaptación completa de S16.

La prueba real validó el acceso, seleccionó un evento del catálogo, comparó sus campos con el endpoint individual y realizó una actualización con un solo GET adicional. La clave se obtuvo y transmitió por stdin solo en memoria, sin guardarla en argumentos, archivos ni evidencia. Los ensayos verificaron headers, URL, almacenamiento y registros sin conservar el valor. La regresión del catálogo se guardó dentro de S06 para no sobrescribir la evidencia histórica de S05.

## Límites y revisión

No se modificó el backend ni se crearon reservas o cambios de inventario. Los estados cero, errores y cambios de evento controlados pertenecen a interceptores de prueba; pantalla-disponibilidad-real.png corresponde a la API local. No se implementó formulario, generación de intención, POST ni recuperación. Las respuestas fallidas no se presentan como reservas rechazadas porque en este sprint no se envía ninguna reserva.

Se entregan código de selección y disponibilidad, ensayo reproducible, guías, evidencia sin claves, informe Markdown y Word y Mermaid editable S06-disponibilidad-evento.mmd. El Word mantiene Times New Roman 12, texto negro, encabezados de tabla negros con texto blanco e índice actualizable. La entrega se mantiene local y requiere aprobación para commit y push a origin/master. S07 no está autorizado.
