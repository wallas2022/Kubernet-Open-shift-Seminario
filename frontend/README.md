# Frontend de reservas del seminario

S01 implementa la base React y TypeScript y los controles RN03. S02 añade SessionContext y un panel temporal para verificar RN04. S03 implementa el cliente HTTP de RN07, disponible para las futuras pantallas; la vista actual no lo invoca ni autentica ni crea reservas. Las pantallas de negocio corresponden a S04 en adelante.

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

Las futuras claves se transportarán en headers, por cliente. S01 comprueba esa frontera con claves aleatorias sintéticas y un receptor temporal. No se incorporan claves de la demo real. La API seguirá autorizando las solicitudes; estas restricciones no sustituyen autenticación ni un gestor de secretos de producción.

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

S02 usa un almacén por instancia de SessionProvider, sin almacenamiento persistente. `useSession()` ofrece hasCredential, setCredential, readCredential y clearCredential para la futura integración. El campo enmascarado se vacía después de cada envío local; limpiar, pagehide o desmontar elimina la referencia del almacén. Una recarga crea un almacén vacío. No se garantiza borrado físico de strings por el recolector de memoria, ni se controla un gestor de contraseñas o extensión ajena a la aplicación. El panel solicita únicamente valores de prueba y no valida identidad. No se implementa todavía el registro de reserva pendiente, ni la salida con advertencia de S13.

La comprobación S02 se ejecuta con `node scripts/verify-session.mjs` y Chromium disponible. S02_BROWSER_URL y S02_EVIDENCE_DIR permiten indicar URL y destino de evidencia. En Docker se comparte la red de seminario-frontend-s01-preview y se usa http://127.0.0.1:5173 para respetar los hosts permitidos. La comprobación S01 histórica exige cero campos y corresponde al código de aquella entrega; para S02 se usa verify-session.mjs. S01 y S02 están publicados; S03 requiere aprobación antes de commit y push.

## Cliente HTTP de S03

`createApiClient({ readCredential, timeoutMs })` ofrece catalog, availability, reservation y createReservation. El timeout por defecto es 15000 ms e incluye lectura del cuerpo. `useApiClient()` conecta el lector de SessionContext sin conservar una copia del token entre solicitudes. Las rutas son locales /api, sin query; X-Api-Key y la clave de idempotencia viajan en headers. Se omiten cookies, caché y referrer y se bloquean redirecciones. No hay reintentos automáticos de ningún método.

Los resultados son una unión ApiResult: éxito con status y data validado, o fallo con kind, outcome y code controlados. Un POST enviado con timeout, cancelación, red caída, 5xx o respuesta inesperada conserva outcome uncertain. Una lectura fallida usa read-failed; un dato inválido local o cancelación previa usa not-sent. Solo los errores conocidos de rechazo del backend permiten rejected. Un conflicto de idempotencia rechaza ese envío, pero no demuestra que una intención anterior no exista: su resolución corresponde al controlador futuro. Nunca borrar automáticamente una operación pendiente a partir de un error genérico.

Retry-After para 429/503 solo aporta segundos de orientación; no programa otro envío. Error y detail se normalizan por lista de códigos conocidos y estado HTTP. No se exponen mensajes arbitrarios, cuerpos de error ni excepciones del fetch. Las respuestas HTML, vacías o incompatibles producen un resultado controlado. La API del cliente exige una intención con clave suministrada; no genera ni persiste operaciones. PendingOperation define el contrato futuro sin credencial; S08/S10 implementarán persistencia y recuperación.

`node scripts/verify-http.mjs` prueba respuestas controladas en Chromium sin llamar al backend. S03_BROWSER_URL y S03_EVIDENCE_DIR configuran la URL de desarrollo y las evidencias. La carga dinámica del cliente usa el servidor Vite, no preview. En Docker se ejecuta con la misma red indicada para S02 y S03_BROWSER_URL=http://127.0.0.1:5173. Los tests Node incluyen un servidor HTTP efímero que simula una respuesta perdida después de incrementar un contador; esto no verifica un commit de PostgreSQL ni PV08 completo. La compilación actual elimina el cliente de los assets de la pantalla inicial porque todavía no lo consume; los tipos, tests y prueba Chromium verifican el módulo antes de integrarlo en S04.

## Fuentes técnicas verificadas

- [Vite y exposición de variables de entorno](https://vite.dev/guide/env-and-mode).
- [Opciones del servidor y proxy de desarrollo](https://vite.dev/config/server-options.html#server-proxy).
- [React y construcción de una aplicación desde cero](https://react.dev/learn/build-a-react-app-from-scratch).
- [Fetch y lectura de respuestas](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch).
- [Política de redirecciones de Request](https://developer.mozilla.org/en-US/docs/Web/API/Request/redirect).
