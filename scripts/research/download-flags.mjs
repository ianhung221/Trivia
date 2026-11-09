import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../../data/geography.json',import.meta.url),'utf8'));
const directory=new URL('../../assets/flags/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const paths=data.questions.filter(q=>q.image).map(q=>q.image.split('/').at(-1)).filter(p=>!fs.existsSync(new URL(p,directory)));
for(let start=0;start<paths.length;start+=8) {
  await Promise.all(paths.slice(start,start+8).map(async filename=>{
    const url=`https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${filename}`;
    const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error(`${filename}: ${response.status}`);
    const text=await response.text();
    if(!text.includes('<svg')||/<script|onload\s*=/i.test(text))throw Error(`${filename}: invalid SVG`);
    fs.writeFileSync(new URL(filename,directory),text);
  }));
}
const license=await fetch('https://raw.githubusercontent.com/lipis/flag-icons/main/LICENSE',{signal:AbortSignal.timeout(20000)});
if(!license.ok)throw Error(`license: ${license.status}`);
fs.writeFileSync(new URL('LICENSE.txt',directory),await license.text());
console.log(`Saved ${paths.length} SVG flags and MIT license.`);
