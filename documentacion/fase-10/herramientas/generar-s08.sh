#!/usr/bin/env bash
set -euo pipefail
# Reuses the isolated document environment prepared in previous sprints.
mkdir -p /work/evidencias/frontend-s08
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s08-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s08/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S08/word/DOC-S08-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S08/fuentes/DOC-S08-01-entrega.md --output sprints/S08/word/DOC-S08-01-entrega.docx --subtitle 'Creación idempotente y bloqueo de doble envío para RF05' --expected-sprints 0 --footer-label 'S08 RF05' --figure /work/documentacion/fase-10/revision/s08-figuras/S08-creacion-idempotente.png --figure-max-height 7.4 --figure-title 'Persistencia de intención y envío único' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S08-creacion-idempotente.mmd. El pendiente se verifica antes del POST y bloquea nuevas intenciones.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S08/word/DOC-S08-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s08-word --emit_pdf
