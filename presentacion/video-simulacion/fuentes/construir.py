from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math, subprocess, sys, wave, hashlib
sys.path.insert(0,'/tmp/seminario-video')
import imageio_ffmpeg

root=Path('/work/presentacion/video-simulacion');rev=root/'revision';rev.mkdir(exist_ok=True)
scenes=json.loads((root/'fuentes/escenas.json').read_text(encoding='utf-8'))
ff=imageio_ffmpeg.get_ffmpeg_exe();fps=24
def run(args):
 p=subprocess.run([ff,'-hide_banner','-loglevel','error','-y',*args],capture_output=True,text=True)
 if p.returncode:raise RuntimeError(p.stderr)
def duration(file):
 with wave.open(str(file)) as w:return w.getnframes()/w.getframerate()
raw=[duration(rev/f'audio/voz-{i+1:02}.wav') for i in range(7)]
speed=sum(raw)/60;assert .5<=speed<=2
dur=[x/speed for x in raw];starts=[];clock=0
for i,value in enumerate(dur):
 starts.append(clock);clock+=value
 run(['-i',str(rev/f'audio/voz-{i+1:02}.wav'),'-af',f'atempo={speed:.12f}','-ar','44100','-ac','1',str(rev/f'audio/ajustada-{i+1:02}.wav')])
(rev/'audio-list.txt').write_text(''.join(f"file '{rev}/audio/ajustada-{i+1:02}.wav'\n" for i in range(7)))
run(['-f','concat','-safe','0','-i',str(rev/'audio-list.txt'),'-af','apad','-t','60',str(root/'narracion.wav')])
fonts={}
def font(size=22,bold=False):
 key=(size,bold)
 if key not in fonts:fonts[key]=ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-'+('Bold' if bold else 'Regular')+'.ttf',size)
 return fonts[key]
def wrap(draw,text,size,width):
 lines=[];line=''
 for w in text.split():
  candidate=(line+' '+w).strip()
  if line and draw.textlength(candidate,font=font(size))>width:lines.append(line);line=w
  else:line=candidate
 return lines+[line]
