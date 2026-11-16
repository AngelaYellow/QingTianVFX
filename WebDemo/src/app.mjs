import {ScoreModel} from './score.mjs';
import {AudioEngine} from './audio.mjs';
import {ParticleRenderer} from './shape-renderer.mjs';
const $=id=>document.getElementById(id),titles=['旧光短暂聚拢','雨把光分开','又近了一点','只剩经过的光'];
const fail=e=>{$('error').hidden=false;$('error').textContent=e.message||String(e);console.error(e);};
const getJSON=async file=>{const r=await fetch(file);if(!r.ok)throw Error(`载入失败：${file}`);return r.json();};
let score,audio,renderer,frame,preview=true,offline=false,last=performance.now(),lastUI=0,overlay=false,fps=60,raf=0,audioEnabled=true;
const intervals=[],audit=[];
const format=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
async function toggle(){try{if(audio.playing)audio.pause();else{if(preview){preview=false;await audio.seek(0,false);}$('welcome').hidden=true;await audio.play();}updateUI();}catch(e){fail(e);}}
async function jump(i){preview=false;$('welcome').hidden=true;await audio.seek(score.contract.anchorTimes[i],false);draw();updateUI();}
function nearest(t){return score.contract.anchorTimes.reduce((a,v,i,k)=>Math.abs(v-t)<Math.abs(k[a]-t)?i:a,0);}
function updateOverlay(){
  const i=$('reference-choice').value==='auto'?nearest(frame.SongTime):Number($('reference-choice').value),src=`references/C${i+1}.png`;
  if(overlay&&$('reference').getAttribute('src')!==src)$('reference').src=src;
  if(!overlay)$('reference').removeAttribute('src');
  $('reference').hidden=!overlay;$('reference').style.opacity=$('opacity').value;
  $('overlay-controls').hidden=!overlay;$('overlay-toggle').setAttribute('aria-pressed',String(overlay));$('opacity-value').value=`${Math.round($('opacity').value*100)}%`;
}
function updateUI(){
  if(!frame)return;const t=preview?0:frame.SongTime,ci=frame.ChapterIndex;
  $('clock').value=`${format(t)} / ${format(score.timeline.duration)}`;
  if(document.activeElement!==$('seek'))$('seek').value=t;
  $('chapter-name').textContent=`C${ci+1} / ${titles[ci]}`;
  $('state-label').textContent=preview?'风格帧预览':`${audio.playing?'演出中':t>=score.timeline.duration?'演出结束':'已暂停'} · ${frame.SongTime.toFixed(2)} s`;
  $('play').textContent=audio.playing?'暂停':'播放';
  $('status').textContent=audio.buffer?`${Math.round(fps)} fps · 本地音频已就绪`:'请选择本地音频';
  document.querySelectorAll('[data-anchor]').forEach(b=>{const selected=Math.abs(score.contract.anchorTimes[Number(b.dataset.anchor)]-frame.SongTime)<.01;b.classList.toggle('active',selected);});
  if(!$('debug').hidden){
    for(const k of ['rms','low','high'])$(k).value=audio.signals[k];$('beat').value=frame.BeatPulse;$('phrase').value=frame.LyricEnvelope;
    $('performance').textContent=`${Math.round(fps)} fps · ${renderer.canvas.width} × ${renderer.canvas.height} · 形体流场 + ${renderer.particles} 随动粒子`;
    const p=frame.parameters;$('parameter-readout').textContent=[`SongTime       ${frame.SongTime.toFixed(3)}`,`AnchorFreedom  ${frame.AnchorFreedom.toFixed(3)}`,`LyricEnvelope  ${frame.LyricEnvelope.toFixed(3)}`,`LightCenterA   ${p.LightCenterA.map(v=>v.toFixed(3)).join(', ')}`,`LightCenterB   ${p.LightCenterB.map(v=>v.toFixed(3)).join(', ')}`,`GapWidth       ${p.GapWidth.toFixed(5)}`,`FlowerForm     ${p.FlowerForm.toFixed(3)}`,`MasterGain     ${p.MasterGain.toFixed(3)}`,`FlowPhase      ${frame.FlowPhase.toFixed(3)}`,`输入：${offline?'离线特征（视频导出）':'实时 Web Audio'}`].join('\n');
    const applied=renderer.applied;
    $('applied-readout').textContent=[`曲式          ${applied.Section}`,`段落运动等级  ${applied.SectionLevel.toFixed(2)}`,`整体流动幅度  ${applied.MacroAmplitude.toFixed(3)}`,`实时声学能量  ${applied.Energy.toFixed(3)}`,`惯性冲击      ${applied.InertialHit.toFixed(3)}`,`镜头推进      ${applied.CameraDolly.toFixed(3)}`,`锚点穿行相位  ${applied.AnchorCrossing.toFixed(3)}`,`小亮点        ${renderer.smallPoints?'显示':'关闭：只看形体与雨/丝带'}`,`音频：${audioEnabled?'正在驱动整个形体场':'关闭；保留微弱基础流动'}`].join('\n');
  }
  updateOverlay();
}
function draw(t,signals){frame=score.evaluate(t??(preview?score.contract.anchorTimes[0]:audio.time),audioEnabled?(signals??audio.signals):{rms:.5,low:.5,high:.5,onset:0},{beatEnabled:audioEnabled});frame.AudioEnabled=audioEnabled;renderer.render(frame);}
function tick(now){
  raf=requestAnimationFrame(tick);const dt=(now-last)/1000;last=now;
  if(offline||document.hidden)return;
  if(dt>0){fps=fps*.95+.05/dt;if(audio.playing){intervals.push(dt*1000);if(intervals.length>30000)intervals.shift();}}
  audio.measure(dt);draw();
  if(now-lastUI>150){updateUI();lastUI=now;}
  if(audio.playing&&(!audit.length||frame.SongTime-audit.at(-1).t>=1))audit.push({t:frame.SongTime,...audio.signals,raw:{...audio.raw},chapter:frame.ChapterIndex});
}
async function loadAudio(bytes,name){
  $('begin').disabled=true;$('begin').textContent='正在解码音频…';$('error').hidden=true;
  try{await audio.load(bytes);$('begin').disabled=false;$('play').disabled=false;$('begin').textContent='播放整首晴天';$('source-note').textContent=`${name} · ${audio.buffer.duration.toFixed(2)} s · 已就绪`;$('status').textContent='本地音频已就绪';}
  catch(e){$('begin').textContent='请重新选择音频';throw e;}
}
async function init(){
  const [timeline,contract,beats,features]=await Promise.all(['timeline','parameter-contract','beats68','audio-features'].map(f=>getJSON(`data/${f}.json`)));
  score=new ScoreModel(timeline,contract,beats,features);audio=new AudioEngine(timeline.duration);renderer=new ParticleRenderer($('art'));renderer.beatTimes=beats.times;await renderer.load();renderer.resize();
  $('art').addEventListener('webglcontextlost',e=>{e.preventDefault();audio.pause();fail(Error('图形设备连接中断。刷新页面恢复，或打开 LocalOnly 中的整曲备份视频。'));});
  window.addEventListener('resize',()=>renderer.resize());
  $('play').onclick=toggle;$('begin').onclick=toggle;
  $('restart').onclick=async()=>{preview=false;$('welcome').hidden=true;await audio.seek(0,false);await toggle();};
  document.querySelectorAll('[data-anchor]').forEach(b=>b.onclick=()=>jump(Number(b.dataset.anchor)));
  let resumeSeek=false;$('seek').addEventListener('pointerdown',()=>{resumeSeek=audio.playing;audio.pause();});
  $('seek').addEventListener('input',()=>{preview=false;audio.seek(Number($('seek').value),false);draw();updateUI();});
  $('seek').addEventListener('change',async()=>{if(resumeSeek)await audio.play();resumeSeek=false;});
  $('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(fail);else document.documentElement.requestFullscreen().catch(fail);};
  $('hide').onclick=()=>document.body.classList.add('hidden-ui');
  $('overlay-toggle').onclick=()=>{overlay=!overlay;updateOverlay();};
  $('opacity').oninput=updateOverlay;$('reference-choice').onchange=updateOverlay;
  $('debug-toggle').onclick=()=>{$('debug').hidden=!$('debug').hidden;$('debug-toggle').setAttribute('aria-expanded',String(!$('debug').hidden));updateUI();};
  $('quality').onchange=()=>{renderer.quality=$('quality').value;renderer.resize();};$('motion').oninput=()=>renderer.motion=Number($('motion').value);
  $('response').oninput=()=>{renderer.responseGain=Number($('response').value);$('response-value').value=renderer.responseGain.toFixed(1)+'×';};
  const setAudioEnabled=enabled=>{audioEnabled=enabled;$('audio-reactive').checked=enabled;draw();updateUI();};
  $('audio-reactive').onchange=()=>setAudioEnabled($('audio-reactive').checked);
  const setSmallPoints=enabled=>{renderer.smallPoints=enabled;$('small-points').checked=enabled;draw();updateUI();};
  $('small-points').onchange=()=>setSmallPoints($('small-points').checked);
  for(const id of ['file','replace-file'])$(id).onchange=async e=>{const file=e.target.files[0];if(!file)return;try{await loadAudio(await file.arrayBuffer(),file.name);}catch(err){fail(err);}};
  document.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)&&e.code!=='Escape')return;
    if(e.code==='Space'){e.preventDefault();toggle();}else if(/^[1-4]$/.test(e.key))jump(Number(e.key)-1);
    else if(e.key.toLowerCase()==='h')document.body.classList.toggle('hidden-ui');
    else if(e.key.toLowerCase()==='f')$('fullscreen').click();else if(e.key==='Escape')document.body.classList.remove('hidden-ui');
    else if(e.key.toLowerCase()==='o')$('overlay-toggle').click();else if(e.key.toLowerCase()==='d')$('debug-toggle').click();else if(e.key.toLowerCase()==='r')$('restart').click();
    else if(e.key.toLowerCase()==='p')setSmallPoints(!renderer.smallPoints);
    else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();preview=false;audio.seek(audio.time+(e.key==='ArrowLeft'?-5:5));}
  });
  window.__demo={ready:true,score,audio,renderer,get frame(){return frame;},jump,
    setAudioEnabled,setSmallPoints,
    async play(t){preview=false;$('welcome').hidden=true;if(t!==undefined)await audio.seek(t,false);await audio.play();},pause(){audio.pause();draw();updateUI();},
    async seek(t){preview=false;await audio.seek(t,false);draw();updateUI();},
    renderAt(t,signals){offline=true;draw(t,signals??score.cached(t));return frame;},
    resumeRealtime(){offline=false;last=performance.now();},
    capture(){return $('art').toDataURL('image/png');},
    stats(){const sorted=[...intervals].sort((a,b)=>a-b);return {gpu:renderer.gpu,quality:renderer.quality,resolution:[renderer.canvas.width,renderer.canvas.height],particles:renderer.particles,frameCount:intervals.length,meanFps:1000/(intervals.reduce((a,b)=>a+b,0)/Math.max(1,intervals.length)),p95ms:sorted[Math.floor(sorted.length*.95)],p99ms:sorted[Math.floor(sorted.length*.99)],over33ms:intervals.filter(x=>x>33.34).length,audio:{duration:audio.buffer?.duration,time:audio.time,playing:audio.playing,sampleRate:audio.context?.sampleRate},audit};},
    resetStats(){intervals.length=0;audit.length=0;},
    setSize(w,h){renderer.resize(w,h);},setOverlay(enabled){overlay=enabled;updateOverlay();}
  };
  draw();updateUI();requestAnimationFrame(tick);
  const response=await fetch('LocalOnly/QingTian.wav',{method:'HEAD'});
  if(response.ok){await loadAudio(await (await fetch('LocalOnly/QingTian.wav')).arrayBuffer(),'本地《晴天》');}
  else{$('begin').textContent='请先选择本地音频';$('source-note').textContent='选择原版音频后，即可离线演出';}
}
init().catch(fail);
