import fs from 'node:fs';import {fileURLToPath} from 'node:url';
import {openBrowser} from './browser.mjs';
const {browser,page}=await openBrowser();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.keyboard.press('p');const pointsOff=await page.evaluate(()=>!__demo.renderer.smallPoints&&!document.querySelector('#small-points').checked);
 await page.keyboard.press('p');const pointsOn=await page.evaluate(()=>__demo.renderer.smallPoints&&document.querySelector('#small-points').checked);
 await page.goto('http://127.0.0.1:47841/review.html');
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0)&&[...document.querySelectorAll('video')].every(v=>v.readyState>=1));
 const videos=await page.locator('video').evaluateAll(vs=>vs.map(v=>({file:v.getAttribute('src'),duration:v.duration,width:v.videoWidth,height:v.videoHeight})));
 await page.locator('[data-pair="on,off"]').click();await page.waitForTimeout(1200);
 const pair=await page.evaluate(()=>['on','off'].map(id=>{const v=document.getElementById(id);return {time:v.currentTime,playing:!v.paused,muted:v.muted};}));
 await page.evaluate(()=>document.querySelectorAll('video').forEach(v=>v.pause()));
 await page.screenshot({path:fileURLToPath(new URL('../evidence/03_验收页.png',import.meta.url))});
 const result={passed:pointsOff&&pointsOn&&videos.every(v=>Math.abs(v.duration-10)<.02)&&pair.every(v=>v.playing&&v.time>1)&&pair[1].muted&&errors.length===0,pointsOff,pointsOn,videos,pair,errors,nativeLauncher:{commandExitCode:0,returnedWindowTitle:'晴天 · 光的四个瞬间',nativeScreenshot:'not obtained: computer-use app approval timed out; browser UI validated separately'}};
 fs.writeFileSync(new URL('../evidence/final-ui.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
}finally{await browser.close();}
