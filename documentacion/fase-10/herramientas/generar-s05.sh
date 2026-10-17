#!/usr/bin/env bash
set -euo pipefail
# Reuses the isolated document environment prepared in previous sprints.
mkdir -p /work/evidencias/frontend-s05
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s05-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s05/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S05/fuentes/DOC-S05-01-entrega.md --output sprints/S05/word/DOC-S05-01-entrega.docx --subtitle 'Catálogo con carga vacío error y actualización para RF02' --expected-sprints 0 --footer-label 'S05 RF02' --figure /work/documentacion/fase-10/revision/s05-figuras/S05-catalogo-eventos.png --figure-max-height 7.4 --figure-title 'Lectura y actualización del catálogo' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S05-catalogo-eventos.mmd. Los datos previos se conservan tras un fallo solo con aviso de desactualización.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S05/word/DOC-S05-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s05-word --emit_pdf
