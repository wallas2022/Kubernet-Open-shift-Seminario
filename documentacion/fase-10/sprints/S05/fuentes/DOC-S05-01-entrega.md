# Entrega de S05 catálogo autenticado de eventos

Documento DOC-S05-01. Requisito RF02. Fecha 17 de octubre de 2026. Estado de entrega local para revisión. El usuario autorizó el siguiente sprint después de publicar S04 como 877e544. Esta entrega habilita P02 con lectura real del catálogo; no habilita todavía selección de evento ni reservas.

## Objetivo y alcance

Mostrar los eventos recibidos de la API con nombre, identificador, capacidad y cupos disponibles. Diferenciar carga, catálogo vacío y fallo de lectura. Permitir actualización explícita y conservar una lectura anterior únicamente con un aviso de desactualización cuando falla su actualización. El frontend no genera eventos ni cupos de demostración por su cuenta.

## Análisis y casos de uso

CU S05 01 Consultar el catálogo. El participante valida su acceso mediante S04 y entra a P02. El catálogo realiza una nueva consulta GET /api/catalogo con la credencial en memoria. Mientras espera, anuncia Cargando eventos sin tarjetas ficticias. Una respuesta válida muestra sus eventos o indica que el catálogo está vacío.

CU S05 02 Actualizar. El participante pulsa Actualizar catálogo. Se conserva la última lectura durante la espera y se deshabilita la acción. Un bloqueo inmediato evita peticiones duplicadas. Una respuesta válida reemplaza los datos, actualiza la hora de lectura y retira cualquier aviso de error previo.

CU S05 03 Recuperarse de un fallo. Si no existe lectura previa, el error explica que no se pudo cargar y ofrece Reintentar. Si existía una lectura, conserva sus valores y su fecha y muestra Información desactualizada. El error también marca como desactualizada una lectura anterior que estaba vacía. No se confunde error con ausencia de eventos.

CU S05 04 Reingresar. Un 401 o ausencia de credencial elimina la sesión y vuelve al acceso. Volver al acceso también elimina el contexto actual. Una nueva sesión inicia sin tarjetas de la anterior. Recargar exige reingresar la clave. No se implementa aún la salida con advertencia de reservas pendientes de S13.

## Diseño e implementación

WelcomePage muestra CatalogPage únicamente cuando SessionContext confirma el acceso. La validación de S04 y la lectura inicial de P02 son dos consultas independientes. No se agregan endpoints ni se modifica el backend. CatalogPage presenta cabecera, acciones, estado de lectura, aviso de error y tarjetas o estado vacío.

useCatalog mantiene data, status y loadedAt solo en memoria de su instancia. data null indica que aún no existe una lectura válida y se distingue de events vacío. status permite loading, ready, refreshing y error. El cliente de S03 valida cada respuesta antes de entregarla a esta pantalla. Los nombres se renderizan como texto de React, sin insertar HTML.

Una referencia de solicitud impide iniciar otra lectura mientras hay una activa. Al desmontar, se aborta la espera y se ignora cualquier respuesta tardía. La lectura inicial se difiere mediante una microtarea que puede cancelarse durante la preparación preliminar de StrictMode; no se requiere eliminar StrictMode ni se programan consultas periódicas. La credencial se obtiene del lector de SessionContext en cada llamada, sin persistencia.

Las tarjetas muestran los cuatro campos reales. Cero cupos se presenta como cero y se identifica como sin cupos en esa lectura. La interfaz no garantiza inventario ni ofrece todavía seleccionar o reservar. El aviso de disponibilidad aclara que puede cambiar. La hora mostrada corresponde a la última lectura correcta del catálogo, no a una garantía de disponibilidad futura.

## Verificación ejecutada

Se ejecutaron npm test, npm run build y npm run verify:secrets en el contenedor Node 22.23.2 con npm 10.9.8. Chromium 145.0.7632.6 se ejecutó mediante Playwright 1.58.2. El código integrado se sirvió desde el Vite local del proyecto en localhost:5180.

| Comprobación | Resultado observado | Evidencia |
| --- | --- | --- |
| Regresión Node de base y transporte | 19 pruebas aprobadas | resultados.json |
| Tipos y compilación integrada | Aprobados | resultados.json |
| Controles de secretos | 12 controles aprobados | secrets.json |
| Catálogo con respuestas controladas | 28 comprobaciones aprobadas | catalog-controlled.json |
| Catálogo contra API local real | 7 comprobaciones aprobadas | catalog-real.json |

La parte aplicable de PV03 y PV04 se verificó con fixtures identificados y lectura real. Los casos controlados cubrieron carga, campos exactos, cero cupos, nombres con texto semejante a HTML, 503, corte de red, HTML inesperado y contrato inválido. Se comprobó que un fallo conserva exactamente las tarjetas y fecha anteriores con aviso, que una lectura correcta sustituye los datos y retira el aviso, y que error inicial y catálogo vacío producen estados distintos.

También se verificaron bloqueo de actualización duplicada, 401 durante el catálogo, ausencia de datos de la sesión anterior tras reingreso, cancelación al volver al acceso y recarga. Las capturas a 1280 y 360 píxeles incluyen nombres largos e identificadores y no presentaron desbordamiento horizontal. Estas comprobaciones no equivalen al cierre integral de RN02 ni a una evaluación completa de accesibilidad de RN06.

La prueba real validó el acceso, comparó cada tarjeta con los campos recibidos de la API local y ejecutó una actualización con un solo GET adicional. La clave se tomó de la configuración del contenedor solo en memoria y se transmitió al ejecutor por stdin, sin escribirla ni incluirla en evidencia. Los ensayos revisaron headers, URL, almacenamiento y registros sin conservar credenciales.

## Límites y revisión

Solo se realizaron lecturas GET en el backend real. No se modificó inventario ni se crearon reservas. Los catálogos con nombres de prueba y los fallos técnicos pertenecen a interceptores explícitos; la captura pantalla-catalogo-real.png corresponde a la API local. No se implementaron disponibilidad individual de S06, formulario, POST, comprobante ni recuperación. Las pruebas históricas de acceso de S04 conservan su alcance original; la pantalla actual se verifica con verify-catalog.mjs.

Se entregan código, guía, ensayo reproducible, evidencia sin credenciales, informe Markdown y Word y Mermaid editable S05-catalogo-eventos.mmd. El Word usa Times New Roman 12, texto negro, encabezados de tabla negros con texto blanco e índice actualizable. La entrega se mantiene local y requiere aprobación antes de commit y push a origin/master. S06 permanece pendiente de autorización.
