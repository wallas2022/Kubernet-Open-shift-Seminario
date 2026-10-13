# Aplicación de reservas concurrentes con PostgreSQL y Kubernetes

DOC-04-01 · Implementación del caso empresarial · Versión 1.0  
Seminario Kubernetes OKD y OpenShift · 13 de octubre de 2026

La aplicación implementa reservas con inventario limitado, claves idempotentes por cliente y un registro outbox confirmado junto con la reserva. La primera ejecución recomendada utiliza Docker Compose; el despliegue kind permite después estudiar réplicas y recuperación. Las notificaciones se simulan en una tabla receptora y no envían mensajes externos.

El entregable incluye código de API y procesador, esquema SQL, pruebas de integración PostgreSQL, manifiestos kind y escenarios k6. Los resultados efectivamente ejecutados se conservan en la evidencia de esta etapa. Los objetivos de capacidad de DOC-01-01 continúan sujetos a ensayos de carga; la corrección de datos y el rendimiento son criterios distintos.

## Índice

1. Arquitectura implementada
2. Contratos de la API y autenticación
3. Transacciones idempotencia e inventario
4. Procesamiento outbox y notificaciones simuladas
5. Configuración dependencias y secretos
6. Ejecución local con Docker Compose
7. Despliegue en kind
8. Pruebas funcionales y de integridad
9. Pruebas de carga y estrés
10. Observabilidad y diagnóstico
11. Alcance de validación y continuidad
12. Referencias

## 1 Arquitectura implementada

La API utiliza FastAPI y un pool psycopg para PostgreSQL. Cada proceso de API tiene su propio pool, con máximo inicial de diez conexiones. El procesador outbox es un proceso separado que consulta eventos pendientes, inserta su recepción simulada y marca el procesamiento dentro de una transacción. No hay caché en esta versión: así se observa directamente la relación entre API, conexiones y base de datos.

```mermaid
flowchart TB
  C[Cliente o generador k6] --> A[API FastAPI]
  A --> P[Pool psycopg]
  P --> D[(PostgreSQL)]
  D --> O[Tabla outbox]
  W[Procesador separado] --> O
  W --> N[Tabla de notificaciones simuladas]
  A --> M[Metricas por ruta y estado]
```

Figura 1. Componentes implementados. El pool está dentro de cada proceso y las tablas pertenecen a PostgreSQL.

| Componente | Ubicación en el repositorio | Función |
| --- | --- | --- |
| API | aplicacion/reservas/api.py | Contratos, autenticación, sondas y métricas |
| Acceso transaccional | aplicacion/reservas/store.py | Inventario, reservas y outbox |
| Esquema | aplicacion/reservas/schema.sql | Tablas, claves y restricciones |
| Procesador | aplicacion/reservas/worker.py | Recepción simulada y deduplicación |
| Inicialización | aplicacion/reservas/manage.py | Crear esquema y semilla sin reiniciar datos |
| Pruebas | aplicacion/tests | Integración y validación de entradas |

Las tablas reales son events, reservations, outbox y notification_deliveries. Las identidades de clientes se configuran mediante claves de laboratorio; no se crea todavía una tabla de usuarios ni un proceso de registro público. El modelo actualizado se conserva en Mermaid junto con el código.

## 2 Contratos de la API y autenticación

### Identidad y validación de entrada

Cada clave de `CLIENT_KEYS_JSON` corresponde a un UUID de cliente. La API deriva la identidad de `X-Api-Key` y no acepta `client_id` enviado en el cuerpo. Dos claves pueden representar clientes diferentes y sus reservas se consultan por propietario. El generador de secretos crea una clave aleatoria local; las pruebas utilizan dos identidades ficticias.

Esta autenticación permite una práctica controlada sin confiar en un encabezado de identidad libre. Para producción se necesita integrar un proveedor de identidad, políticas de rotación, TLS y permisos de datos diferenciados. Health, métricas y documentación están disponibles sin clave en el ambiente local; el acceso externo a esas rutas deberá regularse al publicar una entrada real.

