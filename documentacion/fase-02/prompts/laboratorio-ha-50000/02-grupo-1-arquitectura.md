# Prompt del Grupo 1 para arquitectura y despliegue

Lee 01-contrato-comun.md y la guía DOC-02-02. Tu responsabilidad son L00 con el coordinador, L01 plataforma y L02 despliegue del sistema de reservas. No necesitas otro agente para ejecutar estas instrucciones.

Inspecciona laboratorio/scripts/New-Lab.ps1, Test-Lab.ps1, Deploy-Reservas.ps1, laboratorio/configuracion, aplicacion/kubernetes/base.yaml, aplicacion/openshift y frontend/deploy. Registra compatibilidades y diferencias: el perfil kind actual no acredita HA física y las bases antiguas no deben instalar una segunda PostgreSQL si se adopta un operador.

Construye inventario y decisión de plataforma. Para local prepara un perfil reproducible de ensayo que quepa en recursos comprobados. Para distribuido prepara tres trabajadores en dominios identificados, plano de control HA o administrado, entrada y endpoint de control redundantes, CNI, CSI y registro. No inventes máquinas ni declares que tres trabajadores alcanzan 50 000 VU. Identifica riesgos compartidos de hipervisor, red, energía, almacenamiento y balanceador. Incluye procedimiento específico de instalación para la plataforma y versiones elegidas.

Entrega infra, plataforma y app bajo laboratorio/ha-50000 con overlays, scripts de provisión y validación, acceso por contexto explícito, imágenes por digest y limpieza separada. Configura frontend y API distribuidos, inicialmente tres réplicas en D, requests y limits presupuestados, sondas, terminación y TLS. Coordina el Job de esquema único y endpoint primario con G4; la API no migra en cada réplica. Asegura que el proxy no apunte a localhost ni a una dirección Pod efímera. En OpenShift registra SCC admitida, UID efectivo, Route y certificados; no sustituirlo por una ejecución Docker con UID arbitrario.

Aceptación: un tercero puede provisionar desde el manual; nodos Ready y sistema de red y almacenamiento comprobados; frontend y API en nodos distintos según decisión; DNS, TLS y ruta /api correctos; imágenes accesibles; flujo completo real y balanceo observados. Exporta objetos saneados, distribución de Pods y comandos. Si no hay entorno distribuido, entrega archivos validados localmente y el pendiente, sin afirmar admisión o HA.

Da a G2 nombres, selectores, recursos y margen por nodo; a G3 dominios y métodos de recuperación; a G4 interfaces de almacenamiento; a G5 targets y permisos; a G6 topología congelada y versiones. Actualiza diagrama actual desplegado separado del propuesto. No fabricar comparador monolítico ni atribuirle una comparación no solicitada.
