# Guion de la presentación del seminario Kubernetes OKD y OpenShift

DOC-06-01 · Walter Rosales · 13 de octubre de 2026

Este guion acompaña 20 diapositivas y explica conceptos, decisiones de arquitectura y resultados del piloto local. La validación Kubernetes y HPA permanece pendiente.

## Índice

Duración sugerida: 35–45 minutos más demostración.

## 1 Kubernetes, OKD y OpenShift

- Seminario · Walter Rosales
- Fundamentos, arquitectura y caso empresarial de reservas
- DOC-06-01 · 13 de octubre de 2026

**Guion y fuentes:** Presentación de 35–45 minutos más demostración. Los datos medidos corresponden a un piloto local; el despliegue Kubernetes permanece pendiente.

## 2 Objetivos del seminario

- Comprender el modelo declarativo y la reconciliación.
- Comparar Kubernetes, OKD y Red Hat OpenShift.
- Diseñar reservas concurrentes sin sobreventa.
- Interpretar evidencia de carga y sus límites.

**Guion y fuentes:** Separar conceptos, diseño propuesto y pruebas realmente ejecutadas.

## 3 Problema empresarial

- Una campaña concentra consultas y reservas en pocos minutos.
- Los reintentos pueden duplicar operaciones.
- El inventario debe conservar su integridad bajo concurrencia.
- La operación requiere métricas, recuperación y trazabilidad.

**Guion y fuentes:** Caso didáctico de venta de cupos. No se atribuye a una empresa real.

## 4 Modelo de Kubernetes

- El usuario declara el estado deseado mediante la API.
- Los controladores comparan ese estado con el observado.
- El planificador asigna Pods a nodos disponibles.
- El kubelet mantiene los contenedores en cada nodo.

**Guion y fuentes:** Reconciliación continua: declarar tres réplicas no garantiza disponibilidad si faltan recursos.
https://kubernetes.io/docs/concepts/overview/
https://okd.io/
https://docs.redhat.com/en/documentation/openshift_container_platform/

## 5 Objetos fundamentales

- Pod: unidad de ejecución y programación.
- Deployment: réplicas y actualización de aplicaciones.
- Service: acceso estable a un conjunto de Pods.
- ConfigMap y Secret: configuración y datos sensibles.
- PVC: solicitud de almacenamiento persistente.

**Guion y fuentes:** Un Pod es reemplazable. La persistencia depende del almacenamiento y sus políticas. Un Secret necesita controles de acceso y protección adicional.
https://kubernetes.io/docs/concepts/overview/
https://okd.io/
https://docs.redhat.com/en/documentation/openshift_container_platform/

## 6 Kubernetes, OKD y OpenShift



| Dimensión | Kubernetes | OKD | OpenShift |
| --- | --- | --- | --- |
| Naturaleza | Orquestador | Distribución comunitaria | Plataforma empresarial |
| Integración | A elección del equipo | Componentes integrados | Componentes integrados |
| Soporte | Comunidad o proveedor | Comunidad | Red Hat por suscripción |
| Operación | Diseño propio | Requiere especialización | Requiere especialización |

**Guion y fuentes:** Kubernetes es la base de orquestación. OKD ofrece una distribución comunitaria. OpenShift agrega integración empresarial y soporte comercial según suscripción; evaluar compatibilidad por versión.
https://kubernetes.io/docs/concepts/overview/
https://okd.io/
https://docs.redhat.com/en/documentation/openshift_container_platform/

## 7 Criterios de elección

- Kubernetes: control de componentes y capacidad operativa propia.
- OKD: aprendizaje e integración comunitaria sin soporte comercial de Red Hat.
- OpenShift: plataforma integrada y necesidad de soporte empresarial.
- La decisión incluye personal, ciclo de vida, compatibilidad y costo total.

**Guion y fuentes:** No reducir la evaluación al precio de una licencia. Validar arquitectura y requisitos de la edición elegida. Fuentes y discusión ampliada en DOC-01-01.
https://kubernetes.io/docs/concepts/overview/
https://okd.io/
https://docs.redhat.com/en/documentation/openshift_container_platform/

## 8 Seguridad y operación

- RBAC y separación de espacios de nombres.
- Contenedores sin privilegios y secretos fuera del repositorio.
- Políticas de red, TLS y control de imágenes.
- Copias de seguridad, restauración y actualizaciones verificadas.

**Guion y fuentes:** Estos controles son objetivos de operación. El piloto local no acredita su implantación completa.
https://kubernetes.io/docs/concepts/overview/
https://okd.io/
https://docs.redhat.com/en/documentation/openshift_container_platform/

## 9 Laboratorio propuesto

- Laptop recomendada: 32 GB RAM y SSD con 100 GB libres.
- Ruta reducida de 16 GB: menor cantidad de nodos y carga.
- Ruta de cinco equipos: tres anfitriones, datos y generador.
- Inventario real y capacidad de virtualización por confirmar.

**Guion y fuentes:** Valores de diseño de DOC-02-01. No son un inventario verificado del equipo del usuario.

## 10 Arquitectura de reservas



Clientes acceden a la API. La API consulta y modifica PostgreSQL. El procesador consume el outbox y registra recepciones simuladas en la misma base.

**Guion y fuentes:** API FastAPI, PostgreSQL y procesador outbox. El receptor de notificaciones es simulado dentro de la base de datos. En el piloto los procesos comparten el mismo anfitrión.

