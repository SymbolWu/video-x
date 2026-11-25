import type { Schemas } from "@video-x/sdk-ts";
import { Art } from "../../shared/Art";
export function FilmPeople({
  title,
  people,
  open,
}: {
  title: string;
  people: Schemas["Person"][];
  open?: (person: Schemas["Person"]) => void;
}) {
  const Person = open ? "button" : "div";
  if (!people.length) return null;
  return (
    <section>
      <h3>{title}</h3>
      <div className="detail-people">
        {people.map((p) => (
          <Person key={p.id} onClick={open ? () => open(p) : undefined}>
            <span className="detail-person-art">
              <Art id={p.portraitId} alt="" fallback="user" />
            </span>
            <span>{p.fullName}</span>
          </Person>
        ))}
      </div>
    </section>
  );
}
