# Prompt del Grupo 5 para métricas y observación

Lee 01-contrato-comun.md, DOC-02-02 y topología de G1. Construye la instrumentación L04 y el registro externo que permitirá verificar L05 y L06. No entregar solo capturas de paneles vacíos.

Revisa /metrics actual: suma y conteo permiten media y no p95. Implementa histogramas agregables por ruta y resultado y prueba su exactitud aproximada con observaciones conocidas. No usar claves, propietarios o UUID de reserva como etiquetas. Mantén cardinalidad acotada, contadores compatibles con reinicios y exposición privada de métricas.

Entrega instalación versionada de Prometheus, Grafana, exporters o mecanismos compatibles, dashboards JSON, reglas, consultas, diccionario de métricas y exportación de series. En OpenShift usa y valida el mecanismo permitido de monitorización sin instalar un stack duplicado por defecto. Asegura reloj UTC sincronizado, retención y recursos; el observador debe sobrevivir al dominio de fallo que se mide o reconocer lagunas.

Paneles obligatorios: VU y tasa objetivo y efectiva del cliente; 201 únicos por segundo; reenvíos; sold_out y conflictos separados; p95/p99 por operación; timeouts y errores; CPU, throttling, memoria, OOM y red; Pods deseados, listos y pendientes; conexiones, bloqueos y lag PostgreSQL; marcadores de inyección y recuperación. No promediar p95 de réplicas ni corridas. Compara métricas del cliente con las del servidor sin exigir igualdad donde existen reintentos o tráfico de sondas.

Entrega la fuente de metrics.k8s.io a G2; si hay adapter personalizado, coordina propiedad y prueba con él. No suponer que instalar Prometheus crea automáticamente la señal del HPA. Valida permisos y capacidad de scrape para todas las réplicas y reinicios.

Aceptación: paneles con datos reales identificados por corrida, consultas exportables, muestras crudas, diferencias explicadas y captura externa durante un fallo. La meta de precisión de detección del 95 por ciento exige ventanas con verdad de referencia, TP, FP, FN y demora; entregar ese protocolo o dejarlo pendiente. No confundir precisión con intervalo de confianza estadística ni afirmar detección sin ensayos etiquetados.
