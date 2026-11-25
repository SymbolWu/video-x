import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@video-x/sdk-ts";
import { Art } from "../../shared/Art";
import { Icon } from "../../shared/Icon";
import "./work-profile.css";

export type LibraryScope = {
  kind: "演员" | "系列" | "收藏夹";
  id: string;
  name: string;
};
export function WorkProfile({
  scope,
  back,
}: {
  scope: LibraryScope;
  back: () => void;
}) {
  const { kind, id, name } = scope;
  const details = useQuery({
    queryKey: ["work-profile", kind, id],
    enabled: kind !== "收藏夹",
    queryFn: async () => {
      const params = { path: { id } };
      if (kind === "演员") {
        const { record, firstYear, lastYear, cast } = await unwrap(
          api.GET("/api/people/{id}", { params }),
        );
        return {
          art: record.portraitId,
          description:
            record.detailedName !== record.fullName
              ? record.detailedName
              : null,
          firstYear,
          lastYear,
          count: record.workCount,
          cast,
        };
      }
      const { record, firstYear, lastYear, cast } = await unwrap(
        api.GET("/api/franchises/{id}", { params }),
      );
      return {
        art: record.coverId ?? record.coverIds?.[0],
        description: record.description,
        firstYear,
        lastYear,
        count: record.workCount,
        cast,
      };
    },
  });
  const profile = details.data;
  const years = [
    ...new Set([profile?.firstYear, profile?.lastYear].filter(Boolean)),
  ].join("–");
  return (
    <header className="work-profile">
      <button className="work-back" onClick={back}>
        <Icon name="arrow" size={15} />
        返回上一页
      </button>
      <div className="work-identity">
        {kind !== "收藏夹" && (
          <span
            className={
              "work-profile-art " + (kind === "演员" ? "portrait" : "")
            }
          >
            <Art
              id={profile?.art}
              alt=""
              fallback={kind === "演员" ? "user" : "film"}
            />
          </span>
        )}
        <div>
          <small>{kind}</small>
          <h1>{name}</h1>
          {profile?.description && <p>{profile.description}</p>}
          {profile && (
            <p>
              {profile.count} 部作品{years && " · 馆藏作品年份 " + years}
            </p>
          )}
          {Boolean(profile?.cast.length) && (
            <p>
              {kind === "演员" ? "合作演员" : "参演演员"} ·{" "}
              {profile?.cast.join("、")}
            </p>
          )}
          {details.isError && (
            <p role="alert">
              资料读取失败。{" "}
              <button onClick={() => void details.refetch()}>重试</button>
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
