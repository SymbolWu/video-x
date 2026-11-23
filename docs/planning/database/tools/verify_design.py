"""仅在指定临时实例创建新的 vx_review_* 空测试库，验证候选 DDL 并导出元数据。"""
import argparse,json,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--socket',required=True);p.add_argument('--port',required=True);p.add_argument('--user',required=True);p.add_argument('--database',required=True);a=p.parse_args()
if not a.database.startswith('vx_review_'):p.error('测试库名称必须以 vx_review_ 开头；本工具不连接业务库')
root=Path(__file__).resolve().parent.parent
conn=['-h',a.socket,'-p',a.port,'-U',a.user]
def run(tool,args):
 path=shutil.which(tool) or '/opt/homebrew/bin/'+tool
 r=subprocess.run([path]+args,capture_output=True,text=True)
 if r.returncode:raise RuntimeError(tool+' failed:\n'+r.stdout[-4000:]+'\n'+r.stderr[-4000:])
 return r.stdout
run('createdb',conn+[a.database])
run('psql',conn+['-d',a.database,'-v','ON_ERROR_STOP=1','-f',str(root/'schema.sql')])
checks=run('psql',conn+['-d',a.database,'-v','ON_ERROR_STOP=1','-f',str(root/'verify.sql')])
meta=json.loads(run('psql',conn+['-d',a.database,'-v','ON_ERROR_STOP=1','-A','-t','-f',str(root/'tools/introspect.sql')]))
(root/'schema-metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(checks[-350:]);print('tables',len(meta),'fields',sum(len(t['columns']) for t in meta),'foreign_keys',sum(len(t['fks'] or []) for t in meta))
