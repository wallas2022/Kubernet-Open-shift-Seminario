# Prompt del Grupo 2 para escalabilidad y autoescalado

Lee 01-contrato-comun.md, DOC-02-02 y la salida de G1 y G5. Construye políticas y tratamientos de escalado L04 para la API existente. No cambies a la vez modelo de datos, autenticación o presupuesto por Pod para favorecer un resultado.

Revisa laboratorio/configuracion/reservas-hpa.yaml. Conserva ese antecedente y prepara overlays nuevos de A una API fija, B tres fijas y C HPA con mínimo tres y máximo definido por recursos y conexiones. La cantidad máxima se calcula, no se inventa. Coordina con G4 el número de procesos y POOL_MAX y con G1 requests, cuotas, topología y capacidad después de perder un trabajador.

Comprueba metrics.k8s.io, requests de CPU y estabilidad de señales. Si eliges métricas personalizadas, entrega adapter, reglas, permisos y ensayo específico; no declarar que el HPA lee Grafana. Define ventanas, políticas de subida y bajada y tiempo de arranque observado. HPA no añade hardware: entrega estado Pending, requests disponibles y margen antes y después del fallo. VPA queda inicialmente en recomendación; autoescalado de nodos, KEDA, Kafka y malla requieren tratamientos separados.

Entrega manifiestos y scripts para activar cada condición sin dos controladores escribiendo replicas a la vez. En condiciones fijas retirar o suspender el HPA mediante procedimiento acotado y restaurable. Registrar cambio y configuración efectiva; no basta cambiar el YAML en disco. Implementa vista previa y contexto explícito.

Aceptación: las tres condiciones son repetibles; demanda sostenida produce o no produce escalado con evidencia; desired, current, ready, Pending, eventos, tiempos y recursos están exportados. Verifica retirada gradual de réplicas y falta de duplicación de reservas. No dar por éxito llegar a muchas réplicas si suben errores o la base se bloquea. Entrega a G6 política congelada y series por corrida, distinguiendo beneficio de control de beneficio por gastar más recursos.
