# Respaldo y restauración de la aplicación de reservas

DOC-08-01 · Versión 1.0 · Seminario Kubernetes OKD y OpenShift · 13 de octubre de 2026

Se ejecutó un ensayo real de respaldo lógico y restauración con PostgreSQL 18.3 y datos ficticios. La base restaurada conservó las diez reservas, el inventario, las claves idempotentes y los eventos incluidos en el respaldo. El procesador continuó desde seis eventos pendientes sin volver a registrar las cuatro recepciones ya procesadas.

El resultado corresponde a dos bases temporales de un servidor local y acceso directo mediante la capa Store de la aplicación. No se ejecutó HTTP, Docker, Kubernetes, HPA ni recuperación de un nodo. La copia no contiene una reserva posterior al respaldo: este ensayo muestra recuperación al estado respaldado y no recuperación a un instante posterior.

## Índice

## 1 Objetivo y límites

El objetivo fue comprobar que un respaldo puede restaurarse en una base nueva y que la aplicación reconoce sus datos sin reinicializar el inventario. La comprobación incluyó igualdad de filas, conservación de un reintento, reanudación del outbox y creación de una reserva nueva.

Se utilizó una capacidad de cien unidades, un evento y un cliente ficticio. Diez reservas consumieron cantidades de uno a diez, equivalentes a cincuenta y cinco unidades. Cuatro eventos se procesaron antes del respaldo y seis permanecieron pendientes. No hubo carga concurrente durante el respaldo ni cambios de esquema.

Este ejercicio complementa las pruebas funcionales y de carga de DOC-04-01 y DOC-05-01. No acredita una política de copias de producción, protección fuera del equipo, permisos de servicio, cifrado, retención, réplica ni recuperación ante pérdida del anfitrión. Tampoco mide el tiempo total de recuperación del servicio.

## 2 Método de respaldo

Se utilizó pg_dump en formato custom y pg_restore para reconstruir la base destino. El formato permite restaurar desde un archivo de respaldo. pg_dump trabaja sobre una base; los objetos globales requieren un tratamiento separado. En este laboratorio no se intentó restaurar roles ni permisos originales. [R1, R2]

La restauración utilizó --exit-on-error, --no-owner y --no-acl. Así, un error impide continuar normalmente y no se reproducen propietarios ni privilegios de origen. Estas opciones sirven al ensayo aislado; no reemplazan el diseño de permisos de una recuperación real. [R2]

El programa crea dos bases con nombres aleatorios a partir de template0. La base recibida mediante LAB_DATABASE_URL se usa solo para administrar esas bases nuevas; nunca se restaura sobre ella. Al finalizar se eliminan únicamente las bases creadas por esa ejecución. No se utiliza --clean ni un nombre de base elegido por el participante.

## 3 Secuencia del ensayo

1. Iniciar el PostgreSQL temporal de trabajo en loopback y crear bases origen y destino nuevas.
2. Crear el esquema recovery e inicializar un evento de cien unidades.
3. Crear diez reservas y procesar cuatro eventos outbox.
4. Obtener una instantánea de filas y exportar origen a formato custom.
5. Crear en origen otra reserva de tres unidades, posterior al respaldo.
6. Restaurar el archivo en destino vacío y comparar con la instantánea anterior.
7. Repetir una reserva existente con la misma clave y cantidad.
8. Procesar los seis eventos pendientes, repetir el procesamiento y crear una nueva reserva de dos unidades.
9. Guardar evidencia y retirar las dos bases temporales y el servidor de trabajo.

La comparación serializa las filas ordenadas de events, reservations, outbox y notification_deliveries y calcula SHA256. La igualdad incluye identificadores, claves idempotentes, cantidades, estados, contenido JSON y marcas de tiempo presentes en esas tablas. Se verifica además la fórmula capacidad igual a disponible más cantidades confirmadas. La comparación no abarca catálogos internos, roles ni todo el esquema de objetos PostgreSQL.

## 4 Resultados medidos

| Estado | Reservas | Disponible | Cantidad confirmada | Outbox pendiente |
| --- | --- | --- | --- | --- |
| Antes del respaldo | 10 | 45 | 55 | 6 |
| Origen tras reserva posterior | 11 | 42 | 58 | 7 |
| Destino restaurado | 10 | 45 | 55 | 6 |
| Destino tras procesar pendientes | 10 | 45 | 55 | 0 |
| Destino tras nueva reserva | 11 | 43 | 57 | 1 |

La igualdad de filas entre el estado respaldado y el restaurado pasó. Su hash es 530ac22f246ef32441ac650a309329c651b8a75c76e971bbe4364e4336cae05d. El archivo custom midió 10011 bytes. SHA256 del respaldo: 756cd3b9d02ec554a0207ec9437e1d856175d34837d58f600f351fd06ab98140.

El comando de respaldo tardó 1.9634 segundos y el comando de restauración 1.3447 segundos en esta ejecución. Son duraciones locales de esos comandos sobre una base diminuta; excluyen detección, preparación, validación, cambio de conexiones y restablecimiento del servicio. No deben comunicarse como RTO ni extrapolarse a volúmenes empresariales.

El reintento devolvió la misma reserva y no alteró la instantánea restaurada. El procesador consumió seis eventos y la segunda pasada consumió cero; las recepciones simuladas pasaron de cuatro a diez. La nueva reserva consumió dos unidades y dejó un nuevo evento pendiente, tal como se esperaba antes de otra pasada del procesador. No se afirma que el estado final tenga cero pendientes.

## 5 Interpretación de recuperación y pérdida de datos

