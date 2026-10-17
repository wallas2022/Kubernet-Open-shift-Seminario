# Plan de codificación por requisito del frontend de reservas

Documento DOC-10-06. Versión 1.0. Fecha 17 de octubre de 2026. Estado: planificación pendiente de aprobación. No se ha iniciado la codificación del frontend.

## Objetivo y forma de entrega

Se propone una entrega por cada requisito de DOC-10-01: 19 sprints, correspondientes a 11 requisitos funcionales y 8 requisitos de calidad. Cada sprint tiene un requisito principal, tareas concretas, entregable, dependencias y aceptación. Los controles esenciales de seguridad y manejo de errores se aplican desde que resultan necesarios; el sprint de un requisito transversal completa su revisión global y evidencia, sin posponer esos controles hasta el final.

En este plan, sprint significa una unidad de trabajo revisable por requisito. Se propone una cadencia de revisión al terminar cada unidad. No se fijan fechas ni duración uniforme sin conocer la disponibilidad del usuario y el tiempo de implementación observado. Los tamaños S, M y L expresan esfuerzo relativo propuesto, no días medidos ni compromisos de calendario. Se recalibrarán tras las primeras dos entregas, sin cambiar alcance sin informar al usuario.

## Acuerdo de aprobación y publicación

G0 Planificación: entregar este plan y esperar aprobación expresa. No implementar el frontend, crear commits Git ni realizar push mientras esté pendiente. La aprobación para publicar el plan debe identificar su alcance documental; aprobar el diseño no se interpreta por sí solo como permiso para iniciar todos los sprints.

G1 Inicio: el usuario autoriza el sprint concreto o un conjunto explícito de sprints. Se permite trabajo local de implementación dentro de ese alcance. Al terminar cada entrega se prepara una revisión con cambios, evidencias y limitaciones, y se detiene el avance al siguiente sprint hasta su aprobación salvo autorización expresa de un lote.

G2 Publicación de cada entrega: presentar archivos y diff concreto, pruebas ejecutadas y pendientes, rama y destino. Esperar aprobación expresa para commit y push de esa entrega. Solo entonces crear el commit, revisar su contenido y enviar la rama autorizada. Registrar hash y resultado real del push. Si el envío falla, no informar publicación exitosa ni usar force push para resolverlo.

La orden anterior del proyecto prohibía escrituras remotas. La instrucción del usuario del 17 de octubre permite commit y push de manera condicional después de aprobar cada alcance. Hasta recibir esa aprobación, sigue vigente el bloqueo. No se autoriza git pull, force push, reescritura de historial, publicación de secretos ni inclusión de cambios ajenos a la entrega.

## Secuencia y dependencias

Los sprints se ejecutarán en el orden de esta tabla. La columna de dependencia identifica la base técnica directa; la autorización de avance también se requiere según G1. Los tamaños no sustituyen estimaciones posteriores.

| Sprint | Requisito | Entrega principal | Tamaño |
| --- | --- | --- | --- |
| S01 | RN03 | Base del proyecto y control de secretos | M |
| S02 | RN04 | Credencial solo en memoria | S |
| S03 | RN07 | Cliente HTTP con timeout y recuperación conservadora | M |
| S04 | RF01 | Acceso con clave de laboratorio | S |
| S05 | RF02 | Catálogo con estados vacío y error | S |
| S06 | RF03 | Disponibilidad y actualización de cupos | S |
| S07 | RF04 | Formulario y confirmación de cantidad | S |
| S08 | RF05 | Creación idempotente y bloqueo de doble envío | L |
| S09 | RF06 | Comprobante para 201 y 200 | S |
| S10 | RF07 | Recuperación de operación incierta | L |
| S11 | RF08 | Consulta autorizada por UUID | M |
| S12 | RF09 | Mensajes y errores completos del recorrido | M |
| S13 | RF10 | Salida y limpieza de sesión | S |
| S14 | RF11 | Copia de identificador y actualización posterior | S |
| S15 | RN01 | Revisión integral de español y teclado | M |
| S16 | RN02 | Adaptación a móvil y escritorio | M |
| S17 | RN06 | Foco, anuncios y errores accesibles | M |
| S18 | RN05 | Contenedor y despliegue de laboratorio | L |
| S19 | RN08 | Recursos y medición de la topología usada | L |

Las entregas S01 a S09 son incrementos locales o de prueba; la creación de reservas no se expondrá a participantes hasta completar recuperación y salida segura, S10 y S13. No se presentará un prototipo con datos ficticios como aplicación integrada. La revisión del conjunto funcional para la demo se realiza tras S14; el cierre completo necesita los requisitos de calidad aplicables y el registro de pendientes de infraestructura.

