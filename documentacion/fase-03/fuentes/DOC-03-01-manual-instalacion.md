# Manual de instalación del laboratorio Kubernetes en una laptop

DOC-03-01 · Etapa de instalación · Versión 1.0  
Fecha de consulta 13 de octubre de 2026 · Bases DOC-01-01 y DOC-02-01

La ruta recomendada es Windows 11 x86_64 con WSL 2, Docker Desktop y kind, usando PowerShell de Windows para administrar el clúster. El resultado esperado es Kubernetes local con nodos preparados, una página HTTP de comprobación y evidencia de su respuesta. El perfil de 32 GB crea tres nodos lógicos; el perfil reducido de 16 GB crea uno. Los pasos se presentan para que el participante los ejecute y compruebe; no acreditan que ya se hayan instalado herramientas o creado un clúster.

El formato Word es Times New Roman 12 pt, texto negro, encabezados de tabla negros con letras blancas e índice actualizable. La aplicación empresarial de reservas y sus ensayos de concurrencia se implementarán después de aceptar este ambiente mínimo.

## Índice

1. Alcance y archivos incluidos
2. Requisitos y versiones del recorrido
3. Inventario y preparación de Windows
4. Instalación y validación de WSL
5. Docker Desktop y presupuesto de recursos
6. Instalación de kind y kubectl
7. Preparación de la carpeta local de ejecución
8. Creación y validación del clúster
9. Despliegue de la página de comprobación
10. Acceso HTTP y prueba de aceptación
11. Réplicas y recuperación de un Pod
12. Evidencia y diagnóstico
13. Suspensión y limpieza del laboratorio
14. Variante Linux y transición a OKD y OpenShift
15. Criterios de cierre y siguiente etapa
16. Referencias oficiales

## 1 Alcance y archivos incluidos

El repositorio se conserva en `C:\Users\walte\OneDrive\Documentos\Desarrollo\Kubernets\Redhat openshift`. Los comandos de Windows se ejecutan desde PowerShell y no se deben pegar en una terminal Linux. WSL proporciona el backend de Docker en esta ruta; no es necesario instalar otro Docker Engine dentro de Ubuntu. Evitar administrar un mismo laboratorio mezclando binarios y contextos entre Windows y WSL.

| Archivo del repositorio | Función |
| --- | --- |
| laboratorio/configuracion/kind-32gb.yaml | Un control plane y dos workers lógicos |
| laboratorio/configuracion/kind-16gb.yaml | Un control plane con cargas locales |
| laboratorio/configuracion/smoke.yaml | Namespace, página, Deployment y Service |
| laboratorio/scripts/New-Lab.ps1 | Crear clúster nuevo con versión fijada |
| laboratorio/scripts/Test-Lab.ps1 | Consultar salud y respuesta HTTP |
| laboratorio/infraestructura/inventario.md | Registrar hardware comprobado |

Los scripts no instalan herramientas ni modifican Git. New-Lab evita reemplazar un clúster del mismo nombre o sobrescribir su kubeconfig; Test-Lab consulta recursos y valida el contenido HTTP. Ninguno ejecuta push, pull o fetch. El servidor de comprobación no representa todavía la aplicación de reservas.

## 2 Requisitos y versiones del recorrido

### Presupuesto recomendado

Se propone una laptop de 32 GB, ocho hilos lógicos o más y SSD con 100 GB libres. Reservar al menos 8 GB al anfitrión y comenzar con un entorno WSL de 16 GB. El presupuesto debe ajustarse si otras aplicaciones consumen memoria. Con 16 GB de RAM física se elegirá el perfil reducido, carga ligera y observabilidad mínima. Son recomendaciones del seminario; no garantizan una tasa de solicitudes.

### Versiones fijadas y valores por confirmar

