# Entrega S10 Recuperación de operaciones inciertas

Documento DOC-S10-01. Fecha 19 de octubre de 2026. Requisito RF07. Estado en revisión local, sin commit ni push.

## Resultado y alcance

S10 permite recuperar una operación cuyo resultado no llegó al navegador. Tras recargar, la credencial desaparece de memoria y el registro pendiente permanece en sessionStorage. La pantalla de acceso informa que se necesita la misma clave original. Acceder valida la clave mediante el catálogo, pero no reenvía la reserva. La pantalla Recupera tu operación muestra evento, cantidad y fecha de la intención, y ofrece una acción explícita de recuperación.

El motor no genera otra Idempotency-Key ni modifica event_id o quantity durante la recuperación. Comprueba la huella SHA256 de la credencial actual contra la del registro y vuelve a verificar que identidad y registro no cambiaron durante el cálculo asíncrono. Solo entonces realiza un POST con la clave y el payload originales. Un bloqueo síncrono impide dos recuperaciones por doble clic.

## Preservación de la operación

Una credencial distinta, aunque sea válida para el laboratorio, no dispara POST y conserva el pendiente exactamente. Usar otra clave de laboratorio vuelve al acceso, elimina la credencial en memoria y mantiene el registro. Esto permite corregir la identidad sin borrar la intención. No es la salida completa prevista para S13 y no cancela una reserva del servidor.

Si el registro es corrupto, inaccesible, desaparece o cambia durante la verificación, se bloquea el envío sin sobrescribirlo. La pantalla no ofrece recuperar un registro inválido. No permite preparar otra intención mientras esté bloqueada. Ante almacenamiento inaccesible desde el inicio se requiere restaurar su acceso y recargar, o revisar el caso con el instructor; no se proporciona una acción de borrado.

Otro fallo de red, timeout o respuesta incompatible conserva la operación incierta y no programa reintentos. Si ya estaba marcada uncertain, no vuelve a escribirla. Si falla marcar uncertain, el registro sending original sigue siendo recuperable. El usuario decide cada nuevo intento. Las comprobaciones de S09 siguen validando 200 o 201, evento y cantidad antes de mostrar comprobante y retirar el pendiente. Un fallo de limpieza no oculta una confirmación válida.

## Verificación ejecutada

Pasaron 43 pruebas Node, comprobación de tipos, compilación Vite y 12 controles de secretos. Se agregaron seis pruebas para recuperación tras recarga con intención idéntica, credencial distinta o cambiante, doble clic antes de terminar la huella, almacenamiento corrupto o inaccesible, sustitución del registro durante el cálculo y recuperación del registro sending cuando falla actualizarlo. Las 37 pruebas anteriores permanecieron aprobadas.

verify-recovery.mjs aprobó 30 comprobaciones con respuestas controladas y 28 contra la API real con PostgreSQL exclusivo. Comprobó ausencia de reenvío al recargar o acceder, credencial eliminada tras recarga, otra identidad válida sin POST, misma clave y payload en cada intento, doble clic con un solo reenvío, segundo fallo conservando el pendiente, comprobante con UUID original y limpieza tras respuesta 200. Los ensayos incluyeron registro corrupto y storage bloqueado en el navegador y capturas a 1280 y 360 píxeles sin desbordamiento horizontal.

En el ensayo real, el intermediario recibió 201 de la API y descartó la respuesta antes de entregarla al navegador. Tras recarga, una segunda identidad válida intentó recuperar sin generar POST. La identidad original realizó una recuperación explícita; el servidor respondió 200 con el mismo UUID y el intermediario descartó también esa respuesta. Un segundo intento explícito entregó otro 200 con el UUID original y retiró el pendiente. El flujo produjo tres POST, todos con la misma intención: una creación y dos repeticiones.

audit_s10.py comprobó directamente PostgreSQL: capacidad 25, disponibilidad 23, una reserva confirmada de dos cupos y un registro outbox, sin claves duplicadas por cliente. Se verifican así PV08, PV09 y PV10 en el entorno local exclusivo. El worker no se inició para conservar el outbox auditable. No se acredita entrega de correo ni recuperación en Kubernetes u OpenShift. La regresión del comprobante S09 aprobó 58 comprobaciones controladas adicionales, guardadas dentro de S10 sin sobrescribir evidencia publicada.

## Reproducción y limitaciones

frontend/testing/Start-S10.ps1 prepara dos identidades aleatorias y una base efímera reservas_s10, con frontend en localhost:5183 y API de laboratorio en 8085. Los secretos quedan bajo .runtime/s10 excluido de Git. El ensayo real recibe credential y other como JSON por stdin; no se incluyen en argumentos, evidencias ni capturas. Requiere la base exclusiva inicialmente vacía; no repetir sobre la base ya utilizada. audit_s10.py rechaza una URL de base ajena a S10.

browser_loopback.py 5183 proporciona el puente local para el navegador del contenedor y Web Crypto. No forma parte del despliegue. El bloqueo sigue siendo por pestaña y el registro no es un comprobante verificable fuera del navegador. Si se pierde sessionStorage, S10 no puede reconstruir la clave original. La consulta por UUID, salida completa y copia del identificador siguen previstas para S11, S13 y S14.

Se entregan motor y pantalla, pruebas, entorno aislado, evidencias, fuente Markdown, Word y Mermaid editable. El Word mantiene Times New Roman 12, texto negro e índice actualizable. S11 no se inicia. La publicación a origin/master requiere aprobación expresa de esta entrega conforme a AGENTS.md. La función continúa en pruebas hasta completar la salida segura de S13.
