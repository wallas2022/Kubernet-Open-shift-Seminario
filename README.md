# Seminario Kubernetes OKD y Red Hat OpenShift

## Análisis y diseño del frontend

La [Fase 10](documentacion/fase-10/README.md) reúne requisitos, seis casos de uso, experiencia de usuario, arquitectura y plan de validación para la interfaz de reservas. Incluye fuentes Markdown por etapa, Word consolidado y diez diagramas Mermaid editables. Es un diseño propuesto; el frontend todavía no está implementado. Consultar el registro de revisión de esa fase para las comprobaciones efectivamente ejecutadas.



Esta estructura está guardada en la raíz local indicada por el usuario. La Fase 00 fue aprobada por el usuario; sus archivos no se recuperaron y su carpeta se mantiene reservada. La investigación de Fase 01 se encuentra en `documentacion/fase-01`.

## Organización

- `documentacion/fase-00`: documentos aprobados de planificación.
- `documentacion/fase-01/word`: entregables Word de investigación.
- `documentacion/fase-01/fuentes`: fuentes Markdown editables.
- `diagramas`: diagramas Mermaid independientes cuando se desarrollen; los seis actuales están en el Markdown de investigación.
- `laboratorio/infraestructura`: definición de máquinas, redes y almacenamiento.
- `laboratorio/configuracion`: configuración y manifiestos sin secretos.
- `aplicacion`: aplicación demostrativa por implementar.
- `pruebas/carga`, `pruebas/estres`, `pruebas/resiliencia`: escenarios por implementar.
- `evidencias`: resultados reales de ensayos, pendientes de ejecución.
- `presentacion`: material de exposición posterior.
- `plantillas`: convenciones y modelos documentales.

## Estado

DOC-01-01 incluye 22 capítulos, 37 referencias oficiales, comparación de plataformas y caso empresarial propuesto. El Word tiene estilos Times New Roman 12 pt, tablas con encabezados negros y letras blancas, y campo de índice actualizable. Su paginación no ha sido verificada visualmente porque el entorno no dispone de un renderizador accesible. Actualizar el índice con F9 en Word.

## Control del repositorio

El usuario realiza las operaciones remotas. No ejecutar `git push` ni `git pull`, ni escribir en el repositorio remoto. Repositorio Git local inicializado. El remoto origin está configurado como https://github.com/wallas2022/Kubernet-Open-shift-Seminario.git. No se han creado commits ni ejecutado push, pull o fetch.



## Diseño del laboratorio

DOC-02-01 está guardado en documentacion/fase-02, con propuesta para una laptop y alternativas de cuatro o cinco equipos. Es un diseño propuesto; inventario, instalación y pruebas están pendientes. El diagrama editable está en diagramas/laboratorio-cinco-equipos.mmd. La revisión visual de paginación del nuevo Word está pendiente por falta de renderizador accesible.

## Manual de instalación

DOC-03-01 se encuentra en documentacion/fase-03 en Word y Markdown. La ruta principal es Windows con WSL 2, Docker Desktop, kind v0.33.0 y Kubernetes v1.37.0 por digest. Los perfiles kind y manifiesto de comprobación están en laboratorio/configuracion; los scripts de creación y validación en laboratorio/scripts. Se comprobó la sintaxis PowerShell y la estructura del Word. La ejecución real del clúster y la revisión visual de paginación están pendientes. El diseño de DOC-02-01 fue aceptado por el usuario.

## Aplicación de reservas

DOC-04-01 se encuentra en documentacion/fase-04. El código, Compose, Dockerfile, esquema, pruebas y manifiestos kind están en aplicacion. Los escenarios k6 están en pruebas/carga y pruebas/estres; diagramas editables en diagramas. Pasaron 19 pruebas y una comprobación HTTP con PostgreSQL 18.3 real temporal. Evidencias en evidencias/DOC-04-01-resultados.md, XML y JSON. Construcción Docker, despliegue kind, escenarios k6 y revisión visual de Word pendientes. No se afirma capacidad empresarial medida.

## Despliegue y carga piloto

DOC-05-01 está en documentacion/fase-05. Pasaron cuatro ensayos locales de k6 con API y PostgreSQL nativos, integridad comprobada y resultados por repetición en evidencias/carga-piloto. El script laboratorio/scripts/Deploy-Reservas.ps1 prepara primer despliegue kind y laboratorio/configuracion/reservas-hpa.yaml prepara HPA. Construcción Docker, despliegue, HPA y pruebas prolongadas siguen pendientes del acceso al motor; no se atribuyen los resultados locales a Kubernetes.

## Fase 06 Presentación

DOC-06-01: 20 diapositivas editables, guion Markdown y Word, diagrama Mermaid y estado de revisión en `presentacion/fase-06/`. Piloto local medido; Kubernetes y HPA pendientes. Word pendiente de revisión visual.

## Fase 07 Guía del instructor

DOC-07-01 en `documentacion/fase-07/`: agenda de tres horas, demostración, ejercicios, evaluación y soluciones. Hoja separada del participante y Mermaid en `diagramas/`. Word pendiente de revisión visual. Modalidad práctica condicionada a disponibilidad del entorno; no acredita ejecución Kubernetes ni HPA.

## Respaldo y restauración

DOC-08-01 en `documentacion/fase-08/`. Pasó un ensayo local PostgreSQL 18.3 con respaldo lógico, restauración de diez reservas, conservación de idempotencia y continuidad de outbox. Programa en `pruebas/resiliencia/recovery.py`; evidencia en `evidencias/recuperacion-local/`. No acredita recuperación Kubernetes ni RTO empresarial. Word pendiente de revisión visual.

## Preparación OpenShift y estado vigente

Consultar `ESTADO-ACTUAL-SEMINARIO.md` para el estado consolidado. DOC-09-01 en `documentacion/fase-09/` prepara la variante `aplicacion/openshift/`, con PostgreSQL externo TLS e identidad de plataforma. Resolutor offline en `laboratorio/scripts/render_openshift.py`. Pasaron siete comprobaciones locales; admisión y ejecución OpenShift pendientes. Word pendiente de revisión visual.
