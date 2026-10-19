# Frontend de reservas del seminario

S01 implementa la base React y TypeScript y los controles RN03. S02 añade SessionContext para RN04 y S03 el cliente HTTP de RN07. S04 valida el acceso, S05 muestra el catálogo y S06 consulta disponibilidad individual. S07 permite preparar, revisar y confirmar una cantidad localmente. El envío real de reservas sigue pendiente de S08.

## Arranque local

Requiere Node 22, versión 22.12 o superior dentro de esa rama. Las dependencias directas tienen versiones exactas y package-lock.json fija las transitivas. Desde `frontend`:

```powershell
npm ci
npm run dev
```

Abrir http://127.0.0.1:5173. Si el puerto está ocupado, usar `npm run dev -- --port 5180`. La vista de esta sesión está disponible en http://127.0.0.1:5180 mediante un contenedor de desarrollo. El servidor se publica solo en localhost.

Opcionalmente copiar `.env.example` a `.env.local`. Solo contiene DEV_API_TARGET, una dirección del servidor local. En Windows nativo el destino es `http://127.0.0.1:8082`; en el contenedor de desarrollo es `http://host.docker.internal:8082`. La configuración también admite `http://api:8080` para una futura red Compose. No requiere ni lee archivos de credenciales del backend.

## Política de credenciales

No incluir claves en archivos del frontend, variables públicas, query strings o registros. Se rechazan todas las variables VITE_ por ahora; no hay ninguna variable pública permitida. Los valores del entorno nunca se imprimen al rechazar la configuración. envPrefix queda vacío, publicDir está deshabilitado y no se generan sourcemaps de producción.

El destino del proxy solo admite HTTP en los nombres locales indicados, sin usuario, contraseña, parámetros ni ruta adicional. Las peticiones /api con query se rechazan sin reflejar contenido. Las rutas .env se bloquean antes del fallback de la SPA, también con nombre codificado. El servidor de desarrollo restringe los archivos a la raíz frontend.

Las claves se transportan en headers, por cliente. S01 comprueba esa frontera con claves aleatorias sintéticas y un receptor temporal. No se incorporan claves de la demo real al código ni a los entregables. La API autoriza las solicitudes; estas restricciones no sustituyen un gestor de secretos de producción.

## Comprobaciones

```powershell
npm test
npm run build
npm run verify:secrets
npm audit
```

verify:secrets compila con una variable privada sintética, inspecciona artefactos, verifica el rechazo de VITE_ desde entorno y archivo, levanta un receptor temporal y comprueba headers, URL, bloqueo de query y registros. Genera `.verification/secrets.json` sin conservar los valores sintéticos. Usa temporalmente el puerto 5187, que debe estar libre. No sobrescribe un archivo `.env.securitycheck.local` existente.

La revisión automatizada de navegador usa Playwright y necesita Chromium instalado o la imagen `mcr.microsoft.com/playwright:v1.58.2-noble`. `node scripts/verify-browser.mjs` revisa la vista inicial y guarda dos capturas. S01_BROWSER_URL y S01_EVIDENCE_DIR permiten configurar URL y carpeta de evidencia sin credenciales. No acredita las revisiones completas de RN01, RN02 ni RN06.

## Compilación y límites

`npm run build` comprueba tipos y genera dist. `npm run preview` sirve únicamente la compilación estática en localhost:4173; no ofrece un proxy de producción. Nginx, imagen de aplicación, Compose, sondas y clúster se implementarán en S18. Ninguna operación de reserva se ejecuta al abrir la pantalla inicial.

S02 usa un almacén por instancia de SessionProvider, sin almacenamiento persistente. `useSession()` ofrece hasCredential, setCredential, readCredential y clearCredential. S04 añade isAuthenticated y confirmCredential: la presencia temporal de una clave no equivale a acceso validado. El campo enmascarado se vacía después del envío; pagehide o desmontar el proveedor elimina la referencia del almacén. Una recarga crea un almacén vacío. No se garantiza borrado físico de strings por el recolector de memoria, ni se controla un gestor de contraseñas o extensión ajena a la aplicación. El panel temporal de S02 queda como fuente histórica sin mostrarse en la aplicación. No se implementa todavía el registro de reserva pendiente, ni la salida con advertencia de S13.

