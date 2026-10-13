# Guía del instructor para el seminario Kubernetes OKD y OpenShift

DOC-07-01 · Versión 1.0 · Walter Rosales · 13 de octubre de 2026

Esta guía organiza una sesión de tres horas con explicación, demostración, ejercicios y evaluación. Utiliza la investigación DOC-01-01, los manuales DOC-02-01 a DOC-05-01 y la presentación DOC-06-01. El objetivo es que los participantes puedan justificar una plataforma, explicar una reserva concurrente y evaluar una medición sin atribuirle capacidades que no demuestra.

La aplicación y el piloto local cuentan con evidencia de ejecución. El despliegue en Kubernetes, HPA, TLS y alta disponibilidad siguen pendientes. Si el entorno no está disponible, la sesión utiliza los archivos de evidencia y se registra como modalidad documental. Esta guía no declara ejecutada una nueva práctica ni aprobada otra fase.

## Índice

## 1 Resultados de aprendizaje y requisitos

Al terminar, el participante debe explicar cómo se relacionan estado deseado, controlador, Pod y Service; diferenciar Kubernetes, OKD y OpenShift; identificar dónde se garantiza la integridad del inventario; ejecutar o interpretar una secuencia idempotente; y distinguir corrección funcional, rendimiento y disponibilidad.

Se requiere manejo básico de terminal, HTTP, contenedores y bases de datos. Quien no tenga equipo puede trabajar en pareja y analizar la evidencia. El instructor asigna una persona para ejecutar y otra para registrar observaciones; intercambian roles en el segundo ejercicio. Una práctica documental puede evaluar razonamiento, pero no acredita destreza de despliegue.

Antes de la sesión, distribuir DOC-01-01 y pedir la lectura de conceptos fundamentales y comparación. Compartir la presentación y esta guía. Las respuestas del capítulo 8 son para el instructor; entregar al alumno solo las consignas del capítulo 7 y la hoja de trabajo incluida en el paquete.

## 2 Agenda de tres horas

| Minutos | Actividad | Evidencia del participante |
| --- | --- | --- |
| 0 a 10 | Encuadre y diagnóstico inicial | Respuesta breve sobre concurrencia |
| 10 a 45 | Fundamentos y comparación de plataformas | Mapa de responsabilidades |
| 45 a 65 | Arquitectura y consistencia de reservas | Explicación de una transacción |
| 65 a 75 | Pausa | Sin evaluación |
| 75 a 105 | Demostración guiada | Registro de estados y respuestas |
| 105 a 140 | Ejercicios en parejas | Respuestas con evidencia |
| 140 a 165 | Evaluación individual | Hoja de evaluación |
| 165 a 180 | Retroalimentación y cierre | Pendientes identificados |

Usar las diapositivas 1 a 9 para fundamentos, 10 a 13 para arquitectura y verificación, 14 a 18 para medición y límites, y 19 a 20 para demostración y referencias. La presentación por sí sola ocupa aproximadamente 35 a 45 minutos; esta agenda agrega explicación, participación y prácticas.

Si solo hay 90 minutos, reservar 10 para encuadre, 25 para fundamentos, 25 para demostración, 20 para los ejercicios 1 y 3, y 10 para discusión. Registrar la sesión abreviada; no afirmar que se completó la evaluación integral.

## 3 Preparación del instructor

Confirmar el acceso a los documentos y a las evidencias antes de la sesión. Revisar el estado de Docker siguiendo DOC-03-01. Si no está operativo, elegir desde el inicio la modalidad documental; evitar dedicar la clase a una instalación imprevista. El inventario de equipos continúa pendiente, por lo que las recomendaciones de memoria no deben presentarse como recursos disponibles.

Para la modalidad práctica, seguir la preparación y puesta en marcha de DOC-04-01, capítulo 6. Utilizar una instancia de laboratorio y credenciales guardadas fuera del repositorio. El archivo client-access.json generado contiene api_key y client_id. Cargar solo api_key en memoria para la demostración y no mostrar su contenido en pantalla, capturas o entregables.

Verificar GET /health/live y GET /health/ready antes de reunir al grupo. Consultar disponibilidad y anotar el valor inicial real; la inicialización no restablece datos existentes. La demostración reserva una unidad y no incorpora cancelación. Usar un entorno de práctica propio y no reiniciar volúmenes ni inventario para recuperar una cifra esperada.

Preparar DOC-04-01-resultados.md y evidencias/carga-piloto de la Fase 05. Abrir DOC-05-01 junto a los JSON de resultados para poder relacionar cada cifra con un ensayo. Llevar anotado si la sesión será práctica, documental o mixta y qué actividades quedan sin ejecutar.

