import {randomUUID} from 'node:crypto';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {hash,token,equal,fail,passwordHash,verifyPassword,verifyOTP,newOTP,rateLimit,sessionFor,setSession,clearSession,requireAdmin,readBody,jsonBody} from './security.mjs';
import {validateDraft,mediaIds,checkMedia,albumRecord} from './content.mjs';
import {reviewPublication} from '../src/publication-review.js';

export function createAPI(store,{origin,secure=false}){
 const {db,dir,audit,transaction}=store;let activeHashes=0,activeUploads=0;
 const reply=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const protectHash=async fn=>{if(activeHashes>=3)fail(429,'Connexion occupée, veuillez réessayer.');activeHashes++;try{return await fn()}finally{activeHashes--}};
 const email=v=>{if(typeof v!=='string'||v.length>254||!/^\S+@\S+\.\S+$/.test(v))fail(400,'Adresse électronique invalide.');return v.toLowerCase().trim()};
 const name=v=>{if(typeof v!=='string'||v.trim().length<2||v.length>100)fail(400,'Indiquez un nom de 2 à 100 caractères.');return v.trim()};
 const rowFor=id=>{const row=db.prepare('SELECT * FROM albums WHERE id=?').get(id);if(!row)fail(404,'Carnet introuvable.');return row};
 const version=(r,b)=>{if(b.version!==r.version)fail(409,'Ce carnet a été modifié ailleurs. Votre travail est conservé à l’écran. Rechargez la dernière version avant de réessayer.');};
 const updateRefs=(id,d)=>{db.prepare('DELETE FROM published_media WHERE album_id=?').run(id);for(const m of mediaIds(d))db.prepare('INSERT INTO published_media VALUES(?,?)').run(id,m)};
 const userFor=s=>db.prepare('SELECT * FROM users WHERE id=?').get(s.user_id);
 const withCredits=d=>({...d,pages:d.pages.map(p=>({...p,photos:p.photos.map(photo=>({...photo,credit:db.prepare('SELECT credit FROM media WHERE id=?').get(photo.mediaId)?.credit||''}))}))});
 function consumeOTP(u,code){const step=verifyOTP(u.mfa_secret,u.email,code,u.mfa_step);if(step===null||!db.prepare('UPDATE users SET mfa_step=? WHERE id=? AND mfa_step<?').run(step,u.id,step).changes)fail(401,'Code d’authentification invalide ou déjà utilisé.');}
 async function reauthenticate(s,b){rateLimit(db,'reauth:'+s.user_id,15);const before=userFor(s);const valid=await protectHash(()=>verifyPassword(b.password,before.password));const u=userFor(s);if(!valid||u.disabled||u.role!=='admin'||u.password!==before.password)fail(401,'Vérification du compte refusée.');if(u.mfa_secret)consumeOTP(u,b.otp);return u}
 return async(req,res,url)=>{
  const path=url.pathname,method=req.method;
  if(!path.startsWith('/api/')&&!path.startsWith('/media/'))return false;
  try{
   const expected=origin();if(req.headers.host!==new URL(expected).host)fail(403,'Hôte non autorisé.');
   if(!['GET','HEAD'].includes(method)){if(req.headers.origin!==expected)fail(403,'Origine de la requête refusée.');if(req.headers['sec-fetch-site']==='cross-site')fail(403,'Requête intersite refusée.');}
   const session=sessionFor(db,req),ip=req.socket.remoteAddress||'unknown';
   if(path==='/api/session'&&method==='GET'){reply(res,200,{user:session?{id:session.user_id,email:session.email,name:session.name,role:session.role,mfa:!!session.mfa_secret}:null,csrf:session?.csrf||null,setupRequired:!db.prepare('SELECT id FROM users LIMIT 1').get()});return true}
   if(path==='/api/setup'&&method==='POST'){
    rateLimit(db,'setup:'+ip,8);const b=await jsonBody(req);if(db.prepare('SELECT id FROM users LIMIT 1').get())fail(409,'Le premier compte a déjà été créé.');
    const secret=await readFile(store.setupPath,'utf8');if(!equal(b.token,secret.trim()))fail(403,'Code d’installation incorrect.');
    const address=email(b.email),display=name(b.name),password=await protectHash(()=>passwordHash(b.password)),id=randomUUID();
    transaction(()=>{if(db.prepare('SELECT id FROM users LIMIT 1').get())fail(409,'Installation déjà terminée.');db.prepare('INSERT INTO users(id,email,name,password,role,created_at) VALUES(?,?,?,?,?,?)').run(id,address,display,password,'admin',Date.now());audit(id,'setup',id)});
    store.removeSetup();reply(res,201,setSession(db,res,db.prepare('SELECT * FROM users WHERE id=?').get(id),secure));return true;
   }
   if(path==='/api/login'&&method==='POST'){
    rateLimit(db,'login-ip:'+ip,30);const b=await jsonBody(req),address=email(b.email);rateLimit(db,'login-user:'+hash(address),10);
    const before=db.prepare('SELECT * FROM users WHERE email=?').get(address),valid=await protectHash(()=>verifyPassword(b.password,before?.password));
    const user=db.prepare('SELECT * FROM users WHERE email=?').get(address);
    if(!valid||!user||user.disabled||user.password!==before?.password){audit(null,'login.failed');fail(401,'Identifiants incorrects.');}
    if(user.mfa_secret)consumeOTP(user,b.otp);
    if(session)db.prepare('DELETE FROM sessions WHERE hash=?').run(session.hash);db.prepare('DELETE FROM limits WHERE key=?').run('login-user:'+hash(address));audit(user.id,'login');reply(res,200,setSession(db,res,user,secure));return true;
   }
   if(path==='/api/invitations/accept'&&method==='POST'){
    rateLimit(db,'invite:'+ip,10);const b=await jsonBody(req);if(typeof b.token!=='string')fail(400,'Invitation invalide.');const invitation=db.prepare('SELECT * FROM invitations WHERE hash=?').get(hash(b.token));if(!invitation||invitation.expires<Date.now())fail(410,'Cette invitation est expirée ou déjà utilisée.');
    const display=name(b.name),password=await protectHash(()=>passwordHash(b.password));transaction(()=>{const fresh=db.prepare('SELECT * FROM invitations WHERE hash=?').get(hash(b.token));if(!fresh||fresh.expires<Date.now())fail(410,'Invitation expirée ou déjà utilisée.');const user=db.prepare('SELECT * FROM users WHERE id=?').get(fresh.user_id);if(user.disabled)fail(403,'Ce compte est suspendu.');if(user.mfa_secret)consumeOTP(user,b.otp);db.prepare('UPDATE users SET name=?,password=? WHERE id=?').run(display,password,fresh.user_id);db.prepare('DELETE FROM invitations WHERE user_id=?').run(fresh.user_id);audit(fresh.user_id,'invitation.accepted')});
    reply(res,200,setSession(db,res,db.prepare('SELECT * FROM users WHERE id=?').get(invitation.user_id),secure));return true;
   }
   if(path==='/api/logout'&&method==='POST'){if(session&&!equal(req.headers['x-csrf-token'],session.csrf))fail(403,'Jeton de sécurité invalide.');if(session)db.prepare('DELETE FROM sessions WHERE hash=?').run(session.hash);clearSession(res,secure);reply(res,200,{ok:true});return true;}
   if(path==='/api/public/albums'&&method==='GET'){
    const result=db.prepare('SELECT id,slug,published FROM albums WHERE published IS NOT NULL AND archived=0').all().map(r=>{const {pages,...a}=JSON.parse(r.published);return {...a,id:r.id,slug:r.slug,pageCount:pages.length}}).sort((a,b)=>b.year-a.year||a.order-b.order||a.title.localeCompare(b.title,'fr'));reply(res,200,{albums:result});return true;
   }
   const publicAlbum=path.match(/^\/api\/public\/albums\/([a-z0-9-]+)$/);
   if(publicAlbum&&method==='GET'){const r=db.prepare('SELECT id,slug,published FROM albums WHERE slug=? AND published IS NOT NULL AND archived=0').get(publicAlbum[1]);if(!r)fail(404,'Ce carnet n’est pas publié.');reply(res,200,{album:{...withCredits(JSON.parse(r.published)),id:r.id,slug:r.slug}});return true;}
   const mediaRoute=path.match(/^\/media\/([a-f0-9-]{36})$/);
   if(mediaRoute&&['GET','HEAD'].includes(method)){
    const m=db.prepare('SELECT * FROM media WHERE id=?').get(mediaRoute[1]),published=m?.permission==='approved'&&db.prepare('SELECT album_id FROM published_media WHERE media_id=? LIMIT 1').get(m.id);if(!m||(!published&&session?.role!=='admin'))fail(404,'Image indisponible.');const data=await readFile(join(dir,'media',m.id+'.webp'));res.writeHead(200,{'Content-Type':'image/webp','Content-Length':data.length,'Cache-Control':'no-store','Content-Disposition':'inline'});res.end(method==='HEAD'?undefined:data);return true;
   }
   if(!path.startsWith('/api/admin/'))fail(404,'Ressource introuvable.');requireAdmin(session);
   if(!['GET','HEAD'].includes(method)&&!equal(req.headers['x-csrf-token'],session.csrf))fail(403,'Jeton de sécurité invalide. Rechargez votre session.');const uid=session.user_id;
   if(path==='/api/admin/albums'&&method==='GET'){reply(res,200,{albums:db.prepare('SELECT * FROM albums ORDER BY updated_at DESC').all().map(albumRecord)});return true;}
   if(path==='/api/admin/albums'&&method==='POST'){
    const b=await jsonBody(req),d=validateDraft(b.draft);checkMedia(db,d);const id=randomUUID(),slug=d.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50).replace(/^-|-$/g,'')+'-'+d.year+'-'+id.slice(0,8),now=Date.now();transaction(()=>{db.prepare('INSERT INTO albums(id,slug,draft,created_at,updated_at) VALUES(?,?,?,?,?)').run(id,slug,JSON.stringify(d),now,now);audit(uid,'album.created',id)});reply(res,201,albumRecord(rowFor(id)));return true;
   }
   const albumPath=path.match(/^\/api\/admin\/albums\/([a-f0-9-]{36})(?:\/(publish|unpublish|archive|duplicate))?$/);
   if(albumPath){
    const [,id,action]=albumPath;let row=rowFor(id);if(method==='GET'&&!action){reply(res,200,albumRecord(row));return true}const b=await jsonBody(req);version(row,b);
    if(method==='PUT'&&!action){const d=validateDraft(b.draft);checkMedia(db,d);transaction(()=>{version(rowFor(id),b);db.prepare('UPDATE albums SET draft=?,version=version+1,archived=0,updated_at=? WHERE id=?').run(JSON.stringify(d),Date.now(),id);audit(uid,'album.saved',id)});reply(res,200,albumRecord(rowFor(id)));return true}
    if(method==='DELETE'&&!action){if(b.confirm!==id)fail(400,'Confirmation de suppression requise.');transaction(()=>{db.prepare('DELETE FROM published_media WHERE album_id=?').run(id);db.prepare('DELETE FROM albums WHERE id=?').run(id);audit(uid,'album.deleted',id)});reply(res,200,{ok:true});return true}
    if(method==='POST'&&action){
     if(action==='duplicate'){const copy=JSON.parse(row.draft),newId=randomUUID();copy.title=(copy.title+' — copie').slice(0,90);db.prepare('INSERT INTO albums(id,slug,draft,created_at,updated_at) VALUES(?,?,?,?,?)').run(newId,row.slug.slice(0,65)+'-'+newId.slice(0,8),JSON.stringify(copy),Date.now(),Date.now());audit(uid,'album.duplicated',newId);reply(res,201,albumRecord(rowFor(newId)));return true}
     if(b.confirm!==true)fail(400,'Confirmez cette modification de publication.');transaction(()=>{row=rowFor(id);version(row,b);if(action==='publish'){const d=validateDraft(JSON.parse(row.draft));checkMedia(db,d,true);const review=reviewPublication(d,db.prepare('SELECT * FROM media').all());if(!review.ready)fail(400,review.items.filter(i=>i.level==='block').map(i=>i.title).join(' · '));if(!d.place||!d.description)fail(400,'Renseignez la destination et l’introduction avant de publier.');updateRefs(id,d);db.prepare('UPDATE albums SET published=draft,published_version=version,published_at=?,archived=0 WHERE id=?').run(Date.now(),id)}else{db.prepare('DELETE FROM published_media WHERE album_id=?').run(id);db.prepare('UPDATE albums SET published=NULL,published_version=NULL,archived=?,version=version+1,updated_at=? WHERE id=?').run(action==='archive'?1:0,Date.now(),id)}audit(uid,'album.'+action,id)});reply(res,200,albumRecord(rowFor(id)));return true;
    }fail(405,'Méthode non autorisée.');
   }
   if(path==='/api/admin/media'&&method==='GET'){reply(res,200,{media:db.prepare('SELECT * FROM media ORDER BY created_at DESC').all()});return true}
   if(path==='/api/admin/media'&&method==='POST'){
    rateLimit(db,'upload:'+uid,100,3600000);if(activeUploads>=2)fail(429,'Deux images sont déjà en traitement. Réessayez.');if(!['image/jpeg','image/png','image/webp'].includes(req.headers['content-type']))fail(415,'Utilisez une image JPEG, PNG ou WebP.');activeUploads++;
    try{const input=await readBody(req,10*1024*1024);let output,info;try{const pipeline=sharp(input,{limitInputPixels:24_000_000,failOn:'warning'}),metadata=await pipeline.metadata();if(!['jpeg','png','webp'].includes(metadata.format)||metadata.pages>1)fail(415,'Format d’image non accepté.');({data:output,info}=await pipeline.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toBuffer({resolveWithObject:true}));}catch(e){if(e.status)throw e;fail(400,'Cette image est invalide, trop grande ou endommagée.');}
     const id=randomUUID(),filename=decodeURIComponent(String(req.headers['x-file-name']||'image')).slice(0,150);await writeFile(join(dir,'media',id+'.webp'),output,{flag:'wx',mode:0o600});db.prepare('INSERT INTO media(id,filename,width,height,bytes,created_by,created_at) VALUES(?,?,?,?,?,?,?)').run(id,filename,info.width,info.height,output.length,uid,Date.now());audit(uid,'media.uploaded',id);reply(res,201,db.prepare('SELECT * FROM media WHERE id=?').get(id));return true;
    }finally{activeUploads--}
   }
   const mediaPath=path.match(/^\/api\/admin\/media\/([a-f0-9-]{36})$/);
   if(mediaPath){const id=mediaPath[1],m=db.prepare('SELECT * FROM media WHERE id=?').get(id);if(!m)fail(404,'Image introuvable.');const b=await jsonBody(req);
    if(method==='PUT'){if(typeof b.alt!=='string'||b.alt.length>300||typeof b.credit!=='string'||b.credit.length>300||typeof b.permissionNote!=='string'||b.permissionNote.length>1000||!['approved','unknown','denied'].includes(b.permission))fail(400,'Métadonnées invalides.');if(b.permission==='approved'&&(!b.alt.trim()||!b.permissionNote.trim()))fail(400,'Texte alternatif et justification d’autorisation requis.');if(b.permission!=='approved'&&db.prepare('SELECT album_id FROM published_media WHERE media_id=? LIMIT 1').get(id))fail(409,'Dépubliez les carnets utilisant cette image avant de retirer son autorisation.');db.prepare('UPDATE media SET alt=?,credit=?,permission=?,permission_note=? WHERE id=?').run(b.alt.trim(),b.credit.trim(),b.permission,b.permissionNote.trim(),id);audit(uid,'media.reviewed',id);reply(res,200,db.prepare('SELECT * FROM media WHERE id=?').get(id));return true;}
    if(method==='DELETE'){if(b.confirm!==id)fail(400,'Confirmation requise.');if(db.prepare('SELECT draft FROM albums').all().some(r=>mediaIds(JSON.parse(r.draft)).includes(id))||db.prepare('SELECT album_id FROM published_media WHERE media_id=?').get(id))fail(409,'Retirez d’abord cette image de tous les carnets et brouillons.');db.prepare('DELETE FROM media WHERE id=?').run(id);await unlink(join(dir,'media',id+'.webp'));audit(uid,'media.deleted',id);reply(res,200,{ok:true});return true;}
   }
   if(path==='/api/admin/users'&&method==='GET'){reply(res,200,{users:db.prepare('SELECT id,email,name,role,disabled,password IS NOT NULL AS active,mfa_secret IS NOT NULL AS mfa FROM users').all()});return true}
   if(path==='/api/admin/invitations'&&method==='POST'){
    const b=await jsonBody(req);await reauthenticate(session,b);const address=email(b.email);if(!['admin','viewer'].includes(b.role))fail(400,'Rôle invalide.');if(db.prepare('SELECT id FROM users WHERE email=?').get(address))fail(409,'Ce compte existe déjà.');const id=randomUUID(),secret=token();transaction(()=>{db.prepare('INSERT INTO users(id,email,name,role,created_at) VALUES(?,?,?,?,?)').run(id,address,address,b.role,Date.now());db.prepare('INSERT INTO invitations VALUES(?,?,?)').run(hash(secret),id,Date.now()+48*3600000);audit(uid,'user.invited',id)});reply(res,201,{url:origin()+'/admin.html#invitation='+secret,expiresInHours:48});return true;
   }
   const userPath=path.match(/^\/api\/admin\/users\/([a-f0-9-]{36})$/);
   if(userPath&&method==='PUT'){const b=await jsonBody(req);await reauthenticate(session,b);if(userPath[1]===uid)fail(400,'Vous ne pouvez pas modifier vos propres droits ici.');if(!['admin','viewer'].includes(b.role)||typeof b.disabled!=='boolean')fail(400,'Droits invalides.');db.prepare('UPDATE users SET role=?,disabled=? WHERE id=?').run(b.role,b.disabled?1:0,userPath[1]);db.prepare('DELETE FROM sessions WHERE user_id=?').run(userPath[1]);audit(uid,'user.permissions',userPath[1]);reply(res,200,{ok:true});return true}
   if(path==='/api/admin/password'&&method==='POST'){const b=await jsonBody(req),u=await reauthenticate(session,b),password=await protectHash(()=>passwordHash(b.newPassword));db.prepare('UPDATE users SET password=? WHERE id=?').run(password,uid);db.prepare('DELETE FROM sessions WHERE user_id=?').run(uid);audit(uid,'password.changed');reply(res,200,setSession(db,res,u,secure));return true}
   if(path==='/api/admin/mfa/start'&&method==='POST'){const b=await jsonBody(req),u=await reauthenticate(session,b);if(u.mfa_secret)fail(409,'La double authentification est déjà active.');const data=newOTP(u.email);db.prepare('UPDATE users SET mfa_pending=? WHERE id=?').run(data.secret,uid);reply(res,200,data);return true}
   if(path==='/api/admin/mfa/confirm'&&method==='POST'){const b=await jsonBody(req),u=userFor(session);rateLimit(db,'mfa:'+uid,10);const step=u.mfa_pending?verifyOTP(u.mfa_pending,u.email,b.otp):null;if(step===null)fail(400,'Code incorrect.');db.prepare('UPDATE users SET mfa_secret=mfa_pending,mfa_pending=NULL,mfa_step=? WHERE id=?').run(step,uid);db.prepare('DELETE FROM sessions WHERE user_id=?').run(uid);audit(uid,'mfa.enabled');reply(res,200,setSession(db,res,userFor(session),secure));return true}
   if(path==='/api/admin/mfa/disable'&&method==='POST'){const b=await jsonBody(req);await reauthenticate(session,b);db.prepare('UPDATE users SET mfa_secret=NULL,mfa_pending=NULL,mfa_step=-1 WHERE id=?').run(uid);db.prepare('DELETE FROM sessions WHERE user_id=?').run(uid);audit(uid,'mfa.disabled');reply(res,200,setSession(db,res,userFor(session),secure));return true}
   if(path==='/api/admin/audit'&&method==='GET'){reply(res,200,{events:db.prepare('SELECT a.*,u.name FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 100').all()});return true}
   fail(404,'Ressource introuvable.');
  }catch(e){if(!e.status)console.error('API error:',e.message);reply(res,e.status||500,{error:e.status?e.message:'Le serveur n’a pas pu enregistrer cette opération. Réessayez.'});return true}
 };
}
