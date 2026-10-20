# Entrega parcial S17 Foco anuncios y contraste

## Resultado y estado del requisito

S17 implementa las correcciones de RN06 y deja evidencia automática del recorrido accesible. La entrega es parcial: la validación manual con lector de pantalla no se completó y RN06 permanece abierto. Se entrega un entorno ficticio listo para esa revisión y una guía con observaciones pendientes. Sin commit ni push; S18 no iniciado.

## Correcciones implementadas

Al regresar al acceso, el foco pasa al título del formulario; cuando existe un error de entrada, va al campo correspondiente. Los avisos de acceso caducado se asocian al título y al campo de clave. El error de una consulta HTTP devuelve el foco al identificador después de habilitar el campo. Si al terminar una actualización el foco había quedado en el cuerpo de la página, vuelve al título; no se desplaza si el usuario conserva foco en otro elemento.

Los campos de clave, cantidad e identificador enlazan sus errores con aria-describedby y aria-errormessage. El comprobante asocia su mensaje de creación o recuperación con el encabezado que recibe foco. Los avisos y confirmaciones incluyen texto; no dependen exclusivamente del color.

Los mensajes de espera de acceso, catálogo, disponibilidad y consulta quedan fuera de sus contenedores ocupados. Envío y recuperación mantienen anuncios accesibles sin que un ancestro ocupado los difiera. Se conservan roles de estado y alerta y se marcan mensajes atómicos. La advertencia de salida conserva su descripción, foco inicial en Cancelar y regreso a Salir con Escape; sigue siendo no modal.

## Contraste medido

El pie pasó de 3,886 a 5,753 de contraste y la numeración del recorrido de 4,135 a 5,591. Son mediciones sobre sus fondos observados, no estimaciones visuales. Se aplicó un mínimo de 4,5 para texto normal y 3 para texto grande, bordes e indicadores revisados. La referencia de texto es W3C: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html.

La auditoría recorrió 29 estados, con 847 mediciones de texto y 37 de campos o foco. Son observaciones repetidas durante el recorrido, no elementos únicos. Se excluyen controles deshabilitados y decoración. Para el anillo de foco con separación positiva se mide el fondo exterior, donde realmente se dibuja, en lugar del relleno del botón. Esta corrección del medidor resolvió un falso positivo del ensayo.

## Verificación ejecutada

| Verificación | Resultado | Alcance |
| --- | --- | --- |
| Recorrido por teclado | 147 comprobaciones | CU01 a CU06 y 49 desplazamientos |
| Foco y anuncios con espera controlada | 25 comprobaciones | Descripciones, errores y estados del árbol accesible |
| Regresiones | 493 y 82 comprobaciones | Adaptación S16 y mensajes S12 |
| Base del frontend | 52 pruebas y compilación | Node, TypeScript y bundle de producción |
| Secretos | 12 controles | Verificación del bundle |
| Entorno de revisión | 10 controles | Simulador volátil, recuperación y limpieza final |

Las pruebas usan Chromium 145.0.7632.6 y respuestas de negocio controladas. Se inspeccionan referencias accesibles, roles, regiones de estado, errores vinculados y foco visible. La prueba de anuncios retiene respuestas para observar esperas antes de liberarlas. El árbol de Chromium expone los estados como live polite; eso no prueba qué pronuncia un lector.

Los registros están en evidencias/frontend-s17, con capturas de foco y error asociado. accessibility-controlled.json y announcements-controlled.json conservan las comprobaciones finales. Los informes por estado registran colores, relaciones y propiedades accesibles sin volcar la clave del acceso. Los diagnósticos iniciales se separan de los éxitos finales.

## Revisión con lector pendiente

Se comprobó la presencia del ejecutable de Narrador en Windows. El intento de control del Narrador se interrumpió mediante Escape; no se obtuvo una transcripción ni se ejecutó el recorrido con lector. No se presenta la inspección automática como lectura humana ni se afirma que no exista lector instalado.

La guía DOC-S17-02-validacion-lector-pendiente.md identifica las observaciones por cada caso de uso y los datos que debe registrar quien revise: fecha, Windows, navegador, lector, versión, voz y resultado. El entorno http://localhost:5189 sirve esta versión del frontend y respuestas ficticias; acepta la clave pública S17-LECTOR. Sus datos son volátiles y no conecta a la API ni a PostgreSQL reales. La opción lose-next permite revisar un resultado incierto y su recuperación; los controles de preparación dejaron el simulador vacío.

La planificación exige comprobar con lector de pantalla para cerrar S17. Por tanto, las correcciones están listas para revisión, pero la aceptación integral de RN06 queda pendiente. No se acredita conformidad WCAG, lectura oral efectiva, todos los navegadores, nuevas reservas reales ni despliegue en clúster. Se conservan fuente Markdown, Word y Mermaid editable, con el formato documental acordado.