| Control previo | Condición de inicio | Alternativa |
| --- | --- | --- |
| Documentos y presentación | Archivos accesibles | Copia local del paquete |
| API y base de laboratorio | Sonda ready devuelve 200 | Evidencia guardada |
| Credencial de práctica | Carga privada en memoria | Interpretación del contrato |
| Datos de medición | Ensayo y archivo identificados | Tablas de DOC-05-01 |
| Clúster Kubernetes | Validación previa documentada | Análisis de manifiestos sin ejecución |

## 4 Explicación de conceptos y arquitectura

Plantear primero una campaña de reservas: muchas personas pueden leer el último cupo al mismo tiempo. Preguntar qué ocurre si cada proceso decide vender basándose únicamente en esa lectura. Conectar las respuestas con la actualización condicionada en PostgreSQL y el alcance de una transacción.

Explicar Kubernetes a partir del estado deseado. Un Deployment expresa réplicas y actualizaciones; los controladores intentan reconciliar el estado observado. La creación de réplicas depende de recursos y condiciones del clúster. Un Service proporciona una vía estable para llegar a los Pods seleccionados. Estos componentes no reemplazan las restricciones de la base de datos.

Comparar las plataformas con criterios de integración, soporte, ciclo de vida y personal. Kubernetes permite elegir componentes; OKD integra una distribución comunitaria; OpenShift ofrece una plataforma empresarial con soporte según suscripción. La recomendación debe responder a requisitos concretos y contrastarse con la investigación oficial, sin presentar una opción como ganadora universal.

Recorrer el diagrama de arquitectura de DOC-06-01: cliente, API, PostgreSQL y procesador outbox. La transacción confirma inventario, reserva y evento juntos. El procesador registra una recepción simulada en PostgreSQL. El laboratorio no demuestra entrega exactamente una vez a un servicio externo.

Para discutir escalamiento, relacionar cada réplica de API con su pool de conexiones. Con seis procesos y POOL_MAX igual a diez, el máximo configurado agregado de esos pools sería sesenta conexiones, antes de considerar procesadores, administración y otros clientes. Es un cálculo de configuración, no una medición de conexiones abiertas ni una recomendación para el servidor real.

## 5 Demostración paso a paso

### Preparación de la consola

Los siguientes comandos son un procedimiento para una API local de laboratorio ya preparada. No se ejecutaron durante la elaboración de esta guía. La variable apiKey se carga desde el archivo privado generado con anterioridad. La ruta propuesta corresponde al directorio externo utilizado en los manuales; si es diferente, ajustarla al archivo realmente creado.

```powershell
$demoAccessPath = Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\reservas-secrets\client-access.json'
$apiKey = (Get-Content -LiteralPath $demoAccessPath -Raw | ConvertFrom-Json).api_key
$baseUrl = 'http://127.0.0.1:8082'
$headers = @{ 'X-Api-Key' = $apiKey }
$eventId = '00000000-0000-0000-0000-000000000001'
Invoke-RestMethod -Uri "$baseUrl/health/ready"
Invoke-RestMethod -Uri "$baseUrl/catalogo" -Headers $headers
$before = Invoke-RestMethod -Uri "$baseUrl/eventos/$eventId/disponibilidad" -Headers $headers
$before
```

Anotar disponibilidad inicial. El evento indicado es el evento de demostración de la semilla. Si no aparece en catálogo o no tiene cupo, detener esta práctica y revisar la preparación. No sustituir un evento desconocido ni modificar los datos para forzar un resultado.

### Reserva y repetición

```powershell
$demoKey = 'clase-' + [guid]::NewGuid().ToString('N')
$reserveHeaders = @{ 'X-Api-Key' = $apiKey; 'Idempotency-Key' = $demoKey }
$body = @{ event_id = $eventId; quantity = 1 } | ConvertTo-Json
$first = Invoke-WebRequest -Method Post -Uri "$baseUrl/reservas" -Headers $reserveHeaders -ContentType 'application/json' -Body $body
$repeat = Invoke-WebRequest -Method Post -Uri "$baseUrl/reservas" -Headers $reserveHeaders -ContentType 'application/json' -Body $body
$first.StatusCode
$repeat.StatusCode
$first.Content
$repeat.Content
$after = Invoke-RestMethod -Uri "$baseUrl/eventos/$eventId/disponibilidad" -Headers $headers
$after
```

