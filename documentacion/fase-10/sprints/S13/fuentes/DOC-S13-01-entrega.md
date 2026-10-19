# Entrega S13 Salida y limpieza local

## Propósito y resultado

S13 implementa RF10 para cerrar el contexto local del laboratorio y volver a P01. El usuario puede cancelar si existe un pendiente o confirmar que desea perder la recuperación guardada en esta pestaña. La entrega está lista para revisión local y requiere aprobación antes de commit y push. Salir no cancela una reserva ni revoca la clave habilitada por el servidor.

## Comportamiento implementado

Salir está disponible cuando existe una credencial en memoria, un pendiente o un aviso de limpieza incompleta. Sin pendiente, cierra directamente. Si hay preparación, envío, registro válido, registro corrupto o almacenamiento que no puede comprobarse, muestra una advertencia antes de borrar. La advertencia explica que la reserva podría existir y que se perderá la clave de operación necesaria para recuperarla desde esta pestaña. Recomienda conservar el identificador disponible o consultar al instructor antes de enviar otra reserva.

Cancelar salida conserva exactamente el registro, la identidad y el estado de la operación. Escape también cancela. Al abrir la advertencia, el foco pasa a Cancelar salida; al cancelarla, vuelve a Salir. El aviso es un diálogo no modal y no afirma bloquear el resto de la página. La revisión completa con lector de pantalla pertenece a S17.

Al confirmar, el motor se cierra de forma permanente, aborta la espera local, elimina la referencia al pendiente y al comprobante e ignora respuestas tardías. Comprueba la eliminación de seminario.reserva.pendiente.v1 sin borrar claves de otras funciones. El registro contiene la huella de credencial y la clave idempotente; borrar este registro elimina ambas del almacenamiento de sesión. La credencial ya se conservaba exclusivamente en memoria.

La aplicación recrea sus proveedores y pantallas para retirar catálogo, selección, cantidad, consulta por UUID, comprobantes, avisos y estado de acceso anteriores. Una instancia cerrada no puede preparar ni recuperar otra intención. La protección se comprueba tanto durante la huella asíncrona como después del POST. Abortar una espera del navegador no garantiza que el servidor haya cancelado el procesamiento.

## Fallos de limpieza y límites

Si removeItem falla o aparenta funcionar pero el registro sigue presente, la interfaz vuelve al acceso con un aviso de limpieza incompleta. La credencial y los comprobantes anteriores se retiran del contexto; el registro que no pudo eliminarse sigue visible como pendiente y bloquea otra intención. El usuario puede permitir el almacenamiento y repetir Salir. La aplicación no afirma una limpieza exitosa cuando no puede verificarla.

La limpieza es por pestaña y por instancia de la aplicación. No borra datos de otras pestañas ni revoca credenciales del servidor. No se garantiza la sobrescritura física de strings en el recolector de memoria, la eliminación de copias en extensiones o gestores de contraseñas, ni la eliminación de capturas que el usuario haya guardado. Estas limitaciones no se presentan como resultados medidos de memoria física.

## Verificación ejecutada

Se ejecutaron 52 pruebas Node y todas pasaron, incluidas cinco pruebas S13 para limpieza, bloqueo del motor cerrado, salida durante la huella, respuestas tardías y borrado fallido. También pasaron TypeScript, compilación de producción y los 12 controles de secretos. El registro de la suite está en evidencias/frontend-s13/node-tests.txt.

| Ensayo | Resultado | Alcance observado |
| --- | --- | --- |
| Navegador controlado | 71 comprobaciones | Cancelar y Escape, pendiente exacto, salida limpia, corrupto, comprobante, envío y fallo de borrado |
| API real de laboratorio | 11 comprobaciones | Acceso real, salida sin POST y clave todavía habilitada en el servidor |
| Auditoría PostgreSQL | Sin cambios | Un cupo consumido, una reserva, un outbox y cero duplicados |

La matriz controlada usa Chromium en escritorio y móvil de 390 píxeles para la advertencia. Verifica ausencia de POST por salir, limpieza de acceso, catálogo y comprobante, conservación de claves ajenas, descarte de respuestas tardías y aviso si falla el borrado.

El ensayo real reutiliza el laboratorio exclusivo S12 en localhost 5185 y su base reservas_s12, sin crear reservas adicionales. Entra al catálogo, sale y hace una lectura directa autorizada para comprobar que la clave sigue habilitada. Las auditorías previas y posteriores coinciden con la tabla: disponibilidad cero, capacidad uno y una reserva confirmada de un cupo.

Una primera ejecución no encontró el nuevo botón y no se contabilizó como exitosa. Tras reiniciar el frontend, la matriz completa pasó. Las evidencias corresponden a la versión final.

## Evidencia y aceptación

exit-controlled.json y exit-real.json registran las comprobaciones sin credenciales. database-audit.json conserva el resumen previo y posterior. Se entregan capturas de advertencia en escritorio y móvil, fallo de almacenamiento, salida durante envío y regreso al acceso real. La inspección lógica y de storage se realiza mediante comprobaciones sin volcar secretos. PV12 queda cubierto en las rutas de salida con y sin pendiente, dentro de estos límites de laboratorio.

Se entregan código, pruebas, fuente Markdown, Word y Mermaid editable. El Word mantiene Times New Roman 12, texto negro, encabezados de tabla negros con letra blanca e índice actualizable. La entrega no acredita Kubernetes, OpenShift, capacidad máxima ni la revisión integral de calidad de los sprints posteriores. S14 no iniciado. La publicación de S13 requiere aprobación expresa de la entrega según AGENTS.md.
