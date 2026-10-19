# Entrega S12 Mensajes y errores de reservas

Documento DOC-S12-01. Fecha 19 de octubre de 2026. Requisito RF09. Estado en revisión local, sin commit ni push de S12. S11 quedó en el commit local db16f1d por autorización del usuario; no se solicitó push en esa autorización.

## Resultado y alcance

S12 completa los mensajes de acceso, catálogo, disponibilidad, creación, recuperación y consulta. messages.ts traduce únicamente códigos y estados ya normalizados por el cliente HTTP. No utiliza detail arbitrario, HTML, trazas ni SQL recibidos del servidor. La interfaz distingue agotamiento, identidad no autorizada, evento eliminado, conflicto de clave, validación rechazada, fallo temporal y resultado incierto.

Un 401 durante una lectura o un POST elimina la credencial y vuelve al acceso con una explicación de reingreso. El registro pendiente no se borra. Si la credencial original se vuelve a habilitar, el usuario puede acceder y decidir recuperar la operación original. La expiración de acceso no cancela una reserva del servidor ni sustituye la salida completa de S13.

## Matriz de mensajes y acciones

| Causa | Mensaje principal | Estado y acción |
| --- | --- | --- |
| Clave inválida al entrar | La clave no es válida o ya no está habilitada | Sin sesión activa |
| 401 posterior | El acceso ya no está autorizado | Reingresar; conservar pendiente |
| Evento 404 | Evento no disponible | Sin disponibilidad válida |
| Cero cupos leídos | Sin cupos disponibles en esta lectura | Bloquear Reservar |
| sold_out 409 | La API rechazó la reserva por falta de cupos | Rechazo; conservar registro |
| Conflicto 409 | Clave asociada a datos diferentes | No cambiar clave o cantidad para resolverlo |
| 422 con validación reconocida | La API rechazó los datos de la reserva | Revisar con instructor; conservar registro |
| POST incierto | No pudimos confirmar el resultado | Podría existir reserva; recuperación explícita |
| Consulta 404 | No encontramos una reserva accesible con ese identificador | Mismo texto para ajena e inexistente |

Los fallos de lectura añaden una causa segura: tiempo de espera agotado, respuesta no validable, indisponibilidad temporal o conexión fallida. Cuando hay datos anteriores, se conservan con fecha original y aviso de desactualización. El comprobante confirmado permanece visible ante un fallo posterior de disponibilidad. El 401 requiere reingreso y retira la vista autenticada.

Los fallos de POST por red, timeout, HTML, cuerpo vacío, JSON roto o respuesta incompatible no se presentan como rechazo. Un 503 o 429 tampoco demuestra que no hubo efecto. Se conserva el pendiente y no hay reintento automático. Retry-After solo aporta una espera orientativa cuando el valor normalizado es un entero positivo de hasta un día; no programa un envío. Los rechazos conocidos conservan el registro y ofrecen revisar o recuperar explícitamente la intención original, sin crear otra clave.

## Verificación ejecutada

Pasaron 47 pruebas Node, comprobación de tipos, compilación Vite y 12 controles de secretos. Cuatro pruebas nuevas verifican que los resultados inciertos nunca se anuncien como rechazo, la distinción de errores de dominio, la privacidad de consulta y límites de Retry-After y la preservación del pendiente antes de notificar expiración por un POST 401.

verify-errors.mjs aprobó 82 comprobaciones controladas en 20 escenarios: acceso inválido y HTML, 401 de catálogo y disponibilidad, catálogo desactualizado, evento eliminado, cero cupos, agotamiento, conflicto, validación, 401 de POST, 503 por base y retry_later, HTML, cuerpo vacío, JSON roto, fallo de red, timeout real del cliente y lectura fallida después de confirmar. Se comprobó una sola solicitud por envío, conservación de pendientes, ausencia de comprobantes falsos y ausencia de credenciales o detalle privado en página y evidencia.

El ensayo real aprobó diez comprobaciones sobre una base exclusiva con un cupo y dos identidades. Ambos navegadores prepararon la cantidad antes de enviar. La competencia produjo una confirmación y un rechazo por agotamiento. La API también devolvió 409 idempotency_conflict para misma clave con otra cantidad, 422 para cantidad cero y 401 para una clave sintética no autorizada. Estas tres verificaciones fueron solicitudes directas de prueba; los mensajes de esos códigos se verificaron por separado con respuestas controladas en interfaz.

audit_s12.py comprobó capacidad uno, disponibilidad cero, una reserva confirmada de un cupo y un outbox, sin claves duplicadas por cliente. No hubo worker, para mantener el outbox auditable. La regresión S10 aprobó 30 comprobaciones controladas y la de S11 aprobó 42, incluidas recuperación de respuesta perdida, bloqueo de otra identidad y privacidad de consulta. El ensayo real de pérdida después del commit pertenece a S10; no se presenta aquí como una nueva ejecución real de PV08.

Las ejecuciones iniciales de la matriz se detuvieron por páginas de arranque sin interfaz. No se registraron como aprobadas. Se cerró cada contexto tras su escenario y se completó posteriormente una ejecución de toda la matriz. El puente de pruebas no transporta el websocket de desarrollo; sus avisos de HMR no implican solicitudes automáticas de reserva. Las comprobaciones de secretos excluyen la credencial de página, almacenamiento, URL y registros.

## Reproducción y límites

frontend/testing/Start-S12.ps1 inicia base efímera reservas_s12, API en 8087 y frontend en localhost:5185, con dos identidades aleatorias. Los secretos quedan en .runtime/s12 excluido de Git. El ensayo real recibe credential y other por JSON en stdin y consume el único cupo; requiere la base exclusiva inicialmente vacía. No repetir la carrera sobre el inventario agotado. audit_s12.py rechaza una base ajena al laboratorio S12.

S12_BROWSER_URL y S12_EVIDENCE_DIR configuran navegador y evidencia. browser_loopback.py 5185 permite el acceso del navegador del contenedor. No forma parte del despliegue. Los ensayos no modificaron las bases anteriores ni la habitual y no acreditan Kubernetes, OpenShift, entrega de correo ni capacidad máxima.

Se entregan catálogo de mensajes, integración de estados, pruebas, entorno aislado, evidencias, Markdown, Word y Mermaid editable. El Word mantiene Times New Roman 12, texto negro, encabezados de tabla negros con letra blanca e índice actualizable. La revisión integral con lector de pantalla sigue en S17. S13 no se inicia y S12 requiere aprobación antes de commit y push según AGENTS.md.
