# Evidencias S16

- responsive-controlled.json: matriz final de 493 comprobaciones, 60 estados y dimensiones observadas.
- movil, escritorio, escritorio-200 y movil-200: 28 PNG finales de siete pantallas por perfil. Se capturan con CDP a la escala del zoom nativo.
- baseline.json: medición inicial con 50 comprobaciones fallidas en la ventana de 360 al 200 %, antes de los ajustes. No son resultados finales ni 50 defectos independientes.
- node-tests.txt, build.txt y secrets.txt: 52 pruebas, compilación y 12 controles de secretos.
- regresion-s15: nueva ejecución de teclado, con 147 comprobaciones y 49 desplazamientos.
- revision-documental.json y diagrama.json: revisión del Word y render del Mermaid.

Los PNG baseline-movil-200, zoom-capture-probe, ajuste01 y diagnostico01 son diagnósticos locales excluidos por .gitignore; algunas capturas preliminares quedaron recortadas por el mecanismo estándar de Playwright. Las imágenes finales con zoom utilizan Page.captureScreenshot y su ancho se comprueba en la matriz. Los datos de negocio son controlados; no se creó ninguna reserva real.
