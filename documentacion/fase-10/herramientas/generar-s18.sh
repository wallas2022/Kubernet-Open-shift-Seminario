#!/usr/bin/env bash
set -euo pipefail
mkdir -p /work/evidencias/frontend-s18
DIAGRAM_SOURCE_DIR=/work/diagramas/fase-10/sprints DIAGRAM_OUTPUT_DIR=/work/documentacion/fase-10/revision/s18-figuras DIAGRAM_REPORT_PATH=/work/evidencias/frontend-s18/diagrama.json node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
operation_kind=create
if [ -f /work/documentacion/fase-10/sprints/S18/word/DOC-S18-01-entrega.docx ]; then operation_kind=edit; fi
node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind "$operation_kind" --expected-output-count 2 --output-format docx
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S18/fuentes/DOC-S18-01-entrega.md --output sprints/S18/word/DOC-S18-01-entrega.docx --subtitle 'RN05 verificado en Compose y preparación de clúster pendiente' --expected-sprints 0 --footer-label 'S18 RN05' --figure /work/documentacion/fase-10/revision/s18-figuras/S18-despliegue-frontend.png --figure-max-height 7.4 --figure-title 'Laboratorio verificado y despliegue de clúster propuesto' --figure-caption 'Fuente editable en diagramas/fase-10/sprints/S18-despliegue-frontend.mmd. Compose se probó con API y base exclusivas. Ingress TLS y Route OpenShift están preparados y no se ejecutaron en un clúster.'
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S18/word/DOC-S18-01-entrega.docx --output_dir /work/documentacion/fase-10/revision/s18-word --emit_pdf
python3 /work/documentacion/fase-10/herramientas/build_plan.py --source sprints/S18/fuentes/DOC-S18-02-manual-laboratorio.md --output sprints/S18/word/DOC-S18-02-manual-laboratorio.docx --subtitle 'Procedimientos Compose verificados y despliegue de clúster pendiente' --expected-sprints 0 --footer-label 'S18 RN05 Manual' --include-code
python3 /skill/render_docx.py /work/documentacion/fase-10/sprints/S18/word/DOC-S18-02-manual-laboratorio.docx --output_dir /work/documentacion/fase-10/revision/s18-manual-word --emit_pdf
