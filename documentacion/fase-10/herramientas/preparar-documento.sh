#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends python3-docx python3-pip libreoffice-writer poppler-utils fonts-liberation >/tmp/doc10-apt.log 2>&1
pip3 install --break-system-packages pdf2image >/tmp/doc10-pip.log 2>&1
mkdir -p /tmp/doc10-node
npm install --prefix /tmp/doc10-node mermaid@11.12.0 playwright@1.58.2 >/tmp/doc10-npm.log 2>&1
if [ -f /work/documentacion/fase-10/revision/generar-plan ]; then
  node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format docx
  python3 /work/documentacion/fase-10/herramientas/build_plan.py
  python3 /skill/render_docx.py /work/documentacion/fase-10/word/DOC-10-06-plan-sprints-codificacion.docx --output_dir /work/documentacion/fase-10/revision/plan --emit_pdf
  rm /work/documentacion/fase-10/revision/generar-plan
  exit 0
fi
if [ ! -f /work/documentacion/fase-10/word/DOC-10-00-analisis-diseno-frontend.docx ]; then
  node /skill/container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format docx
fi
node /work/documentacion/fase-10/herramientas/render-diagrams.cjs
python3 /work/documentacion/fase-10/herramientas/build_document.py
python3 /skill/render_docx.py /work/documentacion/fase-10/word/DOC-10-00-analisis-diseno-frontend.docx --output_dir /work/documentacion/fase-10/revision/render-final --emit_pdf
