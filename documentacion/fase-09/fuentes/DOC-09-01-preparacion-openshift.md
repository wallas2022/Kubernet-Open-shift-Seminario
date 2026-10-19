# Preparación de la aplicación de reservas para OpenShift

DOC-09-01 · Versión 1.0 · Seminario Kubernetes OKD y OpenShift · 13 de octubre de 2026

Este documento incorpora una variante de despliegue para estudiar la aplicación en OpenShift. Utiliza una imagen publicada por digest, un proyecto dedicado, PostgreSQL externo con verificación TLS y una Route opcional. Los manifiestos originales de kind se conservan como laboratorio independiente.

Pasaron siete comprobaciones locales de estructura y resolución de plantillas. No se ejecutó oc, admisión SCC, construcción de imagen, conexión TLS, despliegue ni prueba de carga en OpenShift. La variante está preparada para validación; no constituye una aplicación certificada ni un despliegue exitoso. El acceso al motor Docker sigue bloqueado desde este entorno.

## Índice

## 1 Diferencias respecto al laboratorio kind

La base kind contiene PostgreSQL con UID y grupo 999 y una imagen local con imagePullPolicy Never. Esas decisiones responden al laboratorio y no deben trasladarse sin revisión a OpenShift. La variante nueva elimina ese StatefulSet y sus volúmenes: requiere una base externa administrada para el ejercicio y una imagen accesible desde el clúster.

| Aspecto | Laboratorio kind | Variante OpenShift propuesta |
| --- | --- | --- |
| PostgreSQL | StatefulSet de una instancia | Servicio externo preparado aparte |
| Imagen API | Tag local y pull Never | Registro accesible e imagen por digest |
| Identidad | Configuración del manifiesto local | UID asignado por la plataforma |
| Entrada | Acceso local de práctica | Route edge opcional |
| Estado | Despliegue pendiente | Admisión y ejecución pendientes |

La variante no instala OpenShift ni despliega un operador de base de datos. La arquitectura externa facilita separar el análisis de permisos del contenedor del aprovisionamiento de PostgreSQL, pero no garantiza alta disponibilidad de datos.

## 2 Identidad y restricciones de ejecución

Las cargas usan ServiceAccount reservas-run, sin montaje automático de token de API. No fijan runAsUser, runAsGroup ni fsGroup. Solicitan runAsNonRoot, seccomp RuntimeDefault, eliminación de capacidades, prohibición de escalamiento de privilegios y sistema raíz de solo lectura. La admisión depende de las SCC disponibles y los permisos reales del proyecto. OpenShift puede asignar identidad dentro del rango del espacio de nombres. [O1]

El manifiesto no crea ni modifica SCC y no solicita anyuid. No debe resolverse una denegación concediendo privilegios sin analizar la causa. Revisar el evento de admisión, la imagen y la SCC efectivamente aplicada. El UID 10001 del Dockerfile es el valor predeterminado de la imagen; la plataforma puede sustituirlo.

El código actual deshabilita la escritura de bytecode y sirve en 8080. Se monta un emptyDir limitado a 32 MiB en /tmp y la CA de PostgreSQL como volumen de solo lectura. La capacidad de la imagen para funcionar con el UID asignado y el sistema raíz de solo lectura sigue pendiente de prueba real.

## 3 Prerrequisitos y configuración privada

Se necesita un clúster de laboratorio accesible, oc compatible, permisos de proyecto, un registro de imágenes y PostgreSQL con TLS. Confirmar conectividad y resolución DNS desde los Pods, recursos disponibles y presupuesto de conexiones. El proyecto propuesto es seminario-ocp, distinto de seminario usado en kind.

La imagen debe construirse con el Dockerfile existente y publicarse mediante el proceso del responsable del registro. Esta entrega no construyó ni publicó una imagen ni proporciona un digest real. El digest identifica contenido; no prueba que esté libre de vulnerabilidades. Verificar la arquitectura de CPU y credenciales de lectura del registro antes de usarlo.

Preparar fuera del repositorio un archivo reservas-openshift.env con DATABASE_URL y CLIENT_KEYS_JSON. DATABASE_URL debe apuntar a la base real con sslmode=verify-full y sslrootcert=/etc/reservas-db/ca.crt. La CA debe validar el certificado del servidor y su nombre debe coincidir con el host de conexión. Esta modalidad valida cadena y nombre, según libpq. [O3]

