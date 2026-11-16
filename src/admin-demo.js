// Isolated, ephemeral showcase adapter. Never sends a modifying request to the server.
import {registerPreviewMedia} from './carnets-render.js';
import {recognizeAccess} from './publication-review.js';
let rows=[],counter=0,media=[];
export const demoIdentity={id:'showcase',email:'demonstration@example.invalid',name:'Camille · profil fictif',role:'admin',mfa:true};
export async function initializeDemo(){
 const r=await fetch('/api/public/albums');if(!r.ok)throw new Error('La bibliothèque doit être disponible pour ouvrir la démonstration.');
 const list=(await r.json()).albums;
 rows=await Promise.all(list.map(async a=>{const full=await fetch('/api/public/albums/'+a.slug);if(!full.ok)throw new Error('Carnet indisponible.');return {id:a.id,slug:a.slug,draft:(await full.json()).album,version:1,status:'published',hasChanges:false,updatedAt:Date.now(),publishedAt:Date.now()}}));
 return {user:demoIdentity,csrf:null};
}
export async function demoAPI(path,{method='GET',body}={}){
 if(path==='/admin/albums'&&method==='GET')return {albums:structuredClone(rows)};
 if(path==='/admin/media'&&method==='GET')return {media:structuredClone(media)};
 if(path==='/admin/media'&&method==='POST'){
  if(!(body instanceof File)||!['image/jpeg','image/png','image/webp'].includes(body.type)||body.size>10*1024*1024)throw new Error('Choisissez une image JPEG, PNG ou WebP de 10 Mo maximum.');
  const image=await createImageBitmap(body);const width=image.width,height=image.height;image.close();if(width*height>24000000)throw new Error('Cette image dépasse 24 mégapixels.');
  const id='demo-media-'+crypto.randomUUID(),previewUrl=URL.createObjectURL(body);registerPreviewMedia(id,previewUrl);const item={id,previewUrl,filename:body.name,width,height,bytes:body.size,alt:'',credit:'',permission:'unknown',permission_note:''};media.unshift(item);return structuredClone(item);
 }
 const mediaMatch=path.match(/^\/admin\/media\/([^/]+)$/);if(mediaMatch&&method==='PUT'){const item=media.find(m=>m.id===mediaMatch[1]);if(!item)throw new Error('Image absente.');Object.assign(item,{alt:body.alt,credit:body.credit,permission:body.permission,permission_note:body.permissionNote});return structuredClone(item);}
 if(path==='/admin/users')return {users:[{...demoIdentity,active:1,disabled:0,mfa:1}]};
 if(path==='/admin/audit')return {events:[]};
 if(path==='/logout')return {ok:true};
 if(path==='/admin/albums'&&method==='POST'){const row={id:'demo-'+ ++counter,slug:'demonstration-'+counter,draft:structuredClone(body.draft),version:1,status:'draft',hasChanges:true,updatedAt:Date.now()};rows.unshift(row);return structuredClone(row)}
 const match=path.match(/^\/admin\/albums\/([^/]+)(?:\/(publish|unpublish|archive|duplicate))?$/);
 if(match){const row=rows.find(r=>r.id===match[1]);if(!row)throw new Error('Carnet absent de cette démonstration.');const action=match[2];
  if(method==='GET')return structuredClone(row);
  if(method==='PUT'){row.draft=structuredClone(body.draft);row.version++;row.hasChanges=true;}
  if(method==='DELETE'){rows=rows.filter(r=>r.id!==row.id);return {ok:true}}
  if(action==='duplicate'){const copy={...structuredClone(row),id:'demo-'+ ++counter,slug:'demonstration-'+counter,status:'draft',hasChanges:true};copy.draft.title+=' — copie';rows.unshift(copy);return copy}
  if(action==='publish'){row.status='published';row.hasChanges=false;row.publishedAt=Date.now();}
  if(action==='unpublish'){row.status='draft';row.hasChanges=true;}
  if(action==='archive')row.status='archived';
  row.updatedAt=Date.now();return structuredClone(row);
 }
 throw new Error('Cette opération nécessite un vrai compte. La démonstration ne crée ni accès, ni fichier, ni publication réelle.');
}
export const recognitionScenarios=[
 {label:'Administrateur + double vérification',input:{authenticated:true,role:'admin',mfaRequired:true,mfaVerified:true}},
 {label:'Compte reconnu sans droits',input:{authenticated:true,role:'viewer'}},
 {label:'Code de vérification manquant',input:{authenticated:true,role:'admin',mfaRequired:true}},
 {label:'Session expirée',input:{}},
 {label:'Compte suspendu',input:{authenticated:true,role:'admin',disabled:true}}
].map(s=>({...s,result:recognizeAccess(s.input)}));
