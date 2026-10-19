"""Resolver plantillas localmente; no consulta ni modifica un clúster."""
import argparse
from pathlib import Path
import re

def render(source, output, project, image):
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,61}[a-z0-9]|[a-z]',project):
        raise ValueError('Proyecto DNS de 1 a 63 caracteres requerido')
    if not re.fullmatch(r'[a-z0-9][a-z0-9.:-]*/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}',image):
        raise ValueError('Imagen requerida: registro/ruta@sha256 con 64 caracteres hexadecimales')
    files=sorted(source.glob('*.yaml'))
    if len(files)!=4:raise ValueError('Se requieren las cuatro plantillas originales')
    if output.exists():raise ValueError('El destino debe ser una carpeta nueva')
    resolved=[]
    for file in files:
        text=file.read_text(encoding='utf-8').replace('PROJECT_REQUIRED',project).replace('IMAGE_BY_DIGEST_REQUIRED',image)
        if 'REQUIRED' in text:raise ValueError('Marcador sin resolver')
        resolved.append((file.name,text))
    output.mkdir(parents=True)
    for name,text in resolved:(output/name).write_text(text,encoding='utf-8')
    return [name for name,_ in resolved]

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--project',required=True)
    parser.add_argument('--image',required=True)
    args=parser.parse_args()
    for name in render(args.source,args.output,args.project,args.image):print(name)
