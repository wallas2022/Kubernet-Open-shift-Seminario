# Verificación de la aplicación de reservas

Fecha: 13 de octubre de 2026. Documento asociado: DOC-04-01.

## Resultados ejecutados

- 19 pruebas aprobadas, cero fallos, cero errores y cero omisiones; duración de la suite registrada: 21.12 segundos.
- 17 pruebas de integración con PostgreSQL 18.3 real temporal y dos pruebas de validación de configuración o entrada.
- Carrera de ochenta solicitudes por veinticinco unidades: veinticinco reservas nuevas, cincuenta y cinco conflictos por agotamiento y cero sobreventa.
- Cuarenta repeticiones con una clave entre dos instancias de API: un efecto nuevo, treinta y nueve respuestas repetidas y una sola reserva y evento outbox.
- Rollback de inventario y reserva cuando falla outbox; conservación del evento pendiente cuando falla el receptor simulado.
- Procesamiento paralelo y repetición de eventos sin duplicar recepciones simuladas.
- Contratos de autenticación, propiedad, cantidades estrictas, clave requerida, conflicto de contenido y separación de liveness y readiness.
- Comprobación HTTP con Uvicorn real: catálogo 200, reserva nueva 201, repetición 200 con igual contenido, cambio de cantidad 409, inventario restante 999 de 1000, un evento procesado y cero nuevos al repetir procesamiento; métricas 200.
- Compilación de módulos Python, lectura de YAML, revisión estructural de siete objetos Kubernetes y sintaxis JavaScript de ambos escenarios k6.
- Exportación de OpenAPI y comprobación de formatos de secretos locales generados; no se copian secretos al repositorio.

La instancia PostgreSQL utilizó datos temporales fuera del repositorio, solo localhost y un puerto dedicado. Cada prueba usó un esquema aleatorio propio; los esquemas de pruebas se retiraron. La instancia temporal y Uvicorn se detuvieron al finalizar. No se modificaron bases PostgreSQL existentes del usuario.

## Entorno de pruebas

Python 3.12.14, PostgreSQL 18.3, FastAPI 0.143.0, Uvicorn 0.54.0, psycopg 3.3.6, psycopg-pool 3.3.3, pytest 9.1.1 y HTTPX 0.28.1. Las dependencias transitivas de ejecución se fijan en aplicacion/requirements.lock.txt.

La suite emitió una advertencia de deprecación de Starlette sobre el uso futuro de HTTPX en TestClient. No causó fallos y no afecta al servidor HTTP de la aplicación.

## Límites y pendientes

Las pruebas de contrato usan TestClient en el mismo proceso; las dos instancias de API no son dos Pods. La comprobación HTTP adicional usa Uvicorn por TCP local. Ninguna de ambas acredita capacidad empresarial, rendimiento distribuido o tolerancia a la pérdida de un host.

No se ejecutaron construcción Docker, Docker Compose ni despliegue Kubernetes: el acceso al motor Docker está bloqueado en este entorno. Los manifiestos se revisaron como YAML; su validación de esquema contra el API server y su despliegue real están pendientes. Tampoco se ejecutaron los escenarios k6 de carga y estrés; su sintaxis pasó revisión, pero no se registran percentiles o tasas de rendimiento como resultados medidos.

Word: se verificaron estilos Times New Roman 12 pt, encabezados de tabla negro y blanco e índice TOC actualizable. El intento de renderizado no pudo continuar por ausencia de LibreOffice; la revisión visual de paginación y actualización final de números de página está pendiente.

No se ejecutaron git push, git pull, git fetch ni escrituras remotas.