Las comprobaciones verify-browser.mjs, verify-session.mjs y verify-access.mjs corresponden a las pantallas históricas de S01, S02 y S04. verify-catalog.mjs comprueba el catálogo, verify-availability.mjs la selección y verify-quantity.mjs el formulario de S07. En Docker se comparte la red de seminario-frontend-s01-preview y se usa http://127.0.0.1:5173 para respetar los hosts permitidos. S01 a S06 están publicados; S07 está aprobado. La publicación remota queda a cargo del usuario. Al repetir pruebas anteriores, usar una carpeta de evidencia nueva.

## Cliente HTTP de S03

`createApiClient({ readCredential, timeoutMs })` ofrece catalog, availability, reservation y createReservation. El timeout por defecto es 15000 ms e incluye lectura del cuerpo. `useApiClient()` conecta el lector de SessionContext sin conservar una copia del token entre solicitudes. Las rutas son locales /api, sin query; X-Api-Key y la clave de idempotencia viajan en headers. Se omiten cookies, caché y referrer y se bloquean redirecciones. No hay reintentos automáticos de ningún método.

Los resultados son una unión ApiResult: éxito con status y data validado, o fallo con kind, outcome y code controlados. Un POST enviado con timeout, cancelación, red caída, 5xx o respuesta inesperada conserva outcome uncertain. Una lectura fallida usa read-failed; un dato inválido local o cancelación previa usa not-sent. Solo los errores conocidos de rechazo del backend permiten rejected. Un conflicto de idempotencia rechaza ese envío, pero no demuestra que una intención anterior no exista: su resolución corresponde al controlador futuro. Nunca borrar automáticamente una operación pendiente a partir de un error genérico.

Retry-After para 429/503 solo aporta segundos de orientación; no programa otro envío. Error y detail se normalizan por lista de códigos conocidos y estado HTTP. No se exponen mensajes arbitrarios, cuerpos de error ni excepciones del fetch. Las respuestas HTML, vacías o incompatibles producen un resultado controlado. La API del cliente exige una intención con clave suministrada; no genera ni persiste operaciones. PendingOperation define el contrato futuro sin credencial; S08/S10 implementarán persistencia y recuperación.

`node scripts/verify-http.mjs` prueba respuestas controladas en Chromium sin llamar al backend. S03_BROWSER_URL y S03_EVIDENCE_DIR configuran la URL de desarrollo y las evidencias. La carga dinámica del cliente usa el servidor Vite, no preview. En Docker se ejecuta con la misma red indicada para S02 y S03_BROWSER_URL=http://127.0.0.1:5173. Los tests Node incluyen un servidor HTTP efímero que simula una respuesta perdida después de incrementar un contador; esto no verifica un commit de PostgreSQL ni PV08 completo. Desde S04, el cliente sí se incluye en los assets porque el acceso lo utiliza.

## Acceso de S04

Abrir http://127.0.0.1:5180 e ingresar una clave proporcionada por el instructor. Entrar ejecuta un GET /api/catalogo por el proxy local. Un 200 con events válido, vacío o con eventos, activa la sesión. Un 401 muestra clave no válida; un error de red, timeout, 5xx, HTML o respuesta incompatible muestra fallo técnico. Los fallos limpian la credencial. No se solicita la clave mediante URL ni se precarga desde configuración. No se envían POST.

El campo se vacía antes de la espera y el formulario queda deshabilitado mientras se valida. Un bloqueo inmediato evita también dos eventos submit en el mismo ciclo. pagehide aborta la espera e impide que una respuesta tardía reactive el acceso. Desde S05, tras validar se navega al catálogo, que vuelve a consultar los datos; Volver al acceso elimina la credencial. La salida con advertencia sobre reservas pendientes sigue en S13.

## Catálogo de S05

CatalogPage solo se muestra con sesión validada. useCatalog consulta GET /api/catalogo, mantiene datos y fecha de la última lectura solo en memoria y permite una lectura a la vez. Se renderizan nombre, UUID, capacidad y available recibidos y validados por el cliente. No se inventan cupos ni se insertan nombres como HTML. No hay polling ni solicitudes POST.