| Operación | Entrada | Resultado normal |
| --- | --- | --- |
| GET /catalogo | X-Api-Key | 200 con lista de eventos |
| GET /eventos/{id}/disponibilidad | UUID y X-Api-Key | 200 con cupo informativo |
| POST /reservas | Clave API, Idempotency-Key, event_id y quantity | 201 nueva o 200 repetida |
| GET /reservas/{id} | UUID y clave del propietario | 200 con reserva propia |
| GET /health/live | Sin credenciales | 200 si el proceso atiende |
| GET /health/ready | Sin credenciales | 200 si consulta el esquema; 503 ante falla cubierta |

### Respuestas de error

Cantidad debe ser un entero estricto de uno a cien; booleanos, decimales, cadenas, cantidades negativas y campos adicionales se rechazan. La clave idempotente acepta de uno a 128 caracteres alfanuméricos o los signos punto, guion bajo, dos puntos y guion. Las rutas usan UUID válidos.

| Código | Significado |
| --- | --- |
| 401 | Clave API ausente o inválida |
| 404 | Evento inexistente o reserva no accesible al cliente |
| 409 con sold_out | Cupo insuficiente; no se crea reserva |
| 409 con idempotency_conflict | Clave ya usada con evento o cantidad diferente |
| 422 | Entrada o encabezado requerido inválido |
| 503 | Base, bloqueo, consulta o pool no disponible en los casos manejados |

Los errores de negocio se representan con campo `error`. Los errores de validación y autenticación usan el formato de detalle de FastAPI. No se devuelve SQL ni credenciales en las respuestas de base no disponible.

## 3 Transacciones idempotencia e inventario

### Un ganador por cliente y clave

La reserva comienza insertando una fila pending con unicidad sobre cliente y clave idempotente. `INSERT ... ON CONFLICT DO NOTHING` decide qué solicitud puede continuar. Una solicitud repetida espera al competidor y después consulta la fila confirmada. Con READ COMMITTED, la consulta posterior utiliza un snapshot nuevo. Si evento y cantidad coinciden, devuelve la misma reserva con HTTP 200; si difieren, devuelve conflicto. [A1, A2]

El ganador descuenta inventario mediante un UPDATE que exige cupo suficiente. Después cambia el estado a confirmed e inserta outbox. El contexto transaccional confirma todos los cambios juntos. Si no hay cupo o falla un paso, se revierte también la fila pending y se libera la clave del intento fallido. [A3]

### Invariantes verificables

Para un evento sin cancelaciones ni reposiciones, disponible más suma de cantidades confirmadas debe ser igual a capacidad. Disponible no puede ser negativo ni superior a capacidad. Cada reserva confirmada debe tener un evento outbox; la unicidad impide varios outbox para la misma reserva.

No se acepta una lectura previa de cupo como autorización de venta. La lectura es informativa; la confirmación depende del UPDATE condicionado dentro de la transacción. Esto permite que dos clientes vean cupo y uno reciba sold_out al competir por las últimas unidades.

La pérdida de la respuesta después del commit se resuelve reintentando con la misma clave y el mismo cuerpo. Una clave nueva representa una intención nueva. La API no implementa cancelaciones ni reembolsos en esta etapa, por lo que no se debe modificar inventario manualmente y seguir usando las mismas fórmulas como si nada hubiera cambiado.

## 4 Procesamiento outbox y notificaciones simuladas

El procesador toma un lote de hasta cincuenta filas pendientes con bloqueo y SKIP LOCKED. Varios procesadores pueden trabajar sobre lotes distintos sin reclamar una misma fila a la vez. Cada recepción usa el ID del evento outbox como clave única. La marca processed_at y la fila receptora se confirman en la misma base.

Si falla una inserción receptora, la transacción no marca el evento como procesado y un intento posterior puede retomarlo. Si un evento se vuelve a presentar, la unicidad receptora impide duplicar la fila. Este diseño demuestra atomicidad y deduplicación dentro del receptor simulado; no prueba entrega exactamente una vez a correo, pagos o sistemas externos.

