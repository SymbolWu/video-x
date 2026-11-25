import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { ErrorNotice, Pager } from "@video-x/ui";

export function ActorEnrichment({
  editPerson,
}: {
  editPerson: (person: Schemas["Person"]) => void;
}) {
  const [page, setPage] = useState(1);
  const [q, search] = useState("");
  const people = useQuery({
    queryKey: ["studio", "enrich", page, q],
    queryFn: () =>
      unwrap(
        api.GET("/api/people", {
          params: {
            query: {
              q: q || undefined,
              page,
              pageSize: 24,
              sort: "name",
              direction: "asc",
            },
          },
        }),
      ),
  });
  return (
    <section>
      <div className="heading">
        <h1>演员资料补全</h1>
      </div>
      <form
        className="studio-tools"
        onSubmit={(event) => {
          event.preventDefault();
          search(String(new FormData(event.currentTarget).get("q") ?? ""));
          setPage(1);
        }}
      >
        <input name="q" aria-label="查找演员" placeholder="搜索演员名称" />
        <button>搜索</button>
      </form>
      <ErrorNotice error={people.error} />
      <div className="ops-panel">
        <p>选择演员，补充头像和详细名称。</p>
        <div className="people-pills">
          {people.data?.items.map((p) => (
            <button key={p.id} onClick={() => editPerson(p)}>
              {p.fullName}{" "}
              <small>
                {!p.portraitId
                  ? "缺头像"
                  : !p.detailedName
                    ? "缺详细名称"
                    : "资料齐全"}
              </small>
            </button>
          ))}
        </div>
      </div>
      {people.data && <Pager {...people.data} onChange={setPage} />}
    </section>
  );
}

export function ArchivedRecords() {
  const archive = useQuery({
    queryKey: ["studio", "archive"],
    queryFn: () => unwrap(api.GET("/api/catalog/archive")),
  });
  return (
    <section>
      <div className="heading">
        <h1>已归档资料</h1>
      </div>
      <ErrorNotice error={archive.error} />
      <div className="ops-panel">
        {archive.isPending && <p>正在读取归档资料…</p>}
        {archive.data?.map((x) => (
          <p key={x.id}>
            <strong>{x.name}</strong> · {x.kind} ·{" "}
            {new Date(x.archivedAt).toLocaleDateString("zh-CN")}
          </p>
        ))}
        {archive.data?.length === 0 && (
          <div className="empty">暂无已归档资料</div>
        )}
      </div>
    </section>
  );
}
