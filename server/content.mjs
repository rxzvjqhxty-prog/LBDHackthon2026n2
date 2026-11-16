import {fail} from './security.mjs';
const text=(v,max=2000)=>{if(typeof v!=='string'||v.length>max)fail(400,'Texte absent ou trop long.');return v.trim()};
const number=(v,min,max)=>{if(!Number.isFinite(v)||v<min||v>max)fail(400,'Valeur numérique invalide.');return v};
const date=v=>{if(!v)return '';if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail(400,'Date invalide.');return v};
const id=v=>{if(v===null||v===undefined||v==='')return null;if(typeof v!=='string'||!/^[-a-zA-Z0-9]{1,60}$/.test(v))fail(400,'Identifiant de média invalide.');return v};
export function validateDraft(d){
 if(!d||typeof d!=='object')fail(400,'Carnet invalide.');
 const title=text(d.title,90),place=text(d.place,120),startDate=date(d.startDate),endDate=date(d.endDate);
 if(!title)fail(400,'Donnez un titre au carnet.');if(endDate&&(!startDate||endDate<startDate))fail(400,'La date de retour doit suivre la date de départ.');
 const year=number(d.year,1976,2200);if(!Number.isInteger(year))fail(400,'Année invalide.');
 if(startDate&&Number(startDate.slice(0,4))!==year)fail(400,'L’année du rayon doit correspondre à la date de départ.');
 if(!d.art||![d.art.color,d.art.ink].every(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)))fail(400,'Couleur invalide.');
 if(!Array.isArray(d.pages)||d.pages.length<1||d.pages.length>40)fail(400,'Un carnet doit contenir de 1 à 40 doubles pages.');
 const pages=d.pages.map(p=>{
  if(!['story','photo','collage'].includes(p.layout)||!Array.isArray(p.photos)||p.photos.length>3)fail(400,'Mise en page invalide.');
  return {id:id(p.id),title:text(p.title,100),body:text(p.body,4000),layout:p.layout,photos:p.photos.map(photo=>({mediaId:id(photo.mediaId),alt:text(photo.alt,300),caption:text(photo.caption,400),x:number(photo.x??50,0,100),y:number(photo.y??50,0,100)}))};
 });
 return {title,place,year,startDate,endDate,group:text(d.group,160),theme:text(d.theme,120),description:text(d.description,2000),order:number(d.order??0,0,10000),coverMediaId:id(d.coverMediaId),art:{column:number(d.art.column,0,2),row:number(d.art.row,0,1),color:d.art.color,ink:d.art.ink},pages};
}
export function mediaIds(d){return [...new Set([d.coverMediaId,...d.pages.flatMap(p=>p.photos.map(i=>i.mediaId))].filter(Boolean))]}
export function checkMedia(db,d,publishing=false){
 for(const id of mediaIds(d)){const m=db.prepare('SELECT * FROM media WHERE id=?').get(id);if(!m)fail(400,'Une image n’est plus disponible.');if(publishing&&(m.permission!=='approved'||!m.alt||!m.permission_note))fail(400,'Chaque image doit avoir un texte alternatif et une autorisation de publication documentée.');}
 if(publishing&&d.pages.some(p=>p.photos.some(i=>!i.mediaId||!i.alt)))fail(400,'Ajoutez un texte alternatif à chaque photographie.');
}
export function albumRecord(row){return {id:row.id,slug:row.slug,draft:JSON.parse(row.draft),version:row.version,status:row.archived?'archived':row.published?'published':'draft',hasChanges:row.published_version!==row.version,publishedAt:row.published_at,updatedAt:row.updated_at};}
