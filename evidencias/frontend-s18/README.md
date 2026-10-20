# Evidencias S18 RN05

Entrega local parcial por falta de contexto de clúster. Compose se ejecutó con Nginx, API real y PostgreSQL exclusivos del proyecto seminario-s18; no se interceptaron respuestas del ensayo de navegador. No se publicó imagen en registro ni se ejecutó apply en un clúster.

- deployment-real.json: 28 controles HTTP y navegador, incluida creación 201 y repetición 200 con el mismo identificador.
- runtime.json: 16 controles de ejecución, UID arbitrario real 1000710000, raíz de solo lectura, temporales, permisos, configuración inválida, logs y caída/restablecimiento de la API.
- compose-integrado.json: dos lecturas contra el segundo frontend temporal en una red externa S18, sin escrituras de negocio. Ese frontend ya fue retirado.
- database-audit.json: auditoría de solo lectura, dos reservas, dos outbox, dos claves de operación, cuatro cupos reservados y 21 disponibles.
- node-tests.txt y build.txt: 52 pruebas unitarias y compilación.
- secrets.txt: doce controles pasados en contenedor aislado.
- kind-rendered.yaml y openshift-rendered.yaml: renderizado local de los overlays; no certifican admisión, SCC ni HTTPS.
- comprobante-proxy-real.png y recarga-spa.png: capturas del recorrido real a través de Nginx.
- diagrama.json: Mermaid analizado y renderizado.

Los fallos iniciales fueron la sintaxis tmpfs de Compose, la captura PowerShell de un rechazo esperado por configuración inválida, el arranque del servidor temporal del control de secretos en un contenedor compartido y el timeout de una lectura inicial del frontend integrado desde Windows. Se corrigieron la sintaxis y la captura; el control de secretos pasó aislado y la lectura integrada pasó después por IPv4. No se afirma una causa raíz del timeout de Windows. Ninguno de esos ensayos iniciales se contabiliza como éxito.

La base exclusiva permanece en ejecución con sus dos reservas de prueba. No hay worker en esta topología; la presencia de outbox no prueba entrega de notificaciones. No se ejecutó carga ni dimensionamiento de S19.
