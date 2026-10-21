# Prompt del Grupo 4 para persistencia e integridad

Lee 01-contrato-comun.md, DOC-02-02 y decisiones de plataforma. Construye L03, preservando la reserva síncrona confirmada después del commit. Inspecciona api.py, store.py, config.py, schema.sql, manage.py y pruebas existentes antes de editar.

Selecciona con evidencia de compatibilidad un operador PostgreSQL o servicio administrado. Propón primario y dos réplicas en dominios distintos, endpoint de escritura estable, failover automático, prevención de doble primario y almacenamiento que sobreviva al fallo previsto. Fija política de sincronización, elección de réplicas y comportamiento cuando falten confirmaciones síncronas. Justifica RPO cero para confirmadas como objetivo a probar; replicación asíncrona no lo garantiza. No inventes campos CRD: fija versión, valida contra su esquema e inspecciona admisión y estado real.

Entrega datos, inicialización, copia y restauración, scripts de auditoría de solo lectura y runbooks. Coordina Job único de migración y reconexión de API. Presupuesta réplicas por procesos por POOL_MAX y conexiones extras; estudia pooler solo si lo identificas como cambio separado. Mide bloqueo del UPDATE de un solo evento, latencia del disco y errores de pool. No cambiar inventario o semántica en mitad de la comparación A/B/C.

Construye semilla nueva por ensayo y registra inventario antes y después. initialize usa ON CONFLICT DO NOTHING y no reinicia eventos existentes. Auditoría obligatoria por evento: capacity menos available igual a suma quantity confirmada, available válido, cero pending persistido, unicidad por propietario y clave, una outbox por reserva y ausencia de huérfanos. Relaciona los IDs confirmados por el cliente con la base después del fallo; resuelve inciertas mediante reenvío original. Cuenta reservas y cupos por separado.

Aceptación: dos competidores por el último cupo producen una confirmación y un sold_out; reenvíos concurrentes conservan ID y descuento; contenido distinto con misma clave da conflicto; pérdida de respuesta no duplica; promoción de primario conserva confirmadas según objetivo o documenta pérdidas. Prueba restauración en una base distinta. Nunca modifiques la base S19 para estos ensayos.

Mantén outbox y worker con el mismo estado en comparaciones. Kafka o AMQ Streams se estudian después del commit como extensión y requieren deduplicación del consumidor, retención, particionado y pruebas propias. No declarar entrega externa exactamente una vez a partir de la recepción simulada local.
