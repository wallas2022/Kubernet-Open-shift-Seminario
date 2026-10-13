# Hoja de trabajo del participante

DOC-07-01 · Seminario Kubernetes OKD y OpenShift

Nombre: ____________________  Fecha: ____________________

Modalidad: práctica / documental / mixta. Equipo o pareja: ____________________

## Registro de demostración

Registrar estados HTTP, identificador de reserva y cantidades; nunca registrar claves API.

| Paso | Resultado esperado | Resultado observado | Ejecutado o interpretado |
| --- | --- | --- | --- |
| Disponibilidad inicial | Valor leído antes de reservar | Por completar | Por completar |
| Reserva nueva | 201 y una reserva | Por completar | Por completar |
| Repetición equivalente | 200 y la misma reserva | Por completar | Por completar |
| Misma clave con otra cantidad | 409 idempotency_conflict | Por completar | Por completar |
| Disponibilidad final | Una unidad menos si no hay otros clientes | Por completar | Por completar |

## Ejercicios

1. Una organización requiere soporte empresarial y plataforma integrada. Proponer una opción, dos condiciones por verificar y un riesgo. Justificar con la investigación.

Respuesta: _______________________________________________________________

2. Se reservan dos unidades; la respuesta se pierde y se reintenta con misma clave y cuerpo. Después se cambia la cantidad a tres con la misma clave. Explicar estados, reducción de inventario y evidencia necesaria.

Respuesta: _______________________________________________________________

3. Consultar DOC-05-01 y sumar solicitudes y reservas de cuatro ensayos. Explicar por qué no acreditan diez mil clientes simultáneos ni permiten derivar p99.

Respuesta: _______________________________________________________________

4. Analizar el HPA propuesto, presupuesto de conexiones y PostgreSQL de una instancia. Proponer un ensayo de recuperación y criterio de éxito.

Respuesta: _______________________________________________________________

## Evaluación individual

1. Explicar reconciliación y una causa de réplicas pendientes.
2. Justificar una plataforma para el escenario de soporte empresarial.
3. Resolver el escenario de reintento del ejercicio 2.
4. Interpretar una tabla del piloto y sus límites.
5. Proponer una validación pendiente con evidencia y criterio de éxito.

Cada pregunta vale veinte puntos. Entregar respuestas propias. Separar resultados medidos de diseños y supuestos.

## Cierre

Conclusión principal: _____________________________________________________

Actividad pendiente: ______________________________________________________

Archivo de evidencia sin secretos: ________________________________________
