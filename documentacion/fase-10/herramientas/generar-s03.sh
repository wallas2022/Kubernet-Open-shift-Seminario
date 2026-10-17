#!/usr/bin/env bash
set -euo pipefail
# Reuses the isolated document environment prepared in previous sprints.
mkdir -p /work/evidencias/frontend-s03
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s03-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s03/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S03/fuentes/DOC-S03-01-entrega.md --output sprints/S03/word/DOC-S03-01-entrega.docx --subtitle 'Timeout y tratamiento conservador para RN07' --expected-sprints 0 --footer-label 'S03 RN07' --figure /work/documentacion/fase-10/revision/s03-figuras/S03-cliente-http.png --figure-max-height 7.4 --figure-title 'Clasificación del resultado HTTP' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S03-cliente-http.mmd. La recuperación de una operación persistida corresponde a S10.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S03/word/DOC-S03-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s03-word --emit_pdf
