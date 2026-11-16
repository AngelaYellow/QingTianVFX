import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {openBrowser} from './browser.mjs';
const {browser,page}=await openBrowser();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const writeImage=async(name)=>{const png=await page.evaluate(()=>__demo.capture());fs.writeFileSync(new URL(`../evidence/${name}.png`,import.meta.url),Buffer.from(png.split(',')[1],'base64'));};
try{
  await page.screenshot({path:fileURLToPath(new URL('../evidence/01_播放器.png',import.meta.url))});
  for(let i=0;i<4;i++){await page.evaluate(i=>{__demo.setOverlay(false);__demo.setSize(1672,941);__demo.renderAt(__demo.score.contract.anchorTimes[i]);},i);await writeImage(`C${i+1}_实际锚点`);}
  await page.evaluate(()=>{__demo.resumeRealtime();__demo.renderer.resize();});
  await page.locator('#begin').click();await page.waitForTimeout(2000);
  const start=await page.evaluate(()=>({time:__demo.audio.time,playing:__demo.audio.playing}));
  await page.evaluate(()=>__demo.play(40));await page.waitForTimeout(2500);
  const first=await page.evaluate(()=>({time:__demo.audio.time,signals:{...__demo.audio.signals},raw:{...__demo.audio.raw}}));
  await page.waitForTimeout(1200);const second=await page.evaluate(()=>({time:__demo.audio.time,signals:{...__demo.audio.signals},raw:{...__demo.audio.raw}}));
  await page.locator('#debug-toggle').click();await page.screenshot({path:fileURLToPath(new URL('../evidence/02_实时参数.png',import.meta.url))});
  await page.locator('#play').click();const before=await page.evaluate(()=>__demo.audio.time);await page.waitForTimeout(350);const paused=await page.evaluate(t=>!__demo.audio.playing&&__demo.audio.time===t,before);
  await page.locator('[data-anchor="2"]').click();const anchor=await page.evaluate(()=>({time:__demo.audio.time,freedom:__demo.frame.AnchorFreedom}));
  await page.locator('#overlay-toggle').click();await page.locator('#opacity').fill('0.37');const overlay=await page.evaluate(()=>({visible:!document.querySelector('#reference').hidden,opacity:document.querySelector('#reference').style.opacity}));
  await page.locator('#overlay-toggle').click();await page.locator('#debug-toggle').click();await page.locator('#fullscreen').click();await page.waitForTimeout(200);
  const fullscreen=await page.evaluate(()=>!!document.fullscreenElement);await page.keyboard.press('h');const hidden=await page.evaluate(()=>document.body.classList.contains('hidden-ui'));await page.keyboard.press('Escape');
  const restored=await page.evaluate(()=>!document.body.classList.contains('hidden-ui'));
  await page.locator('#seek').fill('120');const seek=await page.evaluate(()=>__demo.audio.time);
  await page.locator('#quality').selectOption('medium');const quality=await page.evaluate(()=>({name:__demo.renderer.quality,width:__demo.renderer.canvas.width}));
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);const narrow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  await page.setViewportSize({width:1920,height:1080});await page.locator('#quality').selectOption('high');await page.evaluate(()=>{__demo.resetStats();return __demo.play(100);});await page.waitForTimeout(12000);
  const stats=await page.evaluate(()=>__demo.stats());await page.evaluate(()=>__demo.pause());
  const result={passed:start.playing&&start.time>1&&first.signals.rms>0&&first.signals.rms!==second.signals.rms&&paused&&anchor.time===155.41&&anchor.freedom===0&&overlay.visible&&overlay.opacity==='0.37'&&fullscreen&&hidden&&restored&&seek===120&&quality.name==='medium'&&narrow&&errors.length===0,start,first,second,paused,anchor,overlay,fullscreen,hidden,restored,seek,quality,narrow,stats,errors};
  fs.writeFileSync(new URL('../evidence/browser-validation.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=result.passed?0:1;
}finally{await browser.close();}
