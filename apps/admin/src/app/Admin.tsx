import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { ErrorNotice } from "@video-x/ui";
import { PublishedWorkspace } from "../features/film-editor/PublishedWorkspace";
import { AdminShell } from "./AdminShell";
import {
  openEpisode,
  openFilm,
  openIntakeForEdition,
  returnFromFilm,
  useAdminRoute,
} from "./AdminRoute";
import { CatalogPage } from "../features/catalog/CatalogPage";
import { EntityEditor } from "../features/catalog/EntityEditor";
import { DictionaryPage } from "../features/dictionaries/Dictionary";
import {
  ActorEnrichment,
  ArchivedRecords,
} from "../features/catalog/CatalogTools";
import { SystemStatus } from "../features/operations/SystemStatus";
import { JobsPage } from "../features/operations/JobsPage";
import { CollectionsPage } from "../features/collections/CollectionsPage";
const Intake = lazy(() =>
  import("../features/intake/Intake").then((m) => ({ default: m.Intake })),
);
export function Admin({ logout }: { logout: () => Promise<void> }) {
  const { kind, recordId, filmId, draft } = useAdminRoute();
  const [error, setError] = useState("");
  const [person, setPerson] = useState<Schemas["Person"] | null>(null);
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => unwrap(api.GET("/api/categories")),
  });
  const pending = useQuery({
    queryKey: ["intake", "pending-count"],
    queryFn: async () =>
      (
        await unwrap(
          api.GET("/api/imports", {
            params: { query: { status: "pending", pageSize: 1 } },
          }),
        )
      ).total,
  });
  const options = categories.data ?? [];
  function page() {
    switch (kind) {
      case "intake":
        return (
          <Suspense fallback={<p role="status">读取录入工作台…</p>}>
            <Intake
              categories={options}
              toMedia={openFilm}
              returnToEdition={
                !draft && history.state?.returnToEdition
                  ? () => history.back()
                  : undefined
              }
            />
          </Suspense>
        );
      case "media":
        return filmId ? (
          <PublishedWorkspace
            key={filmId}
            id={filmId}
            categories={options}
            back={returnFromFilm}
            navigation={{
              restoredEpisode: history.state?.episodeOrigin,
              restoreVersions: !!history.state?.restoreVersions,
              inEpisode: !!history.state?.returnToEpisode,
              openEpisode,
              openIntake: openIntakeForEdition,
            }}
          />
        ) : (
          <CatalogPage
            key={kind}
            kind={kind}
            detailId=""
            categories={options}
          />
        );
      case "people":
      case "franchises":
      case "categories":
        return (
          <CatalogPage
            key={kind}
            kind={kind}
            detailId={recordId}
            categories={options}
          />
        );
      case "tags":
      case "organizations":
        return <DictionaryPage key={kind} tags={kind === "tags"} />;
      case "jobs":
        return <JobsPage />;
      case "collections":
        return <CollectionsPage />;
      case "settings":
        return <SystemStatus />;
      case "archive":
        return <ArchivedRecords />;
      case "enrich":
        return <ActorEnrichment editPerson={setPerson} />;
    }
  }
  return (
    <AdminShell
      kind={kind}
      draftEditing={draft}
      filmEditing={!!filmId}
      pending={pending.data}
      logout={() => void logout().catch((e) => setError(e.message))}
    >
      <ErrorNotice error={error || categories.error} />
      {page()}
      {kind === "enrich" && person && (
        <EntityEditor
          kind="people"
          selected={person}
          categories={options}
          close={() => setPerson(null)}
        />
      )}
    </AdminShell>
  );
}