| Componente | Referencia de este manual | Validación |
| --- | --- | --- |
| Windows | Windows 11 x86_64 compatible con Docker | Verificar edición y build real |
| WSL | WSL 2 actualizado según requisito de Docker | wsl --version y wsl --list --verbose |
| Docker Desktop | Versión compatible instalada desde fuente oficial | docker version y docker info |
| kind | v0.33.0 | kind version |
| Kubernetes del nodo | v1.37.0 por digest oficial de kind | kubectl version y descripción de nodos |
| kubectl | v1.37.1 | kubectl version --client |
| Imagen web | nginxinc/nginx-unprivileged:stable-alpine | Resolver digest antes de medir |

Las notas de kind v0.33.0 publican la imagen de nodo v1.37.0 y su digest. Este manual usa ese par compatible; no cambia la imagen por la última upstream automáticamente. El tag web es un punto de selección inicial y puede cambiar: se resolverá a digest antes de registrar un ambiente reproducible. [I1, I2, I7]

La instalación de herramientas puede necesitar privilegios o reinicios según el equipo. Revisar los requisitos vigentes de Docker y su modalidad de uso en la organización antes de instalar. No se aceptarán licencias automáticamente desde los scripts del proyecto. [I3]

## 3 Inventario y preparación de Windows

### Comprobar el sistema y sus recursos

Abrir PowerShell normal y ejecutar las consultas siguientes. Registrar los resultados en la ficha de inventario; no copiar nombres de usuario o información innecesaria a evidencia pública.

```powershell
Get-ComputerInfo -Property WindowsProductName,WindowsVersion,OsBuildNumber
Get-CimInstance Win32_ComputerSystem |
  Select-Object TotalPhysicalMemory,NumberOfLogicalProcessors
Get-CimInstance Win32_Processor |
  Select-Object Name,VirtualizationFirmwareEnabled
Get-PSDrive -PSProvider FileSystem
```

La memoria se expresa en bytes en la consulta. Dividir entre 1 GB para interpretarla. La consulta de virtualización puede requerir una comprobación adicional en BIOS/UEFI o Administrador de tareas si no informa un valor concluyente. Si el equipo es ARM64, no seguir la descarga amd64 del capítulo 6; seleccionar binarios y una ruta soportada para esa arquitectura.

### Antes de modificar componentes

Conectar alimentación, comprobar SSD libre, cerrar cargas pesadas e identificar si hay VPN, proxy o restricciones corporativas. Revisar que los rangos internos que emplee kind no entren en conflicto con la red existente. Si hay conflicto, ajustar Pod y Service CIDR de forma coherente antes de crear, siguiendo la configuración oficial. La API de kind permanecerá en 127.0.0.1. [I8]

Conservar el trabajo abierto antes de reinicios. La instalación no requiere desactivar antivirus, firewall ni controles corporativos. Si una política impide WSL o Docker, registrar el bloqueo y elegir un host compatible en lugar de alterar controles de seguridad.

## 4 Instalación y validación de WSL

### Instalar solo si hace falta

Consultar primero el estado. Si WSL ya está configurado, no reinstalar distribuciones.

```powershell
wsl --version
wsl --status
wsl --list --verbose
```

Si no está instalado, abrir PowerShell como administrador y ejecutar:

```powershell
wsl --install
```

Reiniciar cuando Windows lo solicite. Completar la configuración de la distribución si se instala una y comprobar nuevamente los comandos de consulta. Para actualizar WSL, usar el procedimiento oficial; si corresponde, ejecutar desde la terminal con privilegios:

```powershell
wsl --update
```

Microsoft documenta estas operaciones y la selección de distribuciones. La lista de distribuciones debe mostrar versión 2 para las que se utilicen en la ruta WSL 2. No se necesita ejecutar `wsl --unregister`, pues elimina una distribución y sus datos. [I4]

### Validación para continuar

WSL debe responder sin errores, la virtualización debe estar disponible y Docker debe poder utilizar su backend. Registrar la versión efectiva y cualquier reinicio pendiente. Si aparece un error de virtualización, resolverlo antes de instalar el resto; crear un clúster no corrige una dependencia del anfitrión.

