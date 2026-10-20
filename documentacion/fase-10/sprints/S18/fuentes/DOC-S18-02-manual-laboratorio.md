# Manual reproducible del frontend en contenedor

## Objetivo y condiciones

Servir el frontend compilado con Nginx en 8080, con proxy del mismo origen a la API. Docker Compose debe estar disponible. Los comandos se ejecutan desde la raíz del repositorio en PowerShell. No iniciar sobre bases ajenas ni exponer claves en parámetros de URL. La aplicación recibe la clave en memoria mediante su pantalla de acceso.

## Laboratorio exclusivo usado en S18

Ejecutar `./frontend/testing/Start-S18.ps1`. El script genera claves aleatorias bajo `.runtime/s18/compose.env`, excluido de Git, construye imágenes y espera los controles de salud. La base `reservas_s18` usa almacenamiento efímero; su contenido se pierde si se recrea su contenedor. El laboratorio habitual y los sprints anteriores no se reutilizan. API y PostgreSQL no publican puertos; solo se publica el frontend en `127.0.0.1:18083`.

Abrir http://localhost:18083. Las claves no se incluyen en el manual. Un operador autorizado puede consultar el archivo local de entorno para ingresar la clave exclusiva; no copiar ese archivo a documentación ni evidencias. Para otro puerto, definir `$env:FRONTEND_PORT='18084'` antes de iniciar. Para reproducir exactamente la prueba de UID, dejar el valor predeterminado 1000710000.

Ejecutar el navegador de prueba, que crea reservas reales exclusivamente en esta base:

```powershell
docker run --rm --network container:seminario-s18-frontend-1 -v "${PWD}:/workspace" -w /workspace/frontend mcr.microsoft.com/playwright:v1.58.2-noble node scripts/verify-deployment.mjs
./frontend/testing/Verify-S18Runtime.ps1
```

La primera prueba necesita una base S18 recién inicializada con 25 cupos y sin reservas. Envía una reserva de dos cupos, repite su misma clave y crea otra de dos cupos desde el navegador. Una repetición del script sobre esa misma base conserva la primera reserva y no satisface el criterio inicial 201; no interpretar ese resultado como un defecto de idempotencia. Antes de repetir sobre una base limpia, detener y recrear únicamente el proyecto S18, aceptando la pérdida de sus datos ficticios de laboratorio.

```powershell
docker compose --env-file .runtime/s18/compose.env -f frontend/testing/s18.compose.yaml down
./frontend/testing/Start-S18.ps1
```

El control de ejecución detiene brevemente la API S18, comprueba el 502 genérico del frontend y restablece la API en un bloque finally. No ejecutarlo simultáneamente con la prueba de navegador. Verificar al terminar que el frontend y la API están saludables. La sonda de frontend comprueba sus assets; no certifica la salud de la API ni PostgreSQL.

## Integración con una API Compose existente

`frontend/compose.yaml` añade únicamente el frontend a una red externa existente con un servicio resoluble como `api:8080`. Se debe comprobar ese alias antes de usarlo. No usar el mismo proyecto Compose que el ensayo exclusivo al mismo tiempo.

```powershell
$env:API_NETWORK='seminario-reservas_default'
$env:FRONTEND_PORT='18084'
docker compose -p seminario-frontend-integrado -f frontend/compose.yaml up -d --build --wait
```

El valor propuesto del puerto es 8083 si FRONTEND_PORT no está definido. En esta máquina está ocupado por S08. Este modo solo debe probarse con lecturas si se conecta a una base que no es la exclusiva S18. La prueba destructiva de caída se limita al entorno exclusivo.

## Kind y entrada HTTPS pendiente

Prerrequisitos: clúster kind autorizado, namespace seminario, API disponible mediante `reservas-api:80`, controlador Ingress con clase nginx, resolución del host reservas.lab.test y certificado TLS apropiado en el Secret reservas-lab-tls. La base y la API deben tener su instalación y pruebas previas; S18 no aplica automáticamente los manifiestos de fases anteriores.

```powershell
kind load docker-image seminario-reservas-frontend:s18 --name NOMBRE_DEL_CLUSTER
kubectl kustomize frontend/deploy/kind
kubectl apply --dry-run=server -k frontend/deploy/kind
kubectl apply -k frontend/deploy/kind
kubectl -n seminario rollout status deployment/reservas-frontend
```

Revisar antes de aplicar el contexto, nombre de clúster, clase Ingress, hostname y Secret TLS. No crear un certificado privado dentro del repositorio. Comprobar desde el navegador la confianza del certificado, recarga SPA, rechazo de API desconocida, proxy y recorrido autenticado. Registrar versión del clúster, eventos, estado de sondas e imagen efectiva. Estos comandos de aplicación son instrucciones pendientes, no pruebas realizadas en esta entrega.

## Variante OpenShift pendiente

El overlay no fija UID ni solicita SCC anyuid. Debe dejar que la política del proyecto asigne el UID. El Deployment exige usuario no root, sin privilegios adicionales, elimina capacidades y usa raíz de solo lectura con emptyDir en /tmp. La comprobación Docker de UID arbitrario no sustituye la admisión SCC real.

Cambiar el namespace seminario-lab por el proyecto autorizado y la imagen registry.invalid por una imagen accesible del registro elegido, preferiblemente por digest. Publicar la imagen al registro requiere autorización independiente y no se ejecutó en S18. Revisar la Route edge con redirección HTTP a HTTPS y la confianza del certificado del router.

```powershell
oc kustomize frontend/deploy/openshift
oc apply --dry-run=server -k frontend/deploy/openshift
oc apply -k frontend/deploy/openshift
oc -n PROYECTO rollout status deployment/reservas-frontend
oc -n PROYECTO get route reservas-frontend
oc -n PROYECTO get pods -l app=reservas-frontend -o wide
```

Guardar la SCC admitida, UID real, eventos, versión de OpenShift, digest, sondas y resultados HTTPS. No se afirma compatibilidad OpenShift mientras esa evidencia no exista. Los recursos del Deployment son presupuestos iniciales propuestos; S19 medirá su suficiencia.

## Fuentes técnicas

- Nginx imagen oficial: https://hub.docker.com/_/nginx
- Nginx contenedores: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/
- Kubernetes sondas: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/
- Kubernetes Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Red Hat UID arbitrario: https://access.redhat.com/articles/4859371
