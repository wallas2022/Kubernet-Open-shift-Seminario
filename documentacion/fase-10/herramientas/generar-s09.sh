#!/usr/bin/env bash
set -euo pipefail
# Reuses the isolated document environment prepared in previous sprints.
mkdir -p /work/evidencias/frontend-s09
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s09-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s09/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S09/word/DOC-S09-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S09/fuentes/DOC-S09-01-entrega.md --output sprints/S09/word/DOC-S09-01-entrega.docx --subtitle 'Confirmación de reservas nuevas y repetidas para RF06' --expected-sprints 0 --footer-label 'S09 RF06' --figure /work/documentacion/fase-10/revision/s09-figuras/S09-comprobante-reserva.png --figure-max-height 7.4 --figure-title 'Validación y conservación del comprobante' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S09-comprobante-reserva.mmd. Solo una confirmación válida permite retirar el pendiente; una lectura fallida no oculta el comprobante.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S09/word/DOC-S09-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s09-word --emit_pdf
