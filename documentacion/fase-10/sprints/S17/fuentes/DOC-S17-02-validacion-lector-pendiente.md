# Validación manual pendiente con lector de pantalla

Estado: NO EJECUTADA. La inspección automática del árbol accesible no es una prueba de la lectura del Narrador. No marcar RN06 completo hasta registrar este recorrido.

## Entorno listo para revisión

Abrir http://localhost:5189. Es un entorno ficticio local, independiente de la API y de PostgreSQL reales. La clave pública de este ensayo es S17-LECTOR; no es una credencial del laboratorio real. Se comprobó el comportamiento del simulador y se dejó sin reservas ficticias. Su proceso puede detenerse después de la sesión con docker stop seminario-s17-reader.

El servidor frontend/testing/s17_reader_fixture.py sirve frontend/dist y respuestas guardadas solo en memoria. Para recrearlo, primero compilar el frontend y ejecutar desde la raíz: docker run -d --name seminario-s17-reader -p 127.0.0.1:5189:8080 -v "${PWD}:/workspace:ro" python:3.12-slim python /workspace/frontend/testing/s17_reader_fixture.py. Si el contenedor ya existe y está detenido, usar docker start seminario-s17-reader. No repetir docker run con el mismo nombre.

## Preparación de la prueba

Registrar fecha, persona que revisa, Windows, navegador y versión de Narrador o NVDA. Registrar voz, idioma, nivel de detalle y modo de exploración utilizados. No modificar opciones durante el recorrido sin anotarlo.

Con Narrador se puede iniciar o detener la lectura con Windows+Ctrl+Enter. La tecla Narrador suele ser Bloq Mayús o Insert; Narrador+Tab lee el elemento actual. Estos atajos proceden de la guía oficial de Microsoft: https://support.microsoft.com/en-us/accessibility/windows/narrator/appendix-b-narrator-keyboard-commands-and-touch-gestures.

## Recorrido que debe registrarse

| Caso | Comprobar mediante lectura y teclado | Estado |
| --- | --- | --- |
| CU01 Acceso | Se reconoce el título, la etiqueta de clave, su condición de campo protegido y la ayuda; al entrar vacío se identifica el error y el campo | Pendiente |
| CU02 Catálogo y cupos | Se reconoce la navegación, se anuncia la espera al actualizar y se leen capacidad y disponibilidad sin depender del color | Pendiente |
| CU03 Crear y copiar | Cantidad cero anuncia su error asociado; la revisión recibe foco; se comunica envío y confirmación; el UUID puede copiarse por teclado | Pendiente |
| CU04 Recuperar | Con el modo lose-next, el resultado incierto se entiende; recargar conserva el pendiente; reingresar no reenvía; recuperar anuncia su resultado | Pendiente |
| CU05 Consultar | Un identificador incompleto comunica error junto al campo; el identificador del comprobante devuelve datos y confirmación sin anunciar una creación nueva | Pendiente |
| CU06 Salir | La advertencia explica la pérdida de recuperación; Cancelar recibe foco; Escape vuelve a Salir; confirmar borra datos locales y el acceso vuelve a recibir foco | Pendiente |

Para simular el resultado incierto de CU04, salir de la reserva anterior y ejecutar en otra ventana de PowerShell: Invoke-RestMethod -Uri http://localhost:5189/_fixture -Method Post -ContentType 'application/json' -Body '{"mode":"lose-next"}'. El siguiente envío crea un registro ficticio pero responde 503; su recuperación con la misma operación devuelve 200. No hay intervención de una base real.

Anotar las frases que se perciben, interrupciones, duplicaciones, silencios, foco inesperado y resultado por caso. Corregir los hallazgos y repetir los casos afectados. La aprobación de documentos no sustituye estas observaciones. Solo cerrar RN06 cuando el recorrido con el lector esté registrado y los problemas que impidan uso estén resueltos.
