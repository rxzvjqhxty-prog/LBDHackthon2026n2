import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('original/Main.dc.html', 'utf8');
const keys = {S:'stats',G:'gallery',C:'cycles',SEC:'sections',O:'orientation',SP:'sports',FAC:'facilities',IMG:'facilityImages',CONC:'competitions',EVT:'events',VOY:'trips',CL:'clubs',CLI:'clubImages',Y:'history',F:'faq'};
const data = {};
for (const [key,name] of Object.entries(keys)) {
  const match = source.match(new RegExp(`const ${key}=(\\[[\\s\\S]*?\\]|\\{[\\s\\S]*?\\});`));
  if (!match) throw new Error(`Missing original content: ${key}`);
  data[name] = vm.runInNewContext(`(${match[1]})`, {}, {timeout:1000});
}
fs.writeFileSync('src/content.js', '// Content transcribed programmatically from the preserved export.\nexport const content = '+JSON.stringify(data,null,2)+';\n');
console.log(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,Array.isArray(v)?v.length:Object.keys(v).length])));