Un fallo inicial ofrece Reintentar sin mostrar datos ni confundirlo con events vacío. Un fallo de actualización conserva exactamente la lectura anterior con aviso de Información desactualizada y su hora original, incluso si estaba vacía. Una lectura correcta reemplaza la anterior y retira el aviso. Un 401 elimina la sesión; salir de la vista aborta la espera e impide aplicar resultados tardíos. El catálogo no se conserva entre sesiones ni tras recarga. S06 incorpora Consultar disponibilidad por evento.

## Disponibilidad de S06

Consultar disponibilidad abre una vista por evento y ejecuta GET /api/eventos/{id}/disponibilidad. El UUID se valida por el cliente de S03 y la respuesta debe corresponder al mismo evento. Nombre del evento procede de la última lectura del catálogo; id, capacity y available proceden del endpoint individual. No se usan los cupos de la tarjeta como sustituto de una lectura de disponibilidad.

La pantalla muestra carga, campos reales, momento de lectura con zona horaria del navegador y Actualizar disponibilidad. Un fallo técnico con datos anteriores conserva sus valores y fecha con aviso de desactualización. Sin datos previos, no inventa números. Un 404 retira la lectura anterior y muestra Evento no disponible; un 401 elimina la sesión. Volver o seleccionar otro evento aborta la espera e impide que una respuesta tardía sobrescriba la nueva selección.

Cero cupos muestra un aviso explícito y bloquea Reservar. Desde S07, Reservar abre la preparación únicamente con lectura válida, actual y positiva. Durante actualización o tras error técnico se bloquea hasta obtener otra lectura válida. No se simula una reserva. La lectura no garantiza inventario. Volver al catálogo conserva su lectura anterior con su fecha.

## Salida y limpieza de S13

Salir cierra el contexto de esta pestaña. Si hay preparación, envío, pendiente válido o corrupto, o storage inaccesible, advierte antes de borrar la recuperación local. Cancelar y Escape conservan el registro. Confirmar elimina la credencial en memoria y verifica el borrado del registro propio, incluida su huella. La aplicación recrea proveedores y pantallas, retira comprobantes y descarta respuestas tardías. Si el borrado falla, vuelve al acceso con aviso de limpieza incompleta y conserva el bloqueo del pendiente. Salir no cancela reservas ni revoca la clave del servidor. Cambiar de clave mediante los controles anteriores conserva el pendiente y sigue siendo una acción diferente.

`node scripts/verify-exit.mjs` ejecuta la matriz controlada en el laboratorio existente de localhost:5185. `--real` reutiliza la clave del laboratorio exclusivo S12 desde su archivo ignorado `.runtime/s12/compose.env`, realiza solo lecturas y verifica que salir no revoca la clave. No imprime credenciales. S13_BROWSER_URL y S13_EVIDENCE_DIR configuran URL y evidencia. Las auditorías S12 antes y después conservan inventario, reserva y outbox. Evidencia en evidencias/frontend-s13. Entrega S13 aprobada para commit y push el 19 de octubre de 2026; S14 no iniciado. Las referencias siguientes a S13 pendiente conservan el alcance histórico de incrementos anteriores.

## Cantidad y revisión de S07

ReservationDraft delega el envío al motor de S08 a través de CreationContext. El campo de cantidad es texto con teclado numérico para evitar conversiones ambiguas del navegador. validateQuantity acepta únicamente texto decimal canónico de 1 a 100 y comprueba que no supere available de la lectura actual. Rechaza espacios, signos, ceros iniciales, decimales, notación exponencial, texto, booleanos y números recibidos sin formato de campo.

Revisar cantidad muestra nombre, UUID y unidades antes de Confirmar cantidad. Volver a editar mantiene la entrada; Cancelar preparación la descarta. La confirmación de cantidad es local; desde S08, Enviar reserva realiza una solicitud explícita mediante el motor de creación. Actualizar disponibilidad cierra la preparación y obliga a revisarla de nuevo; el borrador no persiste, pero una intención enviada conserva su registro pendiente.

