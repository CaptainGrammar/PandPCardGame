/* First Impressions: A Game of Delicate Hostilities — card creator.
   All imagery is embedded as data URIs, so previews and PNGs work offline. */
(() => {
  'use strict';
  const ART = window.REGENCY_ART || {};
  // Deliberately preserve the legacy key so older saved cards continue to load.
  const STORE_KEY = 'society-scandal-card-creator-v1';
  const W = 720, H = 1040; // portrait character cards
  const LW = 1040, LH = 720; // landscape setting cards
  const dimensions = c => c.type === 'setting' ? {w:LW,h:LH} : {w:W,h:H};
  const TRAITS = ['Proud','Prejudiced','Charming','Witty','Ambitious','Loyal','Romantic','Pragmatic','Manipulative','Impulsive','Reserved','Outspoken','Conventional','Independent','Compassionate','Vain'];
  const palette = {
    gold: { frame: '#27392f', trim: '#c5ab6c', dark: '#1c2b24', medallion: '#5a7380' },
    sage: { frame: '#536656', trim: '#dcc995', dark: '#293d33', medallion: '#647b67' },
    blue: { frame: '#475f6a', trim: '#e0c99a', dark: '#293e49', medallion: '#5a7887' },
    rose: { frame: '#745a58', trim: '#ddc49c', dark: '#503b3b', medallion: '#97716d' },
    charcoal: { frame: '#303430', trim: '#d0b68a', dark: '#1b201b', medallion: '#536158' }
  };
  const defaultCards = [
    {id:'elizabeth',type:'character',name:'Elizabeth Bennet',image:'asset:elizabeth',sway:3,standing:4,ability1:'<b>Independent Spirit:</b> Gain +1 Sway when challenging Lady Catherine.',ability2:'<i>Sharp Observation:</i> If Darcy is on the opposing side, Elizabeth gains +1 Standing.',quote:'“I could easily forgive his pride, if he had not mortified mine.”',tags:'Witty, Independent',showStats:false,color:'gold',pattern:'sprigs',ornament:'floral',imageZoom:100,imageX:0,imageY:0},
    {id:'darcy',type:'character',name:'Fitzwilliam Darcy',image:'asset:darcy',sway:2,standing:6,ability1:'<b>Devotion:</b> Gain +2 Standing while Elizabeth is on your side.',ability2:'<i>Reserve:</i> When challenged by Wickham, reduce incoming damage by 1.',quote:'“My good opinion once lost, is lost forever.”',tags:'Proud, Loyal, Reserved',showStats:false,color:'blue',pattern:'vines',ornament:'floral',imageZoom:100,imageX:0,imageY:0},
    {id:'netherfield',type:'setting',name:'Netherfield Ball',image:'asset:netherfield',sway:1,standing:2,ability1:'<b>Favorable Acquaintances:</b> Jane Bennet and Bingley each gain +2 Standing.',ability2:'<i>First Impressions:</i> The first character introduced by each player gains +1 Sway.',quote:'An evening of dancing, conversation, and uneasy first impressions.',tags:'',showStats:false,color:'sage',pattern:'vines',ornament:'vines',imageZoom:100,imageX:0,imageY:0}
  ];
  const getEl = id => document.getElementById(id);
  const form = {
    name:getEl('card-name'),sway:getEl('sway'),standing:getEl('standing'),ability1:getEl('ability-1'),ability2:getEl('ability-2'),quote:getEl('quote'),showStats:getEl('show-stats'),imageZoom:getEl('image-zoom'),imageX:getEl('image-x'),imageY:getEl('image-y')
  };
  const canvas = getEl('card-preview');
  const gallery = getEl('gallery-list');
  const status = getEl('save-status');
  const imageCache = new Map();
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { /* no local data */ }
  let cards = Array.isArray(stored) && stored.length ? stored.map(sanitizeCard).filter(Boolean) : defaultCards.map(sanitizeCard);
  if (!cards.length) cards = defaultCards.map(sanitizeCard);
  let selectedId = cards[0].id;
  let dirty = false;
  let toastTimer;

  function freshId() { return 'card-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7); }
  function escapeHTML(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  // Whitelist markup for the rich-text abilities. Imported/pasted HTML is never trusted.
  function sanitizeRich(input){
    const doc=new DOMParser().parseFromString('<div>'+String(input??'')+'</div>','text/html');
    const root=doc.body.firstElementChild;
    function walk(node){
      if(node.nodeType===3){return escapeHTML(node.nodeValue||'');}
      if(node.nodeType!==1)return '';
      const tag=node.tagName.toLowerCase();
      if(['script','style','svg','iframe','object'].includes(tag))return '';
      if(tag==='br')return '<br>';
      const children=[...node.childNodes].map(walk).join('');
      if(tag==='b'||tag==='strong')return '<b>'+children+'</b>';
      if(tag==='i'||tag==='em')return '<i>'+children+'</i>';
      if(tag==='div'||tag==='p')return children+(node===root?'':'<br>');
      return children;
    }
    return [...root.childNodes].map(walk).join('').replace(/(?:<br>){3,}/g,'<br><br>').replace(/(?:<br>)+$/,'');
  }
  function normalizeTags(raw){
    const picked=(Array.isArray(raw)?raw.join(','):String(raw||'')).split(',').map(t=>t.trim()).filter(t=>TRAITS.includes(t));
    return [...new Set(picked)].slice(0,3).join(', ');
  }
  function sanitizeCard(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string') return null;
    const str = (v,n) => typeof v === 'string' ? v.slice(0,n) : '';
    const integer = (v,f,min,max) => Number.isFinite(+v) ? Math.max(min,Math.min(max,Math.round(+v))) : f;
    const image = str(raw.image,1000000);
    // Migrate old single-ability cards without destroying their text or styling.
    let legacy=str(raw.abilityText,10000);
    const oldTitle=str(raw.abilityName,44).trim();
    if(oldTitle && !legacy.toLowerCase().startsWith(oldTitle.toLowerCase())) legacy=oldTitle+' — '+legacy;
    const ability1=sanitizeRich(raw.ability1===undefined?escapeHTML(legacy):raw.ability1);
    const ability2=sanitizeRich(raw.ability2===undefined?'':raw.ability2);
    return {id:str(raw.id,80)||freshId(),type:raw.type==='setting'?'setting':'character',name:str(raw.name,42),image:image.startsWith('asset:')||/^data:image\/(?:jpeg|png|webp);base64,/.test(image)?image:'',sway:integer(raw.sway,3,1,4),standing:integer(raw.standing,4,2,7),ability1,ability2,quote:str(raw.quote,160),tags:normalizeTags(raw.tags),showStats:Boolean(raw.showStats),color:palette[raw.color]?raw.color:'gold',pattern:['sprigs','vines','damask','leaves','none'].includes(raw.pattern)?raw.pattern:'sprigs',ornament:['floral','vines','minimal'].includes(raw.ornament)?raw.ornament:'floral',imageZoom:integer(raw.imageZoom,100,100,250),imageX:integer(raw.imageX,0,-100,100),imageY:integer(raw.imageY,0,-100,100)};
  }
  function active() { return cards.find(c=>c.id===selectedId) || cards[0]; }
  function srcFor(s) { return (s||'').startsWith('asset:') ? ART[s.split(':')[1]] : s; }
  function imageFor(src) {
    if(!src) return null;
    const url=srcFor(src); if(!url) return null;
    if(imageCache.has(url)) return imageCache.get(url);
    const img=new Image(); imageCache.set(url,img);
    img.onload=()=>{drawPreview();drawGalleryCanvases();};
    img.onerror=()=>{imageCache.set(url,null);};
    img.src=url;
    return img;
  }
  function setStatus(msg) { status.textContent=msg; }
  function toast(msg) {
    const node=getEl('toast'); node.textContent=msg; node.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2400);
  }
  function setType(type) {
    const card=active(); card.type=type; dirty=true;
    updateFields(); updatePreview(); setStatus('Unsaved changes · Select “Save Draft” to keep them.');
  }
  function updateFields() {
    const c=active();
    getEl('type-character').classList.toggle('active',c.type==='character');
    getEl('type-setting').classList.toggle('active',c.type==='setting');
    getEl('type-character').setAttribute('aria-pressed',String(c.type==='character'));
    getEl('type-setting').setAttribute('aria-pressed',String(c.type==='setting'));
    getEl('name-label').textContent=c.type==='setting'?'Setting Name':'Character Name';
    getEl('art-label').textContent=c.type==='setting'?'Setting Artwork':'Portrait Artwork';
    getEl('stats-fields').hidden=c.type==='setting';
    getEl('traits-field').hidden=c.type==='setting';
    getEl('ability-label-1').textContent=c.type==='setting'?'Setting Effect I':'Interaction I';
    getEl('ability-label-2').textContent=c.type==='setting'?'Setting Effect II':'Interaction II';
    form.name.value=c.name;form.sway.value=c.sway;form.standing.value=c.standing;
    form.ability1.innerHTML=c.ability1||'';form.ability2.innerHTML=c.ability2||'';
    form.quote.value=c.quote;form.showStats.checked=!!c.showStats;
    syncTraitButtons(c.tags);
    updateImagePositionControls();
    getEl('sway-output').textContent=c.sway;getEl('standing-output').textContent=c.standing;
    getEl('preview-kind').textContent=c.type==='setting'?'SETTING CARD':'CHARACTER CARD';
    const d=dimensions(c);
    getEl('preview-size').textContent=`${d.w} × ${d.h} px · print-ready PNG available`;
    document.querySelectorAll('[data-color]').forEach(b=>{b.classList.toggle('active',b.dataset.color===c.color);b.setAttribute('aria-pressed',String(b.dataset.color===c.color));});
    document.querySelectorAll('[data-pattern]').forEach(b=>{b.classList.toggle('active',b.dataset.pattern===c.pattern);b.setAttribute('aria-pressed',String(b.dataset.pattern===c.pattern));});
    document.querySelectorAll('[data-ornament]').forEach(b=>{b.classList.toggle('active',b.dataset.ornament===c.ornament);b.setAttribute('aria-pressed',String(b.dataset.ornament===c.ornament));});
    const thumb=getEl('uploaded-image');thumb.replaceChildren();
    if(c.image){const im=document.createElement('img'); im.alt='Current card artwork';im.src=srcFor(c.image);thumb.append(im);}else{const s=document.createElement('span');s.textContent='❦';thumb.append(s);}
    canvas.classList.toggle('art-draggable',Boolean(c.image));
    resizeCardCanvas(c);
    updateStatWarning();
  }
  function updateImagePositionControls(){
    const c=active();
    for(const key of ['imageZoom','imageX','imageY'])form[key].value=c[key]??(key==='imageZoom'?100:0);
    getEl('image-zoom-output').textContent=(c.imageZoom??100)+'%';
    const describe=(n,a,b)=>n===0?'Center':n<0?`${Math.abs(n)}% ${a}`:`${n}% ${b}`;
    getEl('image-x-output').textContent=describe(c.imageX??0,'Left','Right');
    getEl('image-y-output').textContent=describe(c.imageY??0,'Up','Down');
  }
  function updateStatWarning(){const c=active();const guidance=getEl('stat-guidance');const over=c.sway+c.standing>9;guidance.classList.toggle('warning',over);guidance.textContent=over?'Combined stats exceed the suggested 9-point limit.':'Suggested combined stats: no more than 9.';}
  function syncTraitButtons(tags){
    const selected=new Set(String(tags||'').split(',').map(t=>t.trim()).filter(Boolean));
    document.querySelectorAll('.trait-chip').forEach(btn=>{
      const on=selected.has(btn.dataset.trait);
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-pressed',String(on));
    });
    const count=selected.size;
    document.querySelectorAll('.trait-chip').forEach(btn=>{
      const on=selected.has(btn.dataset.trait);
      btn.disabled=!on && count>=3;
    });
    const helper=getEl('traits-helper');
    if(helper)helper.textContent=count?`Selected ${count} of 3 traits. These appear as bubbles on character cards.`:'Selected 0 of 3 traits. These appear as bubbles on character cards.';
  }
  function toggleTrait(trait){
    const c=active();
    const selected=String(c.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
    const set=new Set(selected);
    if(set.has(trait)) set.delete(trait);
    else if(set.size<3) set.add(trait);
    editField('tags',[...set].join(', '));
    syncTraitButtons(active().tags);
  }
  function updatePreview() { drawPreview();drawGalleryCanvases(); }
  function editField(key,value) { const c=active();c[key]=value;dirty=true;setStatus('Unsaved changes · Select “Save Draft” to keep them.');updatePreview(); }
  function loadCard(id) { selectedId=id;dirty=false;updateFields();renderGallery();drawPreview();setStatus('Editing “'+active().name+'”.'); }
  function newCard(type) {
    const c={id:freshId(),type,name:type==='setting'?'New Setting':'New Character',image:'',sway:2,standing:5,ability1:'',ability2:'',quote:'',tags:'',showStats:false,color:'gold',pattern:'sprigs',ornament:'floral',imageZoom:100,imageX:0,imageY:0};
    cards.push(c); selectedId=c.id;dirty=true;updateFields();renderGallery();drawPreview();setStatus('New card · Enter its details, then save.');
    getEl('card-name').focus();getEl('card-name').select();
  }
  function save() {
    try {localStorage.setItem(STORE_KEY,JSON.stringify(cards));dirty=false;setStatus('Saved in this browser · '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));toast('Your card gallery has been saved.');}
    catch(e){setStatus('Unable to save. Browser storage might be full. Export your card data instead.');toast('Browser storage is full; try exporting JSON.');}
  }
  function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  function safeFileName(name) {return (name || 'card').toLowerCase().replace(/[^a-z0-9- ]+/g,'').replace(/\s+/g,'-').slice(0,65)||'card';}
  function exportData(){ const blob=new Blob([JSON.stringify({format:'first-impressions',game:'First Impressions: A Game of Delicate Hostilities',version:7,card:active()},null,2)],{type:'application/json'});downloadBlob(blob,safeFileName(active().name)+'.json');toast('Card data exported.'); }
  async function pngExport(){
    const c=active();const img=imageFor(c.image);
    if(img && !img.complete) await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});
    const output=document.createElement('canvas');const d=dimensions(c);output.width=d.w*2;output.height=d.h*2;const ctx=output.getContext('2d');ctx.scale(2,2);renderCard(ctx,c);
    output.toBlob(blob=>{if(!blob){toast('Could not render PNG.');return;}downloadBlob(blob,safeFileName(c.name)+'.png');toast('High-resolution PNG downloaded.');},'image/png');
  }
  async function processImageFile(file) {
    if(!file || !/^image\/(jpeg|png|webp)$/.test(file.type)){toast('Choose a JPG, PNG, or WebP image.');return;}
    if(file.size>15000000){toast('Please choose an image smaller than 15 MB.');return;}
    const fr=new FileReader();fr.onload=()=>{
      const img=new Image(); img.onload=()=>{
        const maxW=900,maxH=1150,scale=Math.min(1,maxW/img.width,maxH/img.height),c=document.createElement('canvas');
        c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
        const cx=c.getContext('2d');cx.fillStyle='#eee5d0';cx.fillRect(0,0,c.width,c.height);cx.drawImage(img,0,0,c.width,c.height);
        Object.assign(active(),{imageZoom:100,imageX:0,imageY:0});editField('image',c.toDataURL('image/jpeg',.83));updateFields();toast('Artwork added. Drag it on the card or adjust the size and position sliders.');
      };img.onerror=()=>toast('The image could not be opened.');img.src=fr.result;
    };fr.readAsDataURL(file);
  }
  function importJson(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result),raw=data.card||data,c=sanitizeCard(raw);if(!c)throw new Error('Invalid card');c.id=freshId();cards.push(c);loadCard(c.id);dirty=true;setStatus('Imported card · Save to keep it in this browser.');toast('Card imported.');}catch(e){toast('Could not import this card JSON file.');}};reader.readAsText(file);}

  // Canvas card drawing. The same renderer powers the live preview, gallery, and PNG export.
  function rounded(ctx,x,y,w,h,r,fill,stroke,width=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
  function line(ctx,x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function artworkDimensions(img,x,y,w,h,c){
    const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*(c.imageZoom||100)/100;
    const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
    const px=Math.max(-100,Math.min(100,c.imageX||0)),py=Math.max(-100,Math.min(100,c.imageY||0));
    // Positive alignment values move the visible artwork right or down.
    return {dx:x+(w-dw)*(100-px)/200,dy:y+(h-dh)*(100-py)/200,dw,dh};
  }
  function cover(ctx,img,x,y,w,h,c){
    if(!img||!img.complete||!img.naturalWidth)return false;
    const box=artworkDimensions(img,x,y,w,h,c);
    ctx.drawImage(img,box.dx,box.dy,box.dw,box.dh);
    return true;
  }
  function centerText(ctx,text,x,y,font,color,maxW){ctx.save();ctx.fillStyle=color;ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y,maxW);ctx.restore();}
  function metricCenterText(ctx,text,cx,cy,font,color,maxW){
    ctx.save();ctx.fillStyle=color;ctx.font=font;ctx.textAlign='left';ctx.textBaseline='alphabetic';
    const m=ctx.measureText(String(text||''));
    if(m.actualBoundingBoxLeft!==undefined){
      const x=cx-(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2;
      const y=cy+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2;
      ctx.fillText(text,x,y,maxW);
    }else{
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,cx,cy,maxW);
    }
    ctx.restore();
  }
  function drawTrackedCentered(ctx,text,cx,cy,font,color,tracking=0,maxW){
    ctx.save();ctx.fillStyle=color;ctx.font=font;ctx.textBaseline='alphabetic';
    const chars=[...String(text||'')];
    const widths=chars.map(ch=>ctx.measureText(ch).width);
    const total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*tracking;
    let x=cx-total/2;
    const m=ctx.measureText(String(text||''));
    const y=cy+(m.actualBoundingBoxAscent!==undefined?(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2:0);
    chars.forEach((ch,i)=>{ctx.fillText(ch,x,y,maxW);x+=widths[i]+tracking;});
    ctx.restore();
  }
  function wrap(ctx,text,maxWidth,maxLines){
    const paras=String(text||'').split(/\n/),lines=[];
    paras.forEach(para=>{let current='';for(const word of para.trim().split(/\s+/).filter(Boolean)){const attempt=current?current+' '+word:word;if(ctx.measureText(attempt).width>maxWidth && current){lines.push(current);current=word;}else current=attempt;}if(current)lines.push(current);});
    if(lines.length>maxLines){const trimmed=lines.slice(0,maxLines),last=trimmed.length-1;while(ctx.measureText(trimmed[last]+'…').width>maxWidth && trimmed[last].length>1)trimmed[last]=trimmed[last].slice(0,-1);trimmed[last]+='…';return trimmed;}return lines;
  }
  function centeredLines(ctx,text,x,startY,maxWidth,font,color,lineHeight,maxLines){ctx.font=font;const rows=wrap(ctx,text,maxWidth,maxLines);rows.forEach((s,i)=>centerText(ctx,s,x,startY+i*lineHeight,font,color,maxWidth));return rows.length;}
  function richCharacters(html){
    const doc=new DOMParser().parseFromString('<div>'+sanitizeRich(html||'')+'</div>','text/html');
    const chars=[];
    function walk(n,bold=false,italic=false){
      if(n.nodeType===3){for(const ch of n.nodeValue||'')chars.push({ch,bold,italic});return;}
      if(n.nodeType!==1)return;
      const tag=n.tagName.toLowerCase();
      if(tag==='br'){chars.push({ch:'\n',bold:false,italic:false});return;}
      for(const child of n.childNodes)walk(child,bold||tag==='b'||tag==='strong',italic||tag==='i'||tag==='em');
    }
    for(const child of doc.body.firstElementChild.childNodes)walk(child);
    return chars;
  }
  function fontFor(g,size){return `${g.italic?'italic ':''}${g.bold?'bold ':''}${size}px Georgia`}
  function layoutRich(ctx,chars,maxW,size){
    const lines=[];let line=[],width=0;
    const flush=()=>{lines.push({glyphs:line,width});line=[];width=0;};
    let i=0;
    while(i<chars.length){
      const ch=chars[i];
      if(ch.ch==='\n'){flush();i++;continue;}
      if(/\s/.test(ch.ch)){
        if(line.length){ctx.font=fontFor(ch,size);const w=ctx.measureText(' ').width;
          if(width+w<=maxW){line.push({...ch,ch:' ',w});width+=w;}}
        i++;while(i<chars.length&&chars[i].ch!=='\n'&&/\s/.test(chars[i].ch))i++;
        continue;
      }
      const word=[];let wordWidth=0;
      while(i<chars.length&&!/\s/.test(chars[i].ch)){
        const item=chars[i++];ctx.font=fontFor(item,size);const w=ctx.measureText(item.ch).width;
        word.push({...item,w});wordWidth+=w;
      }
      if(line.length&&width+wordWidth>maxW){while(line.length&&line.at(-1).ch===' '){width-=line.pop().w;}flush();}
      for(const letter of word){
        if(line.length&&width+letter.w>maxW)flush();
        line.push(letter);width+=letter.w;
      }
    }
    if(line.length||!lines.length)flush();
    return lines;
  }
  function drawRichTextFit(ctx,html,box,color){
    const glyphs=richCharacters(html);
    if(!glyphs.length)return;
    let size=27,lines=[];
    // Keep reducing the font until *all* content fits. No ellipses or cut-off lines.
    for(;size>=1;size-=.5){
      lines=layoutRich(ctx,glyphs,box.w,size);
      const lineHeight=size*1.24;
      if(lines.length*lineHeight<=box.h)break;
    }
    const lineHeight=size*1.24;
    let cy=box.y+(box.h-lines.length*lineHeight)/2+lineHeight/2;
    ctx.save();ctx.fillStyle=color;ctx.textBaseline='middle';ctx.textAlign='left';
    for(const row of lines){
      let cx=box.x+(box.w-row.width)/2;
      for(const glyph of row.glyphs){ctx.font=fontFor(glyph,size);ctx.fillText(glyph.ch,cx,cy);cx+=glyph.w;}
      cy+=lineHeight;
    }
    ctx.restore();
  }
  function drawSprig(ctx,x,y,angle,scale=1,color='#667b60'){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.9;
    ctx.beginPath();ctx.moveTo(0,23);ctx.bezierCurveTo(-8,6,12,-10,1,-23);ctx.stroke();
    for(let i=0;i<5;i++){
      const yy=16-i*9;
      ctx.beginPath();ctx.ellipse(-5-(i%2),yy,6.2,3.1,-.85,0,Math.PI*2);
      ctx.ellipse(5+(i%2),yy-4,6.2,3.1,.85,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function drawVineLeaf(ctx,x,y,angle,scale=1,color='#667b60'){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
    ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=1.25;
    ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(7,-2,10,-10,0,-18);ctx.bezierCurveTo(-10,-10,-7,-2,0,0);ctx.fill();
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-18);ctx.stroke();
    ctx.restore();
  }
  function drawVineTendril(ctx,x,y,angle,scale=1,color='#667b60'){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
    ctx.strokeStyle=color;ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(8,-9,16,-4,14,7);ctx.bezierCurveTo(11,17,-1,18,-4,9);ctx.bezierCurveTo(-7,1,-2,-5,5,-5);ctx.stroke();
    ctx.restore();
  }
  function pattern(ctx,type,opacity=1){
    if(type==='none')return;
    ctx.save();
    const cols={sprigs:'#687963',vines:'#678063',damask:'#426d7d',leaves:'#8b855c'};
    ctx.strokeStyle=cols[type];ctx.fillStyle=cols[type];
    ctx.globalAlpha=(type==='damask'?.24:type==='vines'?.27:.20)*opacity;
    if(type==='sprigs'){
      for(let y=128;y<1000;y+=96)for(let x=95;x<700;x+=93)
        drawSprig(ctx,x+(Math.floor(y/96)%2)*45,y,.14,.59,cols.sprigs);
    }else if(type==='vines'){
      ctx.lineWidth=3;
      for(let x=65;x<735;x+=154){
        for(let y=118;y<1040;y+=182){
          ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+78,y+40,x-45,y+105,x+10,y+177);ctx.stroke();
          drawSprig(ctx,x+48,y+57,-.7,1.25,cols.vines);
          drawSprig(ctx,x-12,y+129,.65,1.15,cols.vines);
        }
      }
    }else if(type==='damask'){
      for(let y=112;y<1065;y+=146)for(let x=96;x<730;x+=132){
        ctx.lineWidth=2.4;
        ctx.beginPath();
        ctx.moveTo(x,y-34);ctx.lineTo(x+34,y);ctx.lineTo(x,y+34);ctx.lineTo(x-34,y);ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x,y-21);ctx.lineTo(x+21,y);ctx.lineTo(x,y+21);ctx.lineTo(x-21,y);ctx.closePath();
        ctx.stroke();
        ctx.beginPath();ctx.arc(x,y,4.4,0,2*Math.PI);ctx.fill();
        ctx.beginPath();ctx.moveTo(x-48,y);ctx.lineTo(x-34,y);ctx.moveTo(x+34,y);ctx.lineTo(x+48,y);ctx.moveTo(x,y-48);ctx.lineTo(x,y-34);ctx.moveTo(x,y+34);ctx.lineTo(x,y+48);ctx.stroke();
      }
    }else if(type==='leaves'){
      for(let y=120;y<1020;y+=118)for(let x=78;x<720;x+=112){
        drawSprig(ctx,x,y,-.78,1.7,cols.leaves);
        drawSprig(ctx,x+35,y+55,.67,1.55,cols.leaves);
      }
    }
    ctx.restore();
  }
  function vineColumn(ctx,x,mirror,pal){
    ctx.save();ctx.translate(x,0);ctx.scale(mirror? -1:1,1);
    ctx.strokeStyle=pal.trim;ctx.fillStyle=pal.trim;ctx.lineWidth=3.1;
    ctx.beginPath();ctx.moveTo(18,136);ctx.bezierCurveTo(74,180,-4,246,43,302);ctx.bezierCurveTo(84,350,8,418,47,474);ctx.bezierCurveTo(82,525,14,572,42,620);ctx.stroke();
    for(const [xx,yy,a,s] of [[35,178,-.55,1.35],[55,246,.6,1.12],[20,315,-.72,1.25],[54,394,.62,1.2],[21,468,-.68,1.36],[52,546,.62,1.15]]) drawVineLeaf(ctx,xx,yy,a,s,pal.trim);
    for(const [xx,yy,a,s] of [[10,214,-.15,.95],[60,283,.4,.92],[15,436,-.2,.98],[54,505,.4,.9]]) drawVineTendril(ctx,xx,yy,a,s,pal.trim);
    ctx.restore();
  }
  function floralRosette(ctx,x,y,clr,r=24){
    ctx.save();ctx.translate(x,y);ctx.fillStyle=clr;ctx.strokeStyle=clr;
    for(let i=0;i<7;i++){ctx.save();ctx.rotate(i*2*Math.PI/7);ctx.beginPath();ctx.ellipse(0,r*.55,r*.35,r*.65,0,0,2*Math.PI);ctx.fill();ctx.restore();}
    ctx.fillStyle='#e9d7ae';ctx.beginPath();ctx.arc(0,0,r*.30,0,2*Math.PI);ctx.fill();ctx.restore();
  }
  function ornaments(ctx,c,pal){
    if(c.ornament==='floral'){
      // Floral preset uses blossoms and corner sprays, with no side vines.
      const top=imageFor('asset:ornament_light');
      if(top?.complete&&top.naturalWidth){ctx.save();ctx.globalAlpha=.95;ctx.drawImage(top,30,20,660,105);ctx.restore();}
      floralRosette(ctx,104,454,pal.trim,29);floralRosette(ctx,616,454,pal.trim,29);
      floralRosette(ctx,76,715,pal.trim,20);floralRosette(ctx,644,715,pal.trim,20);
      floralRosette(ctx,74,926,pal.trim,15);floralRosette(ctx,646,926,pal.trim,15);
      drawSprig(ctx,92,188,-.55,1.5,pal.trim);drawSprig(ctx,628,188,.55,1.5,pal.trim);
      drawSprig(ctx,96,534,.72,1.35,pal.trim);drawSprig(ctx,624,534,-.72,1.35,pal.trim);
    } else if(c.ornament==='vines'){
      // Vines preset uses trailing botanical borders and tendrils.
      vineColumn(ctx,43,false,pal);vineColumn(ctx,677,true,pal);
      ctx.strokeStyle=pal.trim;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(130,79);ctx.quadraticCurveTo(360,35,590,79);ctx.stroke();
      for(let i=0;i<6;i++){drawVineLeaf(ctx,162+i*76,76,i%2?-.9:.9,1.14,pal.trim);}
      drawVineLeaf(ctx,92,896,.55,1.75,pal.trim);drawVineLeaf(ctx,628,896,-.55,1.75,pal.trim);
      drawVineTendril(ctx,115,878,.2,1.1,pal.trim);drawVineTendril(ctx,605,878,-.2,1.1,pal.trim);
    }else{
      // Geometric Regency engraving; no floral overlays.
      ctx.save();ctx.strokeStyle=pal.trim;ctx.lineWidth=3;
      for(const x of [57,663]){
        ctx.beginPath();ctx.moveTo(x,115);ctx.lineTo(x,550);ctx.stroke();
        for(let y=140;y<555;y+=49){
          ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+9,y);ctx.lineTo(x,y+7);ctx.lineTo(x-9,y);ctx.closePath();ctx.stroke();
        }
      }
      ctx.beginPath();ctx.moveTo(100,78);ctx.lineTo(620,78);ctx.stroke();
      for(let i=0;i<5;i++)centerText(ctx,'◇',200+i*80,80,'31px Georgia',pal.trim);
      ctx.restore();
    }
    metricCenterText(ctx,c.ornament==='floral'?'❀':c.ornament==='vines'?'❧':'◇',360,682,'bold 31px Georgia',pal.trim,64);
  }
  function stamp(ctx,x,y,label,num,col,trim,showNum=true){
    // Label is outside the medallion, never squeezed into the score circle.
    ctx.save();ctx.shadowColor='#10180f66';ctx.shadowBlur=9;ctx.shadowOffsetY=4;
    ctx.beginPath();ctx.arc(x,y,67,0,Math.PI*2);ctx.fillStyle='#ddcba3';ctx.fill();ctx.restore();
    ctx.beginPath();ctx.arc(x,y,64,0,Math.PI*2);ctx.strokeStyle=trim;ctx.lineWidth=6;ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,52,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();ctx.strokeStyle='#f6e6be';ctx.lineWidth=2;ctx.stroke();
    if(showNum)metricCenterText(ctx,String(num),x,y,'bold 67px Georgia','#fff8df',82);
    rounded(ctx,x-74,y-104,148,39,8,'#f4e6c4',trim,3);
    metricCenterText(ctx,label,x,y-85,'bold 20px Georgia','#22362d',140);
  }
  function drawTails(ctx,y,fill,trim){ctx.fillStyle=fill;ctx.strokeStyle=trim;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(72,y+8);ctx.lineTo(42,y+2);ctx.lineTo(55,y+35);ctx.lineTo(42,y+68);ctx.lineTo(72,y+61);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(648,y+8);ctx.lineTo(678,y+2);ctx.lineTo(665,y+35);ctx.lineTo(678,y+68);ctx.lineTo(648,y+61);ctx.closePath();ctx.fill();ctx.stroke();}
  function renderLandscapeOrnaments(ctx,c,pal){
    ctx.save();
    const trim=pal.trim;
    if(c.ornament==='floral'){
      for(const [x,y,r] of [[86,75,16],[958,75,16],[85,645,16],[954,645,16]]) floralRosette(ctx,x,y,trim,r);
      drawSprig(ctx,192,70,Math.PI/2,1.3,trim);
      drawSprig(ctx,844,70,-Math.PI/2,1.3,trim);
      floralRosette(ctx,503,73,trim,13);
      drawSprig(ctx,493,616,-.7,1.2,trim);
    }else if(c.ornament==='vines'){
      ctx.strokeStyle=trim;ctx.lineWidth=2.8;
      ctx.beginPath();ctx.moveTo(95,74);ctx.bezierCurveTo(260,36,350,106,490,72);ctx.stroke();
      ctx.beginPath();ctx.moveTo(552,72);ctx.bezierCurveTo(710,108,802,34,940,74);ctx.stroke();
      for(const [x,y,rot] of [[165,65,-.9],[245,75,.7],[325,68,-.7],[406,77,.5],[625,73,-.6],[715,66,.7],[810,77,-.7],[888,68,.8]]) drawVineLeaf(ctx,x,y,rot,1.1,trim);
      for(const [x,y,rot] of [[68,250,.7],[68,360,-.7],[68,465,.7],[978,250,-.7],[978,360,.7],[978,465,-.7]]) drawVineTendril(ctx,x,y,rot,1.0,trim);
    }else{
      ctx.strokeStyle=trim;ctx.lineWidth=2;
      for(const y of [77,652]){
        line(ctx,110,y,460,y,trim,2);line(ctx,570,y,920,y,trim,2);
        for(const x of [128,245,360,478,592,707,822,938])metricCenterText(ctx,'◇',x,y,'21px Georgia',trim,28);
      }
    }
    ctx.restore();
  }
  function renderLandscapeCard(ctx,c){
    // Setting cards have a true landscape canvas, rather than a rotated portrait.
    const pal=palette[c.color]||palette.gold;
    const panelFills={sprigs:'#f3e7ce',vines:'#e9ecdc',damask:'#e1ebea',leaves:'#f1e9ca',none:'#fbf3e1'};
    ctx.clearRect(0,0,LW,LH);ctx.save();
    rounded(ctx,6,6,1028,708,31,'#bca87b','#263729',5);
    rounded(ctx,16,15,1008,688,25,pal.frame,pal.trim,5);
    rounded(ctx,29,28,982,664,20,null,'#e8cf92',2);
    rounded(ctx,45,45,950,630,15,'#f0e4c8','#ba9b65',5);
    rounded(ctx,56,56,928,608,11,'#eee1c3','#cbb183',2);
    ctx.save();ctx.beginPath();ctx.roundRect(57,57,926,606,10);ctx.clip();
    pattern(ctx,c.pattern,.9);
    ctx.translate(600,0);pattern(ctx,c.pattern,.9);
    ctx.restore();
    renderLandscapeOrnaments(ctx,c,pal);

    // Large Regency arch for the setting artwork; zoom and drag still operate normally.
    ctx.save();ctx.shadowColor='#16251b88';ctx.shadowBlur=13;ctx.shadowOffsetY=4;
    rounded(ctx,67,116,429,474,[162,162,10,10],pal.dark,pal.trim,7);ctx.restore();
    ctx.save();ctx.beginPath();ctx.roundRect(77,126,409,454,[152,152,7,7]);ctx.clip();
    ctx.fillStyle='#c4baa0';ctx.fillRect(77,126,409,454);
    if(!cover(ctx,imageFor(c.image),77,126,409,454,c)){
      ctx.fillStyle='#d9d0b3';ctx.fillRect(77,126,409,454);
      metricCenterText(ctx,'⌂',281,318,'160px Georgia','#858d76');
      centerText(ctx,'UPLOAD SETTING ARTWORK',281,437,'20px Georgia','#626757',385);
    }
    ctx.restore();
    rounded(ctx,75,124,413,458,[153,153,8,8],null,pal.trim,4);

    // Card type / title cartouche.
    rounded(ctx,652,67,208,33,10,'#e9d7aa',pal.trim,2);
    metricCenterText(ctx,'SETTING CARD',756,83,'bold 17px Georgia','#2c3b31',196);
    rounded(ctx,515,116,462,80,9,'#f3e4c4',pal.trim,5);
    rounded(ctx,524,123,444,66,7,null,pal.frame,2);
    line(ctx,540,130,952,130,pal.trim,1.6);
    line(ctx,540,182,952,182,pal.trim,1.6);
    const name=c.name||'Untitled Setting';
    let titleSize=name.length>33?31:name.length>25?36:name.length>17?42:48;
    const tracking=name.length>22?-.35:-.15;
    ctx.font=`italic ${titleSize}px Georgia`;
    while(titleSize>18&&([...(name||'')].reduce((n,ch)=>n+ctx.measureText(ch).width,0)+(Math.max(0,name.length-1)*tracking))>407){titleSize--;ctx.font=`italic ${titleSize}px Georgia`;}
    drawTrackedCentered(ctx,name,746,155,`italic ${titleSize}px Georgia`,'#26342d',tracking,407);

    // Two centered rich-text interactions, with the same shrink-to-fit logic as character cards.
    rounded(ctx,515,210,462,323,11,panelFills[c.pattern]||panelFills.sprigs,pal.trim,3);
    ctx.save();ctx.beginPath();ctx.roundRect(525,219,442,305,9);ctx.clip();
    pattern(ctx,c.pattern,.19);ctx.translate(580,0);pattern(ctx,c.pattern,.19);ctx.restore();
    line(ctx,534,372,957,372,pal.trim,1.5);
    drawRichTextFit(ctx,c.ability1||'',{x:540,y:228,w:410,h:135},'#253128');
    drawRichTextFit(ctx,c.ability2||'',{x:540,y:382,w:410,h:137},'#253128');

    // Quotation is a separate quiet band beneath the interactions.
    line(ctx,558,551,935,551,pal.trim,1.35);
    if(c.quote){
      let quoteSize=c.quote.length>115?17:20,lines=[];
      while(quoteSize>8){ctx.font=`italic ${quoteSize}px Georgia`;lines=wrap(ctx,c.quote,390,80);if(lines.length*quoteSize*1.22<=69)break;quoteSize--;} 
      const h=quoteSize*1.24,center=598;
      lines.forEach((row,i)=>centerText(ctx,row,746,center-(lines.length-1)*h/2+i*h,`italic ${quoteSize}px Georgia`,'#3b3930',405));
    }else metricCenterText(ctx,'❧',746,599,'32px Georgia','#918669');

    metricCenterText(ctx,'❧',281,629,'29px Georgia',pal.trim);
    ctx.restore();
  }

  function renderCard(ctx,c){
    if(c.type==='setting'){renderLandscapeCard(ctx,c);return;}
    const pal=palette[c.color]||palette.gold;
    ctx.clearRect(0,0,W,H);
    ctx.save();
    // Card stock, frame, double engraved line.
    rounded(ctx,6,6,708,1028,36,'#beab7b','#1e3026',5);
    rounded(ctx,15,15,690,1010,29,pal.frame,pal.trim,5);
    rounded(ctx,28,27,664,986,20,null,'#dec68c',2);
    rounded(ctx,48,116,624,874,17,'#f0e4c5','#bc9f66',5);
    rounded(ctx,62,130,596,846,10,'#eee2c5','#cfb785',2);
    ctx.save();ctx.beginPath();ctx.rect(63,131,594,844);ctx.clip();pattern(ctx,c.pattern);ctx.restore();
    ornaments(ctx,c,pal);
    // Inner artwork opening.
    if(c.type==='character'){
      ctx.save();ctx.shadowColor='#1b251f';ctx.shadowBlur=12;ctx.shadowOffsetY=3;
      ctx.beginPath();ctx.ellipse(360,328,191,202,0,0,Math.PI*2);ctx.fillStyle='#2a382d';ctx.fill();ctx.restore();
      ctx.save();ctx.beginPath();ctx.ellipse(360,326,182,193,0,0,Math.PI*2);ctx.clip();
      ctx.fillStyle='#a6a690';ctx.fillRect(178,133,364,386);
      if(!cover(ctx,imageFor(c.image),178,133,364,386,c)){
        ctx.fillStyle='#e7d6ac';ctx.fillRect(178,133,364,386);centerText(ctx,'❦',360,305,'112px Georgia','#9c987e');centerText(ctx,'UPLOAD A PORTRAIT',360,412,'19px Georgia','#786f5b',350);
      }
      ctx.restore();
      ctx.beginPath();ctx.ellipse(360,326,184,195,0,0,Math.PI*2);ctx.strokeStyle=pal.trim;ctx.lineWidth=8;ctx.stroke();
      ctx.beginPath();ctx.ellipse(360,326,191,202,0,0,Math.PI*2);ctx.strokeStyle='#241f14';ctx.lineWidth=3;ctx.stroke();
      stamp(ctx,116,211,'SWAY',c.sway,pal.medallion,pal.trim,c.showStats);
      stamp(ctx,604,211,'STANDING',c.standing,'#667c69',pal.trim,c.showStats);
    } else {
      ctx.save();ctx.shadowColor='#19251d99';ctx.shadowBlur=12;ctx.shadowOffsetY=4;
      rounded(ctx,102,132,516,390,[175,175,12,12],'#32483c',pal.trim,8);ctx.restore();
      ctx.save();ctx.beginPath();ctx.roundRect(112,142,496,370,[170,170,9,9]);ctx.clip();ctx.fillStyle='#bcb69a';ctx.fillRect(112,142,496,370);
      if(!cover(ctx,imageFor(c.image),112,142,496,370,c)){
        ctx.fillStyle='#dad0ae';ctx.fillRect(112,142,496,370);centerText(ctx,'⌂',360,330,'160px Georgia','#92967e');centerText(ctx,'UPLOAD A LOCATION',360,456,'21px Georgia','#665f4e');
      }ctx.restore();
      rounded(ctx,110,140,500,374,[174,174,10,10],null,pal.trim,5);
      rounded(ctx,275,52,170,42,12,'#ead7ac',pal.trim,2);
      centerText(ctx,'SETTING CARD',360,74,'bold 19px Georgia','#26372d',170);
    }
    // The portrait ends earlier, leaving space for two complete interactions.
    drawTails(ctx,538,pal.trim,pal.dark);
    rounded(ctx,69,538,582,76,9,'#f3e4c3',pal.trim,5);
    rounded(ctx,78,544,564,64,7,null,pal.frame,2);
    line(ctx,88,551,632,551,pal.trim,2);line(ctx,88,603,632,603,pal.trim,2);
    const nameFont=c.name.length>27?'italic 39px Georgia':c.name.length>18?'italic 44px Georgia':'italic 49px Georgia';
    metricCenterText(ctx,c.name||'Untitled Card',360,577,nameFont,'#222d26',536);

    // Two equal rich-text panels, individually sized so no ability text is truncated.
    const panelFills={sprigs:'#f3e7ce',vines:'#e9ecdc',damask:'#e1ebea',leaves:'#f1e9ca',none:'#fbf3e1'};
    rounded(ctx,66,627,588,264,12,panelFills[c.pattern]||panelFills.sprigs,pal.trim,3);
    ctx.save();ctx.beginPath();ctx.roundRect(75,636,570,246,9);ctx.clip();pattern(ctx,c.pattern,.23);ctx.restore();
    line(ctx,94,758,626,758,pal.trim,1.6);
    function interaction(text,index){
      // Both rich-text interactions use the full width; no Roman-numeral labels.
      const textBox=index===0?{x:95,y:640,w:530,h:111}:{x:95,y:766,w:530,h:111};
      drawRichTextFit(ctx,text||'',textBox,'#253128');
    }
    interaction(c.ability1,0);
    interaction(c.ability2,1);

    // Quotation sits below the interactions, tags remain at the foot of the card.
    line(ctx,124,907,596,907,pal.trim,1.4);
    if(c.quote){
      const quoteFont=c.quote.length>103?'italic 16px Georgia':'italic 20px Georgia';
      ctx.font=quoteFont;const quoteRows=wrap(ctx,c.quote,466,3);
      const h=quoteRows.length===3?20:22;
      const y=935-(quoteRows.length-1)*h/2;
      quoteRows.forEach((t,i)=>centerText(ctx,t,360,y+i*h,quoteFont,'#3b3930',480));
    }else centerText(ctx,'❧',360,932,'31px Georgia','#8c866b');
    const labels=c.tags.split(',').map(t=>t.trim()).filter(Boolean).slice(0,3);
    if(labels.length){
      ctx.font='bold 16px Georgia';const gap=9;
      const widths=labels.map(t=>Math.min(200,Math.max(84,ctx.measureText(t.toUpperCase()).width+28)));
      const total=widths.reduce((a,b)=>a+b,0)+(labels.length-1)*gap;let x=(W-total)/2;
      labels.forEach((tag,i)=>{
        rounded(ctx,x,969,widths[i],33,12,pal.frame,pal.trim,2);
        centerText(ctx,tag.toUpperCase(),x+widths[i]/2,985,'bold 14px Georgia','#fff4d7',widths[i]-16);
        x+=widths[i]+gap;
      });
    }
    ctx.restore();
  }
  function resizeCardCanvas(c){
    const d=dimensions(c);
    if(canvas.width!==d.w)canvas.width=d.w;
    if(canvas.height!==d.h)canvas.height=d.h;
    fitPreview();
  }
  function fitPreview(){
    const stage=getEl('preview-drop-zone');
    const d=dimensions(active());
    const fit=Math.min(Math.max(240,stage.clientWidth-20)/d.w,Math.max(240,stage.clientHeight-12)/d.h);
    canvas.style.width=Math.floor(d.w*fit)+'px';
    canvas.style.height=Math.floor(d.h*fit)+'px';
  }
  function drawPreview(){resizeCardCanvas(active());const ctx=canvas.getContext('2d');renderCard(ctx,active());}
  function drawGalleryCanvases(){
    const nodes=gallery.querySelectorAll('canvas[data-card-id]');for(const item of nodes){const c=cards.find(c=>c.id===item.dataset.cardId);if(!c)continue;const ctx=item.getContext('2d');const d=dimensions(c);if(item.width!==d.w)item.width=d.w;if(item.height!==d.h)item.height=d.h;ctx.clearRect(0,0,d.w,d.h);renderCard(ctx,c);}
  }
  function renderGallery(){gallery.replaceChildren();for(const c of cards){const b=document.createElement('button');b.type='button';b.className='gallery-card'+(c.id===selectedId?' active':'');b.setAttribute('aria-label','Edit '+c.name);b.title=c.name;const mini=document.createElement('canvas');const d=dimensions(c);mini.width=d.w;mini.height=d.h;mini.dataset.cardId=c.id;b.append(mini);b.addEventListener('click',()=>loadCard(c.id));gallery.append(b);}drawGalleryCanvases();}

  const traitChoices=getEl('trait-choices');
  if(traitChoices){
    TRAITS.forEach(trait=>{
      const btn=document.createElement('button');
      btn.type='button';btn.className='trait-chip';btn.dataset.trait=trait;btn.textContent=trait;btn.setAttribute('aria-pressed','false');
      btn.addEventListener('click',()=>toggleTrait(trait));
      traitChoices.append(btn);
    });
  }

  // UI listeners.
  getEl('type-character').addEventListener('click',()=>setType('character'));
  getEl('type-setting').addEventListener('click',()=>setType('setting'));
  for(const [key,el] of Object.entries(form)){
    if(key==='ability1'||key==='ability2'||key==='showStats')continue;
    el.addEventListener('input',()=>{
      const numeric=['sway','standing','imageZoom','imageX','imageY'].includes(key);
      editField(key,numeric?Number(el.value):el.value);
      if(key==='sway'||key==='standing'){getEl(key+'-output').textContent=el.value;updateStatWarning();}
      if(key.startsWith('image'))updateImagePositionControls();
    });
  }
  form.showStats.addEventListener('change',()=>editField('showStats',form.showStats.checked));

  for(const key of ['ability1','ability2']){
    const el=form[key];
    el.addEventListener('input',()=>{
      // Leave the DOM intact while typing to avoid disturbing the caret;
      // sanitize the model for rendering and normalize markup after focus leaves.
      editField(key,sanitizeRich(el.innerHTML));
    });
    el.addEventListener('blur',()=>{
      if(el.innerHTML!==active()[key])el.innerHTML=active()[key];
    });
    el.addEventListener('paste',event=>{
      event.preventDefault();
      const text=event.clipboardData.getData('text/plain');
      document.execCommand('insertText',false,text);
    });
  }
  document.querySelectorAll('.rich-toolbar button').forEach(button=>{
    button.addEventListener('mousedown',e=>e.preventDefault()); // retain selection when clicking format buttons
    button.addEventListener('click',()=>{
      const target=form[button.closest('[data-rich-for]').dataset.richFor];
      target.focus();document.execCommand(button.dataset.command,false,null);
      editField(target.id==='ability-1'?'ability1':'ability2',sanitizeRich(target.innerHTML));
    });
  });
  for(const button of document.querySelectorAll('[data-color],[data-pattern],[data-ornament]'))button.addEventListener('click',()=>{const c=active();if(button.dataset.color)c.color=button.dataset.color;if(button.dataset.pattern)c.pattern=button.dataset.pattern;if(button.dataset.ornament)c.ornament=button.dataset.ornament;dirty=true;updateFields();updatePreview();setStatus('Unsaved styling changes.');});
  getEl('portrait-file').addEventListener('change',e=>{processImageFile(e.target.files[0]);e.target.value='';});
  getEl('clear-portrait').addEventListener('click',()=>{editField('image','');updateFields();});
  getEl('reset-art-position').addEventListener('click',()=>{Object.assign(active(),{imageZoom:100,imageX:0,imageY:0});dirty=true;updateImagePositionControls();updatePreview();setStatus('Artwork placement reset · Save to keep changes.');});
  getEl('save-card').addEventListener('click',save);
  getEl('download-png').addEventListener('click',pngExport);
  getEl('export-json').addEventListener('click',exportData);
  getEl('import-json').addEventListener('click',()=>getEl('import-file').click());
  getEl('import-file').addEventListener('change',e=>{importJson(e.target.files[0]);e.target.value='';});
  getEl('duplicate-card').addEventListener('click',()=>{const c={...active(),id:freshId(),name:active().name+' (copy)'};cards.push(c);loadCard(c.id);dirty=true;setStatus('Duplicate made · Save to keep it.');toast('Card duplicated.');});
  getEl('delete-card').addEventListener('click',()=>{
    if (!confirm('Remove “'+active().name+'” from your gallery?')) return;
    cards=cards.filter(c=>c.id!==selectedId);
    if(!cards.length){const c={...defaultCards[0],id:freshId(),name:'New Character',image:'',ability1:'',ability2:'',quote:'',tags:'',imageZoom:100,imageX:0,imageY:0};cards.push(c);}
    selectedId=cards[0].id;dirty=true;updateFields();renderGallery();drawPreview();
    setStatus('Card removed · Select “Save Draft” to keep this change.');toast('Card removed from the gallery.');
  });
  getEl('new-character').addEventListener('click',()=>newCard('character'));
  getEl('new-setting').addEventListener('click',()=>newCard('setting'));
  getEl('help-button').addEventListener('click',()=>getEl('help-dialog').showModal());
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}});
  const zone=getEl('preview-drop-zone'),overlay=getEl('drop-overlay');
  zone.addEventListener('dragover',e=>{e.preventDefault();overlay.hidden=false;});
  zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))overlay.hidden=true;});
  zone.addEventListener('drop',e=>{e.preventDefault();overlay.hidden=true;processImageFile(e.dataTransfer.files[0]);});
  // Drag the artwork directly within its oval/arched window. Sliders remain available for precision.
  let drag=null;
  const hitArtwork=(p,c)=>c.type==='setting'
    ? p.x>=77&&p.x<=486&&p.y>=126&&p.y<=580
    : ((p.x-360)/182)**2+((p.y-326)/193)**2<=1;
  const pointerCoords=e=>{const rect=canvas.getBoundingClientRect();const d=dimensions(active());return {x:(e.clientX-rect.left)*d.w/rect.width,y:(e.clientY-rect.top)*d.h/rect.height};};
  canvas.addEventListener('pointerdown',e=>{
    const c=active(),im=imageFor(c.image),pos=pointerCoords(e);
    if(!im?.complete||!im.naturalWidth||!hitArtwork(pos,c))return;
    const bounds=c.type==='setting'?[77,126,409,454]:[178,133,364,386];
    const dims=artworkDimensions(im,...bounds,c);
    drag={id:c.id,x:e.clientX,y:e.clientY,startX:c.imageX||0,startY:c.imageY||0,slackX:bounds[2]-dims.dw,slackY:bounds[3]-dims.dh,width:canvas.getBoundingClientRect().width,height:canvas.getBoundingClientRect().height};
    canvas.setPointerCapture(e.pointerId);canvas.classList.add('art-dragging');e.preventDefault();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==active().id)return;
    const d=dimensions(active());const dx=(e.clientX-drag.x)*d.w/drag.width,dy=(e.clientY-drag.y)*d.h/drag.height;
    if(Math.abs(drag.slackX)>.5)active().imageX=Math.round(Math.max(-100,Math.min(100,drag.startX-dx*200/drag.slackX)));
    if(Math.abs(drag.slackY)>.5)active().imageY=Math.round(Math.max(-100,Math.min(100,drag.startY-dy*200/drag.slackY)));
    dirty=true;updateImagePositionControls();updatePreview();setStatus('Artwork moved · Save to keep changes.');
  });
  function endDragging(){drag=null;canvas.classList.remove('art-dragging');}
  canvas.addEventListener('pointerup',endDragging);
  canvas.addEventListener('pointercancel',endDragging);
  if(window.ResizeObserver)new ResizeObserver(fitPreview).observe(getEl('preview-drop-zone'));
  window.addEventListener('resize',fitPreview);
  updateFields();renderGallery();drawPreview();
})();
