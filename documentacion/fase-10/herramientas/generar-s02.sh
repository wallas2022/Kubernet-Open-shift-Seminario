#!/usr/bin/env bash
set -euo pipefail
# Requires the isolated document environment prepared by preparar-documento.sh.
mkdir -p /work/evidencias/frontend-s02
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s02-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s02/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S02/fuentes/DOC-S02-01-entrega.md --output sprints/S02/word/DOC-S02-01-entrega.docx --subtitle 'Gestión local de credencial para RN04' --expected-sprints 0 --footer-label 'S02 RN04' --figure /work/documentacion/fase-10/revision/s02-figuras/S02-credencial-memoria.png --figure-max-height 7.4 --figure-title 'Ciclo de vida de la credencial' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S02-credencial-memoria.mmd. El cliente HTTP todavía no está implementado.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S02/word/DOC-S02-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s02-word --emit_pdf