El proceso registra únicamente cantidades procesadas y errores genéricos de base. Ante fallo de conexión o SQL cubierto espera dos segundos antes de intentar otro lote. Al recibir SIGINT o SIGTERM deja de aceptar un ciclo nuevo y cierra el pool al terminar. Una falla real del proceso antes del commit deja el lote pendiente.

Para un receptor externo futuro se necesitarán timeouts, reintentos acotados, estado de intentos y deduplicación del receptor. No se debe insertar una llamada externa dentro de una transacción larga de PostgreSQL esperando obtener atomicidad entre ambos sistemas.

## 5 Configuración dependencias y secretos

### Configuración de ejecución

| Variable | Uso |
| --- | --- |
| DATABASE_URL | Conexión PostgreSQL del ambiente |
| CLIENT_KEYS_JSON | Mapa de claves a UUID de cliente |
| POOL_MAX | Máximo de conexiones por proceso, entre uno y cincuenta |
| DB_SCHEMA | Esquema validado, public por defecto |
| TEST_DATABASE_URL | Conexión exclusiva para pruebas de integración |

Las conexiones tienen timeout de cinco segundos; el pool espera hasta dos segundos, las consultas tienen statement_timeout de tres segundos y los bloqueos lock_timeout de dos segundos. Una espera agotada requiere que el cliente reintente de forma controlada usando la misma clave. Estos valores son iniciales y deben ajustarse con medición, sin ocultar fallas mediante reintentos ilimitados.

Los requisitos directos y un archivo de versiones transitivas se conservan en `requirements.txt` y `requirements.lock.txt`. El Dockerfile usa el archivo de versiones fijadas. La imagen base Python y PostgreSQL se seleccionan por tags de familia; para un ensayo reproducible hay que registrar sus digests y el ID de la imagen construida. Fijar versiones no equivale a haber realizado una auditoría completa de vulnerabilidades.

### Crear secretos locales

Desde la carpeta aplicacion, generar archivos fuera del repositorio:

```powershell
$secretsDir = Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\reservas-secrets'
python .\tools\generate_env.py --directory $secretsDir
```

La herramienta crea compose.env, kubernetes.env y client-access.json sin imprimir los valores secretos. Cada formato tiene tratamiento propio de comillas: el archivo Compose no se reutiliza como archivo de Secret Kubernetes. No se sobrescriben archivos existentes. No publicar el contenido ni la salida de comandos que expandan variables secretas.

## 6 Ejecución local con Docker Compose

### Crear el ambiente

Situarse en la carpeta aplicacion del repositorio. Docker debe estar disponible en modo Linux. La composición utiliza una base con volumen persistente, un contenedor de inicialización, API y procesador. El puerto PostgreSQL no se publica al anfitrión; HTTP se vincula a 127.0.0.1:8082.

```powershell
docker compose --env-file "$secretsDir\compose.env" up --build -d
docker compose --env-file "$secretsDir\compose.env" ps
Invoke-RestMethod 'http://127.0.0.1:8082/health/ready'
```

La semilla crea un evento de mil unidades solo cuando no existe. Repetir init no recupera cupo ni elimina reservas. La persistencia impide tratar cada reinicio como un ensayo con inventario limpio. Para comparar pruebas usar una base de ensayo nueva y conservar la anterior cuando se necesite reproducir resultados.

### Reservar y repetir

```powershell
$access = Get-Content "$secretsDir\client-access.json" -Raw | ConvertFrom-Json
$headers = @{'X-Api-Key'=$access.api_key; 'Idempotency-Key'='reserva-001'}
$body = @{event_id='00000000-0000-0000-0000-000000000001';quantity=1} | ConvertTo-Json
Invoke-RestMethod 'http://127.0.0.1:8082/reservas' `
  -Method Post -Headers $headers -ContentType 'application/json' -Body $body
