"""从已验证的 PostgreSQL 元数据和字段依据生成可对照的字段字典。"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
meta={t['name']:t for t in json.loads((ROOT/'schema-metadata.json').read_text())}
spec=json.loads((ROOT/'model-spec.json').read_text())
payload=json.loads((ROOT/'field-provenance.json').read_text());P=payload['fields'];T=payload['tables']
FILES=[('tables-catalog.md','作品与资料',['资料']),('tables-library.md','媒体库与文件',['文件']),('tables-personal.md','账号、个人整理与播放',['身份','个人','播放']),('tables-metadata.md','来源、字段维护与差异',['来源']),('tables-operations.md','导入、任务、可靠写入与迁移',['导入','运行','迁移'])]
lookup={t['name']:file for file,_,domains in FILES for t in spec if t['domain'] in domains}
def esc(v):return str(v).replace('|','\\|').replace('\n',' ')
assert set(meta)=={t['name'] for t in spec}
assert set(P)=={t['name']+'.'+c[0] for t in spec for c in t['columns']}
for file,title,domains in FILES:
 chosen=[t for t in spec if t['domain'] in domains]
 text=[f'# {title} · 字段与业务依据 v0.5','', '[阅读指南](./field-guide.md) · [模型入口](./README.md) · [分域关系图](./relationships.md) · [建表 SQL](./schema.sql)','',
 '更新于 2026-11-17。结构来自临时 PostgreSQL 16.14 实际执行结果；业务说明来自逐字段设计依据。PK=主键，FK=参与外键。**“写入者、使用场景”为计划行为，尚未接入应用；首版建议为建议，不等于所有候选字段已经定稿。**','',
 '每表先看类型和含义，再看同名字段的“来源与使用规则”。旧字段名指当前旧实体，历史数据证据见[依据复核](./evidence-review.md)。','',
 '| 表 | 字段数 | 本表首版建议 | 业务依据 |','| --- | ---: | --- | --- |']
 for t in chosen:text.append(f'| [{t["name"]}](#{t["name"]}) · {t["label"]} | {len(t["columns"])} | {T[t["name"]]["stage"]} | {T[t["name"]]["basis"]} |')
 for t in chosen:
  name=t['name'];m=meta[name];notes={n:note for n,_,note in t['columns']}
  assert [c['name'] for c in m['columns']]==[c[0] for c in t['columns']],name
  text += ['',f'<a id="{name}"></a>',f'## {name} · {t["label"]}','',
   f'本表依据：{T[name]["basis"]}。建议：**{T[name]["stage"]}**；个别字段以以下逐项标记为准。','',
   '| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |','| --- | --- | --- | --- | --- | --- |']
  for c in m['columns']:
   typ=c['type'].replace('timestamp with time zone','timestamptz')
   keys='/'.join(k for k,yes in [('PK',c['pk']),('FK',c['fk'])] if yes) or '—'
   default=f'`{esc(c["default"])}`' if c['default'] is not None else '—'
   text.append(f'| <a id="{name}-{c["name"]}"></a>`{c["name"]}` | `{typ}` | {"是" if c["nullable"] else "否"} | {keys} | {default} | {esc(notes[c["name"]])} |')
  text += ['', '### 字段来源与使用规则','', '| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |','| --- | --- | --- | --- | --- |']
  for c in m['columns']:
   p=P[name+'.'+c['name']];old='、'.join('`'+s+'`' for s in p['old_sources']) if p['old_sources'] else '无旧字段；按本表设计依据新增'
   text.append(f'| `{c["name"]}` | **{p["origin"]}**：{old} | {esc(p["usage"])} | {esc(p["writer"])}；{esc(p["initialization"])} | {p["stage"]} |')
  text += ['', '<details>','<summary>数据库约束与索引</summary>','','```sql']
  text += [c['name']+': '+c['definition']+';' for c in m['constraints'] or []]
  text += ['','-- 含主键、唯一约束的支撑索引']+(m['indexes'] or [])+['```','','</details>']
 (ROOT/file).write_text('\n'.join(text)+'\n')
lines=['# 全量外键清单 · v0.5','', '[模型入口](./README.md) · [分域关系图](./relationships.md) · [字段阅读指南](./field-guide.md)','',
 '以下为候选 schema 实际执行后的 127 条外键，不包含仅由事务用例保证的规则。后置表也在本候选清单内，不代表首版全部启用。复合外键是一条完整约束，不可拆开解释。','',
 '| 引用表 | 被引用表 | 外键定义 |','| --- | --- | --- |']
for t in sorted(meta.values(),key=lambda t:t['name']):
 for fk in t['fks'] or []:lines.append(f'| [{t["name"]}](./{lookup[t["name"]]}#{t["name"]}) | [{fk["to"]}](./{lookup[fk["to"]]}#{fk["to"]}) | `{fk["definition"]}` |')
(ROOT/'foreign-keys.md').write_text('\n'.join(lines)+'\n')
print('已生成五份双层字段字典及外键清单，覆盖',len(P),'字段')
