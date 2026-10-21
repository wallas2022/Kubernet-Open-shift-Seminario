# Estado actual del seminario

## Alineación documental del 20 de octubre de 2026

El usuario autorizó el commit local de esta adaptación documental. Se prepara su registro sin push; la autorización no incluye el commit de la implementación S19, que continúa en revisión.

Se incorporaron los documentos de caso de éxito y organización entregados por el usuario como fuentes rectoras, conservando sus originales. El sistema de reservas construido es el caso propio común a los seis grupos y 22 alumnos. DOC-01-02 organiza la investigación aplicada; DOC-06-02 contiene treinta diapositivas con notas y fuentes y su guion; DOC-07-02 prepara la exposición y demostración conjunta. Se mantienen Markdown, Word y tres diagramas Mermaid editables. DOC-01-01 y DOC-06-01 quedan como apoyo previo. Se distinguen resultados Compose de hipótesis de millones de operaciones, disponibilidad, Kafka y autoescalado en OpenShift. Esta adaptación no ejecuta esos experimentos ni cierra los pendientes de clúster de S18. Entrega documental local para revisión, sin commit ni push; S19 continúa en revisión. Navegación actual en los README de Fases 01, 06 y 07.

## Actualización de S19 del 20 de octubre de 2026

S18 tiene commit local d7fea11 autorizado por el usuario, sin push. S19 RN08 autorizado e implementado localmente con PV16 sobre Compose exclusivo: tres repeticiones de cuatro usuarios, 3240 solicitudes medidas y 180 de calentamiento, sin errores. El recálculo desde JSONL pasó 76 controles y se verificaron tres propuestas de recursos. Se separaron CPU, memoria y contadores cgroup v2 de frontend, API, PostgreSQL y generador. Sin OOM en los intervalos; se registraron períodos de limitación de CPU en API y generador. Auditoría de solo lectura: 380 reservas y claves únicas, 380 outbox sin huérfanos, 380 cupos consumidos y 9620 disponibles. Se entregan Markdown, Word, Mermaid, scripts y parches de recursos propuestos sin aplicar. Frontend exclusivo en localhost:18085. No se afirma capacidad máxima, HPA, clúster ni HTTPS; los pendientes de S18 continúan. S19 en revisión, sin commit ni push propios.

## Actualización de S18 del 20 de octubre de 2026

El usuario aprobó el commit local de la entrega parcial S18 y autorizó continuar con S19. Esta aprobación no incluye push. Los párrafos siguientes conservan el estado técnico de la entrega antes de esta aprobación.

S17 publicado mediante b12c395. El usuario informó que completó la prueba con Narrador y autorizó continuar con S18; se registra como confirmación del usuario, sin atribuir al agente resultados manuales no observados. S18 RN05 implementado localmente: imagen Nginx 1.30.6 en 8080, proxy, raíz de solo lectura, UID arbitrario, Compose y overlays kind/OpenShift. Pasaron 28 controles HTTP y de navegador con API real y base exclusiva, 16 de ejecución, dos lecturas de Compose integrado, 52 pruebas Node, compilación y 12 controles de secretos en contenedor aislado. Auditoría de solo lectura: dos reservas, dos outbox, cuatro cupos consumidos y 21 disponibles. El frontend exclusivo está en localhost:18083 porque 8083 está ocupado por S08. No hay contextos de clúster configurados; admisión y HTTPS permanecen pendientes y S18 se entrega parcial por esa dependencia. Sin commit ni push de S18; S19 no iniciado. Fuentes, manual, Word y Mermaid en las carpetas S18.

## Actualización de S17 del 19 de octubre de 2026

S16 publicado en origin/master mediante 193659a tras aprobación del usuario. S17 RN06 autorizado e implementado localmente con entrega parcial: correcciones de foco, errores asociados, anuncios fuera de zonas ocupadas y contraste. Pasaron 147 comprobaciones de teclado, 25 específicas de foco y anuncios, 847 mediciones de texto y 37 de campo o foco; también 493 comprobaciones de adaptación, 82 de mensajes, 52 pruebas Node, compilación y 12 controles de secretos. Las respuestas son controladas. El entorno ficticio localhost:5189 pasó diez controles y quedó vacío, sin reservas ni base reales. El intento de control del Narrador se interrumpió con Escape; la validación manual con lector NO se completó y RN06 sigue abierto. Se entrega informe Markdown, Word y Mermaid, más guía de revisión pendiente. Entrega parcial S17 aprobada por el usuario el 20 de octubre de 2026 para commit y push a origin/master. La aprobación no cierra RN06 ni sustituye la prueba manual pendiente; S18 no iniciado.

