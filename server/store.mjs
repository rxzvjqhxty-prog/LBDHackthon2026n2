import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {albums as seeds,photoSlots} from '../src/carnets-data.js';

export function createStore(directory){
 const dir=resolve(directory);mkdirSync(dir,{recursive:true,mode:0o700});mkdirSync(join(dir,'media'),{recursive:true,mode:0o700});
 const db=new DatabaseSync(join(dir,'bonaparte.sqlite'));db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 db.exec(readFileSync(new URL('./migrations/001.sql',import.meta.url),'utf8'));
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}};
 if(!db.prepare('SELECT value FROM meta WHERE key=?').get('seeded'))transaction(()=>{
  const now=Date.now();for(const [order,a] of seeds.entries()){
   const draft={...a,order,startDate:'',endDate:'',coverMediaId:null,pages:photoSlots.map((p,i)=>({id:randomUUID(),title:i===0?a.title:p.label,body:i===0?a.description:i===1?'Les photographies et les récits de ce voyage restent à recueillir.':'Un espace pour les découvertes et les mots des participants.',layout:'collage',photos:[]}))};
   db.prepare('INSERT INTO albums(id,slug,draft,published,published_version,created_at,updated_at,published_at) VALUES(?,?,?,?,1,?,?,?)').run(randomUUID(),a.slug,JSON.stringify(draft),JSON.stringify(draft),now,now,now);
  }db.prepare('INSERT INTO meta VALUES(?,?)').run('seeded','1');
 });
 const setupPath=join(dir,'setup-code.txt');
 if(!db.prepare('SELECT id FROM users LIMIT 1').get()&&!existsSync(setupPath))writeFileSync(setupPath,randomBytes(32).toString('base64url'),{mode:0o600,flag:'wx'});
 const audit=(user,action,target='')=>db.prepare('INSERT INTO audit(user_id,action,target,created_at) VALUES(?,?,?,?)').run(user||null,action,target,Date.now());
 return {db,dir,transaction,audit,setupPath,removeSetup:()=>{if(existsSync(setupPath))unlinkSync(setupPath)}};
}
