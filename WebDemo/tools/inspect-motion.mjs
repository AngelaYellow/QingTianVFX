import fs from 'node:fs';
import {openBrowser} from './browser.mjs';
const {browser,page}=await openBrowser();
try{
 for(const enabled of [true,false]){
  await page.evaluate(enabled=>{__demo.pause();__demo.setAudioEnabled(enabled);__demo.setSmallPoints(false);__demo.setSize(1672,941);__demo.renderer.director.reset();},enabled);
  for(let i=0;i<=240;i++){
   await page.evaluate(t=>__demo.renderAt(t),103+i/60);
   if(i===120||i===240){const png=await page.evaluate(()=>__demo.capture());fs.writeFileSync(new URL(`../evidence/形体_${enabled?'开':'关'}_${103+i/60}s.png`,import.meta.url),Buffer.from(png.split(',')[1],'base64'));}
  }
 }
}finally{await browser.close();}