## 5 Docker Desktop y presupuesto de recursos

### Instalar y comprobar

Descargar Docker Desktop para Windows desde la página oficial. Seleccionar el backend WSL 2 en la modalidad compatible con el equipo. Abrir Docker Desktop y completar su configuración interactiva. Usar contenedores Linux. En esta ruta, desactivar el Kubernetes integrado de Docker Desktop si está habilitado y no se necesita, para no mantener dos clústeres consumiendo recursos. [I3, I5]

```powershell
docker version
docker info --format '{{.OSType}}'
docker context show
```

`docker version` debe mostrar cliente y servidor; el tipo del servidor debe ser `linux`. Si solo responde el cliente, iniciar Docker Desktop o corregir el contexto. La primera descarga de imágenes requiere conectividad con los registros. No se confunde descargar imágenes Docker con `git pull`: este recorrido no sincroniza el repositorio Git remoto.

### Ajustar WSL con cuidado

En el backend WSL 2, los recursos de la VM se administran mediante opciones WSL aplicables. Para una laptop de 32 GB y al menos ocho hilos lógicos, el siguiente es un ejemplo de `.wslconfig` en el perfil del usuario de Windows. Abrir el archivo existente si lo hay y combinar sus valores; no sobrescribir otras opciones sin revisarlas. [I6]

```ini
[wsl2]
memory=16GB
processors=6
swap=4GB
```

Para 16 GB físicos puede empezarse con `memory=8GB`, cuatro procesadores si existen y `swap=2GB`. El límite WSL afecta a las distribuciones WSL 2 que lo utilizan, no solo al clúster. Si otras tareas dependen de WSL, incluirlas en el presupuesto. El swap no reemplaza memoria suficiente para cargas sostenidas.

Aplicar cambios requiere cerrar tareas WSL y reiniciar su entorno. El comando siguiente detiene las distribuciones y puede interrumpir procesos; ejecutarlo únicamente después de guardar trabajo y detener las tareas pertinentes. Reabrir Docker Desktop después y repetir `docker version`.

```powershell
wsl --shutdown
```

## 6 Instalación de kind y kubectl

### Elegir una carpeta de herramientas

Desde PowerShell normal, crear una carpeta de herramientas fuera del repositorio. Los ejemplos son para x86_64. Las descargas de este capítulo las ejecuta el participante al instalar; no se han ejecutado durante la elaboración documental.

```powershell
$toolDir = Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\bin'
New-Item -ItemType Directory -Path $toolDir -Force | Out-Null
$env:Path = "$toolDir;$env:Path"
```

El cambio de PATH mostrado solo afecta la terminal actual. Para futuras terminales puede añadirse esa carpeta al PATH del usuario desde la configuración de variables de entorno, sin reemplazar el resto del valor. Comprobar `Get-Command kind,kubectl` para identificar qué binario se ejecuta.

### kind v0.33.0

Descargar el binario Windows amd64 y su archivo SHA256 desde Assets de la publicación oficial v0.33.0. Guardar el binario como `kind.exe` en `$toolDir`. Comparar su SHA256 con el archivo oficial correspondiente antes de ejecutarlo. [I1, I2]

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath "$toolDir\kind.exe"
kind version
```

La salida debe identificar `kind v0.33.0`. Si se usa un administrador de paquetes, fijar la versión y volver a comprobarla: instalar sin versión puede producir un resultado distinto al manual.

### kubectl v1.37.1 con checksum

La documentación oficial describe la descarga y verificación de kubectl. Este ejemplo fija el parche y usa su checksum publicado. [I9]

```powershell
$kubectlBase = 'https://dl.k8s.io/release/v1.37.1/bin/windows/amd64'
Invoke-WebRequest "$kubectlBase/kubectl.exe" `
  -OutFile "$toolDir\kubectl.exe"
Invoke-WebRequest "$kubectlBase/kubectl.exe.sha256" `
  -OutFile "$toolDir\kubectl.exe.sha256"