## Actualización de S16 del 19 de octubre de 2026

S15 publicado en origin/master mediante c5c9523 tras aprobación del usuario. S16 RN02 autorizado e implementado localmente: cabecera, acciones y rejillas adaptables, envoltura de textos e identificadores y disponibilidad en una columna en ventanas muy estrechas. Pasaron 493 comprobaciones en 60 combinaciones de pantalla y tamaño, a 360 y 1280 píxeles, con zoom nativo de pestaña al 100 y 200 por ciento; se generaron 28 capturas comparables. Pasaron también 147 comprobaciones de regresión por teclado, 52 pruebas Node, compilación y 12 controles de secretos. Las respuestas de negocio son fixtures, sin reservas reales nuevas. Word de cuatro páginas revisado visualmente, fuente Markdown y Mermaid en las carpetas S16. Entrega S16 aprobada por el usuario para commit y push a origin/master; S17 no iniciado. No se acredita dispositivo físico, todos los navegadores ni accesibilidad integral.

## Actualización de S15 del 19 de octubre de 2026

S14 publicado en origin/master mediante 33ac2bd tras autorización del usuario. S15 RN01 autorizado e implementado localmente: revisión de español, retiro de avisos de funciones futuras y referencias de sprint en las pantallas, ayuda para identificadores y corrección del destino de Ir al contenido. Pasaron 147 comprobaciones de teclado y 49 desplazamientos hasta controles en CU01 a CU06, más 82 controles de mensajes, 42 de consulta y 46 de copia y actualización. Las respuestas de negocio son fixtures; no se ejecutaron nuevas reservas reales. Fuente Markdown, Word de cuatro páginas revisado visualmente y Mermaid en las carpetas S15. Pasaron también 52 pruebas Node, compilación y 12 controles de secretos. Entrega S15 aprobada por el usuario para commit y push a origin/master; S16 no iniciado. La aceptación de móvil, zoom, lector de pantalla y accesibilidad integral sigue en S16 y S17.

## Actualización de S14 del 19 de octubre de 2026

S14 RF11 implementado y aprobado por el usuario para commit y push a origin/master: copia exacta del UUID, selección manual si falla el portapapeles y actualización de cupos posterior a 201 y 200, sin otro POST. Pasaron 52 pruebas Node, compilación, 12 controles de secretos y 46 comprobaciones de navegador con fixtures de negocio y portapapeles nativo de Chromium. Se cubren creación, repetición, consulta y recuperación; 503 y 404 conservan el comprobante. No se ejecutó nueva creación real ni auditoría PostgreSQL. Fuente Markdown, Word y Mermaid en las carpetas de S14. Publicación autorizada por el usuario; S15 no iniciado.

## Actualización de S13 del 19 de octubre de 2026

S11 y S12 publicados hasta 32b8737 en origin/master. S13 RF10 aprobado por el usuario para commit y push a origin/master el 19 de octubre de 2026: Salir, advertencia de pérdida de recuperación, cancelación, limpieza verificable y descarte de respuestas tardías. Pasaron 52 pruebas Node, compilación, 12 controles de secretos, 71 comprobaciones de navegador controladas y 11 con API real mediante lecturas del laboratorio exclusivo S12. La auditoría previa y posterior conserva una reserva y un outbox, sin cambios. Fuente Markdown, Word y Mermaid en las carpetas de S13. S13 aprobado para commit y push el 19 de octubre de 2026; S14 no iniciado. Los apartados siguientes conservan el historial de entregas anteriores.

## Actualización de S12 del 19 de octubre de 2026

