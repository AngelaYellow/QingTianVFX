import fs from 'node:fs';
import {openBrowser} from './browser.mjs';
const {browser,page}=await openBrowser();
try{
 const result=await page.evaluate(()=>{
  const d=__demo,r=d.renderer;d.pause();d.setOverlay(false);
  const read=()=>{const gl=r.gl,out=new Float32Array(512*512*4);gl.bindFramebuffer(gl.FRAMEBUFFER,r.states[r.current].fbo);gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.readPixels(0,0,512,512,gl.RGBA,gl.FLOAT,out);const error=gl.getError();gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(error)throw Error('GPU readback: '+error);return out;};
  function windowMotion(enabled){
   d.setAudioEnabled(enabled);r.director.reset();d.renderAt(105,{rms:.8,low:.6,high:.5,onset:0});const a=read();
   for(let i=1;i<=60;i++)d.renderAt(105+i/30,{rms:.8,low:.6,high:.5,onset:0});const b=read();
   const groups=[[],[]];let finite=true;
   for(let slot=500;slot<512*512;slot+=997){const k=slot*4;finite&&=Number.isFinite(b[k])&&Number.isFinite(b[k+1]);
    if(Math.abs((b[k+2]-a[k+2])-2)>.12)continue; // Exclude respawned material.
    const dx=(b[k]-a[k])*1672,dy=(b[k+1]-a[k+1])*941;groups[slot/(512*512)<.513?0:1].push({dx,dy,distance:Math.hypot(dx,dy)});
   }
   const all=groups.flat(),mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
   return {finite,survivingSamples:all.length,meanDistancePx:mean(all.map(x=>x.distance)),groups:groups.map(g=>({count:g.length,dx:mean(g.map(x=>x.dx)),dy:mean(g.map(x=>x.dy))}))};
  }
  const on=windowMotion(true),off=windowMotion(false);d.setAudioEnabled(true);
  const before=read(),current=r.current;r.resize(960,540);const after=read();let preserved=current===r.current;
  for(let i=0;i<before.length;i+=997)preserved&&=before[i]===after[i];
  d.renderAt(107);const paused=read();d.renderAt(107);const pausedAgain=read();let pauseStable=true;
  for(let i=0;i<paused.length;i+=997)pauseStable&&=paused[i]===pausedAgain[i];
  return {passed:on.finite&&off.finite&&on.survivingSamples>30&&off.survivingSamples>30&&on.meanDistancePx>off.meanDistancePx*1.3&&preserved&&pauseStable,on,off,resizePreservesGpuState:preserved,pausePreservesGpuState:pauseStable,method:'Read actual RGBA32F GPU position/age buffers. Fixed acoustic inputs over 105-107 seconds; not a live musical velocity measurement. Excludes particles that respawned.',simulationStates:512*512,reconstructionSamples:r.renderSamples};
 });
 fs.writeFileSync(new URL('../evidence/gpu-state-validation.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
}finally{await browser.close();}
