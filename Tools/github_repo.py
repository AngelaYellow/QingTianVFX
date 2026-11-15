"""Use the existing Git credential helper without printing or storing secrets."""
from pathlib import Path
import json,os,subprocess,sys,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parents[1]
env=os.environ.copy();env.update(GIT_TERMINAL_PROMPT='0',GCM_INTERACTIVE='never',GCM_GUI_PROMPT='0')
result=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,env=env,timeout=25,cwd=ROOT)
cred=dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
token=cred.get('password')
if not token:
    print(json.dumps({'authenticated':False,'reason':'No existing noninteractive GitHub credential'}));sys.exit(2)
def api(path,payload=None):
    req=urllib.request.Request('https://api.github.com'+path,data=None if payload is None else json.dumps(payload).encode(),headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'QingTianVFX-setup','X-GitHub-Api-Version':'2022-11-28'})
    with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
user=api('/user');mode=sys.argv[1] if len(sys.argv)>1 else 'status'
if mode=='status': print(json.dumps({'authenticated':True,'login':user['login']}));sys.exit()
name='QingTianVFX'
try:
    repo=api('/repos/'+user['login']+'/'+name)
    if repo['size']>0: raise RuntimeError('Existing nonempty remote; refusing automatic overwrite')
except urllib.error.HTTPError as e:
    if e.code!=404:raise
    repo=api('/user/repos',{'name':name,'description':'Unity 6.3 URP / VFX Graph music-driven QingTian visualization. M1 parameter performance; original audio excluded.','private':False,'auto_init':False})
print(json.dumps({'created_or_empty':True,'url':repo['html_url'],'clone_url':repo['clone_url'],'private':repo['private']}))
if repo['private']:raise RuntimeError('Expected public repository')
remotes=subprocess.run(['git','remote'],cwd=ROOT,capture_output=True,text=True,check=True).stdout.split()
if 'origin' not in remotes:subprocess.run(['git','remote','add','origin',repo['clone_url']],cwd=ROOT,check=True)
else:
    current=subprocess.run(['git','remote','get-url','origin'],cwd=ROOT,capture_output=True,text=True,check=True).stdout.strip()
    if current!=repo['clone_url']:raise RuntimeError('Unexpected existing origin')
subprocess.run(['git','push','-u','origin','main'],cwd=ROOT,env=env,check=True)
