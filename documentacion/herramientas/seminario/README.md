# Reconstrucción de los entregables del seminario

Ejecutar desde la raíz del repositorio. `runtime.mjs` localiza y verifica el runtime instalado; permite definir `CODEX_PRIMARY_RUNTIME_ROOT`. No instala dependencias.

En PowerShell, usar los ejecutables del runtime:

```powershell
& "$env:USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe" documentacion/herramientas/seminario/build_docs.py
& "$env:USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe" documentacion/herramientas/seminario/build_deck.mjs
```

`build_docs.py` genera investigación, guion y guía Word, y el guion Markdown desde el JSON. Conserva Times New Roman 12, texto negro, cabeceras de tabla negras con texto blanco e índice actualizable con F9 en Word.

`build_deck.mjs` utiliza Artifact Tool y genera treinta diapositivas, notas, dos tablas nativas y un gráfico nativo con libro de datos incorporado. El resultado de la validación debe ser exitoso antes de considerar terminado el PowerPoint. Revisar `revision/seis-grupos/validation.json` y las vistas PNG. Si una ejecución falla, conservar el último entregable validado y diagnosticar el candidato de `.runtime/seminario/build`.

Los Word deben renderizarse con la herramienta documental `render_docx.py` y revisarse página por página después de cualquier cambio. Los tres Mermaid editables están en `diagramas/seminario-seis-grupos`; pueden validarse mediante `documentacion/fase-10/herramientas/render-diagrams.cjs` con las variables `DIAGRAM_SOURCE_DIR`, `DIAGRAM_OUTPUT_DIR` y `DIAGRAM_REPORT_PATH`.
