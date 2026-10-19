# Fase 10 Análisis y diseño del frontend de reservas

Fecha de actualización: 19 de octubre de 2026. Versión: 1.0. Estado: planificación y S01 a S10 publicados; S11 aprobado para commit local; S12 autorizado. Salida completa pendiente de S13.

Esta fase define una interfaz web para la aplicación de reservas existente. Su propósito es permitir una demostración comprensible del negocio y preparar su futura integración con Docker Compose, Kubernetes y OpenShift.

## Recorrido de lectura

| Etapa | Fuente editable | Contenido |
| --- | --- | --- |
| 01 | [DOC-10-01](fuentes/DOC-10-01-analisis-requisitos.md) | Problema, alcance, actores, requisitos y reglas |
| 02 | [DOC-10-02](fuentes/DOC-10-02-casos-uso.md) | Casos de uso, precondiciones, alternativas y aceptación |
| 03 | [DOC-10-03](fuentes/DOC-10-03-diseno-experiencia.md) | Pantallas, navegación, estados y accesibilidad |
| 04 | [DOC-10-04](fuentes/DOC-10-04-diseno-tecnico.md) | Arquitectura, contratos, datos, seguridad y despliegue |
| 05 | [DOC-10-05](fuentes/DOC-10-05-validacion-entrega.md) | Trazabilidad, pruebas propuestas, riesgos y etapas de construcción |
| 06 | [DOC-10-06](fuentes/DOC-10-06-plan-sprints-codificacion.md) | 19 sprints, uno por requisito, con tareas, aceptación y aprobación previa de commit y push |

DOC-10-06 tiene un Word independiente. El usuario aprobó la planificación y autorizó commit y push del paquete documental a origin/master el 17 de octubre de 2026. Esa aprobación no inicia automáticamente S01. Cada entrega posterior requerirá su autorización de publicación. El Word DOC-10-00 conserva las cinco etapas de análisis y diseño originales; las versiones entregadas para revisión mantienen su estado histórico y esta nota registra la aprobación posterior.

El Word consolidado DOC-10-00 reúne las cinco etapas y sus diagramas. Los originales Mermaid están en `diagramas/fase-10/`; cada figura incluye interpretación y límites en su etapa correspondiente. El registro de revisión distingue las comprobaciones documentales de las pruebas funcionales pendientes.

## Catálogo de diagramas

| ID | Diagrama | Etapa |
| --- | --- | --- |
| D10-01 | [Contexto](../../diagramas/fase-10/D10-01-contexto.mmd) | Análisis |
| D10-02 | [Casos de uso](../../diagramas/fase-10/D10-02-casos-uso.mmd) | Casos de uso |
| D10-03 | [Navegación](../../diagramas/fase-10/D10-03-navegacion.mmd) | Experiencia |
| D10-04 | [Estados de operación](../../diagramas/fase-10/D10-04-estados.mmd) | Experiencia |
| D10-05 | [Pantallas](../../diagramas/fase-10/D10-05-pantallas.mmd) | Experiencia |
| D10-06 | [Componentes](../../diagramas/fase-10/D10-06-componentes.mmd) | Diseño técnico |
| D10-07 | [Secuencia de reserva](../../diagramas/fase-10/D10-07-secuencia-reserva.mmd) | Diseño técnico |
| D10-08 | [Datos existentes](../../diagramas/fase-10/D10-08-datos.mmd) | Diseño técnico |
| D10-09 | [Despliegue](../../diagramas/fase-10/D10-09-despliegue.mmd) | Diseño técnico |
| D10-10 | [Etapas de entrega](../../diagramas/fase-10/D10-10-etapas.mmd) | Validación |

## Entrega de S01

El usuario autorizó el inicio de S01 y, tras revisar la entrega, autorizó su commit y push a origin/master el 17 de octubre de 2026, completados en e991654. El [informe de entrega](sprints/S01/fuentes/DOC-S01-01-entrega.md) conserva la versión presentada para aprobación. El [registro de aprobación](sprints/S01/README.md) documenta la autorización posterior. La guía técnica está en [frontend/README.md](../../frontend/README.md).

## Entrega de S02

El usuario autorizó S02 mediante «sigamos S02» y aprobó su publicación mediante «confirmado». Commit y push completados en fc4bb25. El [informe Markdown](sprints/S02/fuentes/DOC-S02-01-entrega.md) y su [Word](sprints/S02/word/DOC-S02-01-entrega.docx) conservan la entrega revisada. El [diagrama editable](../../diagramas/fase-10/sprints/S02-credencial-memoria.mmd) muestra el ciclo de vida en memoria. S02 no autentica contra la API.

## Entrega de S03

El usuario autorizó iniciar S03 mediante «autorizao S03» y aprobó publicarlo mediante «autorizado y sigue con S04». Commit y push completados en e0ace99. El [informe Markdown](sprints/S03/fuentes/DOC-S03-01-entrega.md) y su [Word](sprints/S03/word/DOC-S03-01-entrega.docx) conservan la entrega revisada. El [diagrama editable](../../diagramas/fase-10/sprints/S03-cliente-http.mmd) resume la clasificación. PV08 completo sigue previsto para S10.

## Entrega de S04

