# Despliegue y resultados piloto de carga de la aplicación de reservas

DOC-05-01 · Seminario Kubernetes OKD y OpenShift · Versión 1.0  
Fecha 13 de octubre de 2026

Se ejecutaron tres ensayos locales de carga mixta y un piloto escalonado de lectura con k6 2.3.0, API Uvicorn y PostgreSQL 18.3 reales. Las tres ventanas mixtas completaron sus solicitudes y confirmaron reservas sin sobreventa; todos los umbrales configurados pasaron. El resultado acredita el comportamiento de este piloto local. No establece capacidad máxima ni demuestra escalamiento Kubernetes.

Docker sigue sin ser accesible desde el entorno de trabajo. Por ello, la construcción y despliegue en kind, la operación HPA y la entrada TLS permanecen pendientes. Se entregan sus archivos y procedimiento para ejecutar cuando el motor esté disponible. No se realizaron push, pull ni escrituras remotas.

## Índice

1. Entorno y alcance de las mediciones
2. Procedimiento del piloto
3. Resultados de carga y lectura
4. Integridad y conclusiones permitidas
5. Primer despliegue en kind
6. Métricas y escalamiento HPA
7. Evidencia y siguiente experimento
8. Referencias

## 1 Entorno y alcance de las mediciones

El piloto ejecutó un proceso de API, un proceso de procesador outbox, una instancia PostgreSQL temporal y un generador k6 en el mismo anfitrión Windows. La API utilizó máximo de diez conexiones por pool; PostgreSQL permitió cien conexiones y shared_buffers de 32 MB. El código y las dependencias corresponden a DOC-04-01.

El acceso fue HTTP por localhost y puerto dedicado, sin Docker, router, TLS ni Kubernetes. El generador compartió CPU, memoria, red y disco con la aplicación. La información visible al proceso identifica 16 procesadores lógicos; la memoria instalada no pudo consultarse mediante CIM y se mantiene como no disponible. No se supone que el equipo real tenga los 32 GB recomendados en DOC-02-01.

Las versiones y hashes de fuentes se conservan en evidencia. k6 se descargó de la publicación oficial v2.3.0 y su SHA256 se contrastó con el archivo de checksums de esa publicación. La versión de dependencias no reemplaza una auditoría completa del sistema. [P1]

## 2 Procedimiento del piloto

Se creó un esquema PostgreSQL temporal independiente para cada ejecución, con inventario inicial de mil unidades. La API y el procesador iniciaron sobre ese esquema. Antes de medir se hicieron veinte lecturas ligeras de calentamiento, excluidas de los contadores de k6. El inventario comenzó limpio en cada repetición; no se sumaron reservas de distintos ensayos como si fueran una misma campaña.

Las tres repeticiones mixtas fijaron cincuenta llegadas por segundo durante treinta segundos, con una solicitud por iteración y mezcla determinista de 80 por ciento catálogo, 15 por ciento disponibilidad y 5 por ciento reservas. Se usó RUN_ID distinto en cada repetición. El escenario exigió menos de uno por ciento de fallos técnicos, cero iteraciones descartadas, p95 de lecturas menor a 300 ms y p95 de reservas menor a 800 ms. [P2]

El piloto de lectura comenzó en veinticinco llegadas por segundo y recorrió objetivos de cincuenta, cien, cien y veinticinco en cuatro tramos de diez segundos. Es una carga variable de lectura de cuarenta segundos; no busca afirmar el punto de saturación. El escenario largo de estrés de DOC-04-01 se conserva para ejecución posterior.

Al terminar cada ensayo se esperó el procesamiento de eventos pendientes y se consultaron inventario, reservas, outbox y recepciones simuladas. Los procesos y esquemas temporales se retiraron después de conservar evidencia. Las duraciones de arranque y cierre no se mezclan con la ventana de medición de k6.

## 3 Resultados de carga y lectura

| Ensayo | Solicitudes | Tasa efectiva por segundo | p95 total ms | Error técnico porcentaje | Descartadas |
| --- | --- | --- | --- | --- | --- |
| mixed-1 | 1500 | 50.00 | 4.59 | 0.00 | 0 |
| mixed-2 | 1501 | 50.03 | 4.41 | 0.00 | 0 |
| mixed-3 | 1500 | 50.00 | 4.30 | 0.00 | 0 |
| read-pilot | 2749 | 68.72 | 3.34 | 0.00 | 0 |

