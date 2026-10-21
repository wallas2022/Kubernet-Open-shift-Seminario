# Guía del seminario por seis grupos y sistema de reservas

DOC-07-02 · Propuesta de exposición conjunta · 20 de octubre de 2026

## Cómo se mostrará nuestro caso de éxito

La sesión utiliza un solo caso: el sistema de reservas que construimos. Primero se plantea la necesidad de confirmar cupos sin sobreventa ni duplicación. Cada grupo explica un mecanismo que interviene en esa misma operación. Después se realiza una demostración funcional conjunta y se interpreta la evidencia disponible. Se cierra con el protocolo para investigar las metas de 1M a 10M sobre OpenShift, todavía no demostradas.

La investigación principal es DOC-01-02 y la presentación DOC-06-02, de treinta diapositivas. DOC-01-01 se conserva como biblioteca general. Los Word originales de organización y caso de éxito definen la distribución de los alumnos y la intención de investigación. Esta guía no atribuye a un grupo experimentos que no haya realizado ni convierte una propuesta de plataforma en un resultado medido.

## Responsables y bloques

| Grupo y alumnos | Diapositivas | Responsabilidad en la exposición |
| --- | --- | --- |
| G1 · 4 | 5 a 7 | Arquitectura objetos Kubernetes y estado del despliegue |
| G2 · 4 | 8 a 10 | Escalado de solicitudes y consumidores y comparación controlada |
| G3 · 4 | 11 a 13 | Fallos recuperación seguridad y disponibilidad definida |
| G4 · 4 | 14 a 16 | Inventario transacción idempotencia y mensajería |
| G5 · 3 | 17 a 19 | Métricas instrumentación y evidencia S19 |
| G6 · 3 | 20 a 22 | Unidad de reserva protocolo y análisis estadístico |

Las diapositivas 1 a 4 abren el caso; 23 a 26 acompañan la demostración; 27 a 30 integran logros, pendientes y conclusión. Un coordinador presenta apertura y cierre y G6 conduce el registro experimental. Cada equipo asigna sus nombres y roles reales antes de la sesión; no se inventan integrantes.

## Agenda propuesta de tres horas

| Bloque | Minutos | Producto observable |
| --- | --- | --- |
| Apertura y recorrido general | 10 | Pregunta y alcance compartidos |
| G1 Fundamentos y Arquitectura | 20 | Diagrama y componentes identificados |
| G2 Escalabilidad y Autoescalado | 20 | Tratamientos y señales explicados |
| G3 Resiliencia y Seguridad | 20 | Fallos controles y recuperación |
| G4 Persistencia y Mensajería | 25 | Reserva única e inventario coherente |
| G5 Observabilidad y Métricas | 20 | Fuentes unidades y paneles |
| G6 Diseño Experimental | 25 | Protocolo e interpretación correcta |
| Demostración conjunta | 25 | Reserva comprobante y consulta |
| Discusión y cierre | 15 | Conclusión y pendientes acordados |

La duración es una propuesta adaptable, no una restricción recibida del usuario. Si se necesita una exposición breve, conservar la participación de los seis grupos y reducir explicación de comandos; no eliminar el bloque metodológico ni presentar como probadas las capacidades que no se pudieron demostrar.

## Preparación antes del seminario

El instructor y G1 comprueban que el laboratorio exclusivo de demostración esté operativo. S18 puede iniciarse desde la raíz con ./frontend/testing/Start-S18.ps1 y publica http://localhost:18083; ese inicio no restablece automáticamente sus datos. La base S18 tenía dos reservas de prueba al cerrar su entrega, por lo que se debe leer el inventario actual y no prometer una cifra inicial fija. No usar la base medida S19 para crear reservas de exposición: alteraría su auditoría histórica.

G3 entrega la clave exclusiva por un canal privado y ensaya su entrada con la proyección oculta. El archivo local .runtime/s18/compose.env no se proyecta, comparte ni adjunta a entregables. La clave del participante permanece en memoria; los identificadores de reserva pueden mostrarse como datos del laboratorio. Preparar un navegador limpio y una pestaña de consulta.

G4 comprueba un evento con al menos un cupo y prepara el registro de disponibilidad inicial A. No reiniciar volúmenes ni modificar inventario frente al público para obtener una cifra esperada. Si se necesita una prueba de último cupo o pérdida de respuesta, debe prepararse y auditarse otra base exclusiva antes de la sesión.

G5 abre las evidencias S19 y verifica su procedencia: cuatro usuarios, tres repeticiones de treinta segundos, 3240 HTTP medidos, 360 reservas nuevas y 180 HTTP de calentamiento separado. G6 verifica que las series y la auditoría correspondan a esa misma topología y conserva un registro de demostración separado.

## Demostración funcional de veinticinco minutos

### Minutos cero a cinco

