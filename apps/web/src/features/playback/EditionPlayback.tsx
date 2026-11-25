import { useState } from "react";
import type { Schemas } from "@video-x/sdk-ts";
import { Playback } from "./Playback";
export function EditionPlayback({
  media,
  profileId,
  resume = false,
}: {
  media: Schemas["MediaDetail"];
  resume?: boolean;
  profileId: string;
}) {
  const versions = media.editions ?? [];
  const [picked, choose] = useState<string>();
  const edition =
    versions.find((v) => v.id === picked) ??
    versions.find((v) => v.id === media.resumeEditionId) ??
    versions.find((v) => v.isDefault) ??
    versions[0];
  const [startOnChange, setStartOnChange] = useState(resume);
  const pick = (id: string, play: boolean) => {
    setStartOnChange(play);
    choose(id);
  };
  const selector = (inPlayer: boolean) =>
    versions.length > 1 && (
      <label className="version-picker">
        播放版本
        <select
          aria-label="播放版本"
          value={edition?.id}
          onChange={(e) => pick(e.target.value, inPlayer)}
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.height ? " · " + v.height + "p" : ""}
            </option>
          ))}
        </select>
      </label>
    );
  return (
    <div>
      {selector(false)}
      <Playback
        key={edition?.id ?? media.id}
        mediaId={media.id}
        profileId={profileId}
        editionId={edition?.id}
        title={media.title}
        selector={selector(true)}
        startOnChange={startOnChange}
      />
    </div>
  );
}