def srt_time(sec):
 ms=round(sec*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
 return f'{h:02}:{m:02}:{s:02},{ms:03}'
captions=[];srt=[]
for i,s in enumerate(scenes):
 words=s['voice'].split();at=starts[i]
 for j in range(0,len(words),8):
  chunk=words[j:j+8];end=at+dur[i]*len(chunk)/len(words)
  captions.append((at,end,' '.join(chunk)))
  srt += [str(len(captions)),f'{srt_time(at)} --> {srt_time(end)}',' '.join(chunk),'']
  at=end
(root/'simulacion-seminario.srt').write_text('\n'.join(srt),encoding='utf-8')
bg='#091321';panel='#122338';ink='#F2F7FC';muted='#A2B4C9';cyan='#53D7F0';green='#61E4AA';amber='#FFC45C';red='#FF6A7D'
def center(draw,text,x,y,size=22,color=ink,bold=False):
 w=draw.textlength(text,font=font(size,bold));draw.text((x-w/2,y),text,font=font(size,bold),fill=color)
def box(draw,bounds,color=panel,outline=None,radius=16):draw.rounded_rectangle(bounds,radius=radius,fill=color,outline=outline,width=2)
def arrow(draw,a,b,color='#37536C',width=3):
 draw.line([a,b],fill=color,width=width)
 angle=math.atan2(b[1]-a[1],b[0]-a[0]);size=9
 draw.polygon([b,(b[0]-size*math.cos(angle-.5),b[1]-size*math.sin(angle-.5)),(b[0]-size*math.cos(angle+.5),b[1]-size*math.sin(angle+.5))],fill=color)
def wheel(draw,x,y,r):
 draw.ellipse((x-r,y-r,x+r,y+r),outline=cyan,width=3)
 for k in range(7):
  a=k*math.tau/7
  p=(x+math.cos(a)*r*1.25,y+math.sin(a)*r*1.25)
  draw.line([(x,y),p],fill=cyan,width=2)
  draw.ellipse((p[0]-3,p[1]-3,p[0]+3,p[1]+3),fill=cyan)
def pod(draw,x,y,state,alpha=1):
 color={'ready':green,'failed':red,'starting':amber,'off':'#314258'}[state]
 fill={'ready':'#143C39','failed':'#452A37','starting':'#453C28','off':'#1B2A3C'}[state]
 box(draw,(x,y,x+156,y+49),fill,color,10)
 draw.rectangle((x+12,y+13,x+31,y+32),outline=color,width=2)
 draw.line([(x+12,y+13),(x+20,y+7),(x+39,y+7),(x+31,y+13)],fill=color,width=2)
 draw.text((x+48,y+8),'API',font=font(18,True),fill=color)
 status={'ready':'Lista','failed':'Fuera','starting':'Iniciando','off':'Sin réplica'}[state]
 draw.text((x+48,y+29),status,font=font(13),fill=color)
 if state=='failed':
  draw.line([(x+132,y+15),(x+145,y+30)],fill=red,width=3);draw.line([(x+145,y+15),(x+132,y+30)],fill=red,width=3)
def frame(t):
 stage=max(i for i,s in enumerate(starts) if t>=s);local=(t-starts[stage])/dur[stage]
 im=Image.new('RGB',(1280,720),bg);d=ImageDraw.Draw(im)
 for xx in range(25,1280,35):
  for yy in range(125,615,35):d.ellipse((xx,yy,xx+1,yy+1),fill='#203147')
 d.text((40,22),'SEMINARIO · SISTEMA DE RESERVAS',font=font(17,True),fill=cyan)
 box(d,(922,17,1240,51),'#283047',None,12)
 center(d,'SIMULACIÓN CONCEPTUAL',1081,25,17,amber,True)
 title=scenes[stage]['title']
 size=34 if len(title)<52 else 30
 d.text((39,64),title,font=font(size,True),fill=ink)
 center(d,'Arquitectura ilustrada · tiempos y capacidad pendientes de medición',640,111,17,muted)
 if stage==6:
  groups=[('01','Arquitectura','Nodos y componentes'),('02','Autoescalado','Réplicas según métricas'),('03','Resiliencia','Fallos y recuperación'),('04','Persistencia','Reservas e integridad'),('05','Observabilidad','Latencias y recursos'),('06','Experimentos','Comparación y evidencia')]
  for k,(num,name,desc) in enumerate(groups):
   x=55+(k%3)*402;y=175+(k//3)*160
   box(d,(x,y,x+370,y+132),panel,'#2C465F')
   d.text((x+21,y+16),num,font=font(24,True),fill=cyan)
   d.text((x+65,y+19),name,font=font(24,True),fill=ink)
   d.text((x+23,y+72),desc,font=font(20),fill=muted)
  center(d,'Aplicación construida  ·  Laboratorio HA y 50 000 usuarios: por validar',640,527,23,green,True)
 else:
  # Links are drawn before the components. Moving particles represent requests, not measured throughput.
  arrow(d,(138,290),(230,290))
  arrow(d,(293,335),(293,370));arrow(d,(357,392),(460,363))
  for x in (555,795,1035):arrow(d,(x,438),(725,500))
  box(d,(430,155,1218,457),'#0C1B2D','#2A506D',20)
  wheel(d,461,179,11);d.text((487,167),'KUBERNETES',font=font(19,True),fill=cyan)
  tag=['Tráfico normal','Demanda en aumento','HPA + capacidad disponible','Reposición de un Pod','Capacidad de reserva','Datos con recuperación'][stage]
  d.text((800,171),tag,font=font(17),fill=muted)
  # Participants icon.
  for k in range(3):
   px=66+k*26;d.ellipse((px,240,px+15,255),fill=cyan);box(d,(px-4,260,px+19,285),'#21455A',None,6)
  center(d,'Participantes',100,310,19)
  if stage>=1:
   center(d,'50 000 usuarios',120,360,23,amber,True);center(d,'META DEL ENSAYO',120,391,13,muted)
  else:center(d,'Solicitudes',100,364,19,muted)
  box(d,(230,241,357,335),panel,cyan)
  center(d,'Entrada',293,254,23,ink,True);center(d,'HTTPS',293,288,21,cyan)
  d.text((203,435),'Frontend y proxy',font=font(17),fill=muted)
  box(d,(231,371,357,414),panel,'#3C5E7B',10);center(d,'Aplicación',294,382,18)
  # States for API Pods, laid out across three worker nodes.
  states=[['ready','off'],['off','off'],['off','off']]
  if stage==1 and local>.55:states=[['ready','off'],['ready','off'],['off','off']]
  if stage>=2:states=[['ready','ready'] for _ in range(3)]
  if stage==2:
   for n in range(3):
    for p in range(2):
     reveal=(n*2+p)/7
     states[n][p]='off' if local<reveal else ('starting' if local<reveal+.12 else 'ready')
  if stage==3:states[1][0]='failed' if local<.35 else ('starting' if local<.65 else 'ready')
  lost=stage==4 and local<.8
  if lost:states[1]=['failed','failed']
  node_x=[455,695,935]
  for n,x in enumerate(node_x):
   failed=lost and n==1
   box(d,(x,211,x+220,438),'#302032' if failed else panel,red if failed else '#35516B',14)
   center(d,f'NODO {n+1}'+(' · CAÍDO' if failed else ''),x+110,225,19,red if failed else ink,True)
   for p,state in enumerate(states[n]):pod(d,x+32,266+p*73,state)
  ready=[(node_x[n]+110,290+p*73) for n in range(3) for p in range(2) if states[n][p]=='ready']
  particle_count=8 if stage==0 else 35
  for k in range(particle_count):
   phase=(t*(.45 if stage==0 else .7)+k/particle_count)%1
   if phase<.2:
    q=phase/.2;a=(139,290);b=(230,290)
   elif phase<.35:
    q=(phase-.2)/.15;a=(293,335);b=(293,371)
   elif ready:
    q=(phase-.35)/.65;a=(358,392);b=ready[k%len(ready)]
   else:continue
   px=a[0]+(b[0]-a[0])*q;py=a[1]+(b[1]-a[1])*q
   d.ellipse((px-3,py-3,px+3,py+3),fill=cyan)
  # Data layer and illustrative failover.
  dbswitch=stage==5 and .2<local<.55;dbpromoted=stage==5 and local>=.55
  for x,label,color in [(610,'Primario',green),(918,'Réplica',cyan)]:
   if stage==5:
    if x==610:label='Fuera de servicio' if local>.2 else 'Primario';color=red if local>.2 else green
    if x==918:label='Nuevo primario' if dbpromoted else ('Promoviendo' if dbswitch else 'Réplica');color=green if dbpromoted else (amber if dbswitch else cyan)
   box(d,(x,493,x+240,569),panel,color,15)
   center(d,'PostgreSQL',x+120,502,21,ink,True);center(d,label,x+120,534,18,color)
  if not dbpromoted:arrow(d,(855,530),(912,530),cyan)
  if stage==5 and dbpromoted:arrow(d,(1100,440),(1038,490),green,4)
  if stage==5 and dbswitch:center(d,'Pausa de escritura ilustrada',384,528,17,amber)
  else:center(d,'Reserva → Commit → Comprobante',305,535,18,green)
  messages=['Cada punto representa tráfico simbólico','La cifra es una meta, no una medición','Las réplicas crecen dentro de los recursos disponibles','Readiness habilita tráfico solo a instancias preparadas','Los nodos restantes necesitan margen para seguir atendiendo','La conmutación requiere configuración y pruebas propias']
  center(d,messages[stage],640,588,18,muted)
 caption=next((c for a,b,c in captions if a<=t<b),'')
 box(d,(36,618,1244,701),'#1A2D43',None,13)
 lines=wrap(d,caption,25,1140)
 for k,line in enumerate(lines):center(d,line,640,632+k*29,25)
 d.rectangle((0,713,int(1280*t/60),719),fill=cyan)
 return im

video=rev/'animacion-sin-audio.mp4'
logfile=(rev/'encode.log').open('wb')
proc=subprocess.Popen([ff,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','1280x720','-framerate',str(fps),'-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','fast','-crf','22','-pix_fmt','yuv420p',str(video)],stdin=subprocess.PIPE,stderr=logfile)
for i in range(60*fps):proc.stdin.write(frame(i/fps).tobytes())
proc.stdin.close();result=proc.wait();logfile.close()
if result:raise RuntimeError((rev/'encode.log').read_text())
output=root/'simulacion-kubernetes-reservas.mp4'
run(['-i',str(video),'-i',str(root/'narracion.wav'),'-t','60','-c:v','copy','-c:a','aac','-b:a','160k','-metadata','title=Simulación conceptual del seminario Kubernetes y reservas','-movflags','+faststart',str(output)])
run(['-i',str(output),'-f','null','-'])
checks=[]
for i in range(7):
 for suffix,fraction in ([('a',.25),('b',.72)] if i in (2,3,4,5) else [('a',.5)]):
  t=starts[i]+dur[i]*fraction;name=f'verificacion-{i+1:02}-{suffix}.png'
  run(['-ss',str(t),'-i',str(output),'-frames:v','1',str(rev/name)])
  checks.append({'image':name,'time':t})
probe=subprocess.run([ff,'-hide_banner','-i',str(output)],capture_output=True,text=True)
(rev/'media-info.txt').write_text(probe.stderr,encoding='utf-8')
(rev/'verificacion.json').write_text(json.dumps({'duration_seconds':60,'fps':fps,'frames':1440,'scenes':[{'title':s['title'],'start':start,'duration':length} for s,start,length in zip(scenes,starts,dur)],'captures':checks,'speed_adjustment':speed,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'conceptual_simulation':True,'full_decode_passed':True},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'output':str(output),'bytes':output.stat().st_size,'duration':60,'frames':1440,'voice_speed':speed}))