G1 muestra el diagrama de navegador, frontend, API y PostgreSQL y aclara que el entorno es Compose. G3 introduce la clave sin proyectarla. El participante abre el catálogo y G4 selecciona un evento y anota A. Se explica que consultar disponibilidad no bloquea los cupos.

### Minutos cinco a doce

El participante elige reservar una unidad, revisa y confirma. Se espera el comprobante y se anota su identificador R. G4 explica que el comprobante corresponde a la reserva persistida. Se verifica cantidad uno y disponibilidad A menos uno, si no hay otras operaciones simultáneas en esa base. G5 registra hora, operación y resultado; G6 confirma que se está observando un caso funcional y no una prueba de capacidad máxima.

### Minutos doce a diecisiete

El participante copia R y consulta la reserva. Se comprueba mismo identificador y cantidad. G3 explica que la autorización se aplica en servidor y que un UUID no concede permiso por sí solo. Finalmente se usa Salir y se verifica que el acceso vuelve a solicitar la clave.

### Minutos diecisiete a veintidós

G4 explica la idempotencia con las evidencias aisladas de S18 o S19: un 201 y el reenvío 200 conservan el identificador y una sola reserva. No se intenta demostrarlo inventando un doble clic que la interfaz bloquea. La recuperación de respuesta perdida solo se ejecuta si fue ensayada previamente en un entorno dedicado; en caso contrario se muestran el flujo y su evidencia histórica identificada.

### Minutos veintidós a veinticinco

G2 ubica qué crecería con HPA y qué crecería con KEDA en la ampliación Kafka. G5 muestra las métricas locales y distingue el tablero futuro. G6 compara el registro de la demostración con la pregunta inicial y deja explícito que no se ejecutaron millones de reservas ni autoescalado de clúster.

## Registro de aceptación de la demostración

| Campo | Dato que debe anotarse | Criterio |
| --- | --- | --- |
| Entorno y fecha | Proyecto versión y ejecutor | Laboratorio exclusivo identificado |
| Evento e inventario A | Identificador y lectura inicial | Al menos un cupo |
| Reserva R | Identificador cantidad y resultado | Confirmación persistida de una unidad |
| Inventario final | Lectura posterior | A menos uno sin operaciones ajenas |
| Consulta | ID y cantidad observados | Coinciden con R |
| Salida | Pantalla de acceso | Clave no conservada en la interfaz |
| Incidencias | Error y evidencia | Sin alterar datos para ocultarlo |

Si falla el acceso, la base o la disponibilidad, detener escrituras y utilizar capturas y resultados ya preparados, indicando fecha y entorno. Una evidencia histórica puede explicar el mecanismo, pero no se registra como una demostración en vivo exitosa. La sesión no requiere hacer fallar servicios de otros proyectos.

## Qué debe investigar cada grupo

G1 justifica la arquitectura y distingue lo construido de un comparador monolítico todavía inexistente. G2 relaciona HPA, VPA, nodos y KEDA con señales y condiciones separadas. G3 analiza fallos, SCC, seguridad, malla y definición de disponibilidad. G4 sustenta ACID, idempotencia, CAP en su contexto y mensajería posterior al commit. G5 entrega diccionario de métricas, paneles y plan de trazas. G6 operacionaliza hipótesis y prepara diseño, corridas, análisis y límites.

La revisión semanal debe responder qué cambió, con qué versión, por qué se decidió, qué se verificó y dónde están los datos. Un manifiesto sin aplicar se registra como preparado; una gráfica sin origen no es evidencia; un resultado de Compose no se atribuye a OpenShift.

## Evaluación académica propuesta

| Dimensión | Peso propuesto | Evidencia esperada |
| --- | --- | --- |
| Fundamento y fuentes | 20 por ciento | Conceptos correctos y referencias primarias |
| Aplicación a reservas | 25 por ciento | Decisiones vinculadas al caso propio |
| Artefactos y configuración | 20 por ciento | Material editable y versiones claras |
| Pruebas y trazabilidad | 25 por ciento | Datos auditoría o pendiente justificado |
| Integración y exposición | 10 por ciento | Relación con los otros cinco grupos |

Los pesos son una propuesta para el responsable del seminario. No se califica como incumplimiento científico que una hipótesis resulte refutada; se evalúa el método y la honestidad de la conclusión. Tampoco se premia llamar escalabilidad a cualquier ejecución rápida sin contraste.

## Cierre y trabajo posterior

El cierre reconoce la aplicación funcional y la evidencia local y asigna el próximo experimento integrado. Los niveles 1M, 2.5M, 5M, 7.5M y 10M conservan su lugar en la investigación, sujetos a recursos y protocolo aprobados. No se promete ejecutarlos todos durante la exposición ni se concluye H1 con el piloto S19.

Fuentes rectoras: documentos originales de organización y caso de éxito de Fase 01; investigación DOC-01-02; presentación y guion DOC-06-02; entregas y evidencias S18 y S19. Los manuales históricos de instalación y recuperación permanecen como apoyo técnico, no como sustitutos del nuevo orden por grupos.
