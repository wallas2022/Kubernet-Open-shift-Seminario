# Entrega S16 Adaptación de pantalla y zoom

## Propósito y resultado

S16 implementa RN02 para que las vistas de reservas se redistribuyan en ventanas estrechas y con zoom. Pasaron 493 comprobaciones en 60 combinaciones de pantalla y tamaño, sin desplazamiento horizontal ni contenido desbordado en los estados medidos. La entrega queda en revisión local y requiere aprobación antes de commit y push. S17 no iniciado.

## Cambios implementados

La cabecera y el pie permiten distribuir sus elementos en varias filas. La rejilla principal usa columnas con mínimo cero y los elementos de tarjetas y formularios pueden reducir su ancho. Los grupos de acciones ya no imponen un mínimo de 190 píxeles. Los botones ajustan el texto y respetan el ancho disponible; por debajo de 320 píxeles útiles, la disponibilidad se presenta en una columna.

Los nombres largos, mensajes e identificadores admiten saltos de línea sin ocultar contenido ni reducir la letra. El comprobante conserva el UUID completo en sus datos y en el campo seleccionable; este último mantiene el desplazamiento interno habitual de un campo de una sola línea. La actualización de cupos en la pantalla de recuperación utiliza el mismo estilo de acción que el comprobante.

## Matriz de tamaños y zoom

| Perfil | Ventana inicial | Área útil observada |
| --- | --- | --- |
| Móvil al 100 por ciento | 360 por 1000 píxeles | 360 por 1000 píxeles CSS |
| Escritorio al 100 por ciento | 1280 por 1000 píxeles | 1280 por 1000 píxeles CSS |
| Escritorio al 200 por ciento | 1280 por 1000 píxeles | 640 por 500 píxeles CSS |
| Ventana estrecha al 200 por ciento | 360 por 1000 píxeles | 180 por 500 píxeles CSS |

Cada perfil recorre quince estados: acceso y su validación; catálogo normal, vacío y error; disponibilidad, error de cantidad y revisión; comprobante y fallo posterior de cupos; consulta inválida y confirmada; recuperación, advertencia de salida y comprobante recuperado. Los fixtures incluyen un nombre largo con una secuencia sin espacios, UUID completos y capacidad de cinco cifras. Las acciones se recorren mediante desplazamiento vertical, sin exigir desplazamiento horizontal de la página.

## Método y resultados

La prueba usa Chromium 145.0.7632.6 de la imagen mcr.microsoft.com/playwright:v1.58.2-noble y el frontend del laboratorio S12. Una extensión local, cargada solo en el navegador aislado de pruebas, aplica chrome.tabs.setZoom y confirma el valor con getZoom. El zoom de la pestaña reduce el ancho útil medido; no se sustituye por zoom CSS ni por cambiar únicamente el tamaño de la ventana. Referencia del mecanismo: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom.

responsive-controlled.json registra 493 comprobaciones exitosas, dimensiones y elementos revisados en sesenta estados. Incluye ancho de página, desbordamiento de elementos y acceso a controles mediante desplazamiento vertical. Se verifican 28 capturas comparables, siete por perfil, y que sus anchos corresponden a la ventana original. Las lecturas y envíos del servicio están interceptados con respuestas controladas; cambiar tamaño no añade solicitudes de reserva.

Pasaron las 52 pruebas Node existentes, TypeScript, compilación de producción y 12 controles de secretos. La regresión de S15 pasó 147 comprobaciones y 49 desplazamientos por teclado en los seis casos de uso. Sus registros nuevos están en evidencias/frontend-s16/regresion-s15.

## Hallazgos y correcciones del ensayo

La medición inicial pasó los anchos de 360 y 1280 y el zoom de escritorio. En la ventana de 360 ampliada al 200 por ciento registró cincuenta fallos de comprobación relacionados con cabecera, mínimos de acciones y distribución de contenido. No representan cincuenta defectos independientes. Tras ajustar la distribución se detectó y corrigió la compresión del icono informativo.

La captura completa estándar de Playwright recortaba las imágenes con zoom nativo, aunque las medidas de distribución eran correctas. La versión final utiliza Page.captureScreenshot con el rectángulo ajustado al factor de zoom y comprueba el ancho PNG. Las capturas preliminares y diagnósticos locales se distinguen de las finales; baseline.json conserva la medición inicial. Ningún intento fallido se contabiliza como éxito final.

## Entrega y límites de aceptación

Se entregan código, prueba reproducible frontend/scripts/verify-responsive.mjs, extensión de zoom de prueba, evidencias, Markdown, Word e itinerario Mermaid editable. S16_BROWSER_URL configura el frontend y S16_PROFILES permite seleccionar perfiles. La matriz completa es el criterio de esta entrega.

PV13 queda cubierto para adaptación y zoom de RN02 en Chromium y los estados documentados. No se probó un dispositivo físico ni se acredita pinch zoom, todos los navegadores o accesibilidad integral. El lector de pantalla y la revisión global de accesibilidad corresponden a S17. No se crearon nuevas reservas reales ni se midió PostgreSQL, Kubernetes, OpenShift o rendimiento. El Word conserva Times New Roman 12, texto negro, encabezados de tabla negros con letra blanca e índice actualizable.
