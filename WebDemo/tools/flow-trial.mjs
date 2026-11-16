import fs from 'node:fs';
import {openBrowser} from './browser.mjs';
const root=new URL('../LocalOnly/flow-rework-20261116/trial/',import.meta.url);fs.mkdirSync(root,{recursive:true});
const {browser,page}=await openBrowser();
const capture=async name=>{fs.writeFileSync(new URL(name+'.png',root),Buffer.from((await page.evaluate(()=>__demo.capture())).split(',')[1],'base64'));};
try{
 await page.evaluate(()=>{__demo.setSize(1672,941);__demo.setOverlay(false);__demo.audio.gain.gain.value=0;});
 for(let i=0;i<4;i++){await page.evaluate(i=>__demo.renderAt(__demo.score.contract.anchorTimes[i]),i);await capture('anchor'+(i+1));}
 await page.evaluate(()=>{__demo.resumeRealtime();__demo.resetStats();return __demo.play(102);});
 for(const t of [105,107,109,113]){await page.waitForFunction(t=>__demo.audio.time>=t,t);await capture('t'+t);}
 console.log(JSON.stringify(await page.evaluate(()=>({stats:__demo.stats(),applied:__demo.renderer.applied}))));
} finally{await browser.close();}
