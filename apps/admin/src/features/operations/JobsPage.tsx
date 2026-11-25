import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@video-x/sdk-ts";
import { ErrorNotice, Pager } from "@video-x/ui";
export function JobsPage() {
  const [page, setPage] = useState(1);
  const tasks = useQuery({
    queryKey: ["ops", "imports", page],

    queryFn: () =>
      unwrap(
        api.GET("/api/imports", { params: { query: { pageSize: 25, page } } }),
      ),
    refetchInterval: 5000,
  });
  return (
    <section className="studio-extra">
      <header className="heading">
        <h1>后台任务</h1>
      </header>
      <ErrorNotice error={tasks.error} />
      <div className="ops-deck">
        <article>
          <h3>任务队列</h3>
          <dl>
            <dt>文件扫描</dt>
            <dd>{tasks.data?.scanning ? "执行中" : "空闲"}</dd>
            <dt>录入记录</dt>
            <dd>{tasks.data?.total ?? "—"}</dd>
          </dl>
          <button onClick={() => void tasks.refetch()}>刷新</button>
        </article>
        <article>
          <h3>最近文件探测</h3>
          {tasks.data?.items.map((r) => (
            <details key={r.id}>
              <summary>{r.relativePath}</summary>
              <p>
                {r.probeStatus === "succeeded" ? "探测成功" : r.probeStatus} ·{" "}
                {r.publishedMediaId
                  ? "已发布"
                  : r.reviewed
                    ? "已确认"
                    : "待核对"}
              </p>
            </details>
          ))}
        </article>
      </div>
      <Pager
        page={page}
        pageSize={25}
        total={tasks.data?.total ?? 0}
        onChange={setPage}
      />
    </section>
  );
}
