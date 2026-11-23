import type { Static } from "@sinclair/typebox";
import type { LookupChoice, SourceCandidate } from "@video-x/contracts";
import { javdb } from "./javdb.js";
export type Candidate = Static<typeof SourceCandidate>;
export type Choice = Static<typeof LookupChoice>;
export type LookupResult =
  | { choices: Choice[] }
  | {
      candidate: Omit<Candidate, "posterId">;
      cover?: Buffer;
      warning?: string;
    };
export interface MetadataProvider {
  code: string;
  name: string;
  lookup(query: string): Promise<LookupResult>;
}
export const providers: ReadonlyMap<string, MetadataProvider> = new Map([
  [javdb.code, javdb],
]);