La reserva posterior al respaldo se conservó en origen y quedó ausente en destino. Es el comportamiento esperado de esta copia: lo confirmado después de su estado consistente no se incorpora automáticamente a la recuperación.

El RPO expresa la pérdida de datos tolerable, y el RTO el tiempo tolerable para recuperar el servicio. Este ensayo no fija ni acredita esos objetivos empresariales. Para evaluarlos habría que acordarlos, controlar la frecuencia y protección de copias, registrar el instante de falla y medir hasta que el servicio recupere su operación validada.

La recuperación a un instante requeriría una estrategia adicional basada en respaldos apropiados y conservación de WAL. No se configuró en este ejercicio. PostgreSQL describe esa estrategia como distinta del respaldo lógico utilizado aquí. [R3]

La deduplicación observada corresponde a notification_deliveries dentro de la misma base. Un receptor externo podría haber recibido mensajes después del estado restaurado; habría que reconciliar ambos sistemas. El resultado no demuestra entrega exactamente una vez a proveedores externos.

## 6 Reproducción del ejercicio

El programa pruebas/resiliencia/recovery.py requiere las dependencias de la aplicación, su paquete reservas en PYTHONPATH y herramientas PostgreSQL compatibles. El servidor debe estar disponible en 127.0.0.1 y la cuenta de laboratorio necesita permiso para crear y retirar bases propias. No usar cuentas ni datos de producción. El script no instala ni inicia PostgreSQL.

Desde la raíz local del repositorio, con un entorno Python que ya tenga las dependencias de aplicacion instaladas:

```powershell
$env:PYTHONPATH = Join-Path (Get-Location) 'aplicacion'
$env:LAB_DATABASE_URL = 'postgresql://seminario_test@127.0.0.1:55439/postgres'
$pgBin = 'C:\ruta\postgresql\bin'
$recoveryEvidence = Join-Path $env:LOCALAPPDATA ('SeminarioKubernetes\recovery-' + [guid]::NewGuid().ToString('N'))
python .\pruebas\resiliencia\recovery.py --pg-bin $pgBin --evidence-dir $recoveryEvidence
```

La ruta de herramientas es un marcador que debe ajustarse. La cuenta y puerto del ejemplo corresponden al servidor temporal del ensayo y no se crean con ese comando. Si se requiere contraseña, proporcionar un mecanismo privado de autenticación local; no incrustarla en el documento ni publicar variables. El directorio de evidencia debe ser nuevo. El programa conserva allí el respaldo con datos ficticios y result.json.

La prueba ejecutada en este trabajo utilizó un lanzador interno para iniciar y detener el servidor temporal, y cargó el mismo programa de ensayo en ese proceso. El comando de reproducción presupone un servidor previamente iniciado; no se afirma haber probado cada instalación de los participantes.

Ante un error, no aplicar la copia sobre la base original ni eliminar otros datos para hacer pasar la prueba. Revisar herramientas, permisos, espacio y conectividad. La limpieza de bases utiliza la lista de nombres creados durante esa ejecución. Una interrupción abrupta del sistema puede impedirla y requiere revisión del entorno de laboratorio.

## 7 Criterios de aceptación y pendientes

| Comprobación | Criterio | Resultado de este ensayo |
| --- | --- | --- |
| Restauración | pg_restore termina sin errores | Cumplido |
| Datos | Filas restauradas iguales al estado respaldado | Cumplido |
| Inventario | Capacidad igual a disponible más confirmado | Cumplido |
| Idempotencia | Reintento sin nueva reserva ni descuento | Cumplido |
| Outbox | Seis pendientes procesados y segunda pasada cero | Cumplido |
| Continuidad de escritura | Nueva reserva de dos unidades | Cumplido |
| Limpieza | Bases temporales retiradas | Cumplido |

El siguiente ensayo debe incluir conexión HTTP de la API restaurada, recuperación sobre infraestructura separada y registro del tiempo completo de servicio. En Kubernetes quedan pendientes persistencia, interrupción de un Pod y recuperación observada. Una copia local no protege frente a pérdida del equipo que aloja origen y archivo.

Antes de considerar una política empresarial, definir retención, ubicación separada, cifrado, control de acceso, responsables, frecuencia de simulacros y reconciliación externa. Esos aspectos son decisiones pendientes, no controles implantados por este documento.

## 8 Evidencia y referencias

La evidencia resumida se guarda en evidencias/recuperacion-local/result.json y un manifiesto de hashes identifica el programa y los archivos de aplicación utilizados. El respaldo sintético permanece en el directorio privado de trabajo y no forma parte del paquete del repositorio. El archivo JSON permite revisar conteos, hashes, tiempos y resultados lógicos sin incluir claves API ni cadena de conexión.

R1. PostgreSQL 18, pg_dump, consulta del 13 de octubre de 2026. https://www.postgresql.org/docs/18/app-pgdump.html

R2. PostgreSQL 18, pg_restore, consulta del 13 de octubre de 2026. https://www.postgresql.org/docs/18/app-pgrestore.html

R3. PostgreSQL 18, Continuous Archiving and Point in Time Recovery. https://www.postgresql.org/docs/18/continuous-archiving.html

Material interno: DOC-04-01, DOC-05-01, aplicacion/reservas/store.py y pruebas/resiliencia/recovery.py. Los estados de este informe proceden de una ejecución nueva; las pruebas Kubernetes continúan pendientes. El Word acompaña la fuente con el formato acordado; su revisión visual y paginación quedan pendientes si el renderizador no está disponible.
