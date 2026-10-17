const fs = require('fs');
const path = require('path');
const {chromium} = require('/tmp/doc10-node/node_modules/playwright');

async function main() {
  const dir = process.env.DIAGRAM_SOURCE_DIR ?? '/work/diagramas/fase-10';
  const out = process.env.DIAGRAM_OUTPUT_DIR ?? '/work/documentacion/fase-10/revision/figuras';
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1800,height:1600}, deviceScaleFactor:1.5});
  // Mermaid runs entirely inside the container. The HTTP server exposes only its dependency files.
  const http = require('http');
  const base = '/tmp/doc10-node/node_modules/mermaid/dist';
  const server = http.createServer((req,res)=>{
    const name = path.resolve(base, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!name.startsWith(base + '/')) {res.writeHead(403);res.end();return;}
    if (!fs.existsSync(name)) {res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(name));
  });
  await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
  await page.goto('http://127.0.0.1:8765/mermaid.esm.min.mjs');
  await page.setContent('<html><body style="margin:24px;background:white"><div id="figure"></div></body></html>');
  await page.evaluate(async()=>{
    const mod = await import('http://127.0.0.1:8765/mermaid.esm.min.mjs');
    window.mermaid = mod.default;
    window.mermaid.initialize({startOnLoad:false, securityLevel:'strict', theme:'neutral',
      themeVariables:{fontFamily:'Liberation Serif',fontSize:'20px'},
      flowchart:{htmlLabels:false,curve:'linear',useMaxWidth:false},
      sequence:{useMaxWidth:false}, er:{useMaxWidth:false}});
  });
  const results=[];
  for (const name of fs.readdirSync(dir).filter(x=>x.endsWith('.mmd')).sort()) {
    const source=fs.readFileSync(path.join(dir,name),'utf8');
    const svg=await page.evaluate(async(source)=>{
      await window.mermaid.parse(source);
      const {svg}=await window.mermaid.render('diagram',source);
      document.getElementById('figure').innerHTML=svg;
      const element = document.querySelector('#figure svg');
      const style = document.createElementNS('http://www.w3.org/2000/svg','style');
      style.textContent='.edgeLabel rect{fill:white!important}.edgeLabel text,.edgeLabel tspan{fill:black!important}';
      element.appendChild(style);
      return element.outerHTML;
    },source);
    fs.writeFileSync(path.join(out,name.replace('.mmd','.svg')),svg);
    await page.locator('#figure svg').screenshot({path:path.join(out,name.replace('.mmd','.png'))});
    results.push({diagram:name,parse:'pass',render:'pass'});
  }
  fs.writeFileSync(process.env.DIAGRAM_REPORT_PATH ?? '/work/documentacion/fase-10/revision/diagramas.json',JSON.stringify(results,null,2));
  console.log('Diagramas analizados y renderizados:',results.length);
  await browser.close(); server.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
