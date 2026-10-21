from pathlib import Path
import ast

# Reuse the reviewed Word formatting functions without rebuilding other deliveries.
root=Path.cwd()
source=root/'documentacion/herramientas/seminario/build_docs.py'
tree=ast.parse(source.read_text(encoding='utf-8'))
nodes=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef))]
module=ast.Module(body=nodes,type_ignores=[])
scope={}
exec(compile(module,str(source),'exec'),scope)
scope['build'](
 root/'documentacion/fase-02/fuentes/DOC-02-02-guia-laboratorio-ha-50000.md',
 root/'documentacion/fase-02/word/DOC-02-02-guia-laboratorio-ha-50000.docx',
 'Montaje por etapas y contratos de trabajo para los seis grupos',
 'Guía para construir y evaluar el laboratorio Kubernetes del sistema de reservas con carga progresiva y fallos controlados. Incluye dependencias, criterios de aceptación y rutas de los prompts para otro agente. El despliegue y la meta de 50 000 usuarios siguen pendientes de ejecución.'
)
