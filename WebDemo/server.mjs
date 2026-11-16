import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||47841);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.wav':'audio/wav','.mp4':'video/mp4','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({app:'QingTian WebDemo',port}));}
    const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
    const target=path.resolve(root,relative);
    if(!target.startsWith(root+path.sep)||relative.split(/[\\/]/).some(x=>x.startsWith('.'))){res.writeHead(403);return res.end();}
    if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);return res.end('Not found');}
    const {size}=fs.statSync(target); let start=0,end=size-1,status=200;
    if(req.headers.range){
      const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if(!m){res.writeHead(416);return res.end();}
      start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;
      if(start>end){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}status=206;
    }
    res.writeHead(status,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-cache',...(status===206?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
    if(req.method==='HEAD')return res.end();
    fs.createReadStream(target,{start,end}).pipe(res);
  }catch{res.writeHead(400);res.end('Bad request');}
});
function open(){const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';if(fs.existsSync(chrome))spawn(chrome,['--no-proxy-server',`--user-data-dir=${path.join(root,'LocalOnly','ChromeProfile')}`,`--app=http://127.0.0.1:${port}`],{detached:true,stdio:'ignore',windowsHide:true}).unref();}
server.on('error',async e=>{
  if(e.code==='EADDRINUSE'){
    try{const r=await fetch(`http://127.0.0.1:${port}/health`);if((await r.json()).app==='QingTian WebDemo'){if(process.argv.includes('--open'))open();return;}}catch{}
  }
  console.error(e.message);process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>{console.log(`QingTian: http://127.0.0.1:${port} (offline / localhost only)`);if(process.argv.includes('--open'))open();});
