#!/usr/bin/env bash
set -euo pipefail
# Reuses the isolated document environment prepared in previous sprints.
mkdir -p /work/evidencias/frontend-s11
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s11-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s11/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S11/word/DOC-S11-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 1 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S11/fuentes/DOC-S11-01-entrega.md --output sprints/S11/word/DOC-S11-01-entrega.docx --subtitle 'Consulta por UUID y comprobante autorizado para RF08' --expected-sprints 0 --footer-label 'S11 RF08' --figure /work/documentacion/fase-10/revision/s11-figuras/S11-consulta-reserva.png --figure-max-height 7.4 --figure-title 'Consulta autorizada y presentación del comprobante' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S11-consulta-reserva.mmd. La consulta exige UUID válido y la API limita el acceso al propietario de la reserva.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S11/word/DOC-S11-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s11-word --emit_pdf