La primera petición debería devolver 201 y la repetición 200, con la misma reserva. Si no hubo operaciones de otros clientes, la disponibilidad debería bajar solo una unidad. Registrar respuestas observadas y compararlas con el contrato. Ante timeout después del envío, conservar la clave y el cuerpo; generar una clave nueva podría crear una segunda intención de compra.

### Conflicto y observación

Reutilizar la misma clave con quantity igual a dos. El contrato espera 409 con idempotency_conflict y sin una reserva nueva. Invoke-WebRequest puede lanzar una excepción ante un estado no exitoso: registrar el estado y cuerpo de esa respuesta desde la herramienta HTTP disponible. No interpretar la excepción de consola como prueba suficiente del código de negocio.

Consultar /metrics y relacionar las rutas y estados con las peticiones. Una métrica de API no acredita por sí sola que el evento outbox se procesó; contrastar con el procedimiento y evidencia de DOC-04-01. Al finalizar, retirar variables que contienen credenciales de la consola. No publicar el archivo privado ni una captura de sus valores.

En modalidad documental, seguir la misma secuencia leyendo el contrato y la evidencia HTTP guardada de la Fase 04. Escribir “interpretado” en lugar de “ejecutado” en la hoja. Mantener una columna separada para resultado esperado y observado.

## 6 Interpretación del piloto de carga

Pedir al grupo que encuentre las tres repeticiones mixtas de DOC-05-01. Cada una usa cincuenta llegadas por segundo durante treinta segundos, un esquema independiente y mil unidades iniciales. Los ensayos confirmaron setenta y cinco reservas cada uno y terminaron con novecientas veinticinco unidades disponibles.

| Ensayo | Solicitudes | p95 reservas ms | Reservas confirmadas |
| --- | --- | --- | --- |
| Mixto 1 | 1500 | 34.92 | 75 |
| Mixto 2 | 1501 | 29.54 | 75 |
| Mixto 3 | 1500 | 42.41 | 75 |

El ensayo de lectura completó 2749 solicitudes sin crear reservas. El conjunto suma 7250 solicitudes y 225 reservas repartidas en cuatro ensayos. Esa suma no representa una única campaña ni un único inventario. Los percentiles corresponden a cada ejecución; promediarlos no produce el p95 global.

Todas las ventanas reportaron cero fallos técnicos y cero iteraciones descartadas. Explicar por qué un sold_out esperado es un resultado de negocio y debe distinguirse de una falla técnica. Aun así, una campaña empresarial puede tener objetivos de éxito de reservas que requieran otro indicador.

Solicitar tres límites de la evidencia: generador y aplicación comparten anfitrión, las ventanas son cortas y el acceso es HTTP local. No se midió p99 ni capacidad máxima. No se ejecutaron HPA, TLS o recuperación de nodos. La siguiente medición debe registrar topología, recursos, versiones, mezcla, duración y criterio de parada antes de comparar resultados.

## 7 Ejercicios y evaluación individual

### Ejercicio 1 Decisión de plataforma

Una organización necesita soporte empresarial y una plataforma integrada, pero todavía no ha confirmado presupuesto ni competencias operativas. Proponer una opción inicial, dos condiciones de validación y un riesgo. Justificar con DOC-01-01. Tiempo sugerido: ocho minutos.

### Ejercicio 2 Reintento y cupo

Un cliente reserva dos unidades. Pierde la respuesta y reintenta con la misma clave y cuerpo. Luego cambia la cantidad a tres sin cambiar la clave. Explicar los resultados esperados, la reducción total de inventario y qué evidencia permitiría comprobarlo. Tiempo sugerido: diez minutos. Puede resolverse con trazas o práctica controlada; no afirmar ejecución si solo se razonó.

### Ejercicio 3 Evidencia y rendimiento

Calcular solicitudes y reservas totales de los cuatro ensayos, y explicar por qué no se puede afirmar soporte para diez mil clientes simultáneos. Indicar qué dato faltaría para calcular p99 y por qué promediar p95 no lo reemplaza. Tiempo sugerido: ocho minutos.

### Ejercicio 4 Operación y recuperación

Analizar los manifiestos de Fase 05 sin aplicarlos. Indicar qué necesita el HPA para observar CPU, cómo influye el pool por réplica y qué implica tener una sola instancia de PostgreSQL. Proponer un ensayo de recuperación con criterio de éxito y registrar que está pendiente. Tiempo sugerido: nueve minutos.

### Evaluación individual

Responder sin copiar las soluciones: 1) explicar reconciliación y una causa de réplicas pendientes; 2) justificar una plataforma para el escenario del ejercicio 1; 3) resolver el ejercicio 2; 4) interpretar una tabla del piloto con sus límites; 5) proponer una validación pendiente con evidencia y criterio de éxito. Disponer de veinticinco minutos. La rúbrica siguiente asigna veinte puntos por pregunta.

