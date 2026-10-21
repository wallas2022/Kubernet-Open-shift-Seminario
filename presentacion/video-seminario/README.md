# Explicación del seminario en un minuto

[Video MP4 de 60 segundos](seminario-un-minuto.mp4), 1280 por 720, H.264 con audio AAC, narración sintetizada en español y subtítulos visibles. [Subtítulos SRT](seminario-un-minuto.srt).

Resume objetivo, seis grupos, sistema de reservas construido, arquitectura propuesta, pruebas de carga y fallos, medición y estado actual. Distingue la evidencia local de la meta pendiente de 50 000 usuarios y del laboratorio de alta disponibilidad.

Fuentes del contenido: DOC-01-02, DOC-02-02 y DOC-06-02 del repositorio. Guion y escenas en fuentes/escenas.json. No muestra una prueba real de Kubernetes ni simula una medición ejecutada.

Para reconstruir: ejecutar fuentes/narrar.ps1 desde la raíz en Windows con Microsoft Helena Desktop; después ejecutar fuentes/construir_video.py en el contenedor seminario-doc-s02, con Pillow, fuentes Liberation e imageio-ffmpeg instalado en /tmp/seminario-video. La versión utilizada de imageio-ffmpeg fue 0.6.0. La voz se ajusta conservando el tono para completar exactamente un minuto. revisión/timeline.json conserva los tiempos.

Se comprobó duración 00:01:00.00, presencia de audio y video y decodificación completa sin errores. Se inspeccionaron capturas del MP4 en sus ocho escenas. El audio es sintético; no se acredita revisión auditiva humana. Entrega local sin commit ni push.
