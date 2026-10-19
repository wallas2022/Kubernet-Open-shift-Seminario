# Estado actual del seminario

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
