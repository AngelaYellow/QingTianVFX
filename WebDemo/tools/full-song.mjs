import fs from 'node:fs';
import {openBrowser} from './browser.mjs';
const headless=process.env.VISIBLE!=='1';
const {browser,page}=await openBrowser({headless,width:1920,height:1080});
const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
try{
  await page.locator('#fullscreen').click();await page.locator('#begin').click();await page.keyboard.press('h');
  if(headless)await page.evaluate(()=>__demo.audio.gain.gain.value=0);
  await page.evaluate(()=>{__demo.resetStats();window.__liveFeatures=[];let previous=-1;const sample=()=>{const d=__demo,t=d.audio.time;if(d.audio.playing&&t-previous>=.045){__liveFeatures.push({t,...d.audio.signals});previous=t;}requestAnimationFrame(sample);};requestAnimationFrame(sample);});const started=Date.now();
  let last=-1,monotonic=true,unexpectedPause=false;
  for(let i=0;i<59;i++){
    await page.waitForTimeout(5000);
    const c=await page.evaluate(()=>({time:__demo.audio.time,playing:__demo.audio.playing,chapter:__demo.frame.ChapterIndex,master:__demo.frame.parameters.MasterGain,freedom:__demo.frame.AnchorFreedom,context:__demo.audio.context.state,visibility:document.visibilityState}));
    checks.push(c);monotonic&&=c.time>=last;last=c.time;
    if(!c.playing&&c.time<269.747)unexpectedPause=true;
    if(i%6===0)console.log(`full-song ${c.time.toFixed(2)} s / C${c.chapter+1}`);
    if(c.time>=269.747)break;
  }
  const stats=await page.evaluate(()=>__demo.stats());
  const live=await page.evaluate(()=>__liveFeatures),step=.05,frames=[];let index=0;
  for(let t=0;t<=269.8;t+=step){while(index<live.length-2&&live[index+1].t<t)index++;const a=live[index],b=live[Math.min(index+1,live.length-1)],u=Math.max(0,Math.min(1,(t-a.t)/Math.max(1e-6,b.t-a.t)));frames.push(Object.fromEntries(['rms','low','high','onset'].map(k=>[k,Number((a[k]+(b[k]-a[k])*u).toFixed(6))])));}
  fs.writeFileSync(new URL('../data/performance-features.json',import.meta.url),JSON.stringify({source:'Local full-song Web Audio analyser capture; no audio or lyrics',step,normalization:{rms:.27,low:.055,high:.0025,onset:.12},frames}));
  const result={passed:monotonic&&!unexpectedPause&&stats.audio.time===269.747&&!stats.audio.playing&&new Set(checks.map(c=>c.chapter)).size===4&&errors.length===0,headless,outputMuted:headless,analysisBeforeMute:true,featureSamples:live.length,startedAt:new Date(started).toISOString(),wallSeconds:(Date.now()-started)/1000,monotonic,unexpectedPause,fullscreen:await page.evaluate(()=>!!document.fullscreenElement),stats,checks,errors};
  fs.writeFileSync(new URL('../evidence/full-song-playback.json',import.meta.url),JSON.stringify(result,null,2));
  console.log(JSON.stringify({...result,stats:{...stats,audit:`${stats.audit.length} samples`},checks:`${checks.length} samples`}));
  process.exitCode=result.passed?0:1;
}finally{await browser.close();}
