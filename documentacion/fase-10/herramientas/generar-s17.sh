#!/usr/bin/env bash
set -euo pipefail
mkdir -p /work/evidencias/frontend-s17
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s17-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s17/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S17/word/DOC-S17-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S17/fuentes/DOC-S17-01-entrega.md --output sprints/S17/word/DOC-S17-01-entrega.docx --subtitle 'Correcciones de RN06 y validación manual pendiente' --expected-sprints 0 --footer-label 'S17 RN06' --figure /work/documentacion/fase-10/revision/s17-figuras/S17-foco-anuncios.png --figure-max-height 7.4 --figure-title 'Foco y anuncios con aceptación pendiente del lector' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S17-foco-anuncios.mmd. La inspección automática no sustituye la prueba manual con lector; RN06 continúa abierto.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S17/word/DOC-S17-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s17-word --emit_pdf