$expected = (Get-Content "$toolDir\kubectl.exe.sha256" -Raw).Trim()
$actual = (Get-FileHash "$toolDir\kubectl.exe" -Algorithm SHA256).Hash
if ($actual -ine $expected) { throw 'Checksum de kubectl incorrecto' }
kubectl version --client -o yaml
```

Conservar la versión y el resultado de verificación. No continuar si el hash no coincide. El script de creación requiere kubectl 1.37.x y kind 0.33.0 para mantener el recorrido alineado con la imagen de nodo seleccionada.

## 7 Preparación de la carpeta local de ejecución

### Separar repositorio y credenciales

El código, YAML y documentos se guardan en el repositorio autorizado. El kubeconfig del clúster contiene credenciales y se guardará por defecto en `%LOCALAPPDATA%\SeminarioKubernetes\seminario\kubeconfig.yaml`, fuera de OneDrive y del repositorio. Los datos activos de Docker permanecerán en su ubicación de runtime. No copiar discos virtuales o bases activas dentro de la carpeta de código.

```powershell
$repo = 'C:\Users\walte\OneDrive\Documentos\Desarrollo\Kubernets\Redhat openshift'
Set-Location -LiteralPath $repo
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes'
$kubeconfig = Join-Path $runtimeRoot 'seminario\kubeconfig.yaml'
$ctx = 'kind-seminario'
```

Usar `--kubeconfig` y `--context` explícitos en los comandos. No cambiar de contexto global ni mezclar estas credenciales con ambientes empresariales. El archivo `.gitignore` del proyecto excluirá credenciales, secretos locales y datos de ejecución que accidentalmente se generen dentro del árbol; eso no protege archivos que ya estén versionados.

### Revisar antes de crear

Abrir el perfil y New-Lab.ps1 y ejecutar primero la vista previa:

```powershell
.\laboratorio\scripts\New-Lab.ps1 -Profile 32gb -WhatIf
```

La vista previa consulta requisitos y anuncia la creación, pero no crea clúster ni carpetas de ejecución. Si PowerShell bloquea un script por política, revisar la política y el origen del archivo conforme a la administración del equipo; no desactivar de forma global sus controles. Puede seguirse el recorrido manual equivalente del capítulo siguiente.

## 8 Creación y validación del clúster

### Ruta asistida

Ejecutar uno de los perfiles, no ambos para el mismo nombre:

```powershell
.\laboratorio\scripts\New-Lab.ps1 -Profile 32gb
```

Para una laptop con 16 GB, sustituir el perfil:

```powershell
.\laboratorio\scripts\New-Lab.ps1 -Profile 16gb
```

El script exige Docker Linux disponible, usa un kubeconfig dedicado y fija la imagen de nodo publicada en las notas de kind. Si el clúster o kubeconfig ya existe, se detiene para evitar reemplazarlo. Espera hasta cinco minutos durante creación y luego comprueba Ready; el tiempo real depende del hardware y de las descargas. Una salida de error no cuenta como validación.

### Ruta manual equivalente

Esta alternativa solo se usa si no se ejecutó la ruta asistida y el nombre `seminario` está libre. La imagen está en una línea larga por su digest; copiarla completa.

```powershell
$nodeImage = 'kindest/node:v1.37.0@sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5'
New-Item -ItemType Directory `
  -Path (Split-Path $kubeconfig) -Force | Out-Null
$env:KIND_EXPERIMENTAL_PROVIDER = 'docker'
kind get clusters
kind create cluster --name seminario `
  --config .\laboratorio\configuracion\kind-32gb.yaml `
  --image $nodeImage --kubeconfig $kubeconfig --wait 5m
if ($LASTEXITCODE -ne 0) { throw 'Fallo la creacion del cluster' }
```

Antes de ejecutarla, revisar `kind get clusters` y confirmar que no existe `seminario` ni el kubeconfig dedicado. La ruta manual no incluye todas las protecciones del script. Con 16 GB seleccionar `kind-16gb.yaml`.