S11 tiene commit local db16f1d y su publicación queda incluida en la aprobación de S12 del 19 de octubre de 2026. S12 RF09 aprobado para commit y push a origin/master: mensajes de errores normalizados, reingreso explicado por 401 y conservación de pendientes. Pasaron 47 pruebas Node, compilación, 12 controles de secretos, 82 comprobaciones de matriz controlada, diez reales y 72 de regresión. La competencia real por un cupo produjo una confirmación y un rechazo, una reserva y un outbox. Fuente Markdown, Word y Mermaid en las carpetas de S12. S12 aprobado para commit y push el 19 de octubre de 2026; S13 no iniciado.

## Actualización de S11 del 19 de octubre de 2026

S11 RF08 implementado y aprobado para commit local: consulta por UUID con acceso por propietario y comprobante compartido. Pasaron 43 pruebas Node, compilación, 12 controles de secretos, 42 comprobaciones controladas, 29 con API real y 58 de regresión S09. Propietario autorizado; reserva ajena e inexistente con igual 404 y mensaje genérico. Auditoría exclusiva: una reserva de dos cupos y un outbox, sin cambios por consultar. Informe Markdown y Word de cuatro páginas en documentacion/fase-10/sprints/S11, con Mermaid editable. Aprobado para commit local; S12 autorizado el 19 de octubre de 2026. S10 ya fue publicado mediante cee373a; los apartados anteriores en fecha conservan el historial.

## Actualización de S10 del 19 de octubre de 2026

S10 RF07 implementado y aprobado para publicación: recuperación tras recarga, misma identidad y reenvío explícito de la intención original. Pasaron 43 pruebas Node, compilación, 12 controles de secretos, 30 comprobaciones controladas, 28 con API real y 58 de regresión S09. La auditoría PostgreSQL exclusiva confirmó una reserva de dos cupos y un outbox tras descartar dos respuestas del servidor y recuperar con el mismo UUID. Informe Markdown, Word de cuatro páginas y Mermaid en documentacion/fase-10/sprints/S10 y diagramas/fase-10/sprints. Aprobado por el usuario para commit y push el 19 de octubre de 2026. S11 no iniciado; salida completa pendiente de S13.

## Actualización de S09 del 19 de octubre de 2026

S09 RF06 implementado, aprobado y publicado: comprobante para 201 y 200, validación y limpieza conservadora del pendiente. Pasaron 37 pruebas Node, compilación, 12 controles de secretos, 58 comprobaciones de interfaz controladas, 28 con API real y 70 de regresión S08. PostgreSQL exclusivo confirmó dos reservas y dos outbox para cuatro cupos. Word de cuatro páginas y capturas revisados visualmente. Informe en documentacion/fase-10/sprints/S09. Publicado en origin/master mediante el commit 46051bcc40acad16c265dff788b8b79ab82f89a7 el 19 de octubre de 2026; push exitoso. S10 no iniciado.

## Actualización de S08 del 19 de octubre de 2026

S08 RF05 está implementado y en revisión local: creación idempotente, intención persistida antes del POST y bloqueo de doble envío. Pasaron 34 pruebas Node, compilación, 12 controles de secretos, 74 comprobaciones de interfaz con fixtures y 30 contra API real con PostgreSQL exclusivo. La auditoría registró 23 reservas y 23 outbox para 25 cupos, sin sobreventa ni claves duplicadas. Informe en `documentacion/fase-10/sprints/S08/fuentes/DOC-S08-01-entrega.md`, junto con Word y Mermaid editable. S08 publicado en origin/master mediante el commit 8c9528c0737e0b15c42111573f8c4ce190385eac tras confirmación del usuario el 19 de octubre de 2026; push exitoso. S09 no iniciado. La recuperación de operaciones inciertas y salida completa siguen pendientes de S10 y S13. Los apartados siguientes conservan el historial anterior.

## Actualización de frontend del 17 de octubre de 2026

S01 fue autorizado e implementado localmente: base React y TypeScript, pantalla inicial, proxy de desarrollo y controles RN03. Pasaron cinco pruebas dirigidas, compilación, doce comprobaciones con claves sintéticas y revisión Chromium de la vista inicial. npm audit informó cero vulnerabilidades. La entrega está en revisión y no tiene commit ni push. La planificación original se publicó mediante el commit 47c4086; la implementación posterior requiere su propia aprobación. S02 no se ha iniciado. Informe: `documentacion/fase-10/sprints/S01/fuentes/DOC-S01-01-entrega.md`.

