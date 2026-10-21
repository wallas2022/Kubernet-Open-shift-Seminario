from pathlib import Path
import json,subprocess,wave,sys,textwrap,math
from PIL import Image,ImageDraw,ImageFont
sys.path.insert(0,'/tmp/seminario-video')
import imageio_ffmpeg

root=Path('/work/presentacion/video-seminario')
review=root/'revision';frames=review/'cuadros';frames.mkdir(parents=True,exist_ok=True)
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
scenes=json.loads((root/'fuentes/escenas.json').read_text(encoding='utf-8'))
def run(args):
 p=subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y',*args],capture_output=True,text=True)
 if p.returncode:raise RuntimeError(p.stderr)
def length(file):
 with wave.open(str(file)) as w:return w.getnframes()/w.getframerate()
raw=[length(review/f'audio/voz-{i+1:02}.wav') for i in range(len(scenes))]
speed=sum(raw)/60
assert .5<=speed<=2,speed
audios=[];durations=[]
for i,duration in enumerate(raw):
 dest=review/f'audio/ajustada-{i+1:02}.wav'
 run(['-i',str(review/f'audio/voz-{i+1:02}.wav'),'-af',f'atempo={speed:.10f}','-ar','44100','-ac','1',str(dest)])
 audios.append(dest);durations.append(duration/speed)
audio_list=review/'audio-list.txt'
audio_list.write_text(''.join(f"file '{p.as_posix()}'\n" for p in audios))
run(['-f','concat','-safe','0','-i',str(audio_list),'-af','apad','-t','60','-c:a','pcm_s16le',str(root/'narracion.wav')])
fontroot=Path('/usr/share/fonts/truetype/liberation')
def font(size,bold=False):return ImageFont.truetype(str(fontroot/('LiberationSans-Bold.ttf' if bold else 'LiberationSans-Regular.ttf')),size)
def wrap(draw,text,f,maxwidth):
 lines=[];line=''
 for word in text.split():
  proposed=(line+' '+word).strip()
  if draw.textlength(proposed,font=f)>maxwidth and line:lines.append(line);line=word
  else:line=proposed
 return lines+[line]
def stamp(seconds):
 ms=round(seconds*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
 return f'{h:02}:{m:02}:{s:02},{ms:03}'
manifest=[];subtitles=[];timeline=[];now=0;counter=1
for index,(scene,duration) in enumerate(zip(scenes,durations)):
 words=scene['voice'].split();chunks=[' '.join(words[i:i+9]) for i in range(0,len(words),9)]
 weights=[len(c.split()) for c in chunks];elapsed=0
 for part,(caption,weight) in enumerate(zip(chunks,weights)):
  segment=duration*weight/len(words)
  im=Image.new('RGB',(1280,720),'#F5F6F8');draw=ImageDraw.Draw(im)
  draw.rectangle((0,0,14,720),fill='#126A75')
  draw.text((62,44),scene['tag'],font=font(18,True),fill='#126A75')
  for row,line in enumerate(wrap(draw,scene['title'],font(39,True),1150)):
   draw.text((60,94+row*49),line,font=font(39,True),fill='#121C2B')
  y=225 if len(scene['lines'])<5 else 206
  bodyfont=font(27 if len(scene['lines'])>4 else 29)
  for line in scene['lines']:
   draw.ellipse((64,y+12,72,y+20),fill='#126A75')
   for row,text in enumerate(wrap(draw,line,bodyfont,1100)):
    draw.text((92,y+row*38),text,font=bodyfont,fill='#263447')
   y+=49 if len(scene['lines'])>4 else 78
  draw.rounded_rectangle((44,558,1236,682),radius=16,fill='#121C2B')
  captions=wrap(draw,caption,font(27),1100)
  for row,line in enumerate(captions):
   width=draw.textlength(line,font=font(27))
   draw.text(((1280-width)/2,582+row*37),line,font=font(27),fill='white')
  draw.text((1122,32),f'{index+1:02} / 08',font=font(17),fill='#5A6574')
  draw.rectangle((0,710,1280*(now+elapsed+segment)/60,720),fill='#126A75')
  file=frames/f'escena-{index+1:02}-{part+1:02}.png';im.save(file)
  manifest += [f"file '{file.as_posix()}'",f'duration {segment:.9f}']
  subtitles += [str(counter),f'{stamp(now+elapsed)} --> {stamp(now+elapsed+segment)}',caption,'']
  counter+=1;elapsed+=segment
 timeline.append({'scene':index+1,'start':now,'duration':duration,'voice':scene['voice']})
 now+=duration
manifest.append(f"file '{file.as_posix()}'")
(review/'frames.txt').write_text('\n'.join(manifest),encoding='utf-8')
(root/'seminario-un-minuto.srt').write_text('\n'.join(subtitles),encoding='utf-8')
output=root/'seminario-un-minuto.mp4'
run(['-f','concat','-safe','0','-i',str(review/'frames.txt'),'-i',str(root/'narracion.wav'),'-t','60','-r','30','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',str(output)])
(review/'timeline.json').write_text(json.dumps({'duration':60,'speed_adjustment':speed,'scenes':timeline},ensure_ascii=False,indent=2),encoding='utf-8')
# Decode the delivered artifact, not just the source PNGs.
run(['-i',str(output),'-f','null','-'])
for scene in timeline:
 run(['-ss',str(scene['start']+scene['duration']/2),'-i',str(output),'-frames:v','1',str(review/f"verificacion-{scene['scene']:02}.png")])
probe=subprocess.run([ffmpeg,'-hide_banner','-i',str(output)],capture_output=True,text=True)
(review/'media-info.txt').write_text(probe.stderr,encoding='utf-8')
print(json.dumps({'file':str(output),'bytes':output.stat().st_size,'duration':60,'scenes':8,'speed':speed}))
