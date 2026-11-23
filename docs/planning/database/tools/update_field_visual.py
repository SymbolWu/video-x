"""仅更新已有字段查询的内嵌数据与版本，不生成或改变界面。"""
import argparse,json,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('fragment',type=Path);a=p.parse_args()
b=Path(__file__).resolve().parent.parent
provenance=json.loads((b/'field-provenance.json').read_text());spec=json.loads((b/'model-spec.json').read_text());meta={t['name']:{c['name']:c for c in t['columns']} for t in json.loads((b/'schema-metadata.json').read_text())}
f=[dict(t=x['table'],f=x['field'],o=x['origin'],s=x['old_sources'],p=x['purpose'],u=x['usage'],w=x['writer'],i=x['initialization'],g=x['stage'],typ=meta[x['table']][x['field']]['type'],n=meta[x['table']][x['field']]['nullable']) for x in provenance['fields'].values()]
cancelled=provenance['cancelled']+[{'old':t,'decision':'旧任务表的全部记录和结果 JSON 不迁移；新系统保留任务能力，从新任务开始记录'} for t in ['task','actor_profile_task']]+[{'old':t,'decision':'旧观看进度不迁移；新系统从真实播放建立断点，不换算百分比或补造会话'} for t in ['movie.watch_progress','movie.last_play_position_ms']]
data=dict(fields=f,tables=[dict(name=t['name'],label=t['label']) for t in spec],cancelled=cancelled)
raw=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
s=a.fragment.read_text();s,n=re.subn(r'(<script id="vx-data" type="application/json">).*?(</script>)',lambda m:m[1]+raw+m[2],s,flags=re.S)
assert n==1,'没有唯一的数据槽，停止写入'
s=re.sub(r'v0\.\d+ · 候选设计', 'v'+provenance['version']+' · 候选设计',s)
assert len(s.encode())<1000000
a.fragment.write_text(s);print('查询数据同步:',len(f),'字段，v'+provenance['version'])