## 11 Consistencia del inventario

- Descuento condicional solo si existe cantidad suficiente.
- Reserva, inventario y evento outbox en una transacción.
- Una clave de idempotencia identifica cada operación del cliente.
- Misma clave y mismo contenido: respuesta original; contenido distinto: conflicto.

**Guion y fuentes:** El control de inventario reside en PostgreSQL. Agregar réplicas de API no sustituye la transacción ni elimina cuellos de botella de datos.

## 12 Procesamiento de eventos

- El procesador toma lotes con SKIP LOCKED.
- Una recepción única por evento evita duplicados en la simulación.
- La recepción y el marcado se confirman en una transacción.
- Un receptor externo necesitaría su propia estrategia de idempotencia.

**Guion y fuentes:** No afirmar entrega exactamente una vez a sistemas externos: el laboratorio utiliza un receptor simulado en PostgreSQL.

## 13 Verificación funcional

- 19 pruebas de la aplicación completadas.
- 80 solicitudes concurrentes sobre 25 unidades: 25 confirmadas.
- 40 reintentos con una misma clave: una creación y 39 respuestas repetidas.
- Validación de permisos, rollback, conflictos y procesamiento outbox.

**Guion y fuentes:** Evidencia DOC-04-01. Son pruebas controladas de aplicación con PostgreSQL real; no una certificación de disponibilidad de un clúster.

## 14 Diseño del piloto de carga

- Tres repeticiones de 30 segundos a 50 llegadas/s.
- Mezcla: 80 % catálogo, 15 % disponibilidad y 5 % reservas.
- Un ensayo de lectura de 40 segundos con objetivos de 25 a 100 llegadas/s.
- API, PostgreSQL, procesador y k6 en el mismo equipo.

**Guion y fuentes:** k6 2.3.0, PostgreSQL 18.3, HTTP localhost. Veinte lecturas de calentamiento excluidas. Cada ensayo inicia con 1.000 unidades en un esquema independiente. Fuente DOC-05-01 y evidencias/carga-piloto.

## 15 Latencia p95 de reservas



| Ensayo | p95 de reservas ms |
| --- | --- |
| Mixto 1 | 34.92 |
| Mixto 2 | 29.54 |
| Mixto 3 | 42.41 |

Piloto local de 50 llegadas por segundo y 30 segundos por repetición.

**Guion y fuentes:** Valores por ensayo; no promediar percentiles como si fueran un percentil global. HTTP local, sin TLS, sin Kubernetes. Fuente DOC-05-01 y resultados JSON.

## 16 Resultados e integridad



| Ensayo | Solicitudes | Reservas | Disponible |
| --- | --- | --- | --- |
| Mixto 1 | 1500 | 75 | 925 |
| Mixto 2 | 1501 | 75 | 925 |
| Mixto 3 | 1500 | 75 | 925 |
| Lectura | 2749 | 0 | 1000 |

**Guion y fuentes:** Los tres ensayos mixtos confirmaron 75 reservas cada uno y dejaron 925 unidades. El piloto de lectura dejó 1.000 unidades. No sumar inventarios de esquemas independientes.

## 17 Alcance de la evidencia

- 7.250 solicitudes y 225 reservas en cuatro ensayos.
- Cero fallos técnicos y cero iteraciones descartadas.
- Sin sobreventa y sin eventos pendientes al cierre de los ensayos.
- Capacidad máxima, p99 y alta disponibilidad aún sin demostrar.

**Guion y fuentes:** Los valores describen estas ventanas de medición. No extrapolar a producción ni a una campaña prolongada.

## 18 Validación pendiente en Kubernetes

- Habilitar el acceso al motor Docker y crear kind.
- Construir la imagen, desplegar y comprobar sondas y persistencia.
- Instalar métricas y observar el HPA propuesto: 2–6 réplicas, CPU 60 %.
- Repetir carga con generador separado, TLS y pruebas de recuperación.

**Guion y fuentes:** Docker fue inaccesible desde el entorno de trabajo. Manifiestos y scripts están preparados, pero no ejecutados en un clúster. La base de datos propuesta es de una instancia y no ofrece HA.

## 19 Demostración y discusión

- Consultar catálogo y disponibilidad.
- Crear una reserva y repetir su clave de idempotencia.
- Mostrar inventario, métricas y procesamiento del evento.
- Relacionar resultados con objetivos y próximos experimentos.

**Guion y fuentes:** Usar el procedimiento DOC-04-01 y DOC-05-01. Si no existe un entorno activo, presentar evidencia guardada y señalar que se trata de una demostración documental. No mostrar claves ni credenciales.

## 20 Referencias y material de apoyo

- Kubernetes: documentación oficial de conceptos.
- OKD: sitio y documentación de la distribución comunitaria.
- Red Hat: documentación oficial de OpenShift.
- DOC-01-01 a DOC-05-01 y evidencias del repositorio local.

**Guion y fuentes:** Fuentes oficiales:
https://kubernetes.io/docs/concepts/overview/
https://okd.io/
https://docs.redhat.com/en/documentation/openshift_container_platform/
https://grafana.com/docs/k6/latest/
Fuentes primarias y enlaces específicos adicionales en DOC-01-01. Datos experimentales: evidencias/carga-piloto, DOC-04-01-resultados.md.
