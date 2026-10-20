#!/usr/bin/env bash
set -euo pipefail
mkdir -p /work/evidencias/frontend-s16
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s16-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s16/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S16/word/DOC-S16-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S16/fuentes/DOC-S16-01-entrega.md --output sprints/S16/word/DOC-S16-01-entrega.docx --subtitle 'Adaptación de pantalla y zoom del recorrido RN02' --expected-sprints 0 --footer-label 'S16 RN02' --figure /work/documentacion/fase-10/revision/s16-figuras/S16-adaptacion-pantalla.png --figure-max-height 7.4 --figure-title 'Verificación de tamaños y redistribución del contenido' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S16-adaptacion-pantalla.mmd. Matriz de cuatro perfiles y sesenta estados con medidas y capturas comparables.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S16/word/DOC-S16-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s16-word --emit_pdf
