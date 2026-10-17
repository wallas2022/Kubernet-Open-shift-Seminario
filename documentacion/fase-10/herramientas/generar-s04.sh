#!/usr/bin/env bash
set -euo pipefail
# Reuses the isolated document environment prepared in previous sprints.
mkdir -p /work/evidencias/frontend-s04
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s04-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s04/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S04/fuentes/DOC-S04-01-entrega.md --output sprints/S04/word/DOC-S04-01-entrega.docx --subtitle 'Validación de clave contra la API para RF01' --expected-sprints 0 --footer-label 'S04 RF01' --figure /work/documentacion/fase-10/revision/s04-figuras/S04-acceso-laboratorio.png --figure-max-height 7.4 --figure-title 'Validación y activación de la sesión' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S04-acceso-laboratorio.mmd. El catálogo visible corresponde a S05 y la salida completa a S13.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S04/word/DOC-S04-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s04-word --emit_pdf
