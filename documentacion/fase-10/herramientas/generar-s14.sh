#!/usr/bin/env bash
set -euo pipefail
mkdir -p /work/evidencias/frontend-s14
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s14-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s14/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S14/word/DOC-S14-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S14/fuentes/DOC-S14-01-entrega.md --output sprints/S14/word/DOC-S14-01-entrega.docx --subtitle 'Copia del identificador y actualización de cupos para RF11' --expected-sprints 0 --footer-label 'S14 RF11' --figure /work/documentacion/fase-10/revision/s14-figuras/S14-copia-cupos.png --figure-max-height 7.4 --figure-title 'Copia del identificador y lectura posterior' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S14-copia-cupos.mmd. Copiar y consultar cupos no ejecutan otro POST de reserva.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S14/word/DOC-S14-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s14-word --emit_pdf
