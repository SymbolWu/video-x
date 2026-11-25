import { useEffect, useState } from "react";
import { routes, type Kind } from "./AdminShell";
function legacyDestination(): Kind | undefined {
  if (location.hash === "#changes") return "intake";
  if (location.hash === "#sources") return "settings";
}
function locationKind(): Kind {
  return (
    legacyDestination() ??
    (Object.keys(routes) as Kind[]).find(
      (k) => routes[k] === location.hash.slice(1).split("/")[0],
    ) ??
    "intake"
  );
}
function profileId() {
  return (
    location.hash.match(/^#(?:actors|series)\/([0-9a-f-]{36})$/i)?.[1] ?? ""
  );
}
function filmId() {
  return location.hash.match(/^#media\/([0-9a-f-]{36})$/i)?.[1] ?? "";
}

export function openFilm(id: string) {
  if (location.hash === "#media/" + id) return;
  history.pushState(
    { ...history.state, returnToFilmList: location.href },
    "",
    "#media/" + id,
  );
  window.dispatchEvent(new Event("hashchange"));
}
export function returnFromFilm() {
  if (history.state?.returnToFilmList) history.back();
  else location.hash = "media";
}
export function useAdminRoute() {
  function current() {
    return {
      kind: locationKind(),
      recordId: profileId(),
      filmId: filmId(),
      draft: location.hash.startsWith("#draft/"),
    };
  }
  const [route, setRoute] = useState(current);
  useEffect(() => {
    function navigate() {
      const legacy = legacyDestination();
      if (legacy) history.replaceState(history.state, "", "#" + routes[legacy]);
      const next = current();
      setRoute(next);
      if (next.recordId || next.filmId || next.draft || !history.state?.catalog)
        window.scrollTo(0, 0);
    }
    if (legacyDestination()) navigate();
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  return route;
}
