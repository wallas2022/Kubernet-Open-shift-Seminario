import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {load_workspace_dependencies} from './runtime.mjs';
const runtime=await load_workspace_dependencies();
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(runtime.nodeModules,'@oai/artifact-tool/dist/artifact_tool.mjs')));
const utils=await import(pathToFileURL(path.join(runtime.skill,'container_tools/artifact_tool_utils.mjs')));
const root=process.cwd(), build=path.join(root,'.runtime/seminario/build');
const preview=path.join(root,'presentacion/fase-06/revision/seis-grupos');
await fs.mkdir(build,{recursive:true});await fs.mkdir(preview,{recursive:true});
const content=JSON.parse(await fs.readFile('presentacion/fase-06/fuentes/DOC-06-02-contenido.json','utf8'));
if(content.length!==30)throw Error('Expected thirty slides');
const presentation=Presentation.create({slideSize:{width:1280,height:720}});
const font='Arial';
const groups={1:'G1 · Fundamentos y Arquitectura',2:'G2 · Escalabilidad y Autoescalado',3:'G3 · Resiliencia Disponibilidad y Seguridad',4:'G4 · Persistencia Consistencia y Mensajería',5:'G5 · Observabilidad y Métricas',6:'G6 · Diseño Experimental y Análisis Estadístico'};
function text(slide,value,x,y,w,h,size=28,bold=false,color='#111111',align='left'){
 const shape=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 shape.text=value;shape.text.insets=0;shape.text.style={typeface:font,fontSize:size,bold,color,alignment:align,verticalAlignment:'top'};return shape;
}
function lines(slide,values,x,y,w,size=27,step=90){values.forEach((value,i)=>text(slide,value,x,y+i*step,w,76,size));}
for(let index=0;index<content.length;index++){
 const data=content[index],slide=presentation.slides.add();slide.background.fill='#FFFFFF';
 if(data.group)text(slide,groups[data.group],72,34,1136,32,17,true,'#555555');
 if(data.type==='cover'){
   text(slide,data.title,72,125,1136,100,58,true);
   text(slide,data.subtitle,72,255,1050,110,34);
   lines(slide,data.body,72,440,1100,27,66);
 }else{
   text(slide,data.title,72,84,1136,104,40,true);
   if(data.type==='text'){
     text(slide,data.lead,72,218,1136,105,32,true);
     lines(slide,data.body,90,350,1090,28,88);
   }else if(data.type==='columns'){
     text(slide,data.leftTitle,72,218,525,60,28,true);
     text(slide,data.rightTitle,680,218,528,60,28,true);
     lines(slide,data.left,72,304,525,26,98);
     lines(slide,data.right,680,304,528,26,98);
   }else if(data.type==='flow'){
     data.nodes.forEach((node,i)=>{
       const x=72+i*286;
       const box=slide.shapes.add({geometry:'rect',position:{left:x,top:248,width:238,height:110},fill:'#F2F2F2',line:{fill:'#888888',width:1}});
       box.text=node;box.text.insets=12;box.text.style={typeface:font,fontSize:25,bold:true,color:'#111111',alignment:'center',verticalAlignment:'middle'};
       if(i<data.nodes.length-1)text(slide,'→',x+246,274,36,60,34);
     });
     lines(slide,data.body,72,438,1136,28,78);
   }else if(data.type==='table'){
     const values=[data.headers,...data.rows];
     const widths=index===2?[100,900,136]:[370,350,416];
     const table=slide.tables.add({rows:values.length,columns:3,left:72,top:218,width:1136,height:values.length*55,columnWidths:widths,values});
     table.borders.assign({fill:'#CCCCCC',width:1,style:'solid'});
     for(let r=0;r<values.length;r++)for(let c=0;c<3;c++){
       const cell=table.getCell(r,c);cell.fill=r===0?'#111111':'#FFFFFF';cell.text.style={typeface:font,fontSize:22,bold:r===0,color:r===0?'#FFFFFF':'#111111'};
     }
   }else if(data.type==='chart'){
     const chart=slide.charts.add('bar',{position:{left:100,top:200,width:1080,height:335},title:data.chartTitle,titleTextStyle:{typeface:font,fontSize:22},categories:data.categories,series:[{name:'p95 en ms',values:data.values,fill:'#454545'}],barOptions:{direction:'column',gapWidth:170},hasLegend:false,dataLabels:{showValue:true,position:'outEnd',numberFormatCode:'0.00',textStyle:{fontSize:20}},xAxis:{textStyle:{fontSize:18}},yAxis:{min:0,max:25,majorUnit:5,numberFormatCode:'0',textStyle:{fontSize:18}},chartFill:'#FFFFFF',plotAreaFill:'#FFFFFF'});
     utils.applyPresentationChartFont(chart,{fontFamily:font});
     lines(slide,data.body,72,548,1136,24,44);
   }
 }
 if(data.footer)text(slide,data.footer,72,646,1100,48,18,false,'#444444');
 text(slide,String(index+1).padStart(2,'0'),1208,684,36,24,13,false,'#555555');
 slide.speakerNotes.text=data.notes+'\n\nFuentes\n'+data.sources.join('\n');
 const png=await presentation.export({slide,format:'png',scale:1});
 await fs.writeFile(path.join(preview,`slide-${String(index+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
}
const candidate=path.join(build,'candidate.pptx');
await(await PresentationFile.exportPptx(presentation)).save(candidate);
const finalPath=path.join(root,'presentacion/fase-06/DOC-06-02-seminario-seis-grupos.pptx');
let finalized=false;
try{
 const validated=path.join(build,'final-'+Date.now()+'.pptx');
 await utils.finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:validated,pythonExecutable:runtime.python,integrityValidatorPath:path.join(runtime.skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(runtime.skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit','--require-native-table-slide','3','--require-native-table-slide','27'],explicitTotalSlideCount:30,requiredNativeTableOwnerSlides:[3,27],requiredNativeChartOwnerSlides:[19],materializeLiteralChartWorkbooks:true,fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,receiptPath:path.join(preview,'validation.json')});
 await fs.copyFile(validated,finalPath);finalized=true;
}catch(error){await fs.writeFile(path.join(preview,'finalizer-limitation.txt'),String(error.message));}
await fs.writeFile(path.join(preview,'build-status.json'),JSON.stringify({slides:30,nativeTables:[3,27],nativeChart:19,notes:30,finalized,runtime:runtime.version},null,2));
console.log('Built thirty slides; finalizer='+finalized);
process.exit(0);
