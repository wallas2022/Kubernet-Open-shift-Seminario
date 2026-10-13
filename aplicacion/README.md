# Aplicación de reservas del seminario

API FastAPI, PostgreSQL y procesador outbox con receptor de notificaciones simulado. La API descuenta inventario y confirma reserva y evento en una sola transacción. La clave idempotente pertenece al cliente autenticado y no se reutiliza con otro contenido.

## Recorrido local con Docker Compose

Requisitos: Docker con contenedores Linux, Docker Compose y Python 3.12 para generar secretos. Desde esta carpeta, generar archivos fuera del repositorio:

```powershell
$secretsDir = Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\reservas-secrets'
python .\tools\generate_env.py --directory $secretsDir
docker compose --env-file "$secretsDir\compose.env" up --build -d
docker compose --env-file "$secretsDir\compose.env" ps
$access = Get-Content "$secretsDir\client-access.json" -Raw | ConvertFrom-Json
$headers = @{'X-Api-Key'=$access.api_key; 'Idempotency-Key'='reserva-001'}
$payload = @{event_id='00000000-0000-0000-0000-000000000001';quantity=1} | ConvertTo-Json
Invoke-RestMethod 'http://127.0.0.1:8082/reservas' -Method Post -Headers $headers -ContentType 'application/json' -Body $payload
```

No se sobrescriben secretos existentes. No publicar el contenido de los archivos. Repetir la petición con la misma clave y cantidad devuelve la misma reserva; cambiar cantidad con esa clave produce 409. API: http://127.0.0.1:8082/docs. Salud: /health/live y /health/ready. Métricas: /metrics.

El contenedor migrate prepara el esquema y la semilla de 1000 unidades antes de API y worker. Repetir init no restablece inventario ya utilizado. PostgreSQL no expone su puerto al anfitrión en Compose. El volumen persiste al detener servicios. `docker compose down` detiene este proyecto; no añadir `-v` salvo que se quiera destruir expresamente su base de laboratorio.

## Recorrido kind

Usar el kubeconfig del DOC-03-01 y contexto kind-seminario. Crear Namespace y Secret antes de aplicar la base. Construir la imagen local y cargarla en los nodos:

```powershell
docker build -t seminario-reservas:1.0.0 .
kind load docker-image seminario-reservas:1.0.0 --name seminario
$kc = Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\seminario\kubeconfig.yaml'
kubectl --kubeconfig $kc --context kind-seminario create namespace seminario --dry-run=client -o yaml | kubectl --kubeconfig $kc --context kind-seminario apply -f -
kubectl --kubeconfig $kc --context kind-seminario -n seminario create secret generic reservas-config --from-env-file="$secretsDir\kubernetes.env"
kubectl --kubeconfig $kc --context kind-seminario apply -f .\kubernetes\base.yaml
kubectl --kubeconfig $kc --context kind-seminario -n seminario wait --for=condition=complete job/reservas-init --timeout=180s
kubectl --kubeconfig $kc --context kind-seminario -n seminario rollout status deployment/reservas-api --timeout=180s
kubectl --kubeconfig $kc --context kind-seminario -n seminario port-forward service/reservas-api 8082:80 --address 127.0.0.1
```

Si el Secret ya existe, comprobar que corresponde a esta instalación y no reemplazarlo sin revisar las credenciales de la base persistente. El Job puede reintentarse hasta que PostgreSQL esté disponible. Reaplicar un Job completado no ejecuta otra migración: un cambio de esquema requiere una migración versionada posterior.

La base YAML está diseñada para kind, usa su StorageClass predeterminada y una sola instancia PostgreSQL. No es una instalación de PostgreSQL de alta disponibilidad ni un manifiesto listo para SCC de OpenShift. El UID 999 del ejemplo de datos debe revisarse al migrar a otra plataforma. Los tags base de PostgreSQL y Python son móviles; registrar sus digests y el ID de la imagen construida para repetir mediciones.

Port-forward accede a un Pod seleccionado. Para medir escalamiento entre réplicas se debe preparar entrada HTTP real o un generador dentro del clúster que use el Service; no extrapolar rendimiento distribuido desde el túnel.

## Pruebas de integración

Instalar requirements-dev.txt en un entorno de pruebas y definir TEST_DATABASE_URL hacia una base exclusiva de laboratorio con permiso para crear esquemas. Cada prueba crea un esquema aleatorio test_* y elimina únicamente ese esquema al terminar. No usar una base de producción.

```powershell
python -m pip install -r requirements-dev.txt
$env:TEST_DATABASE_URL = 'postgresql://usuario:clave@127.0.0.1:5432/base_de_pruebas'
python -m pytest tests -q
```

No hay sustituto SQLite ni pruebas de PostgreSQL omitidas silenciosamente. Sin TEST_DATABASE_URL, las pruebas fallan indicando el requisito. Se incluyen carreras por inventario, claves repetidas entre dos instancias de API, rollback si falla outbox, aislamiento por cliente y procesamiento paralelo con deduplicación.

## Contratos y límites

| Ruta | Resultado |
| --- | --- |
| GET /catalogo | Eventos e inventario informativo |
| GET /eventos/{id}/disponibilidad | Cupo observado |
| POST /reservas | 201 nueva, 200 repetida, 409 sin cupo o contenido incompatible |
| GET /reservas/{id} | Solo reserva del cliente autenticado |
| GET /health/live | Proceso disponible |
| GET /health/ready | Acceso al esquema de datos |
| GET /metrics | Contadores y suma de duraciones por ruta |

Las claves API se configuran por entorno y corresponden a identidades de laboratorio; no hay registro público de clientes. Falta integrar un proveedor OIDC, rotación administrada, TLS e infraestructura de producción. Las notificaciones son filas en una tabla receptora de prueba: no se envían mensajes externos ni se afirma entrega exactamente una vez a terceros. Las métricas no calculan percentiles; k6 los calcula a partir de sus muestras.

Los escenarios k6 están en pruebas/carga y pruebas/estres, en la raíz del repositorio. Definir API_KEY y RUN_ID único para carga. El escenario mixto usa 80% catálogo, 15% disponibilidad y 5% reservas; los conflictos sold_out se distinguen de fallos técnicos. El estrés se limita al catálogo y reduce carga al final. Ver DOC-04-01 para ejecución e interpretación.