DOC-10-06 agrega la planificación de codificación en 19 sprints, uno por cada requisito funcional y de calidad. El usuario aprobó la planificación y su publicación documental, ya ejecutada en origin/master. Cada entrega posterior requiere aprobación independiente antes de commit y push. S01 es la única implementación autorizada hasta ahora.

La aplicación existente arrancó en Docker Compose durante la sesión: API, worker y PostgreSQL. Se comprobó readiness, HTTP 200 de `/docs` y catálogo autenticado con 1000 cupos disponibles. Esta comprobación no es un despliegue Kubernetes/OpenShift ni una nueva prueba de carga. No se garantiza que los procesos sigan activos después de la sesión.

La Fase 10 contiene el análisis y diseño del frontend en `documentacion/fase-10/`, con cinco etapas documentadas y diez diagramas Mermaid originales en `diagramas/fase-10/`. Define seis casos de uso, requisitos, pantallas, contratos, recuperación idempotente, arquitectura y plan de validación. S01 añade una vista inicial y un diagrama de su frontera de integración; las operaciones de negocio siguen pendientes de los sprints posteriores. La aprobación de la planificación no equivale a aceptación funcional del frontend completo.

La revisión del nuevo Word y los diagramas se detalla en `documentacion/fase-10/fuentes/DOC-10-00-estado-revision.md`. El estado histórico siguiente corresponde al 13 de octubre y conserva sus límites para las entregas anteriores.

Actualización del 13 de octubre de 2026. Este índice resume el estado vigente; los párrafos anteriores del README describen entregas históricas y pueden conservar pendientes que se resolvieron después.

| Material | Ubicación local del repositorio | Estado |
| --- | --- | --- |
| Fase 00 | documentacion/fase-00 | Aprobada por el usuario; archivos originales no recuperados |
| Investigación integral | documentacion/fase-01 | 22 capítulos, Word y Markdown |
| Diseño del laboratorio | documentacion/fase-02 | Propuesto; inventario real pendiente |
| Instalación kind | documentacion/fase-03 | Procedimiento y scripts; clúster sin ejecutar |
| Aplicación | aplicacion y documentacion/fase-04 | 19 pruebas y comprobación HTTP local pasadas |
| Carga piloto | evidencias/carga-piloto y documentacion/fase-05 | Cuatro ensayos locales; 7250 solicitudes y 225 reservas |
| Presentación | presentacion/fase-06 | 20 diapositivas revisadas visualmente |
| Guía docente | documentacion/fase-07 | Agenda, ejercicios, respuestas y evaluación |
| Restauración | evidencias/recuperacion-local y documentacion/fase-08 | Ensayo local pasado con diez reservas restauradas |
| Variante OpenShift | aplicacion/openshift y documentacion/fase-09 | Siete comprobaciones locales; despliegue pendiente |

Todos los Word requieren revisión visual de paginación e índice en un renderizador disponible. Su formato se comprobó estructuralmente. Solo la Fase 00 cuenta con aprobación expresa de fase; las entregas posteriores no implican aprobación automática.

## Próximos hitos técnicos

1. Obtener acceso operativo al motor Docker para la ruta kind, o a un clúster OpenShift de laboratorio para la variante nueva.
2. Construir y verificar la imagen. Para OpenShift, preparar registro, digest real, PostgreSQL externo TLS, CA y credenciales privadas.
3. Validar admisión, inicialización, sondas, reservas, persistencia y outbox en el entorno elegido.
4. Repetir carga con topología y recursos registrados, generador separado y mediciones prolongadas. Validar HPA por separado.
5. Ejecutar recuperación y fallos controlados en el clúster; no atribuir el ensayo PostgreSQL local a Kubernetes.
6. Revisar los Word, actualizar índices y registrar la revisión final de los materiales.

No se afirma capacidad máxima, diez mil clientes simultáneos, alta disponibilidad ni recuperación empresarial. No se ejecutan operaciones remotas Git. La publicación permanece bajo control del usuario.
