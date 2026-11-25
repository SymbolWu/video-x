import type { Schemas } from "@video-x/sdk-ts";
import type { RelationItem } from "./relationChoices";

const groups = new Map([
  ["years", "年份"],
  ["theme", "主题"],
  ["role", "角色"],
  ["behavior", "行为"],
  ["physique", "体型"],
  ["clothing", "服装"],
  ["tricks", "玩法"],
  ["category", "类别"],
  ["place", "地点"],
]);
const groupOrder = [...groups.values()];

function groupLabel(detail?: string | null) {
  const name = detail?.trim();
  return name && name !== "other" ? (groups.get(name) ?? name) : "其他";
}

type TagChoice = RelationItem & { category: string };
type DictionaryEntry = Schemas["DictionaryEntry"];

export function tagChoices(
  entries: DictionaryEntry[],
  category: string,
  term: string,
  categories: Schemas["Category"][],
): TagChoice[] {
  const names = new Map(categories.map((item) => [item.id, item.name]));
  const search = term.trim().normalize("NFKC").toLocaleLowerCase();
  return entries
    .filter(
      (item) =>
        item.kind === "tag" &&
        item.isVisible &&
        (!category || item.categoryId === category) &&
        item.name.normalize("NFKC").toLocaleLowerCase().includes(search),
    )
    .map((item) => {
      const categoryName =
        (item.categoryId && names.get(item.categoryId)) || "";
      const group = groupLabel(item.detail);
      return {
        id: item.id,
        name: item.name,
        category: categoryName,
        detail: group,
        context: [categoryName, group].filter(Boolean).join(" · "),
      };
    });
}

function groupRank(name: string) {
  if (name === "其他") return groupOrder.length + 1;
  const index = groupOrder.indexOf(name);
  return index < 0 ? groupOrder.length : index;
}

export function TagChoiceGroups({
  items,
  ids,
  selected,
  toggle,
  showCategories,
}: {
  items: TagChoice[];
  ids: ReadonlySet<string>;
  selected: ReadonlyMap<string, RelationItem>;
  toggle: (item: RelationItem) => void;
  showCategories: boolean;
}) {
  const byGroup = new Map<string, TagChoice[]>();
  for (const item of items) {
    const group = item.detail ?? "其他";
    const members = byGroup.get(group);
    if (members) members.push(item);
    else byGroup.set(group, [item]);
  }
  const orderedGroups = [...byGroup].sort(
    ([a], [b]) => groupRank(a) - groupRank(b) || a.localeCompare(b, "zh-CN"),
  );
  return (
    <div className="picker-tag-groups">
      {orderedGroups.map(([group, members]) => (
        <section aria-label={group} className="picker-tag-group" key={group}>
          <h3>
            {group} <small>{members.length}</small>
          </h3>
          <div className="picker-tag-cloud">
            {members.map((item) => {
              const linked = ids.has(item.id);
              return (
                <button
                  className="picker-tag"
                  type="button"
                  key={item.id}
                  disabled={linked}
                  aria-pressed={linked || selected.has(item.id)}
                  onClick={() => toggle(item)}
                >
                  <span>{item.name}</span>
                  {showCategories && item.category && (
                    <small>{item.category}</small>
                  )}
                  {linked && <small>已关联</small>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
