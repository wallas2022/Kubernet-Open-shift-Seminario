#!/usr/bin/env bash
set -euo pipefail
mkdir -p /work/evidencias/frontend-s15
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s15-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s15/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S15/word/DOC-S15-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S15/fuentes/DOC-S15-01-entrega.md --output sprints/S15/word/DOC-S15-01-entrega.docx --subtitle 'Español y uso por teclado del recorrido RN01' --expected-sprints 0 --footer-label 'S15 RN01' --figure /work/documentacion/fase-10/revision/s15-figuras/S15-recorrido-teclado.png --figure-max-height 7.4 --figure-title 'Recorrido de teclado por los seis casos de uso' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S15-recorrido-teclado.mmd. Itinerario verificado con teclas del navegador y respuestas controladas del servicio.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S15/word/DOC-S15-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s15-word --emit_pdf
