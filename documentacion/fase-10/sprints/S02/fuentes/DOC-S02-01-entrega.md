# Entrega de S02 credencial temporal en memoria

Documento DOC-S02-01. Requisito RN04. Fecha 17 de octubre de 2026. Estado de entrega local para revisión. El usuario autorizó iniciar S02 mediante «sigamos S02». No se autoriza con ello commit, push ni S03.

## Objetivo y alcance

Conservar una credencial únicamente en memoria de la aplicación y perderla al recargar. Se entrega SessionContext, almacén aislado por instancia y panel temporal con campo enmascarado. No se valida identidad ni se consulta la API. La validación de acceso corresponde a S04 y el transporte a S03.

## Análisis y casos de uso

CU S02 01 Ingresar un valor de prueba. El usuario escribe una credencial y pulsa Conservar en memoria. Si es no vacía y no contiene saltos de línea, el almacén reemplaza su valor y la pantalla anuncia presencia sin mostrarlo. El campo se vacía. Un dato inválido produce un error genérico y no reemplaza el valor anterior.

CU S02 02 Limpiar. El usuario pulsa Limpiar credencial y la referencia se elimina. No hay reserva pendiente ni comprobante en este incremento. La salida con advertencia se implementará en S13.

CU S02 03 Recargar. Después de ingresar el valor, recargar crea un proveedor sin credencial. Otra pestaña inicia vacía. pagehide limpia también el almacén y el borrador del campo para limitar retención al navegar.

## Diseño e implementación

SessionProvider posee un almacén creado por instancia. El token se conserva en una variable privada del cierre, no en el estado React expuesto por el contexto. El contexto ofrece hasCredential, setCredential, readCredential y clearCredential; el futuro cliente HTTP podrá obtener la credencial en el momento de una solicitud. Se rechaza la lectura o reemplazo mediante referencias retenidas después de desmontar el proveedor. El efecto elimina listeners y limpia el almacén al desmontar, compatible con StrictMode.

La aplicación no escribe en localStorage, sessionStorage, IndexedDB, Cache Storage ni cookies; tampoco introduce el valor en rutas, parámetros o registros. El panel usa password y autocomplete off, elimina el valor del campo tras el envío y distingue presencia temporal de acceso autenticado. No hay operación pendiente persistida en S02; su contrato y huella se desarrollarán en los sprints correspondientes sin guardar el token.

El diagrama editable S02-credencial-memoria.mmd representa ingreso, validación local, lectura futura y limpieza. La flecha hacia cliente HTTP expresa una interfaz disponible, no una integración ya ejecutada.

## Verificación ejecutada

Entorno de compilación Node 22.23.2 con npm 10.9.8 en contenedor. Chromium se ejecuta mediante la imagen Playwright 1.58.2, con Node 24.13.0 como ejecutor de la prueba de navegador, no como entorno de compilación. La versión exacta del navegador queda en session.json.

| Comprobación | Resultado observado | Evidencia |
| --- | --- | --- |
| npm test | 7 pruebas aprobadas, incluidas 2 del almacén | resultados.json |
| npm run build | Tipos y compilación aprobados | resultados.json |
| npm run verify:secrets | 12 controles aprobados, 3 artefactos inspeccionados | secrets.json |
| verify-session.mjs | 16 controles de navegador aprobados | session.json |

La prueba de navegador usa dos credenciales sintéticas aleatorias que no conserva en evidencia. Comprueba reemplazo, vaciado del campo, recarga sin credencial, limpieza explícita, dato vacío, pagehide, otra pestaña, almacenamiento vacío, ausencia en HTML y URL, ausencia en logs y ausencia de solicitudes API. Incluye capturas a 1280 y 360 píxeles y comprueba desbordamiento horizontal. No acredita el recorrido completo de accesibilidad ni RN02 global.

## Incidencias y límites

Las primeras ejecuciones de navegador no alcanzaron la pantalla. Se observó un error de caché de Vite y se reinició el contenedor de desarrollo; posteriormente se identificó HTTP 403 por usar host.docker.internal como host del navegador. Se corrigió la ejecución compartiendo la red del contenedor y usando 127.0.0.1, sin ampliar los hosts permitidos. Las ejecuciones fallidas no se cuentan como éxito.

Eliminar referencias no garantiza sobreescritura física de memoria administrada por JavaScript. Extensiones, herramientas de desarrollo y gestores externos están fuera del control de la aplicación. autocomplete off es una indicación al navegador. La prueba pagehide despacha el evento; no demuestra por sí sola todos los comportamientos reales de caché de navegación en otros navegadores. No se usaron claves reales ni se ejecutaron reservas.

## Revisión y publicación

Revisar código de frontend, pruebas, diagrama Mermaid y este informe Word y Markdown. La entrega se mantiene local sin commit ni push. La rama propuesta para una publicación posterior es master con destino origin/master, sujeto a aprobación expresa de esta entrega. S03 permanece pendiente de autorización.
