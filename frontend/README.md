# Frontend de reservas del seminario

S01 implementa la base React y TypeScript y los controles RN03. S02 añade SessionContext para RN04 y S03 el cliente HTTP de RN07. S04 valida el acceso mediante GET /catalogo. S05 muestra el catálogo autenticado con tarjetas reales, estados de carga, vacío y error, y actualización manual. La consulta individual y las reservas siguen pendientes de S06 en adelante.

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

Las comprobaciones verify-browser.mjs, verify-session.mjs y verify-access.mjs corresponden a las pantallas históricas de S01, S02 y S04. S05 utiliza verify-catalog.mjs para la navegación actual. En Docker se comparte la red de seminario-frontend-s01-preview y se usa http://127.0.0.1:5173 para respetar los hosts permitidos. S01 a S04 están publicados; S05 requiere aprobación antes de commit y push.

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

Un fallo inicial ofrece Reintentar sin mostrar datos ni confundirlo con events vacío. Un fallo de actualización conserva exactamente la lectura anterior con aviso de Información desactualizada y su hora original, incluso si estaba vacía. Una lectura correcta reemplaza la anterior y retira el aviso. Un 401 elimina la sesión; salir de la vista aborta la espera e impide aplicar resultados tardíos. El catálogo no se conserva entre sesiones ni tras recarga. La selección de evento pertenece a S06.

`node scripts/verify-catalog.mjs` revisa carga, datos, vacío, errores, lectura desactualizada, actualización, cambios de sesión y dos anchos de pantalla. S05_BROWSER_URL y S05_EVIDENCE_DIR configuran URL y evidencia. `--real` recibe credential por stdin, valida tarjetas contra la API local y actualiza con un GET adicional, sin crear reservas. Las capturas con fixtures y la captura de API real están identificadas en evidencias/frontend-s05. Las capturas no acreditan la revisión integral de accesibilidad o adaptación de S16/S17.

`node scripts/verify-access.mjs` ejecuta casos controlados, incluidos el timeout predeterminado de 15 segundos, doble envío y recarga. S04_BROWSER_URL y S04_EVIDENCE_DIR configuran URL y evidencia. `--real` recibe por stdin un JSON con la propiedad credential y comprueba únicamente GET /catalogo con clave válida e inválida. Usar entrada desde memoria o un gestor seguro, sin escribir la clave en comandos ni archivos; no pasar valores por argumentos o variables VITE_. Las evidencias solo guardan resultados y códigos HTTP, sin la credencial.

## Fuentes técnicas verificadas

- [Vite y exposición de variables de entorno](https://vite.dev/guide/env-and-mode).
- [Opciones del servidor y proxy de desarrollo](https://vite.dev/config/server-options.html#server-proxy).
- [React y construcción de una aplicación desde cero](https://react.dev/learn/build-a-react-app-from-scratch).
- [Fetch y lectura de respuestas](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch).
- [Política de redirecciones de Request](https://developer.mozilla.org/en-US/docs/Web/API/Request/redirect).