La tasa efectiva es la reportada por k6 para cada ejecución. El ensayo variable resume su tasa media; esa media no significa que se sostuviera constantemente el objetivo más alto. Las tres ventanas mixtas conservaron aproximadamente cincuenta solicitudes por segundo y todos los umbrales configurados pasaron.

| Ensayo mixto | p95 lectura ms | p95 reserva ms | Reservas nuevas | Inventario restante |
| --- | --- | --- | --- | --- |
| mixed-1 | 3.96 | 34.92 | 75 | 925 |
| mixed-2 | 3.39 | 29.54 | 75 | 925 |
| mixed-3 | 3.30 | 42.41 | 75 | 925 |

Los percentiles corresponden a las muestras de cada ensayo y se presentan por separado. No se promedian percentiles para construir uno global. No se informa p99 porque no se exportó ese estadístico en estas ventanas; deberá añadirse a la configuración de resumen del siguiente ensayo. Las ventanas son cortas y no equivalen al objetivo empresarial de quince minutos ni a una prueba de resistencia de dos horas.

## 4 Integridad y conclusiones permitidas

Cada ejecución mixta confirmó setenta y cinco reservas de una unidad y dejó novecientas veinticinco disponibles. Se verificó 925 + 75 = 1000, cero inventario negativo, setenta y cinco eventos outbox, setenta y cinco recepciones y cero eventos pendientes. El piloto de lectura dejó mil unidades disponibles y no creó reservas.

Estas comprobaciones complementan las diecinueve pruebas de DOC-04-01. El caso de clave repetida entre dos instancias y las carreras por las últimas unidades se cubren en aquella suite; la carga mixta actual usa claves nuevas y no agota el inventario. No se presenta la mezcla como prueba de todos los conflictos de idempotencia.

La conclusión es que la implementación sostuvo este perfil local corto con integridad y dentro de sus umbrales. No se concluye que soporte la misma tasa con TLS, varios hosts, datos mayores o fallas. Tampoco se atribuye el resultado a Kubernetes, ya que no participó en estas ejecuciones. Un resultado de capacidad requiere condiciones congeladas, métricas del anfitrión y una entrada representativa.

## 5 Primer despliegue en kind

### Preparación y ejecución

El script laboratorio/scripts/Deploy-Reservas.ps1 automatiza el primer despliegue sobre un clúster kind existente. Requiere Docker Linux, kind, kubectl, kubeconfig dedicado y kubernetes.env generado en DOC-04-01. No instala herramientas ni reemplaza una API ya desplegada. Si encuentra un Secret existente, exige conservarlo expresamente mediante UseExistingSecret después de revisar que corresponde a la base.

Desde la raíz del repositorio, ejecutar primero la vista previa. El perfil no puede completarse mientras Docker esté bloqueado:

```powershell
$secretsDir = Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\reservas-secrets'
.\laboratorio\scripts\Deploy-Reservas.ps1 `
  -SecretsFile "$secretsDir\kubernetes.env" -WhatIf
```

Para el primer despliegue real, retirar WhatIf cuando el entorno esté preparado. El script construye una imagen local versionada, la carga en kind, crea los recursos necesarios, solicita validación dry-run al API server, aplica la base y espera Job, API y procesador. Guarda un registro con ID de imagen en una carpeta local de ejecución fuera del repositorio.

La validación del API server ocurre antes de aplicar la base, pero después de construir imagen y preparar Namespace y Secret. No es una operación totalmente libre de efectos. Una falla intermedia conserva lo que ya se creó para diagnosticar; no se ejecuta borrado automático ni rotación de contraseña.

### Validación y ruta de carga

Confirmar nodos Ready, PVC vinculado, Job completo y réplicas disponibles. Repetir contratos e integridad de DOC-04-01. Port-forward sirve para comprobar HTTP, pero selecciona un Pod; una comparación de réplicas requiere un generador que use el Service dentro del clúster o una entrada HTTP real que distribuya tráfico.

La base local de una sola instancia continúa siendo un punto de falla. No se eliminará el Namespace compartido para limpiar solo reservas: podría contener la página de comprobación u otro trabajo. Retirar recursos por nombre y revisar el PVC y los datos antes de cualquier eliminación.

## 6 Métricas y escalamiento HPA

### Requisitos de métricas

HPA de CPU requiere requests de CPU en los contenedores y una API de métricas de recursos disponible. La métrica HTTP de la aplicación no sustituye metrics.k8s.io. Metrics Server provee recursos para escalamiento, no una solución completa de retención y observabilidad. Seleccionar una versión compatible, revisar certificados del kubelet y fijar la publicación antes de instalar. [P3, P4]

Antes de aplicar HPA, comprobar que estas consultas devuelven datos válidos:

```powershell
$kc = Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\seminario\kubeconfig.yaml'
kubectl --kubeconfig $kc --context kind-seminario `
  get --raw /apis/metrics.k8s.io/v1beta1/nodes
kubectl --kubeconfig $kc --context kind-seminario `
  top pods -n seminario
