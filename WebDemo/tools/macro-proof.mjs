// Real-time browser recordings. Audio analysis is live, before the muted speakers.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {openBrowser} from './browser.mjs';
const root=fileURLToPath(new URL('../LocalOnly/验收/',import.meta.url));fs.mkdirSync(root,{recursive:true});
const {browser,page}=await openBrowser({width:1672,height:1040});
const clips=[{name:'01_副歌_音频开',start:105,audio:true,points:true},{name:'02_副歌_音频关',start:105,audio:false,points:true},{name:'03_主歌_音频开',start:40,audio:true,points:true},{name:'04_副歌_关闭小亮点',start:105,audio:true,points:false}];
const results=[];
try{
 for(const clip of clips){
  const downloadPromise=page.waitForEvent('download',{timeout:60000});
  const result=await page.evaluate(async c=>{
   const d=__demo;d.pause();d.resumeRealtime();d.setSize(1672,941);d.setOverlay(false);document.body.classList.add('hidden-ui');
   d.setAudioEnabled(c.audio);d.setSmallPoints(c.points);d.renderer.director.reset();
   const destination=d.audio.context.createMediaStreamDestination();d.audio.analyser.connect(destination);d.audio.gain.gain.value=0;
   await d.play(c.start-2);
   const wait=()=>new Promise(r=>requestAnimationFrame(r));
   while(d.audio.time<c.start)await wait();
   const canvas=document.querySelector('#art'),stream=canvas.captureStream(60);stream.addTrack(destination.stream.getAudioTracks()[0]);
   const mime='video/webm;codecs=vp9,opus';
   const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:14000000,audioBitsPerSecond:192000});const chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   const stopped=new Promise(r=>recorder.onstop=r),trace=[],start=d.audio.time;d.resetStats();recorder.start();
   // Capture a little beyond ten seconds so encoder startup latency never
   // leaves a short clip. The delivered video is trimmed to exactly ten.
   while(d.audio.time-start<10.2){
    trace.push({time:d.audio.time,signals:{...d.audio.signals},wave:[...d.renderer.state.wave],camera:[...d.renderer.state.camera],phase:d.renderer.state.phase,...d.renderer.applied});await wait();
   }
   const end=d.audio.time,stats=d.stats();recorder.stop();await stopped;d.pause();
   d.audio.analyser.disconnect(destination);stream.getTracks().forEach(t=>t.stop());
   const blob=new Blob(chunks,{type:mime}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=c.name+'.webm';link.click();
   return {...c,actualStart:start,actualEnd:end,deliveredSeconds:10,recording:'real-time Canvas captureStream + live Web Audio, speaker muted after analysis; 10.2 seconds captured then trimmed to 10',smallPointDrawCount:c.points?12000:0,bodyParticleCount:d.renderer.bodyParticles,stats,trace};
  },clip);
  const download=await downloadPromise,webm=root+clip.name+'.webm',mp4=root+clip.name+'.mp4';await download.saveAs(webm);
  const convert=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',webm,'-t','10','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2,fps=60','-c:a','aac','-b:a','192k','-movflags','+faststart',mp4],{encoding:'utf8',windowsHide:true});if(convert.status)throw Error(convert.stderr);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames','-of','json',mp4],{encoding:'utf8',windowsHide:true});if(probe.status)throw Error(probe.stderr);
  result.file=mp4;result.probe=JSON.parse(probe.stdout);results.push(result);
  fs.writeFileSync(new URL('../evidence/macro-motion-recordings.json',import.meta.url),JSON.stringify(results,null,2));
  console.log(JSON.stringify({name:clip.name,start:result.actualStart,end:result.actualEnd,meanFps:result.stats.meanFps,frames:result.trace.length,file:mp4}));
 }
}finally{await browser.close();}
