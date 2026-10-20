# Entrega S18 Contenedor y despliegue de laboratorio

## Resultado y alcance

S18 RN05 entrega la imagen del frontend compilado, el proxy y el laboratorio Compose verificado con API y PostgreSQL reales exclusivos. La preparación para kind y OpenShift está disponible, pero la aceptación del clúster y HTTPS sigue pendiente porque no hay contextos configurados. S18 se presenta como entrega parcial por esa dependencia; no se afirma admisión OpenShift. Trabajo local autorizado el 20 de octubre de 2026, sin commit ni push de esta entrega. S19 no iniciado.

El usuario informó que terminó la prueba con Narrador y solicitó continuar con S18. Esa confirmación posterior a S17 se registra con su procedencia; no se atribuye al agente una lectura que no observó.

## Imagen y configuración

El Dockerfile usa dos etapas. Node 22.23.2 compila React y TypeScript mediante npm ci y el lockfile; la etapa final contiene Nginx 1.30.6 y assets estáticos, sin Node ni dependencias del proyecto. Ambas imágenes base están fijadas por digest. El contexto de construcción permite solo fuentes y configuración necesarias y excluye archivos de entorno, node_modules, evidencias y claves.

El servidor escucha en 8080. Puede ejecutarse con el UID predeterminado 10001 o con uno arbitrario; el ensayo principal usó 1000710000 y grupo 0, sin capacidades y sin escalación de privilegios. La raíz permanece de solo lectura. El único volumen de escritura es /tmp, para configuración generada, PID y temporales, limitado a 32 MiB en Compose. No se modifica /etc/passwd ni se solicita anyuid.

El arranque valida que API_UPSTREAM contenga únicamente hostname y puerto. El proxy elimina /api y conserva encabezados de autenticación e idempotencia y el cuerpo. No reintenta automáticamente un POST. Bloquea parámetros de URL, no registra solicitudes ni claves y devuelve un 502 genérico si la API no responde. La recarga SPA sirve index.html; una API desconocida mantiene 404 y no se transforma en la SPA. Los assets faltantes y archivos ocultos también devuelven 404.

## Laboratorio y resultados observados

La prueba principal utilizó frontend Nginx, API y PostgreSQL 18 en el proyecto seminario-s18. API y base no publican puertos. Se publicó únicamente 127.0.0.1:18083, porque el puerto propuesto 8083 está ocupado por S08. La base reservas_s18 es exclusiva y efímera. No se crearon reservas en las bases anteriores ni se modificó su topología.

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| HTTP y navegador | 28 controles pasados | API real sin interceptar respuestas |
| Ejecución y seguridad | 16 controles pasados | UID permisos temporales logs y caída de API |
| Compose en red externa | Dos lecturas pasadas | Frontend temporal retirado al terminar |
| Pruebas unitarias | 52 pasadas | Nueva ejecución del conjunto Node |
| Compilación | Correcta | TypeScript y Vite en imagen y comprobación local |
| Secretos | 12 controles pasados | Repetición en contenedor aislado |
| Manifiestos | Dos overlays renderizados | Sin admisión ni ejecución en clúster |

El ensayo envió una reserva de dos cupos, repitió la misma operación y obtuvo 200 con el mismo identificador; luego creó otra de dos cupos desde el navegador con 201. La auditoría de solo lectura confirmó dos reservas, dos outbox, cuatro cupos consumidos y 21 disponibles; la repetición no duplicó la reserva. No hay worker en esta topología, por lo que outbox no acredita entrega de notificaciones. La recarga de una ruta SPA eliminó la clave de memoria y mostró de nuevo el acceso. No se observaron errores de página. Las capturas y los informes guardan datos de laboratorio, no credenciales.

Se detuvo solo la API S18 para comprobar que el frontend permanece disponible y responde 502 genérico en /api. Tras reiniciarla, el proxy volvió a responder 401 ante una solicitud sin clave. Las sondas de frontend verifican proceso y disponibilidad de index.html; no certifican la disponibilidad de API o base de datos.

## Reproducción y evidencias

Desde la raíz, ejecutar frontend/testing/Start-S18.ps1 para construir y esperar el laboratorio exclusivo. Abrir http://localhost:18083. El archivo .runtime/s18/compose.env contiene claves aleatorias y está excluido de Git. No se deben copiar a la entrega. El manual DOC-S18-02-manual-laboratorio.md detalla arranque, repetición sobre una base limpia, parada y parámetros.

La prueba de navegador es frontend/scripts/verify-deployment.mjs y el control de ejecución es frontend/testing/Verify-S18Runtime.ps1. Deben ejecutarse en secuencia: el segundo interrumpe brevemente la API exclusiva. El primer script requiere una base S18 recién inicializada. El auditor frontend/testing/audit_s18.py consulta los conteos en modo de solo lectura. Las evidencias están en evidencias/frontend-s18, con deployment-real.json, runtime.json, resultados Node y secretos, capturas y manifiestos renderizados.

El primer arranque detectó una lista YAML sin comillas en las opciones tmpfs; se corrigió y el arranque posterior pasó. La primera ejecución del control de secretos no consiguió arrancar su servidor temporal en el contenedor compartido. La repetición en un contenedor aislado pasó los doce controles. Estos fallos iniciales no se contabilizan como éxitos. No hubo cambios de aplicación derivados de ellos.

El verificador PowerShell también requirió ajustar la captura del rechazo esperado de API_UPSTREAM inválido, manteniendo su criterio. La primera lectura del Compose integrado desde Windows agotó el tiempo de espera; la repetición por IPv4 pasó. No se determinó una causa raíz de ese timeout.

## Preparación para clúster y pendientes

El Deployment y Service usan 8080 y 80 respectivamente, sondas startup, liveness y readiness, raíz de solo lectura, sin capacidades y emptyDir limitado en /tmp. Kind fija UID no root y propone Ingress TLS para reservas.lab.test. OpenShift deja asignar el UID al proyecto y propone Route edge con redirección HTTPS. Ambos esperan una API disponible como reservas-api:80.

Antes de aplicar, se deben revisar contexto, proyecto, registro e imagen por digest, API, controlador de entrada, hostname, Secret TLS y confianza del certificado. El overlay OpenShift contiene registry.invalid para evitar confundir una referencia pendiente con una imagen publicada. No se ejecutó push de imágenes, apply ni instalación de clúster. La compatibilidad SCC y el recorrido HTTPS deben comprobarse mediante admisión real y evidencia del entorno elegido.

Los requests y limits son presupuestos iniciales propuestos. S19 medirá CPU y memoria y justificará su ajuste. Esta entrega no afirma capacidad máxima, alta disponibilidad ni un dimensionamiento medido.

## Fuentes técnicas

Nginx documenta imágenes y ejecución con sistema de archivos de solo lectura en https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/. Kubernetes describe las sondas en https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/. Red Hat explica el UID arbitrario y el grupo 0 en https://access.redhat.com/articles/4859371. Estas referencias orientan el diseño; los resultados locales se sustentan en las evidencias de S18.
