/* Native project structure follows a user-saved Bambu Studio 02.08.03.66 project.
   Fresh meshes and part assignments; no machine identifiers, old slices or old AMS slot mapping. */
(function(root){
const header='<?xml version="1.0" encoding="UTF-8"?>';
const core='http://schemas.microsoft.com/3dmanufacturing/core/2015/02',prod='http://schemas.microsoft.com/3dmanufacturing/production/2015/06';
const identity='1 0 0 0 1 0 0 0 1 0 0 0';
const matrix='1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1';
const uuid=()=>root.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{let r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function meshXML(tris){const vs=[],fs=[],map=new Map();for(const t of tris){fs.push(t.map(p=>{const key=p.map(x=>x.toFixed(6)).join(',');if(!map.has(key)){map.set(key,vs.length);vs.push(p);}return map.get(key)}));}return '<mesh><vertices>'+vs.map(p=>`<vertex x="${p[0]}" y="${p[1]}" z="${p[2]}"/>`).join('')+'</vertices><triangles>'+fs.map(t=>`<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`).join('')+'</triangles></mesh>';}
function exportProject(model,baseColor,textColor,template,name,thumbnail,material='PLA'){
const G=root.NameGeometry,enc=root.fflate.strToU8,settings=material==='TPU'?{
 printer_model:template.printer_model,printer_variant:template.printer_variant,
 printer_settings_id:template.printer_settings_id,nozzle_diameter:template.nozzle_diameter,
 layer_height:template.layer_height,initial_layer_print_height:template.initial_layer_print_height,
 filament_type:['TPU','TPU'],filament_settings_id:['',''],filament_ids:['','']
}:JSON.parse(JSON.stringify(template));
settings.filament_colour=[baseColor,textColor].map(x=>x.toUpperCase());
settings.filament_multi_colour=settings.filament_colour.slice();
settings.filament_self_index=['1','2'];
settings.filament_map=['1','1'];settings.filament_volume_map=['0','0'];settings.filament_map_mode='Auto For Flush';
// Use the larger reference purge allowance in either direction: selected colors may differ.
const maxFlush=Math.max(...(settings.flush_volumes_matrix||['605']).map(Number).filter(Number.isFinite),605);
settings.flush_volumes_matrix=['0',String(maxFlush),String(maxFlush),'0'];
settings.flush_volumes_vector=['140','140','140','140'];
const base=G.solid(model.base,0,1.2),letters=G.solid(model.letters,1.2,2.4),x=(180-model.width)/2,y=(180-model.height)/2;
const title=esc('Action Labo '+name),stamp=new Date().toISOString().slice(0,10),u=[uuid(),uuid(),uuid(),uuid(),uuid()];
const attrs=`unit="millimeter" xml:lang="en-US" xmlns="${core}" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="${prod}" requiredextensions="p"`;
const modelXML=header+`<model ${attrs}><metadata name="Application">BambuStudio-02.08.03.66</metadata><metadata name="BambuStudio:3mfVersion">1</metadata><metadata name="Title">${title}</metadata><metadata name="CreationDate">${stamp}</metadata><metadata name="ModificationDate">${stamp}</metadata><resources><object id="3" p:UUID="${u[0]}" type="model"><components><component p:path="/3D/Objects/object_1.model" objectid="1" p:UUID="${u[1]}" transform="${identity}"/><component p:path="/3D/Objects/object_1.model" objectid="2" p:UUID="${u[2]}" transform="${identity}"/></components></object></resources><build p:UUID="${u[3]}"><item objectid="3" p:UUID="${u[4]}" transform="1 0 0 0 1 0 0 0 1 ${x} ${y} 0" printable="1"/></build></model>`;
const objectsXML=header+`<model ${attrs}><metadata name="BambuStudio:3mfVersion">1</metadata><resources><object id="1" p:UUID="${u[1]}" type="model">${meshXML(base)}</object><object id="2" p:UUID="${u[2]}" type="model">${meshXML(letters)}</object></resources></model>`;
function part(id,label,extruder,faces){return `<part id="${id}" subtype="normal_part" uuid="${uuid()}"><metadata key="name" value="${label}"/><metadata key="matrix" value="${matrix}"/><metadata key="extruder" value="${extruder}"/><mesh_stat face_count="${faces}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/></part>`;}
const thumbMeta=thumbnail?'<metadata key="thumbnail_file" value="Metadata/plate_1.png"/><metadata key="thumbnail_no_light_file" value="Metadata/plate_no_light_1.png"/><metadata key="top_file" value="Metadata/top_1.png"/>':'';
const config=header+`<config><object id="3"><metadata key="name" value="${title}"/><metadata key="extruder" value="1"/><metadata face_count="${base.length+letters.length}"/>${part(1,'Base - 1',1,base.length)}${part(2,'Letters - 2',2,letters.length)}</object><plate><metadata key="plater_id" value="1"/><metadata key="plater_name" value="${title}"/><metadata key="locked" value="false"/><metadata key="filament_map_mode" value="Auto For Flush"/><metadata key="filament_maps" value="1 1"/><metadata key="filament_volume_maps" value="0 0"/>${thumbMeta}<model_instance><metadata key="object_id" value="3"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="1"/></model_instance></plate><assemble><assemble_item object_id="3" instance_id="0" transform="1 0 0 0 1 0 0 0 1 ${x} ${y} 0" offset="0 0 0"/><assemble_item object_id="3" volume_id="0" transform="${identity}"/><assemble_item object_id="3" volume_id="1" transform="${identity}"/></assemble></config>`;
const rels=(target,extra='')=>header+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="${target}" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>${extra}</Relationships>`;
const plate={bbox_all:[x,y,x+model.width,y+model.height],bbox_objects:[{area:model.width*model.height,bbox:[x,y,x+model.width,y+model.height],id:1,layer_height:.2,name:'Action Labo '+name}],bed_type:'textured_plate',filament_colors:settings.filament_colour,filament_ids:settings.filament_ids,first_extruder:0,first_layer_time:0,is_seq_print:false,nozzle_diameter:.4,version:2};
const files={'[Content_Types].xml':enc(header+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="png" ContentType="image/png"/></Types>'),'_rels/.rels':enc(rels('/3D/3dmodel.model',thumbnail?'<Relationship Target="/Metadata/plate_1.png" Id="rel-2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>':'')),'3D/3dmodel.model':enc(modelXML),'3D/_rels/3dmodel.model.rels':enc(rels('/3D/Objects/object_1.model')),'3D/Objects/object_1.model':enc(objectsXML),'Metadata/project_settings.config':enc(JSON.stringify(settings,null,2)),'Metadata/model_settings.config':enc(config),'Metadata/plate_1.json':enc(JSON.stringify(plate))};
if(thumbnail){for(const key of ['plate_1','plate_1_small','plate_no_light_1','top_1'])files['Metadata/'+key+'.png']=thumbnail;}
return root.fflate.zipSync(files,{level:6});
}
root.BambuProject={export:exportProject};
})(typeof window==='undefined'?globalThis:window);
