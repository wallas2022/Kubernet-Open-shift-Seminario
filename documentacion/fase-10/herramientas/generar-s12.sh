#!/usr/bin/env bash
set -euo pipefail
# Reuses the isolated document environment prepared in previous sprints.
mkdir -p /work/evidencias/frontend-s12
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s12-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s12/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S12/word/DOC-S12-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S12/fuentes/DOC-S12-01-entrega.md --output sprints/S12/word/DOC-S12-01-entrega.docx --subtitle 'Mensajes de dominio y tratamiento conservador para RF09' --expected-sprints 0 --footer-label 'S12 RF09' --figure /work/documentacion/fase-10/revision/s12-figuras/S12-mensajes-errores.png --figure-max-height 7.4 --figure-title 'Tratamiento de lecturas y resultados de creación' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S12-mensajes-errores.mmd. Los errores normalizados orientan la acción sin reflejar detalles privados ni reintentar automáticamente.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S12/word/DOC-S12-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s12-word --emit_pdf