## Detalle de cada sprint

### S01 RN03 Base del proyecto y control de secretos

Dependencias: aprobación G0 y autorización de S01. Requisito: no incluir claves en repositorio, bundle, URL ni registros. Tareas: crear frontend con React, TypeScript y Vite; fijar dependencias; definir estructura de pantallas y adaptador HTTP; preparar proxy de desarrollo /api; añadir ejemplos sin valores privados y reglas de exclusión; revisar registros y manejo de parámetros.

Entregable: proyecto compilable y guía de arranque sin credenciales incorporadas. Aceptación: compilar, inspeccionar bundle y configuración; verificar que una clave de prueba no aparece en assets, URL ni registros. Evidencia: PV14 inicial, revisión de diff y búsqueda dirigida de la credencial de prueba sin imprimirla. No se crea pantalla de acceso funcional todavía. Tamaño M.

### S02 RN04 Credencial solo en memoria

Dependencias: S01. Tareas: implementar SessionContext, ingreso temporal del token y limpieza de estado sensible; impedir persistencia en localStorage, sessionStorage o parámetros; definir reinicio tras recarga. El registro pendiente podrá guardar una huella y el payload, nunca el token.

Entregable: gestión local de credencial utilizable por el cliente HTTP. Aceptación: recargar elimina el token; inspección de storage no lo encuentra; los logs no lo imprimen. Evidencia: PV14 y prueba de recarga. La salida completa con advertencia se cierra en S13. Tamaño S.

### S03 RN07 Timeout y tratamiento conservador del envío

Dependencias: S01 y S02. Tareas: implementar cliente HTTP con timeout inicial configurable de 15 segundos; normalizar error y detail; separar lectura fallida de POST incierto; evitar reintento automático del POST; definir contrato de operación pendiente y respuestas inesperadas del proxy.

Entregable: cliente HTTP y clasificación de resultados para las pantallas posteriores. Aceptación: un timeout no se muestra como reserva rechazada; un POST no se repite automáticamente; HTML o cuerpo vacío no rompe la pantalla. Evidencia: pruebas dirigidas con respuestas controladas. PV08 con commit real se ejecutará en S10. Tamaño M.

### S04 RF01 Acceso al laboratorio

Dependencias: S02 y S03. Tareas: construir P01 con clave enmascarada; validar mediante GET /catalogo; manejar 200, 401 y fallo técnico; activar sesión local únicamente tras respuesta válida.

Entregable: acceso conectado a la API real. Aceptación: clave válida abre la sesión incluso con catálogo vacío; inválida no permite acceso; un fallo técnico no se presenta como clave incorrecta. Evidencia: PV01 y PV02, capturas y códigos HTTP sin secretos. Tamaño S.

### S05 RF02 Catálogo de eventos

Dependencias: S04. Tareas: construir P02 con tarjetas y campos reales; incorporar carga, events vacío y error de conexión; permitir actualización; conservar datos anteriores solo con aviso de desactualización.

Entregable: catálogo autenticado. Aceptación: lista eventos reales, diferencia vacío de error y no inventa cupos cuando falla la API. Evidencia: PV03 y parte aplicable de PV04 con fixtures explícitos y lectura real. Tamaño S.

### S06 RF03 Disponibilidad de un evento

Dependencias: S05. Tareas: consultar disponibilidad al seleccionar; mostrar momento de lectura y acción Actualizar; manejar 404 y cero cupos; explicar que la lectura no garantiza inventario.

Entregable: selección y disponibilidad conectadas. Aceptación: muestra id, capacity y available correctamente; cero cupos bloquea reserva desde esa vista; una actualización fallida marca el dato previo. Evidencia: PV03 y PV04. Tamaño S.

### S07 RF04 Cantidad y confirmación explícita

Dependencias: S06. Tareas: construir P03; validar cantidad entera entre 1 y 100; mostrar evento y unidades antes de confirmar; permitir volver antes de enviar; impedir envío de formatos ambiguos.

Entregable: formulario con revisión previa. Aceptación: bloquear 0, 101, decimales, texto y booleanos; aceptar 1 y 100 cuando proceda; no ejecutar POST sin confirmación. Evidencia: PV05 y recorrido manual. Tamaño S.

### S08 RF05 Creación idempotente

Dependencias: S03 y S07. Tareas: generar clave por intención; congelar event_id y quantity; guardar pendiente antes del POST; adjuntar headers; deshabilitar doble clic; no iniciar otra intención con pendiente; bloquear envío si no puede persistirse el registro.

