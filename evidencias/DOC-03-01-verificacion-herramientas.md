# Verificación de los archivos de instalación

Fecha: 13 de octubre de 2026. Alcance: documentos y herramientas de DOC-03-01.

## Comprobaciones realizadas

- New-Lab.ps1 y Test-Lab.ps1 pasan el analizador de sintaxis PowerShell.
- Con comandos kubectl y HTTP simulados, Test-Lab produce JSON válido sin mezclar mensajes de rollout.
- Con Service simulado sin destinos, Test-Lab falla como corresponde.
- Con HTTP simulado de una página incorrecta, Test-Lab falla como corresponde.
- Con herramientas simuladas y WhatIf, New-Lab no crea carpeta de ejecución ni clúster y restaura la variable temporal del proveedor.
- Con kubeconfig de prueba existente, New-Lab se detiene y conserva el contenido sin cambios.
- El Word contiene 16 secciones principales, cinco tablas, 29 bloques de comandos y campo TOC actualizable. Se comprobaron estilos de 12 pt y encabezados de tabla negro y blanco.
- Se verificó la igualdad de contenido de las siete copias entregadas al repositorio local.

## Comprobaciones pendientes

No se ejecutaron instalaciones, descargas de herramientas ni creación de un clúster real. Los comandos simulados verifican el control de errores de los scripts; no prueban compatibilidad con un daemon Docker o un servidor Kubernetes real. Los manifiestos necesitan validación de esquema y aplicación contra la versión seleccionada. La imagen web se resolverá a digest al ejecutar el manual.

El intento de renderizar Word mediante render_docx.py no pudo continuar porque LibreOffice no está disponible. La paginación, el índice con números de página y la presentación visual quedan pendientes de comprobación en Word. No se declara validación visual completa.

No se ejecutaron git push, git pull, git fetch ni escrituras en el repositorio remoto.
