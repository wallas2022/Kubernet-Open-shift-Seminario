# Entrega S15 Revisión de español y uso por teclado

## Propósito y resultado

S15 completa la revisión RN01 del recorrido de reservas en español y su operación por teclado. Los seis casos de uso se recorrieron con respuestas de negocio controladas mediante teclado de Chromium. La entrega queda en revisión local; requiere aprobación del usuario antes de commit y push. S16 no iniciado.

## Cambios implementados

Se retiraron anuncios de reservas futuras y referencias a números de sprint de las pantallas del participante. Acceso y catálogo explican el recorrido ya disponible para reservas de prueba. Consultar una reserva sustituye la etiqueta técnica de entrada; la ayuda explica dónde copiar el identificador completo y conserva el formato UUID como referencia secundaria.

Los rechazos de reserva se atribuyen al servicio, sin exigir conocer el término API. La preparación y los fallos de almacenamiento hablan de datos de la reserva; las advertencias mantienen la diferencia entre rechazo conocido y resultado incierto. No se cambiaron contratos, persistencia, identidad ni reglas de reenvío.

La prueba detectó que Ir al contenido desplazaba la vista sin llevar el foco al contenido principal. Se añadió tabIndex negativo al destino en las cinco pantallas que ofrecen este enlace. El destino recibe el foco al activarlo, sin añadirse al orden normal de Tab. Los controles conservan su semántica nativa y el indicador de foco existente.

## Lista de revisión por pantalla

| Pantalla | Recorrido por teclado | Resultado observado |
| --- | --- | --- |
| P01 Acceso | Tab y Enter para clave vacía, rechazada y válida | Validación en español y entrada al catálogo |
| P02 Catálogo | Tab, Espacio y Enter para actualizar y elegir evento | Error de lectura explicado y selección operable |
| P03 Preparación | Enter para validar cantidad; Espacio para cancelar, editar y confirmar | Cantidad cero rechazada, regreso al campo y ningún envío antes de confirmar |
| P04 Comprobante | Tab al campo del identificador | Identificador completo seleccionado y comprobante conservado |
| P05 Consulta | Tab y Enter para identificador inválido y válido | Mensaje comprensible y reserva consultada |
| P06 Recuperación y salida | Reingreso tras recarga; Espacio para recuperar; Escape o Espacio para cancelar salida | Solicitud original conservada y borrado solo al confirmar |

Se revisaron nombres de controles visibles, idioma declarado y ausencia de índices de tabulación positivos en los estados visitados. Mayús+Tab vuelve al campo de cantidad. La salida sin pendiente y la salida con borrado confirmado también se activaron por teclado. La prueba no usa clics, fill, focus ni cambios de selección desde el código de ensayo: escribe y activa mediante el teclado del navegador.

## Verificación y evidencias

La matriz keyboard-controlled.json registra 147 comprobaciones exitosas y 49 desplazamientos hasta los controles. Usa Chromium 145.0.7632.6 a 1280 por 1000 píxeles, en la imagen mcr.microsoft.com/playwright:v1.58.2-noble. El script reproducible es frontend/scripts/verify-keyboard.mjs; S15_BROWSER_URL permite indicar el frontend. Cada escenario conserva el número esperado de envíos; recuperar mantiene exactamente la clave y los datos originales.

Pasaron las 52 pruebas Node existentes, TypeScript, compilación de producción y los 12 controles de secretos. Las capturas muestran consulta, recuperación y advertencia de salida accionadas por teclado. Evidencias en evidencias/frontend-s15. Los ensayos iniciales fallidos no se cuentan como éxitos: se corrigió el destino del salto al contenido y una coincidencia del ensayo que omitía la flecha del botón Volver al catálogo.

También pasaron 82 comprobaciones controladas de mensajes de S12, 42 de consulta de S11 y 46 de copia y actualización de S14. Sus registros se guardan en las subcarpetas regresion-s12, regresion-s11 y regresion-s14 de esta entrega, sin sobrescribir las evidencias anteriores.

## Alcance y aceptación

PV13 queda cubierto en su parte de español y operación por teclado de RN01 para los estados documentados. Esta es una ejecución automatizada con teclas reales del navegador, acompañada de inspección de textos y capturas; no se presenta como evaluación humana con lector de pantalla. Las respuestas del servicio son fixtures y no acreditan nuevas reservas reales ni auditoría PostgreSQL.

Adaptación móvil y zoom corresponden a S16; anuncios, contraste, revisión integral de foco y lector de pantalla corresponden a S17. No se declara accesibilidad integral, conformidad WCAG, compatibilidad con todos los navegadores ni despliegue Kubernetes u OpenShift. Se conservan Markdown, Word e itinerario Mermaid editable. El Word usa Times New Roman 12, texto negro, encabezados de tabla negros con letra blanca e índice actualizable.
