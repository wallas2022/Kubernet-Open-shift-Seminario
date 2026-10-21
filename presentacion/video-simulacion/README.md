# Simulación animada del seminario

[Ver video MP4 de un minuto](simulacion-kubernetes-reservas.mp4). Incluye narración sintetizada en español y subtítulos visibles; [SRT editable](simulacion-seminario.srt). Formato 1280 por 720, 24 cuadros por segundo, H.264 y AAC.

La animación muestra tráfico simbólico, aplicación y proxy, API en tres nodos, creación de réplicas, fallo y reposición de un Pod, pérdida de un trabajador y promoción conceptual de una réplica PostgreSQL. Cierra relacionando los seis grupos con el experimento. Las recuperaciones se condensan para explicar mecanismos; no son tiempos medidos ni una garantía de continuidad. No se ejecuta Kubernetes ni se generan 50 000 solicitudes como parte de la animación.

Fuentes del contenido: investigación DOC-01-02 y plan de laboratorio DOC-02-02. Se conserva el video explicativo anterior en presentacion/video-seminario. Este archivo nuevo aporta movimiento y una arquitectura ilustrada.

Guion editable: fuentes/escenas.json. Reconstruir desde la raíz con fuentes/narrar.ps1 en Windows, voz Microsoft Helena Desktop, y luego fuentes/construir.py en seminario-doc-s02 con Pillow, Liberation Sans e imageio-ffmpeg 0.6.0 en /tmp/seminario-video. El constructor genera 1440 cuadros, ajusta el audio a un minuto, incorpora subtítulos y decodifica el resultado completo para comprobar errores.

revisión/verificacion.json registra escenas, tiempos, SHA256 y decodificación. Las capturas del archivo final permiten revisar escalado, fallos y recuperación. Audio sintético, sin revisión auditiva humana acreditada. Entrega local sin commit ni push.