### Comprobar componentes

```powershell
kubectl --kubeconfig $kubeconfig --context $ctx cluster-info
kubectl --kubeconfig $kubeconfig --context $ctx get nodes -o wide
kubectl --kubeconfig $kubeconfig --context $ctx `
  wait --for=condition=Ready nodes --all --timeout=180s
kubectl --kubeconfig $kubeconfig --context $ctx get pods -A
```

El perfil 32 GB debe mostrar tres nodos Ready y el de 16 GB uno. Revisar que los componentes esenciales no estén en CrashLoopBackOff o ImagePullBackOff. No se exige que los Jobs completados estén Running. Este paso valida infraestructura inicial, no persistencia, alta disponibilidad física ni rendimiento.

## 9 Despliegue de la página de comprobación

### Resolver la imagen a contenido fijo

La imagen de NGINX sin privilegios escucha en 8080 y utiliza rutas temporales en `/tmp`. El manifiesto monta esa ubicación como volumen temporal, sirve HTML desde un ConfigMap y desactiva el token de ServiceAccount. Está preparado para Kubernetes local; una futura migración a SCC de OpenShift requerirá revisar el UID fijo del ejemplo. [I7]

Antes de aplicar, resolver la imagen web y generar un manifiesto local de ejecución por digest. El tag permite seleccionar la imagen inicial, pero el archivo generado y su digest son la referencia que debe conservarse para repetir un ensayo.

```powershell
$webTag = 'nginxinc/nginx-unprivileged:stable-alpine'
docker pull $webTag
if ($LASTEXITCODE -ne 0) { throw 'No se pudo descargar NGINX' }
$digestRaw = docker image inspect $webTag `
  --format '{{index .RepoDigests 0}}'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo obtener el digest' }
$webDigest = "$digestRaw".Trim()
if ($webDigest -notmatch '@sha256:[a-f0-9]{64}$') {
  throw 'Digest de NGINX no valido'
}
$source = '.\laboratorio\configuracion\smoke.yaml'
$resolved = Join-Path $runtimeRoot 'seminario\smoke-resolved.yaml'
$yamlText = Get-Content -LiteralPath $source -Raw
$yamlText.Replace($webTag, $webDigest) |
  Set-Content -LiteralPath $resolved -Encoding UTF8
```

El runtime debe existir después de crear el clúster. Si no existe, volver al capítulo 8. Para un registro no accesible desde los nodos, corregir conectividad o autenticación antes de aplicar; descargar una imagen al host no configura automáticamente acceso desde todos los nodos.

### Aplicar y esperar

```powershell
kubectl --kubeconfig $kubeconfig --context $ctx apply -f $resolved
if ($LASTEXITCODE -ne 0) { throw 'No se aplico el manifiesto' }
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  rollout status deployment/comprobacion --timeout=180s
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  get pods,services -o wide
```

El Deployment solicita dos réplicas. En el perfil reducido pueden limitarse a una después de aplicar:

```powershell
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  scale deployment/comprobacion --replicas=1
```

Reaplicar el manifiesto vuelve a solicitar dos réplicas; registrar esa decisión en la evidencia. El Service es ClusterIP y no publica la aplicación en Internet. No se instala Ingress, Gateway ni TLS en esta primera comprobación; el camino de entrada empresarial se implementará y medirá posteriormente.

## 10 Acceso HTTP y prueba de aceptación

### Abrir un acceso local temporal

En la primera terminal, mantener activo el siguiente comando:

```powershell
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  port-forward service/comprobacion 8080:80 --address 127.0.0.1
```

Abrir `http://127.0.0.1:8080` en el navegador. Debe aparecer `SEMINARIO-OK`. El acceso termina con Ctrl+C. Port-forward selecciona un Pod y no demuestra balanceo de todas las réplicas; si ese Pod desaparece, puede ser necesario iniciar el comando otra vez. No utilizar este túnel como camino de medición de capacidad empresarial. [I10]

