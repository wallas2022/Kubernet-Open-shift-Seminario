#!/usr/bin/env bash
set -euo pipefail
# Reuses the isolated document environment prepared in previous sprints.
mkdir -p /work/evidencias/frontend-s06
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s06-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s06/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S06/word/DOC-S06-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S06/fuentes/DOC-S06-01-entrega.md --output sprints/S06/word/DOC-S06-01-entrega.docx --subtitle 'Lectura y actualización de cupos para RF03' --expected-sprints 0 --footer-label 'S06 RF03' --figure /work/documentacion/fase-10/revision/s06-figuras/S06-disponibilidad-evento.png --figure-max-height 7.4 --figure-title 'Consulta de disponibilidad por evento' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S06-disponibilidad-evento.mmd. El formulario y el envío de reservas se implementarán en los próximos sprints.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S06/word/DOC-S06-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s06-word --emit_pdf