## 8 Respuestas y rúbrica del instructor

Ejercicio 1: OpenShift es una candidata razonable por integración y soporte requerido. Verificar costo total y suscripción, compatibilidad de cargas y capacidad operativa. El soporte no elimina la necesidad de personal capacitado. Aceptar otra propuesta si demuestra cómo satisface el requisito de soporte y fundamenta sus supuestos.

Ejercicio 2: la primera reserva exitosa recibe 201, el reintento equivalente recibe 200 con la misma reserva y el cambio de cantidad recibe 409 idempotency_conflict. Con inventario suficiente y sin otras operaciones, se descuentan dos unidades. Verificar identificador, cuerpo, estado, disponibilidad y unicidad en los datos; una lectura aislada no basta si existen otros clientes activos.

Ejercicio 3: 7250 solicitudes y 225 reservas; el inventario se reinició mediante esquemas independientes por ensayo. Una tasa de llegadas no equivale a clientes simultáneos y las pruebas locales no demuestran la capacidad objetivo. Para p99 se necesita una distribución o salida que lo permita; los p95 por ensayo no contienen esa información.

Ejercicio 4: HPA necesita una fuente de métricas de recursos y requests de CPU adecuados para calcular utilización. El máximo de pools crece con el número de procesos; hay que considerar el presupuesto total de conexiones. PostgreSQL de una instancia es un punto de indisponibilidad. Un ensayo posible es interrumpir un Pod de API de laboratorio y verificar continuidad, reconciliación y ausencia de duplicados con carga controlada; es una propuesta, no un resultado.

| Pregunta | Puntos máximos | Criterio de puntuación |
| --- | --- | --- |
| 1 Reconciliación | 20 | 10 por mecanismo y 10 por causa de pendiente |
| 2 Plataforma | 20 | 10 por requisito y 10 por condiciones y riesgo |
| 3 Idempotencia | 20 | 10 por respuestas y 10 por integridad y evidencia |
| 4 Medición | 20 | 10 por lectura correcta y 10 por límites |
| 5 Validación pendiente | 20 | 10 por ensayo viable y 10 por criterio verificable |

En cada componente de diez puntos, asignar diez si es correcto y fundamentado, cinco si es parcial y cero si está ausente o contradice el caso. Umbral didáctico propuesto: setenta puntos sobre cien. Si el participante confunde una hipótesis con un resultado medido, exigir una corrección antes de acreditar el objetivo correspondiente, aunque supere el total. Este criterio no constituye certificación oficial de ninguna plataforma.

## 9 Registro de sesión y contingencias

Completar fecha, instructor, asistentes, modalidad, versiones y archivos utilizados. Registrar cada actividad como ejecutada, interpretada, omitida o pendiente. Adjuntar solo evidencia sin credenciales y relacionarla con su ejercicio. La hoja del participante permite distinguir lo esperado de lo observado y documentar diferencias.

Si la API no responde, revisar readiness y el procedimiento de DOC-04-01 antes de repetir reservas. Si una petición queda incierta, conservar su clave. Si falla Docker, continuar con evidencia y registrar la práctica pendiente. Si no hay métricas de CPU, el análisis HPA sigue siendo conceptual. Si el resultado difiere del contrato, guardar la observación sin corregir inventario ni declarar éxito.

Al cerrar, recoger una conclusión por participante y asignar un pendiente verificable. El siguiente hito técnico consiste en disponer del motor de contenedores, validar el primer despliegue y repetir pruebas en Kubernetes. Esta guía no cambia ese estado ni realiza operaciones remotas del repositorio.

## 10 Materiales y trazabilidad

DOC-01-01 contiene investigación y referencias oficiales; DOC-02-01 propone la infraestructura; DOC-03-01 describe instalación; DOC-04-01 contiene contratos y evidencia funcional; DOC-05-01 contiene mediciones piloto y preparación de despliegue; DOC-06-01 aporta diapositivas y notas. Las cifras de esta guía proceden de DOC-04-01 y DOC-05-01, no de una ejecución nueva.

El paquete incluye esta fuente Markdown, el borrador Word de formato acordado, hoja de trabajo del participante y diagrama Mermaid del recorrido didáctico. El Word conserva Times New Roman 12 pt, texto negro, tablas con encabezado negro y letras blancas e índice actualizable. Su paginación y revisión visual requieren un renderizador Word disponible; el estado se conserva junto a los archivos.
