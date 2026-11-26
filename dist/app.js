let font,projectSettings,model,baseColor='#FAFAF5',textColor='#E93D32',composing=false,material='PLA';
const $=s=>document.querySelector(s),G=NameGeometry;
function draw(){if(!font||composing)return;try{let name=$('#name').value.trim().normalize('NFC');if(!/^[\p{L}\p{N}ー]+$/u.test(name)||[...name].length<1||[...name].length>12)throw Error('名前は、ひらがな・カタカナ・英数字で1〜12文字にしてください。');$('#widthLabel').textContent=$('#width').value+' mm';model=G.make(font,name,+$('#width').value,$('#playful').checked,$('#shape').value==='plate');$('#preview').setAttribute('viewBox',`-5 -5 ${model.width+10} ${model.height+12}`);$('#art').innerHTML=`<g transform="translate(0 ${model.height}) scale(1 -1)"><path d="${G.pathD(model.base)}" fill="${baseColor}" fill-rule="nonzero" stroke="#00000018" stroke-width=".15" filter="url(#shadow)"/><path d="${G.pathD(model.letters)}" fill="${textColor}" fill-rule="nonzero" stroke="#00000020" stroke-width=".08"/></g>`;$('#dimensions').textContent=`${model.width.toFixed(1)} × ${model.height.toFixed(1)} mm`;$('#status').textContent='● 形ができました。名前や色は何度でも変えられます。';$('#status').classList.remove('error');$('#downloadStl').disabled=false;$('#download3mf').disabled=!projectSettings;}catch(e){model=null;$('#art').innerHTML='';$('#status').textContent=e.message;$('#status').classList.add('error');$('#download3mf').disabled=$('#downloadStl').disabled=true;}}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(draw,160)}
$('#name').addEventListener('input',schedule);$('#name').addEventListener('compositionstart',()=>composing=true);$('#name').addEventListener('compositionend',()=>{composing=false;draw()});$('#width').addEventListener('input',schedule);$('#playful').addEventListener('change',draw);$('#shape').addEventListener('change',draw);
document.querySelectorAll('[data-name]').forEach(b=>b.onclick=()=>{$('#name').value=b.dataset.name;draw()});
const palette=[['白','#FAFAF5','#315d48'],['黒','#222622','white'],['青','#1468D8','white'],['赤','#E93D32','white'],['黄色','#F6CD19','#314631']];
const colorMemory={PLA:{base:baseColor,text:textColor},TPU:{base:'#FAFAF5',text:'#E93D32'}};
function renderColors(){
 for(const type of ['base','text']){
  const current=type==='base'?baseColor:textColor,row=$(`#${type}Colors`);
  row.innerHTML=palette.filter(([label])=>material==='PLA'||['白','赤','青'].includes(label)).map(([label,color,tick])=>`<button class="swatch" data-color="${color}" data-label="${label}" aria-label="${label}の${type==='base'?'ベース':'文字'}" aria-pressed="${current===color}" style="--color:${color};--tick:${tick}"></button>`).join('');
  $(`#${type}Label`).textContent=palette.find(p=>p[1]===current)[0];
  row.querySelectorAll('button').forEach(b=>b.onclick=()=>{
   if(type==='base')baseColor=b.dataset.color;else textColor=b.dataset.color;
   colorMemory[material][type]=b.dataset.color;renderColors();draw();
  });
 }
}
$('#material').addEventListener('change',()=>{
 $('#printStep').textContent=$('#material').value==='TPU'?'TPUの設定を選び、外部スプールと高さ1.2mmでの手動色替えを確認してスライス。':'２色の表示を確認してスライス。送信時にAMSの実際の色を確認。';
 material=$('#material').value;({base:baseColor,text:textColor}=colorMemory[material]);renderColors();
 $('#exportHint').textContent=material==='PLA'?'3MFに選んだ２色と部品への割り当て、A1 mini・0.4mm・eSUN PLA+の設定を含めます。Bambu Studioでは「プロジェクト」として開いてください。':'TPUの3MFは形状・２色・部品の割り当てを保存します。温度や速度は含めません。Bambu Studioで使用するTPUの設定を選び、外部スプール・手動色替えを設定してください。';
 $('#materialHelp').textContent=material==='PLA'?'PLA・積層0.2mm・サポートなしが試作の目安です。':'TPUは使用するフィラメントに合った設定で試作してください。２色の場合は高さ1.2mmでの手動色替えを確認してください。';draw();
});
renderColors();
function save(bytes,extension){let blob=new Blob([bytes],{type:extension==='3mf'?'model/3mf':'application/octet-stream'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ActionLabo_'+$('#name').value.trim()+(extension==='3mf'?'_'+material+'_Bambu_2p4mm':'')+'.'+extension;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('#toast').textContent='保存を開始しました。Bambu Studioで開いてください。';$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',4500);}
async function thumbnail(){
 const svg=$('#preview').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','512');svg.setAttribute('height','256');
 const src=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
 try{const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#e7ece3';c.fillRect(0,0,512,256);c.drawImage(image,0,0,512,256);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));return new Uint8Array(await blob.arrayBuffer());}finally{URL.revokeObjectURL(src);}
}
$('#download3mf').onclick=async()=>{clearTimeout(timer);draw();if(!model||!projectSettings)return;const button=$('#download3mf');button.disabled=true;const text=button.textContent;button.textContent='設定つきデータを作っています…';try{const m=model,bc=baseColor,tc=textColor,name=$('#name').value.trim(),selectedMaterial=material;let image;try{image=await thumbnail()}catch(e){console.warn('Thumbnail unavailable',e)}save(BambuProject.export(m,bc,tc,projectSettings,name,image,selectedMaterial),'3mf');}catch(e){$('#status').textContent='保存できませんでした：'+e.message}finally{button.textContent=text;button.disabled=!model||!projectSettings;}};$('#downloadStl').onclick=()=>{clearTimeout(timer);draw();if(model)save(G.stl(model),'stl')};
Promise.all([fetch('fonts/playful.ttf').then(r=>{if(!r.ok)throw Error('書体を読み込めませんでした。ページを開き直してください。');return r.arrayBuffer()}),fetch('bambu-settings.json').then(r=>{if(!r.ok)throw Error('印刷設定を読み込めませんでした。ページを開き直してください。');return r.json()})]).then(([b,settings])=>{font=opentype.parse(b);projectSettings=settings;draw()}).catch(e=>{$('#status').textContent=e.message;$('#status').classList.add('error')});
