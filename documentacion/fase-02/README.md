# Montaje del laboratorio del seminario

La guía principal para construir el laboratorio de concurrencia y alta disponibilidad del sistema de reservas es DOC-02-02:

- [Guía Word](word/DOC-02-02-guia-laboratorio-ha-50000.docx).
- [Fuente Markdown](fuentes/DOC-02-02-guia-laboratorio-ha-50000.md).
- [Prompt maestro para otro agente](prompts/laboratorio-ha-50000/00-prompt-maestro.md).
- [Índice y prompts de los seis grupos](prompts/laboratorio-ha-50000/README.md).
- [Diagrama editable](../../diagramas/laboratorio-ha-50000/arquitectura.mmd).

Entregar el prompt maestro a quien construirá todo el laboratorio. Para una tarea específica entregar el contrato común y el prompt de su grupo. El primer paso es L00, inventario y selección concreta de infraestructura; después se construyen plataforma, aplicación, datos HA, métricas, HPA y experimentos.

La guía distingue 50 000 usuarios activos, 50 000 intenciones acumuladas y una ráfaga. Incluye pilotos, auditoría de reservas y guiones de fallos con criterios de evaluación propuestos. Los recursos, proveedor y versiones definitivas se fijarán con el inventario real. La documentación de montaje anterior se conserva como antecedente y debe comprobarse antes de usar sus scripts.

Estado: documentación preparada y revisada, laboratorio nuevo todavía no construido. Sin commit ni push de esta entrega.
