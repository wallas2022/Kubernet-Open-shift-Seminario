#!/usr/bin/env bash
set -euo pipefail
# Reuses the isolated document environment prepared in previous sprints.
mkdir -p /work/evidencias/frontend-s10
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s10-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s10/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S10/word/DOC-S10-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S10/fuentes/DOC-S10-01-entrega.md --output sprints/S10/word/DOC-S10-01-entrega.docx --subtitle 'Recuperación explícita de la intención original para RF07' --expected-sprints 0 --footer-label 'S10 RF07' --figure /work/documentacion/fase-10/revision/s10-figuras/S10-recuperacion-pendiente.png --figure-max-height 7.4 --figure-title 'Recuperación con la misma identidad e intención' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S10-recuperacion-pendiente.mmd. Cada reenvío requiere una acción explícita y conserva la clave y los datos originales.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S10/word/DOC-S10-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s10-word --emit_pdf
