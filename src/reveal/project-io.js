/** Editable Reveal Sheet JSON import/export. Incoming data is never executed. */
function createProjectIO({core,imageIO,env}) {
  const fail=code=>{throw core.error(code);};
  const isAbort=signal=>Boolean(signal?.aborted);
  function cleanDocument(doc){
    return {
      id:doc.id,revision:doc.revision,title:doc.title,
      defaults:{mode:doc.defaults.mode,otherAnswers:doc.defaults.otherAnswers},
      pages:doc.pages.map(page=>({id:page.id,title:page.title,description:page.description,imageId:page.imageId,questionOrder:[...page.questionOrder]})),
      assets:doc.assets.map(asset=>({id:asset.id,mime:asset.mime,width:asset.width,height:asset.height,byteLength:asset.byteLength,dataBase64:asset.dataBase64})),
      questions:doc.questions.map(question=>({id:question.id,pageId:question.pageId,revision:question.revision,maskIds:[...question.maskIds],prompt:question.prompt,answer:question.answer})),
      masks:doc.masks.map(mask=>({id:mask.id,pageId:mask.pageId,kind:mask.kind,questionId:mask.questionId,rect:{x:mask.rect.x,y:mask.rect.y,w:mask.rect.w,h:mask.rect.h}}))
    };
  }
  function envelope(doc,kind,appVersion){
    return {format:'reveal-sheet',schemaVersion:1,appVersion,kind,document:cleanDocument(doc)};
  }
  function assertSupportedEditable(value){
    if(value.kind!=='editable')fail('INVALID_SHEET');
    const doc=value.document;
    // v0.3 supports grouped questions and auxiliary covers, while guided-study
    // defaults still belong to a later milestone.
    if(doc.defaults.mode!=='free'||doc.defaults.otherAnswers!=='hidden')fail('INVALID_SHEET');
  }
  function serialize(doc,kind='editable',appVersion='0.2.0'){
    const value=envelope(doc,kind,appVersion);
    const checked=core.validateEnvelope(value);
    if(!checked.ok)fail(checked.errors?.[0]?.code||'INVALID_SHEET');
    if(kind==='editable')assertSupportedEditable(value);
    return JSON.stringify(value);
  }
  function prepareJson(doc,appVersion='0.2.0'){
    return new env.Blob([serialize(doc,'editable',appVersion)],{type:'application/json;charset=utf-8'});
  }
  function escapeJsonForHtml(text){
    return String(text).replace(/</g,'\\u003C').replace(/>/g,'\\u003E').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  }
  function prepareHtml(doc,playerTemplate,appVersion='0.6.0'){
    if(typeof playerTemplate!=='string'||!playerTemplate)fail('INVALID_SHEET');
    const marker='__REVEAL_'+'LESSON_JSON__',matches=playerTemplate.split(marker).length-1;
    if(matches!==1)fail('INVALID_SHEET');
    const json=serialize(doc,'lesson',appVersion),html=playerTemplate.replace(marker,escapeJsonForHtml(json));
    if(new env.TextEncoder().encode(html).byteLength>core.limits.maxHtmlBytes)fail('LIMIT_EXCEEDED');
    return new env.Blob([html],{type:'text/html;charset=utf-8'});
  }
  function jsonDepthWithin(text,maxDepth=16){
    let depth=0,inString=false,escaped=false;
    for(let index=0;index<text.length;index++){
      const ch=text[index];
      if(inString){
        if(escaped){escaped=false;continue;}
        if(ch==='\\'){escaped=true;continue;}
        if(ch==='"')inString=false;
        continue;
      }
      if(ch==='"'){inString=true;continue;}
      if(ch==='{'||ch==='['){depth++;if(depth>maxDepth)return false;}
      else if(ch==='}'||ch===']'){depth--;if(depth<0)return false;}
    }
    return !inString&&depth===0;
  }
  const LESSON_DATA_START='<script id="reveal-'+'sheet-data" type="application/json">';
  const LESSON_DATA_END='</'+'script>';
  function extractLessonEnvelope(text){
    if(typeof text!=='string'||text.length===0)fail('INVALID_SHEET');
    const start=text.indexOf(LESSON_DATA_START);
    if(start<0||text.indexOf(LESSON_DATA_START,start+LESSON_DATA_START.length)>=0)fail('INVALID_SHEET');
    const jsonStart=start+LESSON_DATA_START.length,end=text.indexOf(LESSON_DATA_END,jsonStart);
    if(end<0)fail('INVALID_SHEET');
    const json=text.slice(jsonStart,end);
    if(new env.TextEncoder().encode(json).byteLength>core.limits.maxJsonBytes)fail('LIMIT_EXCEEDED');
    if(!jsonDepthWithin(json,16))fail('INVALID_SHEET');
    let value;
    try{value=JSON.parse(json);}catch{fail('INVALID_SHEET');}
    if(value&&value.format==='reveal-sheet'&&value.schemaVersion!==1)fail('UNSUPPORTED_SCHEMA');
    const checked=core.validateEnvelope(value);
    if(!checked.ok)fail(checked.errors?.[0]?.code==='UNSUPPORTED_SCHEMA'?'UNSUPPORTED_SCHEMA':'INVALID_SHEET');
    if(value.kind!=='lesson')fail('INVALID_SHEET');
    return envelope(value.document,'lesson',value.appVersion);
  }
  async function readHtml(file,{signal}={}){
    if(isAbort(signal))fail('CANCELLED');
    if(!file||!Number.isSafeInteger(file.size)||file.size<1)fail('INVALID_SHEET');
    if(file.size>core.limits.maxHtmlBytes)fail('LIMIT_EXCEEDED');
    let text;
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(isAbort(signal))fail('CANCELLED');
      text=new env.TextDecoder('utf-8',{fatal:true}).decode(bytes);
    }catch(error){
      if(error?.code==='CANCELLED')throw error;
      fail('INVALID_SHEET');
    }
    const lesson=extractLessonEnvelope(text);
    for(const asset of lesson.document.assets){
      if(isAbort(signal))fail('CANCELLED');
      try{await imageIO.verifyStoredAsset(asset,{signal});}
      catch(error){if(error?.code==='CANCELLED')throw error;fail(error?.code==='LIMIT_EXCEEDED'?'LIMIT_EXCEEDED':'INVALID_SHEET');}
    }
    if(isAbort(signal))fail('CANCELLED');
    return envelope(lesson.document,'editable',lesson.appVersion);
  }
  async function readSheet(file,options={}){
    const name=String(file?.name||'').toLowerCase(),type=String(file?.type||'').toLowerCase();
    if(name.endsWith('.reveal.html')||name.endsWith('.html')||type==='text/html')return readHtml(file,options);
    if(name.endsWith('.reveal.json')||name.endsWith('.json')||type==='application/json'||type==='text/json')return readJson(file,options);
    fail('INVALID_SHEET');
  }
  async function readJson(file,{signal}={}){
    if(isAbort(signal))fail('CANCELLED');
    if(!file||!Number.isSafeInteger(file.size)||file.size<1)fail('INVALID_SHEET');
    if(file.size>core.limits.maxJsonBytes)fail('LIMIT_EXCEEDED');
    let text;
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(isAbort(signal))fail('CANCELLED');
      const decoder=new env.TextDecoder('utf-8',{fatal:true});
      text=decoder.decode(bytes);
    }catch(error){
      if(error?.code==='CANCELLED')throw error;
      fail('INVALID_SHEET');
    }
    if(!jsonDepthWithin(text,16))fail('INVALID_SHEET');
    let value;
    try{value=JSON.parse(text);}catch{fail('INVALID_SHEET');}
    if(value&&value.format==='reveal-sheet'&&value.schemaVersion!==1)fail('UNSUPPORTED_SCHEMA');
    const checked=core.validateEnvelope(value);
    if(!checked.ok)fail(checked.errors?.[0]?.code==='UNSUPPORTED_SCHEMA'?'UNSUPPORTED_SCHEMA':'INVALID_SHEET');
    assertSupportedEditable(value);
    for(const asset of value.document.assets){
      if(isAbort(signal))fail('CANCELLED');
      try{await imageIO.verifyStoredAsset(asset,{signal});}
      catch(error){if(error?.code==='CANCELLED')throw error;fail(error?.code==='LIMIT_EXCEEDED'?'LIMIT_EXCEEDED':'INVALID_SHEET');}
    }
    if(isAbort(signal))fail('CANCELLED');
    return envelope(value.document,'editable',value.appVersion);
  }
  function stripKnownExtension(value){
    let base=value;
    while(true){
      const next=base.replace(/(?:\.reveal\.html|\.reveal\.json|\.html|\.json)$/i,'');
      if(next===base)return base;base=next;
    }
  }
  function isReserved(base){
    const stem=base.split('.')[0].toUpperCase();
    return ['CON','PRN','AUX','NUL'].includes(stem)||/^COM[1-9]$/.test(stem)||/^LPT[1-9]$/.test(stem);
  }
  function truncateFilename(value){
    const encoder=new env.TextEncoder(),points=[...value];let out='';
    for(const point of points){
      if([...out].length>=80)break;
      const candidate=out+point;
      if(encoder.encode(candidate).byteLength>180)break;
      out=candidate;
    }
    return out;
  }
  function sanitizeFilename(base,kind){
    const suffix=kind==='html'?'.reveal.html':'.reveal.json';
    let value=String(base??'').trim();
    value=stripKnownExtension(value);
    value=value.replace(/[<>:"/\\|?*\u0000-\u001F\u007F]/g,'_').replace(/[ .]+$/g,'');
    value=truncateFilename(value).replace(/[ .]+$/g,'');
    if(!value)value='reveal-sheet';
    if(isReserved(value))value='_'+value;
    return value+suffix;
  }
  return Object.freeze({readJson,readHtml,readSheet,extractLessonEnvelope,serialize,prepareJson,prepareHtml,escapeJsonForHtml,sanitizeFilename,jsonDepthWithin});
}
