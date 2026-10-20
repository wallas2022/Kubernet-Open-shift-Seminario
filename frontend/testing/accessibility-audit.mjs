import { writeFile } from 'node:fs/promises';
export async function inspectAccessibility(page, screen, out, baseline = false) {
  const semantic = await page.evaluate(() => {
    const references = [], counts = new Map();
    for (const el of document.querySelectorAll('[id]')) counts.set(el.id, (counts.get(el.id) || 0) + 1);
    for (const el of document.querySelectorAll('[aria-describedby],[aria-labelledby],[aria-errormessage]')) {
      for (const attr of ['aria-describedby','aria-labelledby','aria-errormessage']) for (const id of (el.getAttribute(attr) || '').split(/\s+/).filter(Boolean)) if (counts.get(id) !== 1) references.push({attr,id});
    }
    const invalid = Array.from(document.querySelectorAll('input[aria-invalid=true]')).map(el => ({label:el.labels?.[0]?.textContent,description:el.getAttribute('aria-describedby'),error:el.getAttribute('aria-errormessage')}));
    const live = Array.from(document.querySelectorAll('[role=status],[role=alert]')).filter(el => el.textContent.trim()).map(el => ({role:el.getAttribute('role'),text:el.textContent.trim(),busyAncestor:!!el.closest('[aria-busy=true]'),atomic:el.getAttribute('aria-atomic')}));
    return {references,invalid,live,mainCount:document.querySelectorAll('main').length};
  });
  const colorReport = await page.evaluate(() => {
    const parse = text => { const m = text.match(/^rgba?\(([^)]+)\)$/); if (!m) return null; const a = m[1].split(',').map(Number); return [...a.slice(0,3), a[3] ?? 1]; };
    const mix = (front, back) => front.slice(0,3).map((n,i) => n*front[3] + back[i]*(1-front[3]));
    const luminance = color => color.map(n=>n/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[0.2126,0.7152,0.0722][i],0);
    const ratio = (a,b) => (Math.max(luminance(a),luminance(b))+0.05)/(Math.min(luminance(a),luminance(b))+0.05);
    const measured=[];
    for (const el of document.querySelectorAll('body *')) {
      if (!Array.from(el.childNodes).some(node=>node.nodeType===Node.TEXT_NODE && node.textContent.trim()) || !el.getClientRects().length || el.closest('button:disabled,input:disabled,[aria-disabled=true],script,style')) continue;
      if(el.matches('.skip-link') && !el.matches(':focus'))continue;
      const style=getComputedStyle(el); if(style.visibility==='hidden')continue;
      const ancestors=[];for(let at=el;at;at=at.parentElement)ancestors.unshift(at);
      let bg=[255,255,255]; for(const ancestor of ancestors){const rgba=parse(getComputedStyle(ancestor).backgroundColor);if(rgba)bg=mix(rgba,bg);}
      const fg=parse(style.color);if(!fg)continue;
      const size=parseFloat(style.fontSize),large=size>=24 || (parseFloat(style.fontWeight)>=700 && size>=18.6667);
      const contrast=ratio(mix(fg,bg),bg),required=large?3:4.5;
      measured.push({tag:el.tagName,class:typeof el.className==='string'?el.className:'',text:el.textContent.trim().slice(0,100),foreground:style.color,background:bg.map(Math.round),fontSize:size,required,ratio:Number(contrast.toFixed(3)),passed:contrast>=required});
    }
    const controls=[];
    for(const el of document.querySelectorAll('input:not(:disabled),button:focus-visible,a:focus-visible,h1:focus-visible,h2:focus-visible')){
      if(!el.getClientRects().length)continue;
      const style=getComputedStyle(el),focused=el.matches(':focus-visible');
      // A positive outline offset puts the ring on the surrounding canvas, outside the control fill.
      const canvas=focused&&parseFloat(style.outlineOffset)>=0?el.parentElement:el;
      const ancestors=[];for(let at=canvas;at;at=at.parentElement)ancestors.unshift(at);
      let bg=[255,255,255];for(const at of ancestors){const rgba=parse(getComputedStyle(at).backgroundColor);if(rgba)bg=mix(rgba,bg);}
      const color=parse(el.tagName==='INPUT'&&!focused?style.borderTopColor:style.outlineColor);
      const width=parseFloat(el.tagName==='INPUT'&&!focused?style.borderTopWidth:style.outlineWidth);
      if(color){const contrast=ratio(mix(color,bg),bg);controls.push({tag:el.tagName,kind:focused?'focus':'input-border',width,ratio:Number(contrast.toFixed(3)),required:3,passed:width>0&&contrast>=3});}
    }
    return {measured,controls};
  });
  const colors=colorReport.measured,components=colorReport.controls;
  const session=await page.context().newCDPSession(page);const tree=await session.send('Accessibility.getFullAXTree');await session.detach();
  const accessible = tree.nodes.filter(node=>!node.ignored && ['status','alert','heading','alertdialog','main','textbox'].includes(node.role?.value)).map(node=>({role:node.role?.value,name:node.name?.value,description:node.description?.value,properties:node.properties?.filter(p=>['live','atomic','busy','level','modal','invalid'].includes(p.name)).map(p=>({name:p.name,value:p.value?.value}))}));
  await writeFile(`${out}/${screen}-a11y.json`,JSON.stringify({screen,baseline,semantic,colors,components,accessible},null,2));
  const failures=[...semantic.references.map(ref=>`broken-reference-${ref.id}`),...semantic.invalid.filter(f=>!f.description||!f.error).map(f=>`unassociated-error-${f.label}`),...semantic.live.filter(l=>l.busyAncestor).map(l=>`busy-live-${l.role}`),...colors.filter(c=>!c.passed).map(c=>`contrast-${c.tag}-${c.class}-${c.ratio}`)];
  failures.push(...components.filter(c=>!c.passed).map(c=>`component-${c.kind}-${c.ratio}`));
  if(semantic.mainCount!==1)failures.push('main-landmark-count');
  if(failures.length && !baseline)throw Error(`${screen}: ${failures.join(', ')}`);
  return {screen,textColors:colors.length,componentColors:components.length,failures,accessibleRoles:accessible.length};
}