`node scripts/verify-quantity.mjs` verifica formatos, límites, revisión, cancelación, actualización y ausencia de POST. `--real` recibe credential por stdin y usa lecturas reales de catálogo y disponibilidad, sin crear reservas. S07_BROWSER_URL y S07_EVIDENCE_DIR configuran URL y evidencia. Las pruebas unitarias también comprueban booleanos y valores no textuales. La confirmación local no equivale a un comprobante ni a una operación pendiente persistida.

## Creación idempotente de S08

CreationProvider conserva un motor por pestaña. Enviar reserva congela el payload revisado, genera una clave aleatoria, calcula la huella SHA256 de la credencial y guarda y verifica el pendiente antes del POST. Un registro existente o corrupto y cualquier fallo de storage bloquean la creación. El motor bloquea el doble clic y conserva el pendiente tras aceptación, rechazo o resultado incierto; S09 incorporará comprobante y S10 recuperación. No hay reintento automático ni coordinación entre pestañas.

El laboratorio exclusivo se inicia con `testing/Start-S08.ps1`, en localhost:5181. `scripts/verify-creation.mjs` usa fixtures y `--real` requiere credential por stdin y una base exclusiva inicialmente vacía. El ensayo real consume los 25 cupos; para repetirlo se debe recrear únicamente el entorno efímero S08. `testing/audit_s08.py` verifica inventario, reservas y outbox sin registrar credenciales. La entrega y sus límites están en `documentacion/fase-10/sprints/S08/`. No habilitar a participantes hasta S10 y S13.

## Comprobante de S09

ReservationReceipt muestra UUID de reserva y evento, cantidad, estado y fecha del servidor. El motor distingue 201 creado y 200 recuperado, valida otra vez evento y cantidad y conserva una copia inmutable en memoria. Solo retira el pendiente original ante confirmación válida; si falla la limpieza, mantiene el comprobante con advertencia. Actualizar disponibilidad y recibir 503 o 404 no lo oculta. El comprobante se pierde al recargar y el motor mantiene el bloqueo de otra intención durante esta sesión. Recuperación, consulta por UUID, salida completa y copia del identificador corresponden a los siguientes sprints.

`testing/Start-S09.ps1` inicia la base efímera exclusiva y frontend en localhost:5182. `scripts/verify-receipt.mjs` prueba fixtures; `--real` recibe credential por stdin y verifica una repetición controlada del servidor con el mismo UUID. `testing/audit_s09.py` espera dos reservas, cuatro cupos y dos outbox después de ese ensayo. La regresión de S08 se ejecuta contra este frontend con S08_BROWSER_URL y S08_EVIDENCE_DIR propios de S09 para conservar las evidencias publicadas.

## Recuperación de S10

Tras recarga o resultado incierto, RecoveryPage muestra el pendiente y bloquea otra intención. Acceder no reenvía la reserva. Recuperar operación pendiente compara la huella de la credencial y vuelve a leer el registro antes de enviar la clave y el payload originales, sin generar una intención nueva. Otra identidad, corrupción, cambios concurrentes o storage inaccesible bloquean el POST. Cada intento requiere una acción explícita; un nuevo fallo conserva el pendiente. Usar otra clave de laboratorio elimina la credencial en memoria y conserva el registro para corregir la identidad. La salida completa queda en S13.

`testing/Start-S10.ps1` inicia PostgreSQL y API exclusivos, con dos identidades de prueba y frontend en localhost:5183. `scripts/verify-recovery.mjs --real` recibe credential y other por stdin, descarta respuestas después de la confirmación del servidor y recupera con 200 y el mismo UUID. Requiere una base exclusiva inicialmente vacía. `testing/audit_s10.py` espera una reserva de dos cupos, disponibilidad 23 y un outbox. Las evidencias y límites están en `documentacion/fase-10/sprints/S10/`. Si se pierde sessionStorage, no se puede reconstruir la clave original. No habilitar a participantes hasta completar S13.

## Consulta por UUID de S11

