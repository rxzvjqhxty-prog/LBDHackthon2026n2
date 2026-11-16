export let auth={user:null,csrf:null};
export let demoEnabled=false;
let demoHandler;
export async function enableDemo(){const module=await import('./admin-demo.js');auth=await module.initializeDemo();demoHandler=module.demoAPI;demoEnabled=true;return auth;}
export function setAuth(value){auth=value;}
export async function api(path,{method='GET',body,headers={}}={}){
 if(demoEnabled)return demoHandler(path,{method,body,headers});
 const options={method,credentials:'same-origin',headers:{...headers}};
 if(auth.csrf&&!options.headers['X-CSRF-Token'])options.headers['X-CSRF-Token']=auth.csrf;
 if(body instanceof File){options.body=body;options.headers['Content-Type']=body.type;options.headers['X-File-Name']=encodeURIComponent(body.name)}
 else if(body!==undefined){options.body=JSON.stringify(body);options.headers['Content-Type']='application/json'}
 let r;try{r=await fetch('/api'+path,options)}catch{throw new Error('Connexion au serveur interrompue. Votre travail n’a pas été effacé. Réessayez.');}
 const data=await r.json();if(!r.ok){const error=Object.assign(new Error(data.error||'Opération impossible.'),{status:r.status});if(r.status===401&&path.startsWith('/admin/'))window.dispatchEvent(new CustomEvent('session-expired'));throw error}return data;
}