### Validar desde una segunda terminal

Abrir otra terminal PowerShell, situarse en `$repo` y ejecutar:

```powershell
.\laboratorio\scripts\Test-Lab.ps1
```

La prueba consulta nodos, espera el Deployment, comprueba que el Service tenga destinos preparados y exige HTTP 200 con el marcador esperado. Cualquier fallo se comunica como error; no se repara el clúster automáticamente. Si el puerto 8080 está ocupado, usar `8081:80` en port-forward y `-Port 8081` en Test-Lab.

| Comprobación | Resultado esperado |
| --- | --- |
| Nodos | Todos Ready; cantidad según perfil |
| Deployment | Rollout completo y réplicas disponibles |
| Service | Uno o más destinos preparados |
| HTTP local | Código 200 y marcador SEMINARIO-OK |
| Alcance | Comprobación básica, sin benchmark |

## 11 Réplicas y recuperación de un Pod

### Observar la distribución

```powershell
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  get pods -l app=comprobacion -o wide
```

En el perfil con dos workers, revisar sobre qué nodos se colocan las réplicas. La restricción de distribución favorece repartirlas sin bloquear el perfil de un solo nodo. El número de réplicas por sí solo no acredita continuidad ante pérdida del anfitrión.

### Reemplazar una réplica del ejemplo

Esta práctica elimina únicamente un Pod seleccionado de la página de comprobación; el controlador lo reemplazará si existe capacidad. Primero detener port-forward, anotar nombres y ejecutar la consulta para obtener un Pod. Si no devuelve exactamente un nombre válido, no ejecutar la eliminación.

```powershell
$podName = kubectl --kubeconfig $kubeconfig --context $ctx `
  -n seminario get pods -l app=comprobacion `
  -o 'jsonpath={.items[0].metadata.name}'
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($podName)) {
  throw 'No se encontro un Pod para la practica'
}
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  delete pod $podName
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  rollout status deployment/comprobacion --timeout=180s
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  get pods -l app=comprobacion -o wide
```

Anotar el nombre y UID del Pod reemplazado, la hora de eliminación y el momento en que la nueva réplica está preparada. Reiniciar port-forward y repetir Test-Lab. Esto demuestra reconciliación de una carga del ejemplo; no mide RTO de reservas ni conserva transacciones, porque la página no almacena datos de negocio.

## 12 Evidencia y diagnóstico

### Guardar evidencia comprobada

Con port-forward activo, guardar el resultado JSON de Test-Lab en la carpeta local de ejecución. Solo copiar al repositorio resultados revisados sin secretos. Si el script falla, no registrar la ejecución como aprobada.

```powershell
$evidenceFile = Join-Path $runtimeRoot 'seminario\acceptance.json'
.\laboratorio\scripts\Test-Lab.ps1 |
  Set-Content -LiteralPath $evidenceFile -Encoding UTF8
```

Registrar fecha, operador, perfil, hardware real, versiones, imagen de nodo, digest web y pasos completados. New-Lab genera `versions.json` al crear correctamente. La ruta manual exige registrar esa información por separado. Las capturas apoyan el informe pero no sustituyen resultados y parámetros.

### Diagnóstico por síntoma

| Síntoma | Consulta inicial | Qué revisar |
| --- | --- | --- |
| Docker sin servidor | docker version | Aplicación iniciada, contexto y WSL |
| Nodo no Ready | describe node y Pods de sistema | Red, disco y memoria del anfitrión |
| ImagePullBackOff | describe pod | Registro, DNS, proxy o imagen |
| Pending | describe pod | Requests, nodos y restricciones |
| CrashLoopBackOff | logs y describe pod | Configuración, permisos y sondas |
| Port-forward termina | get pods | Pod seleccionado reemplazado o red |
| HTTP incorrecto | Test-Lab y contenido | Puerto ocupado o servicio equivocado |