```

La primera reserva nueva devuelve 201 y repetirla devuelve 200 con el mismo ID y contenido. Para ver códigos HTTP usar una herramienta que exponga estado además del cuerpo. La documentación interactiva está en `/docs` y el esquema en `/openapi.json`.

Al finalizar, `docker compose --env-file "$secretsDir\compose.env" down` detiene este proyecto conservando el volumen. No añadir `-v` salvo que se pretenda borrar expresamente los datos de laboratorio. PostgreSQL 18 utiliza un diseño de volumen distinto de versiones anteriores: la composición monta el padre `/var/lib/postgresql` siguiendo la imagen oficial. [A5]

## 7 Despliegue en kind

### Preparar imagen y credenciales

Usar el clúster aceptado según DOC-03-01 y sus credenciales dedicadas. Desde aplicacion, construir la imagen y cargarla en kind:

```powershell
docker build -t seminario-reservas:1.0.0 .
kind load docker-image seminario-reservas:1.0.0 --name seminario
$kc = Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\seminario\kubeconfig.yaml'
```

Si Namespace seminario ya existe, conservarlo. Si no existe, crearlo. Crear el Secret a partir del archivo Kubernetes local, sin guardar un YAML con valores en Git:

```powershell
kubectl --kubeconfig $kc --context kind-seminario create namespace seminario
kubectl --kubeconfig $kc --context kind-seminario -n seminario `
  create secret generic reservas-config `
  --from-env-file="$secretsDir\kubernetes.env"
```

La primera línea se omite cuando el Namespace ya existe. Un Secret existente no debe reemplazarse sin revisar sus credenciales y la base persistente. Rotar solo la variable de un contenedor no cambia automáticamente la contraseña almacenada en PostgreSQL.

### Aplicar y esperar

```powershell
kubectl --kubeconfig $kc --context kind-seminario `
  apply -f .\kubernetes\base.yaml
kubectl --kubeconfig $kc --context kind-seminario -n seminario `
  wait --for=condition=complete job/reservas-init --timeout=180s
kubectl --kubeconfig $kc --context kind-seminario -n seminario `
  rollout status deployment/reservas-api --timeout=180s
kubectl --kubeconfig $kc --context kind-seminario -n seminario `
  port-forward service/reservas-api 8082:80 --address 127.0.0.1
