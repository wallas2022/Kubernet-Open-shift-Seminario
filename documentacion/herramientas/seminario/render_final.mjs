import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {load_workspace_dependencies} from './runtime.mjs';
const runtime=await load_workspace_dependencies();
const {PresentationFile,FileBlob}=await import(pathToFileURL(path.join(runtime.nodeModules,'@oai/artifact-tool/dist/artifact_tool.mjs')));
const deck=await PresentationFile.importPptx(await FileBlob.load('presentacion/fase-06/DOC-06-02-seminario-seis-grupos.pptx'));
const out='presentacion/fase-06/revision/seis-grupos/final-import';
await fs.mkdir(out,{recursive:true});
for(let i=0;i<deck.slides.items.length;i++){
 const png=await deck.export({slide:deck.slides.items[i],format:'png',scale:1});
 await fs.writeFile(`${out}/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await png.arrayBuffer()));
}
console.log('Final slides imported and rendered: '+deck.slides.items.length);
process.exit(0);