El usuario autorizó el trabajo local de S04 y aprobó su publicación mediante «autorizo s04». Commit y push completados en 877e544. El [informe Markdown](sprints/S04/fuentes/DOC-S04-01-entrega.md) y su [Word](sprints/S04/word/DOC-S04-01-entrega.docx) conservan la entrega revisada. El [diagrama editable](../../diagramas/fase-10/sprints/S04-acceso-laboratorio.mmd) describe la validación. La prueba real recibió 401 y 200, sin crear reservas.

## Entrega de S05

El usuario autorizó S05 y aprobó publicar su entrega. Commit y push completados en 9f23657. El [informe Markdown](sprints/S05/fuentes/DOC-S05-01-entrega.md) y su [Word](sprints/S05/word/DOC-S05-01-entrega.docx) conservan la entrega revisada. El [diagrama editable](../../diagramas/fase-10/sprints/S05-catalogo-eventos.mmd) distingue error inicial y lectura desactualizada. Se verificaron datos controlados y reales sin crear reservas.

## Entrega de S06

El usuario autorizó S06 y aprobó su publicación. Commit y push completados en da21e75. El [informe Markdown](sprints/S06/fuentes/DOC-S06-01-entrega.md) y su [Word](sprints/S06/word/DOC-S06-01-entrega.docx) conservan la entrega revisada. El [diagrama editable](../../diagramas/fase-10/sprints/S06-disponibilidad-evento.mmd) distingue cero cupos, 404 y dato desactualizado. Se verificó el endpoint real sin crear reservas.

## Entrega de S07

El usuario autorizó el siguiente sprint después de publicar S06. El [informe Markdown](sprints/S07/fuentes/DOC-S07-01-entrega.md) y su [Word](sprints/S07/word/DOC-S07-01-entrega.docx) describen RF04, cantidad estricta, revisión y confirmación local. El [diagrama editable](../../diagramas/fase-10/sprints/S07-cantidad-confirmacion.mmd) muestra el recorrido sin POST. La confirmación todavía no crea una reserva. S07 está aprobado; el registro de aceptación está en sprints/S07/README.md. La publicación remota queda a cargo del usuario. S08 no está autorizado.

## Decisiones principales

Se propone React con TypeScript y Vite, un servidor web sin privilegios y un proxy `/api/` hacia FastAPI. La clave de laboratorio se mantendrá en memoria. Las operaciones pendientes se conservarán en la sesión de la pestaña sin guardar la credencial. El frontend no accederá directamente a PostgreSQL ni al worker.

El backend no ofrece listado de reservas, registro de usuarios, pagos ni cancelaciones. Consultar una reserva requiere conocer su identificador. La confirmación de una reserva no acredita envío de correo: el receptor actual es simulado.

## Evidencia y estado

Análisis basado en `aplicacion/reservas/api.py`, `store.py`, `schema.sql`, `config.py`, `worker.py`, `aplicacion/README.md`, `compose.yaml` y los manifiestos existentes. La sesión anterior comprobó el arranque Compose, readiness, documentación HTTP 200 y catálogo con 1000 cupos. No se realizaron nuevas pruebas de negocio durante la redacción. Los ensayos históricos tienen su alcance en `evidencias/`.

No se cambió la aplicación, la base de datos ni los manifiestos. No se realizaron operaciones remotas Git. Construcción, aceptación y despliegue del frontend quedan como trabajo posterior.
## Entrega S08 aprobada

S08 RF05 incorpora creación idempotente y bloqueo de doble envío. Publicado mediante el commit 8c9528c en origin/master. [Informe y entregables](sprints/S08/README.md). Pasaron 34 pruebas Node, compilación, 12 controles de secretos, 74 comprobaciones con respuestas controladas y 30 con API y PostgreSQL exclusivos. La auditoría confirmó 23 reservas y 23 outbox para 25 cupos, sin sobreventa. Recuperación y salida completa pendientes de S10 y S13.

## Entrega S09 aprobada

S09 RF06 incorpora comprobante para 201 y 200 y retiro del pendiente solo con confirmación válida. [Informe y entregables](sprints/S09/README.md). Pasaron 37 pruebas Node, compilación, 12 controles de secretos, 58 comprobaciones con fixtures, 28 con API real exclusiva y 70 de regresión de S08. La auditoría confirmó dos reservas y dos outbox para cuatro cupos. Word de cuatro páginas revisado visualmente. Aprobado por el usuario para commit y push el 19 de octubre de 2026. S10 no iniciado.

## Entrega S10 aprobada

S10 RF07 incorpora recuperación explícita con la misma credencial, clave y payload. [Informe y entregables](sprints/S10/README.md). Pasaron 43 pruebas Node, compilación, 12 controles de secretos, 30 comprobaciones controladas de recuperación, 28 con API real exclusiva y 58 de regresión S09. La auditoría confirmó una reserva de dos cupos y un outbox después de dos respuestas descartadas y recuperación con el mismo UUID. Word de cuatro páginas y capturas revisados visualmente. Aprobado por el usuario para commit y push el 19 de octubre de 2026. S11 no iniciado.

## Entrega S11 aprobada para commit local

S11 RF08 incorpora consulta autorizada por UUID y comprobante compartido. [Informe y entregables](sprints/S11/README.md). Pasaron 43 pruebas Node, compilación, 12 controles de secretos, 42 comprobaciones controladas de consulta, 29 con API real exclusiva y 58 de regresión S09. La API devuelve el mismo 404 para reserva ajena e inexistente. La consulta no genera POST ni modifica inventario u outbox. Word de cuatro páginas y capturas revisados visualmente. Aprobado para commit local; S12 autorizado el 19 de octubre de 2026.
