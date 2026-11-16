// Explicit read-only import from Unity; never copies source lyrics or audio.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const unity=path.resolve(web,'../Assets/QingTian');
const manifest={sources:{},note:'Unity assets read only; timeline contains timing and imagery labels, no sung lyric text.'};
for(const dir of ['data','references','evidence','LocalOnly'])fs.mkdirSync(path.join(web,dir),{recursive:true});
for(const file of ['timeline.json','beats68.json','parameter-contract.json','audio-features.json']){
  const source=fs.readFileSync(path.join(unity,'Data',file));
  if(file==='timeline.json'){
    const t=JSON.parse(source);if(t.lyrics.some(l=>Object.keys(l).some(k=>/text|lyricText|sentence/i.test(k))))throw Error('Unexpected lyric text');
  }
  fs.writeFileSync(path.join(web,'data',file),source);
  manifest.sources[file]=crypto.createHash('sha256').update(source).digest('hex');
}
for(let i=1;i<=4;i++){
  const source=fs.readFileSync(path.join(unity,'ReferenceFrames',`C${i}.png`));
  fs.writeFileSync(path.join(web,'references',`C${i}.png`),source);
  manifest.sources[`C${i}.png`]=crypto.createHash('sha256').update(source).digest('hex');
}
fs.writeFileSync(path.join(web,'data/source-manifest.json'),JSON.stringify(manifest,null,2));
console.log('Imported score, sanitized timeline and four unchanged reference frames. No audio copied.');