```powershell
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  describe deployment comprobacion
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  get events --sort-by=.metadata.creationTimestamp
kubectl --kubeconfig $kubeconfig --context $ctx -n seminario `
  logs deployment/comprobacion --tail=50
```

No se instala Metrics Server en este recorrido: `kubectl top` no es una puerta de aceptación hasta disponer de la API de métricas. Una HPA se incorporará después de instrumentar la aplicación. El CNI predeterminado de kind no se considera una prueba de aplicación de NetworkPolicy; para esas prácticas se elegirá y validará una implementación compatible. [I8]

## 13 Suspensión y limpieza del laboratorio

Detener port-forward con Ctrl+C no elimina la aplicación. Cerrar la terminal tampoco elimina el clúster. Detener Docker Desktop interrumpe las cargas y puede afectar otros proyectos: hacerlo solo después de guardar evidencia y cerrar tareas que dependan de Docker.

Para eliminar únicamente los recursos de la página, usar el manifiesto resuelto del mismo laboratorio. Esto elimina los recursos declarados, incluido el Namespace `seminario`, por lo que debe permanecer dedicado a esta práctica; no usarlo si ya contiene trabajo adicional que se desea conservar.

```powershell
kubectl --kubeconfig $kubeconfig --context $ctx delete -f $resolved
```

Para retirar completamente el clúster local, revisar antes `kind get clusters` y conservar los datos necesarios. El siguiente comando destruye los nodos y el estado de ese clúster, incluidos datos almacenados dentro de él. No se ejecuta como parte de los scripts entregados.

```powershell
kind delete cluster --name seminario --kubeconfig $kubeconfig
```

Conservar la ficha de versiones y evidencia antes de recrear. Si queda un kubeconfig anterior, revisarlo y archivarlo fuera del repositorio antes de usar New-Lab; el script evita sobrescribirlo. No ejecutar limpiezas generales como eliminación de todos los contenedores o imágenes, porque pueden afectar otros proyectos.

## 14 Variante Linux y transición a OKD y OpenShift

### Variante Linux del mismo laboratorio kind

En un host Linux compatible, instalar Docker Engine mediante la guía oficial específica de la distribución. Verificar que el usuario pueda utilizar el daemon sin añadir `sudo` indistintamente a unos comandos y no a otros. Los permisos de acceso al daemon deben gestionarse conforme al equipo. Descargar los binarios Linux de kind v0.33.0 y kubectl v1.37.1 y verificar checksums oficiales. [I1, I11, I12]

Los perfiles YAML y smoke.yaml son reutilizables, pero los scripts entregados son para Windows. En Bash se requiere un kubeconfig local dedicado; seleccionar y revisar el digest oficial del capítulo 8.

```bash
repo='/ruta/local/del/repositorio'
run_dir="$HOME/.local/share/seminario-kubernetes/seminario"
mkdir -p "$run_dir"
cd "$repo"
kind create cluster --name seminario \
  --config laboratorio/configuracion/kind-32gb.yaml \
  --image "$node_image" \
  --kubeconfig "$run_dir/kubeconfig.yaml" --wait 5m
kubectl --kubeconfig "$run_dir/kubeconfig.yaml" \
  --context kind-seminario get nodes
