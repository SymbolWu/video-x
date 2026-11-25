export function LibraryTabs({
  desktop,
  entity,
  facts,
  setTab,
}: {
  desktop: boolean;
  entity: string;
  facts?: { films: number; actors: number; series: number };
  setTab: (name: string) => void;
}) {
  return (
    <div className="vx-entity-tabs" role="tablist" aria-label="片库视图">
      {["影片", "演员", "系列"].map((t) => (
        <button
          role="tab"
          aria-selected={entity === t}
          key={t}
          className={entity === t ? "active" : ""}
          tabIndex={entity === t ? 0 : -1}
          onKeyDown={(event) => {
            const tabs = ["影片", "演员", "系列"];
            const i = tabs.indexOf(t);
            const next =
              event.key === "ArrowRight"
                ? (i + 1) % 3
                : event.key === "ArrowLeft"
                  ? (i + 2) % 3
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 2
                      : -1;
            if (next < 0) return;
            event.preventDefault();
            setTab(tabs[next]!);
            event.currentTarget.parentElement
              ?.querySelectorAll("button")
              [next]?.focus();
          }}
          onClick={() => setTab(t)}
        >
          {t}
          {desktop && (
            <small>
              {t === "影片"
                ? (facts?.films ?? 0)
                : t === "演员"
                  ? (facts?.actors ?? 0)
                  : (facts?.series ?? 0)}
            </small>
          )}
        </button>
      ))}
    </div>
  );
}