Entregable: motor de creación operable en un entorno de pruebas. Aceptación: doble clic no crea dos intenciones; mismo cliente y clave producen un único efecto; cupos insuficientes no generan sobreventa. Evidencia: PV06, PV07 y revisión de inventario y outbox en base exclusiva. Una respuesta perdida permanece pendiente hasta S10; no liberar a participantes. Tamaño L.

### S09 RF06 Confirmación y repetición

Dependencias: S08. Tareas: construir P04; validar la respuesta; mostrar UUID, cantidad, estado y fecha; tratar 201 como creación y 200 como operación recuperada; retirar pendiente solo ante confirmación válida.

Entregable: comprobante consistente para respuestas nuevas y repetidas. Aceptación: repetir la operación muestra el mismo UUID; no se anuncia correo enviado; un fallo de lectura posterior no oculta la confirmación. Evidencia: PV06 y repetición controlada. Tamaño S.

### S10 RF07 Recuperación de una operación incierta

Dependencias: S08 y S09. Tareas: construir P06; recuperar registro tras recarga; solicitar misma credencial; comparar huella; reenviar clave y payload originales solo por acción explícita; manejar corrupción, bloqueo de storage y credencial diferente.

Entregable: recuperación de extremo a extremo. Aceptación: perder respuesta después del commit y recuperar devuelve el mismo UUID, un descuento y un outbox; otra credencial no dispara POST; nuevo fallo conserva el pendiente. Evidencia: PV08, PV09 y PV10 con intermediario que descarte la respuesta después de llegar al servidor. Tamaño L.

### S11 RF08 Consulta por identificador

Dependencias: S04 y S09. Tareas: construir P05; validar UUID; consultar GET /reservas/{id}; reutilizar comprobante; usar nombre del catálogo solo cuando exista; evitar cualquier supuesto de historial completo.

Entregable: consulta autorizada de una reserva. Aceptación: propietario ve sus datos; reserva ajena e inexistente devuelven mensaje genérico; UUID inválido no se envía. Evidencia: PV11 con dos identidades de laboratorio. Tamaño M.

### S12 RF09 Mensajes de error del recorrido

Dependencias: S10 y S11. Tareas: completar traducción de códigos de dominio y validación; distinguir agotamiento, identidad, datos inválidos, fallo temporal y operación incierta; conservar comprobante cuando falla actualizar cupos; cubrir respuestas no JSON.

Entregable: catálogo coherente de mensajes en P01 a P06. Aceptación: completar PV02, PV04, PV07, PV08, PV10 y PV11 en sus rutas; no exponer trazas, SQL ni secretos. Los errores esenciales ya deben funcionar en los sprints anteriores. Evidencia: matriz de mensajes con captura y causa. Tamaño M.

### S13 RF10 Salida y limpieza local

Dependencias: S02 y S10. Tareas: implementar Salir; advertir antes de borrar pendiente incierto; permitir cancelar salida; limpiar token, huella, registro, comprobante y estado de sesión; volver a P01.

Entregable: salida segura del contexto local. Aceptación: PV12 con y sin pendiente; explicar que salir no cancela una reserva ni revoca la clave del servidor. Evidencia: inspección de memoria lógica y storage, sin volcados de secretos. Tamaño S.

### S14 RF11 Copiar identificador y refrescar cupos

Dependencias: S06 y S09. Tareas: copiar UUID al portapapeles; ofrecer selección manual si falla; actualizar disponibilidad tras confirmar; conservar comprobante aunque falle esa lectura.

Entregable: cierre cómodo del recorrido de reserva. Aceptación: copia exacta del UUID, alternativa usable y actualización sin POST adicional. Evidencia: recorrido manual y parte aplicable de PV03 y PV06. Requisito deseable incluido; retirarlo requiere registrar el cambio de alcance. Tamaño S.

### S15 RN01 Español y teclado

Dependencias: S14. Tareas: revisar todas las pantallas, etiquetas e instrucciones; retirar textos técnicos innecesarios; comprobar tabulación, activación por teclado y mensajes claros. El español y las etiquetas se aplican desde las primeras pantallas.

Entregable: revisión integral de lenguaje e interacción por teclado. Aceptación: completar recorrido CU01 a CU06 sin ratón ni controles sin nombre. Evidencia: PV13 con lista de comprobación por pantalla. Tamaño M.

### S16 RN02 Adaptación de pantalla

Dependencias: S14. Tareas: ajustar rejilla, tarjetas, formularios y comprobante a 360 y 1280 píxeles; permitir que UUID y mensajes largos se ajusten; revisar zoom al 200 por ciento.