```

Antes de ejecutar, definir `node_image` con la imagen completa indicada en el capítulo 8, sustituir la ruta real del repositorio y comprobar que `seminario` no exista. Para resolución del digest y acceso HTTP, aplicar las operaciones equivalentes de los capítulos 9 y 10 usando sintaxis Bash. El recorrido Windows es el procedimiento principal documentado; esta variante orienta su adaptación y debe validarse en el host Linux real.

### Ruta local hacia OKD u OpenShift

CRC ofrece una alternativa de clúster local de plataforma integrada. Descargar CRC desde la fuente oficial, comprobar los requisitos de su versión, hipervisor y bundle, y detener el laboratorio kind si se necesita liberar recursos. No se asume ejecutar kind y CRC simultáneamente dentro del presupuesto inicial. [I13, I14]

Para OKD, el flujo oficial incluye el preset correspondiente:

```powershell
crc config set preset okd
crc setup
crc start
crc status
crc console --credentials
crc oc-env
```

`crc setup` prepara componentes del anfitrión y puede requerir permisos. Seleccionar el preset antes de crear el clúster; si ya hay un clúster CRC, revisar su estado y datos antes de cambiarlo. `crc oc-env` muestra cómo habilitar la CLI; aplicar las instrucciones para la terminal utilizada. No publicar la salida de `crc console --credentials`, pues contiene credenciales. [I13]

Para OpenShift local, usar el preset OpenShift documentado por CRC y preparar la cuenta y pull secret que solicite su flujo. No incluir ese secreto en Git. El bundle CRC puede tener una versión distinta de OKD 5.0 o de OpenShift 4.22 investigados; registrar la versión realmente desplegada. La instalación multinodo en tres hosts necesita un manual independiente con DNS, activos, redes y almacenamiento definidos, y no se obtiene agregando workers a CRC.

## 15 Criterios de cierre y siguiente etapa

El ambiente mínimo se acepta cuando existen versiones verificadas, nodos Ready, réplicas disponibles, destinos preparados y HTTP 200 con contenido esperado. Debe poder repetirse el reemplazo de un Pod y recuperarse la página. La ficha distinguirá resultados observados de ejemplos del manual.

| Entregable de cierre | Estado que debe registrar el participante |
| --- | --- |
| Inventario real | Comprobado en la laptop usada |
| Versiones y digests | Guardados y verificables |
| Creación del clúster | Éxito o error con fecha |
| Aceptación HTTP | Resultado real de Test-Lab |
| Reemplazo de Pod | Identificadores y tiempo observado |
| Incidencias | Síntoma, causa y solución aplicada |

El siguiente trabajo será implementar la API de reservas, PostgreSQL, procesamiento outbox y sus contratos. Las pruebas de carga y estrés comenzarán después de verificar ausencia de sobreventa e idempotencia. Esta página de comprobación no autoriza extrapolar capacidad, seguridad empresarial ni continuidad del sistema completo.

## 16 Referencias oficiales

Fuentes consultadas el 13 de octubre de 2026. Las versiones de instalación de este manual se fijan expresamente; las guías generales pueden cambiar.

- [I1] kind. Quick Start. https://kind.sigs.k8s.io/docs/user/quick-start/
- [I2] Kubernetes SIGs. kind v0.33.0 release. Imágenes y digests compatibles. https://github.com/kubernetes-sigs/kind/releases/tag/v0.33.0
- [I3] Docker. Install Docker Desktop on Windows. https://docs.docker.com/desktop/setup/install/windows-install/
- [I4] Microsoft. Install WSL. https://learn.microsoft.com/en-us/windows/wsl/install
- [I5] Docker. Docker Desktop WSL 2 backend. https://docs.docker.com/desktop/features/wsl/
- [I6] Microsoft. Advanced settings configuration in WSL. https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- [I7] NGINX. Unprivileged NGINX Dockerfiles. https://github.com/nginx/docker-nginx-unprivileged
- [I8] kind. Configuration. https://kind.sigs.k8s.io/docs/user/configuration/
- [I9] Kubernetes. Install and Set Up kubectl on Windows. https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
- [I10] Kubernetes. kubectl port-forward. https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- [I11] Docker. Install Docker Engine. https://docs.docker.com/engine/install/
- [I12] Kubernetes. Install and Set Up kubectl on Linux. https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- [I13] CRC. Get started. https://crc.dev/docs/getting-started/
- [I14] CRC. Installing CRC. https://crc.dev/docs/installing/

Para actualizar el índice Word, seleccionar el índice y elegir Actualizar toda la tabla, o seleccionar todo y pulsar F9. Las comprobaciones estructurales del documento no sustituyen la revisión visual de páginas.