```

El Job puede reintentar mientras inicia PostgreSQL. Las sondas de API separan vida del proceso y acceso al esquema. El manifiesto solicita dos réplicas API y un procesador. El volumen local y una sola instancia de datos no ofrecen alta disponibilidad de la base.

La base está dirigida a kind y requiere una StorageClass predeterminada operativa. El UID 999 de PostgreSQL debe revisarse antes de migrar a SCC de OpenShift. La API usa un usuario no privilegiado de imagen y no fija UID en el manifiesto, pero la compatibilidad de toda la solución deberá probarse en la plataforma seleccionada. No se presenta el YAML como instalación empresarial lista.

El túnel selecciona una réplica. Para estudiar escalamiento entre varias API, preparar una entrada HTTP real o un generador que consulte el Service desde dentro del clúster. Los límites de TLS, enrutamiento, HPA y métricas del sistema se incorporarán en la siguiente etapa de ensayos.

## 8 Pruebas funcionales y de integridad

### Ejecución de la suite

La suite requiere PostgreSQL real y una base exclusiva de pruebas con permiso para crear esquemas. Cada prueba crea un esquema test_ con identificador aleatorio y elimina solo ese esquema al terminar. No modifica tablas compartidas de otros esquemas. Si falta la conexión o no es accesible, la ejecución comunica el fallo del requisito; no sustituye PostgreSQL por SQLite.

```powershell
python -m pip install -r requirements-dev.txt
$env:TEST_DATABASE_URL = 'postgresql://usuario:clave@127.0.0.1:5432/base_de_pruebas'
python -m pytest tests -q
```

La URL mostrada es un ejemplo y debe reemplazarse por credenciales reales de laboratorio. Usar un entorno virtual local, sin instalar dependencias globales. La suite utiliza TestClient para el contrato HTTP y conexiones PostgreSQL para las invariantes. No equivale a una prueba del stack TCP de Uvicorn ni del router de Kubernetes. [A6]

| Escenario | Condición comprobada por la prueba |
| --- | --- |
| Autenticación y propiedad | Otro cliente no consulta una reserva ajena |
| Cantidades inválidas | No alteran inventario ni crean reservas |
| Repetición | Misma clave y cuerpo devuelven la misma reserva |
| Carrera de cupo | Ochenta solicitudes compiten por veinticinco unidades |
| Dos instancias API | Cuarenta repeticiones producen un único efecto |
| Contenidos distintos | La clave ganadora rechaza el contenido incompatible |
| Falla al escribir outbox | Descuento y reserva se revierten |
| Procesadores paralelos | Cada evento se recibe una vez en el receptor simulado |
| Falla del receptor | El evento continúa pendiente hasta poder procesarse |
| Salud sin esquema | Liveness responde y readiness falla |

Las cantidades de la tabla describen el diseño de la prueba. El informe de evidencia indica cuáles se ejecutaron y sus resultados. No se confunden con resultados de carga sostenida ni con el objetivo de seiscientas solicitudes por segundo.

## 9 Pruebas de carga y estrés

### Carga mixta

El escenario k6 solicita una tasa constante de llegada, con mezcla de 80 por ciento catálogo, 15 por ciento disponibilidad y 5 por ciento reservas. Comienza en cincuenta iteraciones por segundo durante sesenta segundos; cada iteración hace una solicitud. Configurar la clave y un RUN_ID único mediante variables locales. [A7]

```powershell
$env:API_KEY = $access.api_key
$env:RUN_ID = 'ensayo-001'
$env:BASE_URL = 'http://127.0.0.1:8082'
$env:RATE = '50'
$env:DURATION = '60s'
k6 run ..\pruebas\carga\reservas.js
```

No reutilizar RUN_ID entre ensayos que deban crear operaciones nuevas. El umbral técnico admite menos de uno por ciento de respuestas inesperadas; p95 de lecturas debe ser menor a 300 ms y de reservas menor a 800 ms. Se exige cero iteraciones descartadas para que el generador no oculte incapacidad de sostener la tasa.

sold_out se reporta como conflicto de negocio esperado. Una reserva rechazada por falta de inventario no se cuenta como reserva útil completada aunque su respuesta sea rápida. Registrar reservas nuevas confirmadas, repeticiones, conflictos y fallos técnicos por separado. El inventario de mil unidades se agotará en ensayos suficientemente largos; planear el conjunto de datos antes de medir.

### Estrés de lectura

El escenario de estrés aumenta lecturas de catálogo a cien, doscientas, cuatrocientas y seiscientas por segundo en etapas de dos minutos, y vuelve a cien al final. Es un ensayo de lectura y no sustituye a la carga mixta. Se interrumpe si el indicador técnico supera el umbral configurado después de su periodo inicial.

```powershell
k6 run ..\pruebas\estres\reservas.js
```

Los escenarios están preparados para ejecutarse en un ambiente medido; no se presentan como ya aprobados. Port-forward no es la entrada adecuada para atribuir mejoras a varias réplicas. Antes de comparar, igualar o declarar CPU total, conexiones, datos, versión, ruta de red y capacidad del generador.

## 10 Observabilidad y diagnóstico

La API expone contadores por plantilla de ruta y código HTTP, y suma y cantidad de duraciones. No incluye claves o IDs de clientes como etiquetas. Las métricas son por proceso y reinician con él. El despliegue utiliza un proceso Uvicorn por contenedor para evitar mezclar contadores independientes dentro del mismo endpoint. El cálculo de p95 y p99 proviene de k6 u otra herramienta con muestras o histogramas adecuados.

En PostgreSQL observar inventario, conteo de reservas confirmadas, filas outbox pendientes y notificaciones recibidas. Un pool de diez conexiones en doce réplicas puede solicitar ciento veinte conexiones, más el procesador y administración; el máximo de base debe dimensionarse junto con el número de réplicas, no después de saturarse. [A4]

| Síntoma | Revisión sugerida |
| --- | --- |
| 401 | Clave configurada y encabezado correcto |
| 409 sold_out | Inventario y reservas confirmadas |
| 409 idempotency_conflict | Reutilización de clave con otro cuerpo |
| 503 | Conectividad, pool, bloqueos y tiempo de consultas |
| API no inicia | Configuración requerida y base accesible |
| Job pendiente o fallido | Secret, base preparada y logs de inicialización |
| PVC Pending | StorageClass y capacidad de almacenamiento |
| Worker no progresa | Eventos pendientes y errores genéricos del proceso |

No exponer logs completos o archivos de configuración con credenciales para diagnosticar. La revisión de eventos del laboratorio puede conservarse después de retirar valores sensibles. Los scripts de pruebas verifican integridad; las métricas ayudan a localizar límites, pero no prueban ausencia de sobreventa por sí mismas.

## 11 Alcance de validación y continuidad

La evidencia se guarda por separado con fecha, entorno, dependencias, resultados y limitaciones. Una prueba sobre PostgreSQL temporal valida la lógica de datos en ese motor; una ejecución con respuestas simuladas solo valida el componente simulado. La implementación contiene pruebas que diferencian ambos alcances explícitamente.

En esta entrega pasaron 19 pruebas: 17 de integración con PostgreSQL 18.3 temporal y dos de validación. Además, una comprobación HTTP real con Uvicorn confirmó catálogo, reserva nueva, repetición idempotente, rechazo de contenido incompatible, inventario, procesamiento outbox y métricas. La instancia temporal se detuvo al finalizar. Estas verificaciones no son un benchmark ni una ejecución de Kubernetes.

La imagen Docker, el despliegue kind y los escenarios k6 requieren sus propias ejecuciones. No se declara capacidad empresarial, recuperación de un host ni compatibilidad OpenShift sin evidencia de esos ambientes. La revisión de la paginación del Word también se registra de manera independiente de la revisión estructural.

La siguiente etapa debe cerrar construcción y despliegue en el clúster elegido, incorporar observabilidad del sistema, preparar entrada y TLS, y ejecutar carga, estrés, idempotencia y fallas con parámetros congelados. Después se compararán una réplica, réplicas fijas y HPA con el mismo perfil de datos. El antecedente empresarial y los fundamentos se mantienen en DOC-01-01.

## 12 Referencias

Fuentes oficiales consultadas el 13 de octubre de 2026. Los procedimientos y nombres de archivos corresponden al código entregado.

- [A1] PostgreSQL. Transaction Isolation. READ COMMITTED y concurrencia. https://www.postgresql.org/docs/current/transaction-iso.html
- [A2] PostgreSQL. INSERT. ON CONFLICT y resolución de conflictos. https://www.postgresql.org/docs/current/sql-insert.html
- [A3] Psycopg. Transactions management. Contextos y rollback. https://www.psycopg.org/psycopg3/docs/basic/transactions.html
- [A4] Psycopg. Connection pools. Tamaño y adquisición. https://www.psycopg.org/psycopg3/docs/advanced/pool.html
- [A5] Docker Official Images. PostgreSQL. Variables y persistencia de versión 18. https://hub.docker.com/_/postgres
- [A6] FastAPI. Testing. TestClient y alcance de pruebas HTTP. https://fastapi.tiangolo.com/tutorial/testing/
- [A7] Grafana k6. Constant arrival rate. Tasa de llegada e iteraciones. https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/

El índice Word es un campo actualizable. Tras editar, seleccionar el índice y elegir Actualizar toda la tabla o seleccionar todo y pulsar F9.
