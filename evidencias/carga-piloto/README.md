# Evidencias de carga piloto de DOC-05-01

Fecha: 13 de octubre de 2026.

Se ejecutaron cuatro ensayos locales con k6 2.3.0: tres de carga mixta a cincuenta solicitudes por segundo durante treinta segundos y un piloto de lectura escalonada de cuarenta segundos. Total medido entre todos los ensayos: 7250 solicitudes, cero errores técnicos y cero iteraciones descartadas. Cada repetición mixta confirmó setenta y cinco reservas sin sobreventa y procesó todos sus eventos simulados.

Los JSON mixed-1, mixed-2, mixed-3 y read-pilot conservan la salida de handleSummary de k6. runs.json contiene las métricas seleccionadas y la integridad por ejecución. integridad.json conserva la comprobación de datos posterior a cada ensayo. versiones.json contiene parámetros y hashes de código; host.json identifica información visible al proceso y mantiene memoria como no disponible.

## Alcance y pendientes

Entorno: procesos nativos de API, worker, PostgreSQL y generador en un mismo anfitrión, HTTP por localhost y sin cuotas de contenedor. Hubo veinte lecturas previas de calentamiento separadas en cada ejecución. Datos iniciales independientes por ensayo. Los procesos y esquemas temporales se retiraron después de medir.

No se ejecutó Docker Compose ni kind: el acceso al motor Docker está denegado en este entorno. El script de despliegue pasó análisis sintáctico, el perfil HPA pasó lectura YAML y comprobación de parámetros; faltan validación de API server y ejecución real. Ninguna medición acredita HPA, alta disponibilidad física, TLS, saturación máxima ni capacidad empresarial.

No se exportó p99 en estos resúmenes; el siguiente ensayo deberá configurar ese estadístico. No promediar percentiles entre repeticiones. Los objetivos de carga prolongada y resistencia siguen pendientes.

Word: verificadas tipografía, tablas completas y campo TOC a nivel estructural. La revisión visual y números de página definitivos siguen pendientes por ausencia de renderizador accesible.

No se ejecutaron push, pull ni fetch, ni escrituras remotas.
