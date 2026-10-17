# Entrega de S04 acceso al laboratorio

Documento DOC-S04-01. Requisito RF01. Fecha 17 de octubre de 2026. Estado de entrega local para revisión. El usuario aprobó publicar S03 y autorizó iniciar S04 mediante «autorizado y sigue con S04». S03 fue publicado como e0ace99; S04 requiere aprobación independiente de su entrega antes de commit y push.

## Objetivo y alcance

Se habilita la pantalla P01 con clave enmascarada y validación mediante GET /api/catalogo. La sesión solo se activa tras una respuesta 200 con contrato de catálogo válido, incluso sin eventos. Una clave inválida y un fallo técnico reciben mensajes distintos. El catálogo visible, la selección de eventos y las reservas corresponden a sprints posteriores.

## Análisis y casos de uso

CU S04 01 Entrar. El participante recibe una clave del instructor, la introduce y pulsa Entrar. La aplicación la conserva temporalmente en memoria, vacía el campo y bloquea el formulario durante la validación. Si la API devuelve un catálogo válido, activa la sesión y muestra la confirmación del acceso. No se inventan eventos ni se crea una reserva.

CU S04 02 Corregir la clave. Una respuesta 401 impide activar la sesión y muestra que la clave no es válida o ya no está habilitada. La aplicación limpia su credencial y vuelve a enfocar el campo. Un campo vacío se rechaza localmente sin petición HTTP.

CU S04 03 Reintentar tras un fallo técnico. Red caída, timeout, 5xx, HTML o un contrato inesperado impiden el acceso y muestran que no se pudo comprobar. No se afirma que la clave sea incorrecta. La credencial se elimina y el usuario puede introducirla de nuevo; no hay reintento automático.

CU S04 04 Volver o recargar. La confirmación ofrece Volver al acceso y elimina el contexto de credencial. Recargar también exige reingreso. pagehide aborta una validación en curso e impide que su respuesta tardía reactive la sesión. Esto no revoca la clave del servidor ni implementa todavía la salida con advertencia sobre reservas pendientes de S13.

## Diseño e implementación

SessionContext distingue hasCredential de isAuthenticated. setCredential deja el acceso sin validar; confirmCredential solo se invoca después de que el cliente HTTP devuelve éxito validado y exista todavía una credencial. clearCredential restablece ambas condiciones. El almacén continúa aislado por proveedor y sin persistencia.

useLaboratoryAccess coordina la validación con el cliente de S03, un AbortController por intento y una referencia que bloquea envíos duplicados antes de que React actualice la pantalla. Ignora resultados de intentos abortados o que ya no estén activos. Al desmontarse, cancela la espera. La limpieza al desmontar el proveedor sigue siendo responsabilidad de SessionContext.

LaboratoryAccess contiene el campo password, instrucciones, error asociado, estado de espera y confirmación. La clave no se almacena como estado de un campo React controlado. El formulario se vacía antes de esperar; el acceso correcto retira el campo y mueve el foco al título. El error enfoca el campo y se anuncia mediante alert. La espera usa una región status. Estas medidas no sustituyen la revisión integral de accesibilidad prevista en S17.

WelcomePage coloca el acceso junto a la introducción y conserva un recorrido informativo de futuras funciones. El panel temporal de S02 deja de mostrarse. La vista de confirmación informa que el catálogo se habilitará en la próxima entrega; no presenta un listado ficticio ni un total de eventos como si S05 estuviera implementado.

## Verificación ejecutada

Se ejecutaron npm test, npm run build y npm run verify:secrets en Node 22.23.2 y npm 10.9.8. Chromium 145.0.7632.6 se ejecutó mediante Playwright 1.58.2. El servidor Vite existente se reinició para servir el código integrado y sigue publicado solo en localhost:5180.

| Comprobación | Resultado observado | Evidencia |
| --- | --- | --- |
| Tests Node de base y transporte | 19 pruebas aprobadas | resultados.json |
| Tipos y compilación integrada | Aprobados | resultados.json |
| Controles de secretos | 12 controles aprobados | secrets.json |
| Interfaz con respuestas controladas | 32 comprobaciones aprobadas | access-controlled.json |
| Acceso contra API local real | 8 comprobaciones aprobadas | access-real.json |

PV01 se comprobó con clave válida contra la API local y, mediante respuestas controladas explícitas, con catálogo vacío y catálogo con eventos. PV02 se comprobó con clave inválida que recibió 401 real. Los ensayos controlados cubrieron también 503, HTML, contrato inválido, corte de red y el timeout predeterminado de 15 segundos; todos impidieron el acceso. Se verificaron dos submit simultáneos con una sola petición, ausencia de sesión antes de recibir respuesta, recarga, vuelta al acceso, respuesta tardía tras pagehide y presentación a 1280 y 360 píxeles.

La prueba real obtuvo una clave de la configuración del contenedor de API en memoria y la transmitió por stdin al ejecutor, sin incluir el valor en argumentos, archivos ni evidencia. El navegador la envió por X-Api-Key a través del proxy del frontend. La prueba registró solo resultados y estados HTTP 401 y 200. El caso inválido usó un valor aleatorio distinto. Se comprobaron ausencia de credenciales en URL, registros, HTML y almacenamiento y ausencia de errores de ejecución del navegador.

## Límites y seguridad

Solo se ejecutaron consultas GET /catalogo en la prueba real, sin modificar inventario ni crear reservas. Los casos de catálogo vacío y errores técnicos usaron interceptores, no cambios de base de datos. La autenticación efectiva sigue a cargo de la API; la bandera de sesión local no sustituye autorización del servidor. La clave solo se conserva en memoria y se elimina al fallar, volver, recargar o salir de la página. La eliminación de referencias no garantiza sobreescritura física de memoria ni controla extensiones o gestores de contraseñas externos.

La prueba pagehide despacha el evento para verificar la protección ante respuestas tardías; no acredita todos los comportamientos de caché de navegación en otros navegadores. No se ejecutó la evaluación completa con lector de pantalla ni el despliegue de S18. Las fuentes y evidencias históricas de S01 a S03 conservan el alcance de sus entregas originales; sus scripts de pantallas anteriores no se presentan como prueba de la interfaz actual.

## Entregables y revisión

Se entregan componentes de acceso, ampliación de SessionContext, guías, ensayo reproducible de navegador, evidencias sin claves, informe Markdown y Word y Mermaid editable S04-acceso-laboratorio.mmd. El Word usa Times New Roman 12, negro, encabezados de tabla negros con texto blanco e índice actualizable. La URL local para revisión es http://127.0.0.1:5180. La entrega queda pendiente de aprobación para commit y push a origin/master; S05 no está autorizado.