CLIENT_KEYS_JSON conserva el contrato del manual de aplicación: objeto JSON que asocia claves aleatorias de al menos 32 caracteres a UUID de cliente. No publicar claves ni cadena de conexión. DB_SCHEMA se fija a public en esta variante; preparar una base dedicada al laboratorio con permisos suficientes para inicializar sus tablas. La inicialización crea tablas y semilla, pero no es un sistema general de migraciones.

Crear dos Secrets en el proyecto: reservas-config con el archivo de variables y reservas-db-ca con una entrada ca.crt. No reutilizar kubernetes.env de kind, porque apunta a reservas-db y no configura esta conexión externa. Las credenciales, la CA y la imagen reales son prerrequisitos pendientes, no recursos entregados.

## 4 Resolución local de manifiestos

Las cuatro plantillas están en aplicacion/openshift. Contienen marcadores deliberados de proyecto e imagen y deben resolverse antes de consultar el API. El programa laboratorio/scripts/render_openshift.py solo escribe archivos locales: no inicia sesión, no contacta un registro ni aplica recursos.

Desde la raíz del repositorio:

```powershell
$project = 'seminario-ocp'
$image = Read-Host 'Imagen real registro/ruta@sha256:...'
$resolved = Join-Path $env:LOCALAPPDATA ('SeminarioKubernetes\openshift-' + [guid]::NewGuid().ToString('N'))
python .\laboratorio\scripts\render_openshift.py --source .\aplicacion\openshift --output $resolved --project $project --image $image
```

El programa rechaza nombres de proyecto inválidos, imágenes sin digest SHA256 y destinos existentes. No verifica que la imagen exista ni que sus nodos puedan descargarla. Leer los archivos resueltos antes de continuar. La resolución local no valida la API OpenShift ni sus políticas.

00-serviceaccount.yaml contiene la identidad de ejecución; 01-init.yaml contiene el Job; 02-application.yaml contiene dos Deployments y el Service; 03-route-optional.yaml contiene la Route. Son seis objetos en total. La Route se mantiene separada para poder validar primero la aplicación.

## 5 Secuencia propuesta en un clúster de laboratorio

Los comandos siguientes son un procedimiento pendiente. Usar un contexto autenticado del clúster de práctica y confirmar la identidad antes de cualquier escritura. Se propone un proyecto nuevo; si existe, detenerse y revisar sus recursos para evitar aplicar este primer despliegue sobre una instalación previa.

```powershell
$context = Read-Host 'Contexto del cluster de laboratorio'
oc --context $context whoami
oc --context $context new-project $project
```

Después de cada comando oc, comprobar LASTEXITCODE y detenerse si no es cero. Los bloques no son un script automático de despliegue. No continuar después de un error de permisos, proyecto existente o recurso incompatible.

Con el proyecto recién preparado, indicar las rutas privadas reales:

```powershell
$ocArgs = @('--context', $context, '-n', $project)
$secretFile = Read-Host 'Ruta privada de reservas-openshift.env'
$caFile = Read-Host 'Ruta privada de la CA PostgreSQL'
oc @ocArgs create secret generic reservas-config --from-env-file=$secretFile
oc @ocArgs create secret generic reservas-db-ca --from-file=ca.crt=$caFile
oc @ocArgs apply --dry-run=server -f "$resolved\00-serviceaccount.yaml"
oc @ocArgs apply -f "$resolved\00-serviceaccount.yaml"
```

Si el registro requiere autenticación, preparar el Secret de lectura y vincularlo a reservas-run mediante el procedimiento del administrador del registro. No pegar contraseñas en este documento. Verificar su acceso antes del Job.

```powershell
oc @ocArgs apply --dry-run=server -f "$resolved\01-init.yaml"
oc @ocArgs apply -f "$resolved\01-init.yaml"
oc @ocArgs wait --for=condition=complete job/reservas-init --timeout=300s
oc @ocArgs apply --dry-run=server -f "$resolved\02-application.yaml"
oc @ocArgs apply -f "$resolved\02-application.yaml"
oc @ocArgs rollout status deployment/reservas-api --timeout=180s
oc @ocArgs rollout status deployment/reservas-worker --timeout=180s
```

