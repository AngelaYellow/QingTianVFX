"""Scoped MCP command line: tools / resource URI / tool NAME [JSON file]."""
from pathlib import Path
import asyncio,json,os,sys
os.environ['NO_PROXY']='localhost,127.0.0.1,::1'
from fastmcp import Client
ROOT=Path(__file__).resolve().parents[1]
async def main():
    async with Client('http://127.0.0.1:8082/mcp',timeout=90) as client:
        mode=sys.argv[1]
        if mode=='tools': result={t.name:t.inputSchema for t in await client.list_tools()}
        elif mode=='resources': result=[r.model_dump(mode='json') for r in await client.list_resources()]
        elif mode=='resource':result=[r.model_dump(mode='json') for r in await client.read_resource(sys.argv[2])]
        else:
            args=json.loads(Path(sys.argv[3]).read_text(encoding='utf-8-sig')) if len(sys.argv)>3 else {}
            response=await client.call_tool(sys.argv[2],args,raise_on_error=False)
            result={'isError':response.is_error,'content':[r.model_dump(mode='json') for r in response.content]}
        path=ROOT/'Logs/mcp-last.json';path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        if mode=='tools':
            (ROOT/'Logs/tool-schemas.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps(list(result)))
        else:print(json.dumps(result,ensure_ascii=False))
asyncio.run(main())
