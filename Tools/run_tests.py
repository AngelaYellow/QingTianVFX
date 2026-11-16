"""Close this project's editor first. Run both Unity suites; nonzero on any failure."""
from pathlib import Path
import argparse,json,os,subprocess,sys,time,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--evidence-dir', default='Docs/Evidence', help='Report directory relative to project root; use a new directory to preserve historical evidence.')
options=parser.parse_args()
unity=Path(os.environ.get('QINGTIAN_UNITY',r'D:\Works\Unity\Editors\6000.3.28f1\Editor\Unity.exe'))
if not unity.is_file():raise SystemExit('Set QINGTIAN_UNITY to Unity 6000.3.28f1/Editor/Unity.exe')
env=os.environ.copy();env['UNITY_MCP_SKIP_STARTUP_CONNECT']='1';env['NO_PROXY']='localhost,127.0.0.1,::1'
out=ROOT/options.evidence_dir;out.mkdir(parents=True,exist_ok=True);(ROOT/'Logs').mkdir(exist_ok=True)
results=[]
for mode in ['EditMode','PlayMode']:
    xml=out/(mode.lower()+'-results.xml');log=ROOT/'Logs'/('tests-'+mode.lower()+'.log')
    args=[str(unity),'-batchmode','-projectPath',str(ROOT),'-runTests','-testPlatform',mode,'-assemblyNames','QingTian.'+mode+'Tests','-testResults',str(xml),'-logFile',str(log)]
    started=time.time();proc=subprocess.run(args,env=env,cwd=ROOT,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0),timeout=900)
    if not xml.exists() or xml.stat().st_mtime<started-2:raise SystemExit(f'{mode}: no fresh report; exit {proc.returncode}; see {log}')
    test=ET.parse(xml).getroot();result={'suite':mode,'exitCode':proc.returncode,'result':test.get('result'),'total':int(test.get('total',0)),'passed':int(test.get('passed',0)),'failed':int(test.get('failed',0)),'skipped':int(test.get('skipped',0)),'seconds':time.time()-started}
    results.append(result);print(json.dumps(result),flush=True)
    if proc.returncode!=0 or result['failed'] or result['result']!='Passed':raise SystemExit('FAILED: '+str(xml))
(out/'cli-test-summary.json').write_text(json.dumps({'unity':str(unity),'ranAtUnix':time.time(),'suites':results},indent=2),encoding='utf-8')
print('PASS: both Unity command-line suites.',flush=True)