Un dry-run de recursos superiores no demuestra que los Pods serán admitidos ni que conectarán a PostgreSQL. Revisar Pods, eventos y la anotación openshift.io/scc de los Pods admitidos. No reiniciar el inventario para corregir una falla de conexión. Guardar imagen efectiva, versión del servidor y evidencia sin credenciales.

## 6 Entrada HTTPS y límites de seguridad

La Route opcional apunta al puerto http del Service. Usa terminación edge y redirección desde HTTP. El router termina TLS y el tramo al Pod utiliza HTTP; no es cifrado extremo a extremo. El host se asigna mediante la configuración del clúster y utiliza su certificado de ingreso por defecto. Confirmar DNS y confianza del cliente antes de medir. [O2]

```powershell
oc @ocArgs apply --dry-run=server -f "$resolved\03-route-optional.yaml"
oc @ocArgs apply -f "$resolved\03-route-optional.yaml"
oc @ocArgs get route reservas-api
```

La API actual publica health, métricas y documentación sin autenticación. Una Route al Service también puede exponer esas rutas. Para este laboratorio, usar acceso controlado por la red de práctica y revisar la exposición antes de crear la Route. Una publicación empresarial requiere resolver identidad, restricciones de rutas, políticas de red y protección de observabilidad; esta variante no implanta esos controles adicionales.

No se incluyen HPA ni pruebas de carga para afirmar escalamiento OpenShift. Primero validar la ejecución básica, la conexión TLS y la integridad. Luego adaptar el ensayo con generador separado y presupuesto de conexiones, conservando el procedimiento de DOC-05-01.

## 7 Validación efectuada y criterios pendientes

| Comprobación | Estado | Evidencia requerida para cerrar |
| --- | --- | --- |
| Resolución de seis objetos y proyecto | Comprobada localmente | JSON de validación |
| Controles restrictivos sin UID fijo | Comprobados en YAML | Admisión y UID real del Pod pendientes |
| Sondas y puerto de Route | Comprobados en YAML | Respuestas reales y certificado pendientes |
| Imagen por digest y destino protegido | Comprobados localmente | Digest descargado y ejecución pendientes |
| PostgreSQL externo con TLS | Configuración requerida | Conexión verificada y prueba de CA incorrecta |
| Reserva idempotente e inventario | Pendiente en OpenShift | 201 nueva, 200 repetida y mismo inventario |
| Outbox y recuperación | Pendiente en OpenShift | Continuidad sin duplicados simulados |

El archivo evidencias/openshift-preparacion/validacion-local.json conserva siete comprobaciones y hashes de las plantillas y el resolutor. Las pruebas incluyeron rechazo de proyecto inválido, rechazo de tag sin digest y conservación de un destino existente. No se utilizó oc y no se validó ningún recurso contra un servidor API.

Para cerrar esta etapa, registrar una ejecución real con contexto de laboratorio, versión, digest, SCC aplicada, UID efectivo, Job completo, Pods listos, Route admitida y pruebas de reservas. El éxito de una fase local no cambia el estado pendiente de esta etapa.

## 8 Referencias y continuidad

O1. Red Hat OpenShift Container Platform 4.22, Managing security context constraints. Consulta del 13 de octubre de 2026. https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/authentication_and_authorization/managing-pod-security-policies

O2. Red Hat OpenShift Container Platform 4.22, Routes. Consulta del 13 de octubre de 2026. https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/ingress_and_load_balancing/routes

O3. PostgreSQL 18, SSL Support. Consulta del 13 de octubre de 2026. https://www.postgresql.org/docs/18/libpq-ssl.html

Los contratos de reservas e idempotencia proceden de DOC-04-01 y sus fuentes. DOC-08-01 acredita una restauración PostgreSQL local distinta de este despliegue. DOC-06-01 y DOC-07-01 pueden utilizar esta variante como análisis documental hasta contar con evidencia de clúster.

El siguiente hito es proporcionar acceso al entorno de contenedores o a un clúster de práctica y ejecutar las validaciones pendientes. No se realizaron push, pull ni publicaciones remotas. El Word conserva el formato acordado y requiere revisión visual de paginación cuando exista un renderizador accesible.