Entregable: vistas adaptables y capturas comparables. Aceptación: contenido legible y acciones accesibles sin desplazamiento horizontal en los anchos previstos. Evidencia: PV13 con dimensiones y navegador registrados. Tamaño M.

### S17 RN06 Foco y comunicación accesible

Dependencias: S12, S15 y S16. Tareas: gestionar foco tras navegación y validación; asociar errores a campos; anunciar estados mediante regiones accesibles; revisar contraste; comprobar con lector de pantalla.

Entregable: correcciones y evaluación de accesibilidad del recorrido. Aceptación: errores, espera y confirmación se perciben sin depender solo del color; foco visible y orden lógico. Evidencia: PV13 manual, herramienta utilizada y limitaciones. Si no hay lector disponible, esa comprobación queda pendiente y el requisito no se marca completo. Tamaño M.

### S18 RN05 Contenedor y despliegue de laboratorio

Dependencias: S01 a S17. Tareas: preparar imagen con servidor estático y proxy; escuchar en 8080; probar UID arbitrario y rutas temporales; integrar Compose con entrada local propuesta 8083; preparar Service y Deployment para kind y variante OpenShift; definir sondas del frontend y entrada HTTPS del clúster elegido.

Entregable: imagen, configuración y manual reproducible en Markdown y Word, con Mermaid actualizado si cambia la arquitectura. Aceptación: PV15 sobre Compose y entorno de clúster disponible; verificar recarga SPA, API desconocida, proxy y ejecución sin privilegios. Evidencia de admisión real requerida para afirmar compatibilidad OpenShift. Si falta el clúster, entregar preparación como parcial, sin cerrar su aceptación. Tamaño L.

### S19 RN08 Recursos y medición

Dependencias: S18 y entorno medible. Tareas: registrar topología, versiones, recursos, generador y datos; medir CPU y memoria; proponer requests y limits con justificación; ejecutar carga definida sin mezclar percentiles de repeticiones; documentar límites de interpretación.

Entregable: configuración de recursos y reporte de medición con evidencias. Aceptación: PV16 reproducible en la topología registrada; distinguir frontend, API y base; no declarar capacidad máxima ni HPA sin pruebas específicas. Si no hay entorno, el sprint queda pendiente o parcial y se documenta el bloqueo. Tamaño L.

## Criterio de terminación de cada sprint

Se debe entregar código o configuración correspondiente al requisito, revisión del diff, pruebas necesarias ejecutadas con resultado y evidencia, fuente Markdown y Word breve de la entrega, y diagramas editables actualizados cuando cambien. Cada informe identifica sprint, requisito, comandos, entorno, fallos, pendientes y riesgo residual. No se copia un éxito histórico como resultado nuevo.

Completado técnicamente significa que se verificaron sus criterios; no significa aprobado por el usuario ni publicado. Los estados serán Planificado, Autorizado para trabajo local, En desarrollo, En revisión, Aprobado para publicar, Publicado o Parcial por dependencia. Solo un push exitoso permite usar Publicado.

## Alcance propuesto del primer commit y push

Actualmente la rama local es master y origin apunta a `https://github.com/wallas2022/Kubernet-Open-shift-Seminario.git`, según consulta local de configuración, sin contacto remoto. Hay cambios locales de otras fases que no pertenecen a esta entrega. No se usará git add de todo el repositorio.

La primera publicación propuesta comprende las fuentes DOC-10-01 a DOC-10-06, el estado de revisión, README de Fase 10, los dos Word DOC-10-00 y DOC-10-06, los diez Mermaid de Fase 10 y las herramientas documentales necesarias para reproducirlos. El README de raíz se incluirá solo con el cambio de enlace a esta fase. AGENTS.md se actualizará únicamente con el acuerdo condicional de publicación. Los PNG, PDF y logs de revisión se mantienen locales y se excluyen de este commit. Fase 09, manifiestos OpenShift y demás cambios preexistentes quedan fuera del alcance de publicación propuesto.

Antes de publicar se mostrará el diff staged definitivo. Si la raíz contiene cambios mezclados, se seleccionarán los fragmentos autorizados. La rama y destino final se confirmarán con la aprobación; no se creará ni actualizará una rama remota por inferencia. Mensaje propuesto: `docs: planificar frontend por requisito y controles de aprobacion`.

## Aprobación pendiente

Se solicita revisar el plan de 19 sprints y autorizar, si procede, commit y push exclusivamente del paquete documental definido. Esa aprobación no inicia automáticamente S01 ni publica código del frontend. Al concluir cada entrega de código se solicitará una nueva aprobación para su commit y push, conforme a G2.
