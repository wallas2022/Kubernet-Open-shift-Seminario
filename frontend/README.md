# Frontend de reservas del seminario

S01 implementa la base React y TypeScript y los controles RN03. S02 añade SessionContext y un panel temporal para verificar RN04. No incluye autenticación, consultas de catálogo ni creación de reservas. `src/api/contracts.ts` y `paths.ts` definen la frontera de integración; el transporte HTTP funcional corresponde a S03 y las pantallas de negocio a S04 en adelante.

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

La comprobación S02 se ejecuta con `node scripts/verify-session.mjs` y Chromium disponible. S02_BROWSER_URL y S02_EVIDENCE_DIR permiten indicar URL y destino de evidencia. En Docker se comparte la red de seminario-frontend-s01-preview y se usa http://127.0.0.1:5173 para respetar los hosts permitidos. La comprobación S01 histórica exige cero campos y corresponde al código de aquella entrega; para S02 se usa verify-session.mjs. Cada entrega requiere aprobación antes de commit y push. S02 se mantiene local hasta que el usuario la apruebe.

## Fuentes técnicas verificadas

- [Vite y exposición de variables de entorno](https://vite.dev/guide/env-and-mode).
- [Opciones del servidor y proxy de desarrollo](https://vite.dev/config/server-options.html#server-proxy).
- [React y construcción de una aplicación desde cero](https://react.dev/learn/build-a-react-app-from-scratch).