Desde el catálogo, Consultar una reserva por UUID abre una lectura autorizada. El formulario rechaza UUID inválido sin HTTP, consulta con la clave en encabezado y presenta ReservationReceiptView. Un nombre de evento solo procede del catálogo cuando el UUID coincide. Reserva ajena e inexistente comparten mensaje genérico; 401 vuelve al acceso y un fallo técnico no refleja detalles del servidor. Cambiar el UUID retira el comprobante previo y volver aborta la espera. No hay historial, POST ni modificación del pendiente.

`testing/Start-S11.ps1` inicia el entorno exclusivo en localhost:5184 con dos identidades. `scripts/verify-lookup.mjs --real` recibe credential y other por stdin y prepara una reserva idempotente; mantener S11_FIXTURE_KEY al repetir sobre la misma base. `testing/audit_s11.py` espera una reserva de dos cupos y un outbox. Los resultados controlados y reales y la regresión de S09 quedan en evidencias/frontend-s11. S11 aprobado; su publicación se autorizó junto con S12. La salida completa permanece pendiente de S13.

## Mensajes y errores de S12

messages.ts utiliza solo errores normalizados. Distingue falta de cupos, evento eliminado, conflicto de clave, validación, indisponibilidad temporal y resultado incierto. Un 401 posterior explica el reingreso y elimina la credencial, conservando el pendiente. Las lecturas fallidas conservan datos anteriores marcados y el comprobante ante fallo de disponibilidad. Retry-After orienta una espera, sin programar solicitudes. El ajuste del espacio entre filas mantiene los avisos de acceso separados del pie.

`testing/Start-S12.ps1` inicia un laboratorio exclusivo de un cupo en localhost:5185. `scripts/verify-errors.mjs` comprueba 20 escenarios controlados; `--real` recibe dos identidades por stdin y ejecuta una carrera que consume ese cupo. No repetir la carrera sobre la base agotada. `testing/audit_s12.py` espera una reserva de un cupo y un outbox. S12_SCENARIOS permite revisar escenarios seleccionados y guarda su informe aparte. S11 tiene commit local db16f1d; su publicación y la entrega S12 fueron aprobadas el 19 de octubre de 2026. S13 no está iniciado.

`node scripts/verify-availability.mjs` prueba respuestas controladas y `--real` recibe credential por stdin para comprobar el endpoint de un evento de la API local. S06_BROWSER_URL y S06_EVIDENCE_DIR permiten configurar URL y destino. Los ensayos solo usan GET; no crean reservas. Las capturas reales y las de fixtures se identifican en evidencias/frontend-s06.

`node scripts/verify-catalog.mjs` revisa carga, datos, vacío, errores, lectura desactualizada, actualización, cambios de sesión y dos anchos de pantalla. S05_BROWSER_URL y S05_EVIDENCE_DIR configuran URL y evidencia. `--real` recibe credential por stdin, valida tarjetas contra la API local y actualiza con un GET adicional, sin crear reservas. Las capturas con fixtures y la captura de API real están identificadas en evidencias/frontend-s05. Las capturas no acreditan la revisión integral de accesibilidad o adaptación de S16/S17.

`node scripts/verify-access.mjs` ejecuta casos controlados, incluidos el timeout predeterminado de 15 segundos, doble envío y recarga. S04_BROWSER_URL y S04_EVIDENCE_DIR configuran URL y evidencia. `--real` recibe por stdin un JSON con la propiedad credential y comprueba únicamente GET /catalogo con clave válida e inválida. Usar entrada desde memoria o un gestor seguro, sin escribir la clave en comandos ni archivos; no pasar valores por argumentos o variables VITE_. Las evidencias solo guardan resultados y códigos HTTP, sin la credencial.

## Fuentes técnicas verificadas

- [Vite y exposición de variables de entorno](https://vite.dev/guide/env-and-mode).
- [Opciones del servidor y proxy de desarrollo](https://vite.dev/config/server-options.html#server-proxy).
- [React y construcción de una aplicación desde cero](https://react.dev/learn/build-a-react-app-from-scratch).
- [Fetch y lectura de respuestas](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch).
- [Política de redirecciones de Request](https://developer.mozilla.org/en-US/docs/Web/API/Request/redirect).