```

Si la API no existe o los valores están ausentes, resolver la instalación y conectividad de métricas antes de interpretar HPA. No se añade automáticamente la opción de desactivar verificación TLS del kubelet; si un laboratorio requiere una excepción, documentar su alcance y revisar certificados primero.

### Perfil de HPA propuesto

laboratorio/configuracion/reservas-hpa.yaml usa autoscaling/v2, mínimo de dos réplicas, máximo de seis y objetivo de sesenta por ciento de utilización de CPU respecto al request. Aumenta hasta dos Pods por intervalo de treinta segundos y estabiliza la reducción durante cinco minutos. Son parámetros iniciales, pendientes de medición. [P3]

```powershell
kubectl --kubeconfig $kc --context kind-seminario `
  apply -f .\laboratorio\configuracion\reservas-hpa.yaml
kubectl --kubeconfig $kc --context kind-seminario -n seminario `
  get hpa reservas-api -w
```

El objetivo no significa sesenta por ciento de toda la CPU del host. Con request de 250 millicores, representa una referencia de 150 millicores por réplica para esa métrica. Seis réplicas con pool máximo diez pueden solicitar hasta sesenta conexiones de API, más procesador y administración. Verificar capacidad restante antes de aumentar el máximo.

No reaplicar simultáneamente un manifiesto que fuerce replicas=2 durante el ensayo HPA, pues puede interferir con el controlador. Para la línea base fija, retirar HPA de esa aplicación y establecer explícitamente las réplicas; conservar evidencia del cambio. La reacción requiere tiempo y capacidad de nodos, por lo que una ventana de treinta segundos no basta para acreditar su comportamiento de escalamiento y reducción.

## 7 Evidencia y siguiente experimento

Los archivos JSON originales de k6, resúmenes de integridad, versiones y hashes se guardan en evidencias/carga-piloto. La evidencia no contiene credenciales de los clientes. Los valores memory_gib no disponibles se mantienen como null y no se reemplazan por especificaciones sugeridas.

El siguiente experimento debe comparar una réplica, varias réplicas fijas y HPA con al menos tres repeticiones por variante, inventario inicial equivalente, entrada común y presupuesto declarado. Registrar p95 y p99 por operación, errores técnicos, conflictos de negocio, reservas útiles, iteraciones descartadas, CPU, memoria, conexiones y tiempos de recuperación. No usar las ventanas locales actuales como sustituto de esa comparación.

El acceso al motor Docker es el requisito pendiente para cerrar construcción, Compose y kind en este entorno. Mientras no esté disponible, se puede revisar y ejecutar el procedimiento desde una terminal del equipo que tenga acceso. No se modificó la seguridad del sistema para evitar la restricción.

## 8 Referencias

Fuentes oficiales consultadas el 13 de octubre de 2026.

- [P1] Grafana. k6 v2.3.0 release y archivos de checksum. https://github.com/grafana/k6/releases/tag/v2.3.0
- [P2] Grafana k6. Constant arrival rate. https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/
- [P3] Kubernetes. Horizontal Pod Autoscaling. https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- [P4] Kubernetes SIGs. Metrics Server. Requisitos y compatibilidad. https://github.com/kubernetes-sigs/metrics-server

Formato Word: Times New Roman 12 pt, texto negro y encabezados de tabla con fondo negro y texto blanco. Índice actualizable con F9. La revisión visual de paginación se registra por separado de las verificaciones estructurales.
