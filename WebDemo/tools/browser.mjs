import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}catch{
  playwright=require(process.env.PLAYWRIGHT_PATH||'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
}
export async function openBrowser({headless=true,width=1672,height=1040,pathname='/'}={}){
  const browser=await playwright.chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless,args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',e=>console.error('PAGE:',e.message));
  page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE:',m.text());});
  if(pathname!=='/')await page.route('**/LocalOnly/QingTian.wav',route=>route.continue({url:'http://127.0.0.1:47841/LocalOnly/QingTian.wav'}));
  await page.goto('http://127.0.0.1:47841'+pathname);
  try{await page.waitForFunction(()=>window.__demo?.ready&&window.__demo.audio.buffer,{},{timeout:60000});}
  catch(e){console.error(await page.locator('body').innerText());await browser.close();throw e;}
  return {browser,page};
}
