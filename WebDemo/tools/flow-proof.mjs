// Capture the actual canvas and the local audio; nothing is uploaded.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.mjs';
const label=process.env.PROOF_LABEL||'after',start=Number(process.env.PROOF_START||105),duration=Number(process.env.PROOF_DURATION||12);
const audioEnabled=process.env.PROOF_AUDIO!=='off',smallPoints=process.env.PROOF_POINTS!=='off';
const root=new URL('../LocalOnly/flow-rework-20261116/',import.meta.url);fs.mkdirSync(root,{recursive:true});
const baseline=process.env.PROOF_BASELINE==='1',preroll=3;
const sourceRoot=baseline?new URL('before/',root):new URL('../',import.meta.url);
const sourceHashes=Object.fromEntries(['shape-renderer','motion','flow-field','score','audio'].flatMap(name=>{const p=new URL(`src/${name}.mjs`,sourceRoot);return fs.existsSync(p)?[[name,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]]:[];}));
const {browser,page}=await openBrowser({pathname:baseline?'/LocalOnly/flow-rework-20261116/before/index.html':'/'});
try {
  const downloadPromise=page.waitForEvent('download',{timeout:90000});
  const result=await page.evaluate(async ({label,start,duration,audioEnabled,smallPoints,preroll})=>{
    const d=__demo;d.pause();d.resumeRealtime();d.renderer.quality='high';d.setSize(1672,941);d.setOverlay(false);d.setAudioEnabled(audioEnabled);d.setSmallPoints(smallPoints);
    document.body.classList.add('hidden-ui');d.renderer.director.reset();
    const destination=d.audio.context.createMediaStreamDestination();d.audio.analyser.connect(destination);d.audio.gain.gain.value=0;
    await d.play(Math.max(0,start-preroll-3));const wait=()=>new Promise(r=>requestAnimationFrame(r));while(d.audio.time<start-preroll)await wait();
    const stream=document.querySelector('#art').captureStream(60);stream.addTrack(destination.stream.getAudioTracks()[0]);
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:18000000,audioBitsPerSecond:192000});
    const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(r=>recorder.onstop=r);
    const actualStart=d.audio.time,trace=[];d.resetStats();recorder.start();
    let measured=false,stats=null;while(d.audio.time-actualStart<duration+preroll+1){if(!measured&&d.audio.time>=actualStart+preroll){d.resetStats();measured=true;}if(measured&&!stats&&d.audio.time>=actualStart+preroll+duration)stats=d.stats();trace.push({t:d.audio.time,signals:{...d.audio.signals},applied:{...d.renderer.applied}});await wait();}
    const actualEnd=d.audio.time;stats??=d.stats();recorder.stop();await stopped;d.pause();
    d.audio.analyser.disconnect(destination);stream.getTracks().forEach(t=>t.stop());
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));link.download=label+'.webm';link.click();
    return {label,start,duration,actualStart,clipStart:actualStart+preroll,actualEnd,preroll,audioEnabled,smallPoints,stats,trace,recording:'live canvas capture and live Web Audio; 3-second encoder preroll removed; speakers muted after analysis'};
  },{label,start,duration,audioEnabled,smallPoints,preroll});
  const webm=fileURLToPath(new URL(label+'.webm',root)),mp4=fileURLToPath(new URL(label+'.mp4',root));
  await (await downloadPromise).saveAs(webm);
  const mux=spawnSync('ffmpeg',['-v','error','-y','-i',webm,'-ss',String(preroll),'-t',String(duration),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2,fps=60','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',mp4],{encoding:'utf8',windowsHide:true});
  if(mux.status)throw Error(mux.stderr);Object.assign(result,{baseline,sourceHashes});fs.writeFileSync(new URL(label+'.json',root),JSON.stringify(result,null,2));
  console.log(JSON.stringify({label,file:mp4,clipStart:result.clipStart,actualEnd:result.actualEnd,stats:{...result.stats,audit:result.stats.audit.length+' samples'}}));
} finally {await browser.close();}
