"""Launch this project and its scoped local MCP server. No shared client config edits."""
from pathlib import Path
import os, subprocess, json, urllib.request, time
ROOT=Path(__file__).resolve().parents[1]
editor=Path(os.environ.get('QINGTIAN_UNITY',r'D:\Works\Unity\Editors\6000.3.28f1\Editor\Unity.exe'))
server=Path(os.environ.get('QINGTIAN_MCP_SERVER',str(ROOT.parent/'.unity-tools/mcp-10.3.0/Scripts/mcp-for-unity.exe')))
(ROOT/'Logs').mkdir(exist_ok=True)
env=os.environ.copy();env.update(NO_PROXY='localhost,127.0.0.1,::1',PYTHONUTF8='1',UNITY_MCP_SKIP_STARTUP_CONNECT='1')
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def ready():
    try:
        with opener.open('http://127.0.0.1:8082/health',timeout=2) as r:return json.load(r).get('status')=='healthy'
    except Exception:return False
if not ready():
    if not server.exists():raise SystemExit('Install MCP server 10.3.0; see README.md.')
    log=(ROOT/'Logs/mcp-server.log').open('ab')
    subprocess.Popen([str(server),'--transport','http','--http-url','http://127.0.0.1:8082','--default-instance','QingTianVFX','--project-scoped-tools'],cwd=ROOT,env=env,stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
    for _ in range(20):
        if ready():break
        time.sleep(.5)
lock=ROOT/'Temp/UnityLockfile';opened=False
if lock.exists():
    try:
        with lock.open('r+b'):pass
    except PermissionError:opened=True
if not opened:
    subprocess.Popen([str(editor),'-projectPath',str(ROOT),'-executeMethod','QingTian.Editor.QingTianSetup.OpenPerformance','-logFile',str(ROOT/'Logs/editor.log')],cwd=ROOT,env=env)
print('MCP healthy:',ready(),'; Unity launch requested:',not opened)
