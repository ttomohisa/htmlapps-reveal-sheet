/** Strict local image input and orientation-fixed PNG normalization.
 * env owns browser-specific decoding/Canvas/Blob APIs; no network access here.
 */
function createImageIO({ core, env }) {
  const { limits, error } = core;
  const urls = new Map();
  const checkDimensions = (width, height) => ({ok:
    Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 &&
    width <= limits.maxSide && height <= limits.maxSide && width * height <= limits.maxPixels});
  function inspectHeader(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 12) throw error('UNSUPPORTED_IMAGE');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const text = (offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));
    const range = (offset, size, end = bytes.length) => {
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) || offset < 0 || size < 0 || offset + size > end) throw error('DECODE_FAILED');
    };
    let width = 0, height = 0, orientation = 1, mime;
    if (bytes[0] === 137 && text(1,3) === 'PNG' && bytes[4]===13 && bytes[5]===10 && bytes[6]===26 && bytes[7]===10) {
      mime = 'image/png';
      let offset = 8, ihdr = false, idat = false, end = false;
      while (offset < bytes.length) {
        range(offset,12);
        const size = view.getUint32(offset), type = text(offset + 4,4);
        range(offset + 8, size + 4);
        if (!ihdr && type !== 'IHDR') throw error('DECODE_FAILED');
        if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') throw error('ANIMATED_IMAGE');
        if (type === 'IHDR') {
          if (ihdr || size !== 13) throw error('DECODE_FAILED');
          width=view.getUint32(offset+8); height=view.getUint32(offset+12); ihdr=true;
          if (!checkDimensions(width,height).ok) throw error('IMAGE_TOO_LARGE');
        }
        if (type === 'IDAT') idat=true;
        offset += size + 12;
        if (type === 'IEND') { if(size!==0 || offset!==bytes.length)throw error('DECODE_FAILED'); end=true; break; }
      }
      if (!ihdr || !idat || !end) throw error('DECODE_FAILED');
    } else if (bytes[0]===255 && bytes[1]===216) {
      mime='image/jpeg';
      let offset=2, scan=false, sof=false, exifSeen=false;
      while(offset<bytes.length) {
        if(bytes[offset++]!==255)throw error('DECODE_FAILED');
        while(bytes[offset]===255)offset++;
        range(offset,1); const marker=bytes[offset++];
        if(marker===217)break;
        if(marker===0 || marker===216 || (marker>=208 && marker<=215))throw error('DECODE_FAILED');
        if(marker===1)continue;
        range(offset,2); const size=view.getUint16(offset); if(size<2)throw error('DECODE_FAILED');
        range(offset,size); const end=offset+size;
        if(marker===225 && size>=8 && text(offset+2,6)==='Exif\0\0') {
          if(exifSeen)throw error('DECODE_FAILED'); exifSeen=true;
          const base=offset+8;range(base,8,end);
          const order=text(base,2); if(order!=='II' && order!=='MM')throw error('DECODE_FAILED');
          const little=order==='II';
          if(view.getUint16(base+2,little)!==42)throw error('DECODE_FAILED');
          const ifdOffset=view.getUint32(base+4,little);if(ifdOffset<8)throw error('DECODE_FAILED');
          const ifd=base+ifdOffset;range(ifd,2,end);const count=view.getUint16(ifd,little);
          range(ifd+2,count*12+4,end);
          let found=false;
          for(let n=0;n<count;n++){
            const entry=ifd+2+n*12;
            if(view.getUint16(entry,little)===274){
              if(found || view.getUint16(entry+2,little)!==3 || view.getUint32(entry+4,little)!==1)throw error('DECODE_FAILED');
              found=true;orientation=view.getUint16(entry+8,little);
              if(orientation<1 || orientation>8)throw error('DECODE_FAILED');
            }
          }
        }
        if([192,193,194].includes(marker)){
          if(sof || size<8)throw error('DECODE_FAILED');sof=true;
          height=view.getUint16(offset+3);width=view.getUint16(offset+5);
          const components=bytes[offset+7];if(!components || size!==8+components*3)throw error('DECODE_FAILED');
          if(!checkDimensions(width,height).ok)throw error('IMAGE_TOO_LARGE');
        } else if(marker>=192 && marker<=207 && ![196,200,204].includes(marker))throw error('UNSUPPORTED_IMAGE');
        if(marker===218){scan=true;break;}
        offset=end;
      }
      // Actual entropy/corruption is checked by the browser decoder. Require EOI
      // so a browser's tolerant truncated-file recovery is not silently accepted.
      if(!sof || !scan || bytes.at(-2)!==255 || bytes.at(-1)!==217)throw error('DECODE_FAILED');
    } else if(text(0,4)==='RIFF' && text(8,4)==='WEBP') {
      mime='image/webp';
      if(view.getUint32(4,true)+8!==bytes.length)throw error('DECODE_FAILED');
      let offset=12, payload=false, extended=false, imageWidth=0, imageHeight=0;
      while(offset<bytes.length){
        range(offset,8);const type=text(offset,4), size=view.getUint32(offset+4,true), start=offset+8;
        range(start,size+(size%2));
        if(type==='ANIM'||type==='ANMF')throw error('ANIMATED_IMAGE');
        if(type==='VP8X'){
          if(extended || offset!==12 || size!==10)throw error('DECODE_FAILED');extended=true;
          if(bytes[start]&2)throw error('ANIMATED_IMAGE');
          const u24 = at => bytes[at]+bytes[at+1]*256+bytes[at+2]*65536;
          width=1+u24(start+4);height=1+u24(start+7);
          if(!checkDimensions(width,height).ok)throw error('IMAGE_TOO_LARGE');
        }
        if(type==='VP8 '){
          if(payload || size<10 || (bytes[start]&1) || text(start+3,3)!=='\x9d\x01\x2a')throw error('DECODE_FAILED');
          imageWidth=view.getUint16(start+6,true)&16383;imageHeight=view.getUint16(start+8,true)&16383;payload=true;
        }
        if(type==='VP8L'){
          if(payload || size<5 || bytes[start]!==47 || bytes[start+4]>>5)throw error('DECODE_FAILED');
          const bits=view.getUint32(start+1,true);imageWidth=(bits&16383)+1;imageHeight=((bits>>>14)&16383)+1;payload=true;
        }
        offset=start+size+(size%2);
      }
      if(!payload)throw error('DECODE_FAILED');
      if(extended && (width!==imageWidth || height!==imageHeight))throw error('DECODE_FAILED');
      width=imageWidth;height=imageHeight;
    } else throw error('UNSUPPORTED_IMAGE');
    if(!checkDimensions(width,height).ok)throw error('IMAGE_TOO_LARGE');
    return {mime,width,height,orientation};
  }
  async function inspectInput(file) {
    if (!file || !Number.isSafeInteger(file.size) || file.size<1) throw error('UNSUPPORTED_IMAGE');
    if(file.size>limits.maxInputBytes)throw error('IMAGE_TOO_LARGE');
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(bytes.length!==file.size)throw error('DECODE_FAILED');
    const info=inspectHeader(bytes);
    if(file.type && file.type.toLowerCase()!==info.mime)throw error('UNSUPPORTED_IMAGE');
    return info;
  }
  function abort(signal) { if(signal?.aborted)throw error('CANCELLED'); }
  function encode(bytes) {
    let binary='';for(let n=0;n<bytes.length;n+=32768)binary+=String.fromCharCode(...bytes.subarray(n,n+32768));
    return env.btoa(binary);
  }
  function decodeBase64(value) {
    if(typeof value!=='string' || value.length===0 || value.length%4!==0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw error('INVALID_SHEET');
    const binary=env.atob(value),bytes=new Uint8Array(binary.length);
    for(let n=0;n<binary.length;n++)bytes[n]=binary.charCodeAt(n);
    // Reject noncanonical trailing pad bits too.
    if(env.btoa(binary)!==value)throw error('INVALID_SHEET');
    return bytes;
  }
  async function normalize(file,{signal,ctx}={}) {
    abort(signal);const info=await inspectInput(file);abort(signal);
    let bitmap=null,canvas=null;
    try {
      // The browser applies EXIF exactly once. Never rotate this bitmap again.
      bitmap=await env.createImageBitmap(file,{imageOrientation:'from-image'});abort(signal);
      const width=bitmap.width,height=bitmap.height;
      const swapped=info.orientation>=5;
      if(!checkDimensions(width,height).ok)throw error('IMAGE_TOO_LARGE');
      if(width!==(swapped?info.height:info.width)||height!==(swapped?info.width:info.height))throw error('DECODE_FAILED');
      canvas=env.document.createElement('canvas');canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d');if(!context)throw error('DECODE_FAILED');
      context.drawImage(bitmap,0,0);bitmap.close();bitmap=null;
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(error('DECODE_FAILED')),'image/png'));
      abort(signal);
      if(blob.size>limits.maxPngBytes)throw error('IMAGE_TOO_LARGE');
      const bytes=new Uint8Array(await blob.arrayBuffer());abort(signal);
      const output=inspectHeader(bytes);
      if(output.mime!=='image/png'||output.width!==width||output.height!==height)throw error('DECODE_FAILED');
      return {id:ctx.newId('image'),mime:'image/png',width,height,byteLength:bytes.length,dataBase64:encode(bytes)};
    } catch(e) { if(e.code)throw e;throw error('DECODE_FAILED'); }
    finally { if(bitmap)bitmap.close();if(canvas){canvas.width=0;canvas.height=0;} }
  }
  async function verifyStoredAsset(asset,{signal}={}) {
    abort(signal);
    if(asset.mime!=='image/png' || !Number.isSafeInteger(asset.byteLength) || asset.byteLength<1 || asset.byteLength>limits.maxPngBytes ||
       typeof asset.dataBase64!=='string' || asset.dataBase64.length>Math.ceil(limits.maxPngBytes/3)*4)throw error('INVALID_SHEET');
    const bytes=decodeBase64(asset.dataBase64);
    if(bytes.length!==asset.byteLength)throw error('INVALID_SHEET');
    const h=inspectHeader(bytes);
    if(h.mime!=='image/png'||h.width!==asset.width||h.height!==asset.height)throw error('INVALID_SHEET');
    let bitmap;
    try{bitmap=await env.createImageBitmap(new env.Blob([bytes],{type:'image/png'}));abort(signal);if(bitmap.width!==asset.width||bitmap.height!==asset.height)throw error('INVALID_SHEET');}
    catch(e){if(e.code)throw e;throw error('DECODE_FAILED');}finally{bitmap?.close();}
  }
  function urlFor(asset) {
    if(urls.has(asset.id)){const value=urls.get(asset.id);urls.delete(asset.id);urls.set(asset.id,value);return value;}
    const url=env.URL.createObjectURL(new env.Blob([decodeBase64(asset.dataBase64)],{type:'image/png'}));urls.set(asset.id,url);
    // Display cache holds current + previous only. Document/Undo share strings.
    while(urls.size>2)release(urls.keys().next().value);
    return url;
  }
  function release(assetId) {if(urls.has(assetId)){env.URL.revokeObjectURL(urls.get(assetId));urls.delete(assetId);}}
  function releaseAll() {for(const id of urls.keys())release(id);}
  return Object.freeze({inspectHeader,checkDimensions,inspectInput,normalize,verifyStoredAsset,decodeBase64,urlFor,release,releaseAll});
}
