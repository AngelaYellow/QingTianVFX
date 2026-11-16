// Offline, fixed-step rendering of the SAME WebGL renderer. Audio remains local.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {openBrowser} from './browser.mjs';
const output=fileURLToPath(new URL('../LocalOnly/',import.meta.url));
const duration=Number(process.env.RENDER_DURATION||269.747),start=Number(process.env.RENDER_START||0),fps=Number(process.env.RENDER_FPS||60),width=1600,height=900;
const {browser,page}=await openBrowser({width,height});
page.on('console',m=>{if(m.text().startsWith('EXPORT '))console.log(m.text());});
const started=Date.now();
try{
  await page.evaluate(()=>{__demo.pause();__demo.setOverlay(false);document.body.classList.add('hidden-ui');});
  const downloadPromise=page.waitForEvent('download',{timeout:0});
  const render=await page.evaluate(async({width,height,fps,duration,start})=>{
    __demo.setSize(width,height);__demo.renderAt(start);
    const config={codec:fps>30?'avc1.64002a':'avc1.640028',width,height,bitrate:14000000,framerate:fps,hardwareAcceleration:'prefer-hardware',latencyMode:'realtime',avc:{format:'annexb'}};
    const support=await VideoEncoder.isConfigSupported(config);if(!support.supported)throw Error('This Chrome cannot encode H264 at the requested size');
    const chunks=[];let encodeError=null,outputFrames=0;
    const encoder=new VideoEncoder({output(chunk){const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push(bytes);outputFrames++;},error(e){encodeError=e;}});encoder.configure(config);
    const count=Math.ceil(duration*fps);
    for(let i=0;i<count;i++){
      while(encoder.encodeQueueSize>5){if(encodeError)throw encodeError;await new Promise(r=>setTimeout(r,2));}
      __demo.renderAt(start+Math.min(i/fps,duration));
      const frame=new VideoFrame(document.querySelector('#art'),{timestamp:Math.round(i*1000000/fps),duration:Math.round(1000000/fps)});
      encoder.encode(frame,{keyFrame:i%(fps*2)===0});frame.close();
      if(i%300===0){console.log(`EXPORT ${i}/${count} (${(i/fps).toFixed(0)} s)`);await new Promise(r=>setTimeout(r,0));}
    }
    await encoder.flush();encoder.close();if(encodeError)throw encodeError;
    const blob=new Blob(chunks,{type:'video/h264'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='qingtian-offline.h264';a.click();
    return {requestedFrames:count,outputFrames,width,height,fps,duration,start,bytes:blob.size,codec:config.codec,featureMode:'Unity cached features for deterministic offline export; interactive player uses live Web Audio',gpu:__demo.renderer.gpu};
  },{width,height,fps,duration,start});
  const download=await downloadPromise;await download.saveAs(output+'qingtian-offline.h264');
  const video=output+(duration<269?'短片检查.mp4':'晴天_整曲备份.mp4');
  const mux=spawnSync('ffmpeg',['-hide_banner','-loglevel','warning','-y','-r',String(fps),'-i',output+'qingtian-offline.h264','-ss',String(start),'-i',output+'QingTian.wav','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-t',String(duration),'-movflags','+faststart',video],{encoding:'utf8',windowsHide:true});
  if(mux.status!==0)throw Error(mux.stderr);if(mux.stderr)console.log(mux.stderr.slice(-1500));
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames,duration','-of','json',video],{encoding:'utf8',windowsHide:true});
  if(probe.status!==0)throw Error(probe.stderr);
  const evidence={...render,wallSeconds:(Date.now()-started)/1000,probe:JSON.parse(probe.stdout),file:video};
  fs.writeFileSync(new URL(duration<269?'../evidence/motion-preview-export.json':'../evidence/video-export.json',import.meta.url),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await browser.close();}
