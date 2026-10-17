# Entrega S01 de la base del frontend de reservas

Fecha 17 de octubre de 2026. Requisito RN03. Estado: implementado y verificado localmente, en revisión del usuario. Sin commit ni push de esta entrega. La autorización recibida cubre iniciar S01 y no iniciar S02 ni publicar código.

## Resultado y alcance

Se creó un proyecto React con TypeScript y Vite bajo frontend, con dependencias directas exactas y lockfile. Tiene una pantalla inicial adaptable, componentes separados, estilos locales, tipos de los contratos actuales y constructores de rutas que solo aceptan identificadores UUID donde corresponde.

La pantalla explica que acceso, catálogo y reservas todavía no están habilitados. No muestra cupos ficticios ni llama al backend al abrirse. No se implementó SessionContext, transporte HTTP de negocio, autenticación ni formularios. Los contratos definen la frontera del futuro adaptador; S03 implementará su transporte y S04 conectará el acceso real.

## Cambios de código

frontend/src/app contiene la composición; pages contiene la vista inicial; components contiene el componente de pasos. api contiene contratos y rutas. config/security.mjs valida el entorno y el destino del proxy y aplica el bloqueo de rutas sensibles. vite.config.ts configura desarrollo, compilación y servidor de vista previa.

Las herramientas documentales de Fase 10 se ampliaron con parámetros para producir este informe y renderizar su diagrama sin regenerar los documentos aprobados. Los manifiestos de la aplicación y la base de datos no cambiaron.

## Protección de credenciales

La configuración rechaza VITE_ tanto desde el entorno de proceso como desde archivos de entorno, sin imprimir sus valores. envPrefix está vacío y publicDir deshabilitado; la compilación no publica sourcemaps. Las exclusiones Git cubren .env, archivos locales, node_modules, dist y resultados temporales; .env.example permanece disponible y solo contiene configuración no secreta del servidor.

El proxy acepta destinos HTTP locales y rechaza credenciales embebidas, parámetros, fragmentos y rutas adicionales. Las peticiones de API con query y las rutas .env se rechazan sin reflejar sus valores. Las rutas del cliente no admiten credenciales ni parámetros arbitrarios. Los nombres de host permitidos son 127.0.0.1, localhost, host.docker.internal y api.

Se usaron claves aleatorias sintéticas generadas durante la verificación. Nunca se leyeron las credenciales reales de la demo. Se comprobó el transporte de la clave únicamente en X-Api-Key hacia un receptor temporal y la reescritura /api/catalogo a /catalogo. No se enviaron reservas reales durante estas pruebas.

## Verificación ejecutada

| Comprobación | Resultado observado | Evidencia |
| --- | --- | --- |
| Pruebas dirigidas de seguridad | Cinco aprobadas, cero fallos | frontend/tests/security.test.mjs y resultados de la sesión |
| Tipos y compilación | tsc sin errores y vite build exitoso | evidencias/frontend-s01/resultados.json |
| PV14 inicial | Doce comprobaciones aprobadas con claves sintéticas | evidencias/frontend-s01/secrets.json |
| Bundle | Tres artefactos inspeccionados sin las claves sintéticas, sourcemaps ni archivos env | secrets.json |
| Chromium | Vista inicial visible, sin errores de ejecución o HTTP, escritorio y móvil | browser.json y capturas |
| npm audit | Cero vulnerabilidades informadas | audit.json |
| Exclusiones Git | Configuración local y compilación ignoradas; ejemplo no ignorado | resultados.json |

Entorno de compilación: contenedor node:22-bookworm-slim, Node 22.23.2 y npm 10.9.8. Dependencias directas principales: React 19.3.1, TypeScript 7.0.2, Vite 8.3.4 y plugin React 6.1.2. La verificación de navegador usa Chromium de la imagen Playwright 1.58.2. Las versiones exactas del navegador y hashes se conservarán con la evidencia final.

Se revisaron las capturas a 1280 por 900 y 360 por 800 píxeles. Esa revisión verifica esta vista inicial; no cierra RN01, RN02 ni RN06 para las futuras pantallas. npm audit informa el estado del registro consultado y no acredita ausencia absoluta de vulnerabilidades.

## Incidencias resueltas durante la verificación

La primera compilación se inició antes de terminar la instalación y no encontró tsc; tras finalizar la instalación compiló correctamente. La primera revisión de archivos env observó un fallback de SPA para una ruta inexistente: se añadió bloqueo explícito y prueba de regresión. Una primera comprobación de navegador no encontró el título; la verificación posterior pasó y el script ahora espera el título visible antes de comprobar la página. El puerto 5173 del equipo estaba ocupado: se utilizó 5180 sin detener la otra aplicación.

## Arranque y revisión de la entrega

La vista de esta sesión está en http://127.0.0.1:5180 y pertenece al contenedor seminario-frontend-s01-preview. Es un servidor de desarrollo publicado solo en localhost. Su permanencia depende de que Docker y ese contenedor sigan activos. No es el despliegue Compose del frontend previsto para S18.

Para reproducir, entrar en frontend, ejecutar npm ci, npm test, npm run build y npm run verify:secrets. Para ver la página, usar npm run dev o npm run dev -- --port 5180 cuando 5173 esté ocupado. La guía frontend/README.md describe variables permitidas, dependencias de Chromium y límites del servidor preview. npm run preview sirve archivos estáticos y no un proxy de producción.

## Criterio de aceptación y límites

S01 satisface su alcance local: base compilable, guía de arranque, separación inicial de módulos y controles RN03 verificados con claves de prueba. La búsqueda de esos valores en artefactos y registros no demuestra que cualquier secreto futuro sea imposible de filtrar. La disciplina de revisión debe mantenerse en los siguientes sprints.

Pendientes previstos: credencial en memoria S02, transporte S03, acceso S04, catálogo y reservas S05 a S14, revisiones completas de calidad S15 a S17 y despliegue y medición S18 y S19. No se declara autenticación funcional, compatibilidad OpenShift, capacidad o escalamiento del frontend.

## Aprobación y publicación

Se solicita revisar la entrega S01 y autorizar su commit y push cuando corresponda. El alcance propuesto incluye frontend sin node_modules, dist, entornos privados ni .verification; este informe Markdown y Word; el Mermaid de S01; las evidencias saneadas; la actualización de estado de Fase 10 y las herramientas documentales adaptadas. Cambios de otras fases quedan fuera. No se inicia S02 con esta entrega.

## Fuentes técnicas

Vite y variables de entorno: https://vite.dev/guide/env-and-mode. Proxy de desarrollo: https://vite.dev/config/server-options.html#server-proxy. React y base de proyecto: https://react.dev/learn/build-a-react-app-from-scratch. La documentación se consultó para la implementación; los resultados registrados arriba proceden de ejecuciones locales.
