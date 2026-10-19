#!/usr/bin/env bash
set -euo pipefail
mkdir -p /work/evidencias/frontend-s13
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s13-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s13/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S13/word/DOC-S13-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S13/fuentes/DOC-S13-01-entrega.md --output sprints/S13/word/DOC-S13-01-entrega.docx --subtitle 'Salida con advertencia y limpieza verificable para RF10' --expected-sprints 0 --footer-label 'S13 RF10' --figure /work/documentacion/fase-10/revision/s13-figuras/S13-salida-limpieza.png --figure-max-height 7.4 --figure-title 'Salida del contexto local y resultado del borrado' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S13-salida-limpieza.mmd. La salida afecta esta pestaña y conserva las reservas y la habilitación de la clave en el servidor.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S13/word/DOC-S13-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s13-word --emit_pdf
