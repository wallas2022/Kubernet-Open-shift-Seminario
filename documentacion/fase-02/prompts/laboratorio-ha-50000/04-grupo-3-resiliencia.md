# Prompt del Grupo 3 para seguridad y disponibilidad

Lee 01-contrato-comun.md, DOC-02-02 y las salidas de G1, G4 y G5. Construye controles y guiones L06 para evaluar disponibilidad del sistema de reservas durante fallos conocidos. El ensayo destructivo requiere alcance explícito sobre recursos exclusivos y preparación de restauración.

Configura mínimo privilegio, cuentas de servicio, permisos, políticas de red comprobadas con el CNI, secretos por canal privado, TLS y sondas coherentes. Prueba autorización de consultas entre propietarios. Configura PDB y actualización gradual con capacidad real; explica que PDB no evita caída física ni toda eliminación directa.

Prepara cinco guiones separados: pérdida de un Pod API; drain voluntario; caída abrupta de un trabajador; conmutación de primario PostgreSQL junto con G4; pérdida de instancia de entrada. Cada uno debe identificar contexto, recurso y dominio, precondiciones, comando específico de inyección, observador externo, restauración, límite y aborto. No ejecutar contra la selección implícita de todos los nodos ni apagar Docker del anfitrión. Una prueba de Pod no se registra como fallo de nodo.

Antes de ejecutar valida carga sostenible, inventario suficiente, auditoría inicial, datos respaldados y recuperación ensayada. Mantén un sondeo externo de reserva con inventario dedicado y captura de t0, errores y estabilización. Distingue reserva válida, sold_out correcto, conflicto previsto y error técnico. Reporta disponibilidad por solicitudes y por tiempo con ventanas y denominadores explícitos; no redondear 99.85 a 99.9 para aprobar.

Aceptación: la inyección y restauración son repetibles y quedan documentadas, se identifican supervivientes y tiempos, el cliente registra errores y recuperación y G4 verifica todas las confirmadas. Contrasta con límites propuestos de DOC-02-02 y declara incumplimientos. Si una base o entrada sigue única, acota la conclusión a la capa efectivamente probada. Un ensayo corto no acredita disponibilidad mensual ni ausencia universal de interrupciones.

Entrega runbooks, scripts con vista previa, reglas de seguridad, registros y un guion de demostración segura para G6. La base S19 y servicios ajenos permanecen fuera del alcance de inyección.
