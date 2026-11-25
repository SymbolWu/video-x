import {
  Type as T,
  type Static,
  type TProperties,
  type TSchema,
} from "@sinclair/typebox";
const id = () => T.String({ format: "uuid" }),
  nullable = <S extends TSchema>(s: S) => T.Union([s, T.Null()]);
const obj = <P extends TProperties>(name: string, properties: P) =>
  T.Object(properties, { $id: name, additionalProperties: false });
export const ErrorResponse = obj("ErrorResponse", {
  code: T.String(),
  message: T.String(),
});
export const Health = obj("Health", {
  status: T.Union([T.Literal("ok"), T.Literal("unavailable")]),
});
const storageSpace = {
  total: T.Number(),
  used: T.Number(),
  available: T.Number(),
};
export const RuntimeStatus = obj("RuntimeStatus", {
  checkedAt: T.String(),
  media: T.Object({
    path: T.String(),
    state: T.String(),
    space: nullable(T.Object(storageSpace)),
  }),
  disks: nullable(
    T.Array(T.Object({ name: T.String(), path: T.String(), ...storageSpace })),
  ),
  mediaRoots: T.Optional(
    T.Array(
      T.Object({
        name: T.String(),
        path: T.String(),
        state: T.String(),
        space: nullable(T.Object(storageSpace)),
        capacityCheckedAt: nullable(T.String()),
      }),
    ),
  ),
  art: T.Object({ path: T.String(), bytes: T.Number(), state: T.String() }),
  pending: T.Integer(),
  postgres: T.String(),
  worker: nullable(
    T.Object({ count: T.Integer(), lastSeen: nullable(T.String()) }),
  ),
  ffprobe: nullable(T.String()),
  ffmpeg: nullable(T.String()),
  version: T.String(),
  compose: T.Boolean(),
  listenHost: T.String(),
  origins: T.Array(T.String()),
  sources: T.Array(T.String()),
});
export const Profile = obj("Profile", {
  id: id(),
  displayName: T.String(),
  username: T.String(),
});
export const Login = obj("Login", {
  username: T.String({ minLength: 1, maxLength: 80 }),
  password: T.String({ minLength: 1, maxLength: 128 }),
  installationId: id(),
  clientKind: T.Union([T.Literal("web"), T.Literal("android")]),
  deviceName: T.String({ minLength: 1, maxLength: 120 }),
});
export const LoginResult = obj("LoginResult", {
  profile: T.Ref(Profile),
  token: nullable(T.String()),
});
export const Category = obj("Category", {
  id: id(),
  name: T.String(),
  parentId: nullable(id()),
  isVisible: T.Boolean(),
  revision: T.Integer(),
});
export const CategoryVisibility = obj("CategoryVisibility", {
  expectedRevision: T.Integer({ minimum: 1 }),
  isVisible: T.Boolean(),
});
export const CategoryCreate = obj("CategoryCreate", {
  name: T.String({ minLength: 1, maxLength: 120 }),
});
export const Person = obj("Person", {
  portraitId: T.Optional(nullable(id())),

  id: id(),
  fullName: T.String(),
  detailedName: nullable(T.String()),
  gender: T.String(),
  categoryId: id(),
  categoryName: T.String(),
  workCount: T.Integer(),
  isFavorite: T.Boolean(),
  revision: T.Integer(),
});
export const PersonCreate = obj("PersonCreate", {
  portraitId: T.Optional(nullable(id())),
  fullName: T.String({ minLength: 1, maxLength: 300 }),
  detailedName: T.Optional(nullable(T.String({ maxLength: 300 }))),
  gender: T.Optional(
    T.Union([
      T.Literal("unknown"),
      T.Literal("female"),
      T.Literal("male"),
      T.Literal("other"),
    ]),
  ),
  categoryId: id(),
});
export const PersonPatch = obj("PersonPatch", {
  portraitId: T.Optional(nullable(id())),
  expectedRevision: T.Integer({ minimum: 1 }),
  fullName: T.Optional(T.String({ minLength: 1, maxLength: 300 })),
  detailedName: T.Optional(nullable(T.String({ maxLength: 300 }))),
  gender: PersonCreate.properties.gender,
  categoryId: T.Optional(id()),
});
export const Franchise = obj("Franchise", {
  coverIds: T.Optional(T.Array(id())),
  coverId: T.Optional(nullable(id())),

  id: id(),
  name: T.String(),
  description: nullable(T.String()),
  categoryId: id(),
  categoryName: T.String(),
  workCount: T.Integer(),
  revision: T.Integer(),
});
const filmographyFacts = {
  firstYear: nullable(T.Integer()),
  lastYear: nullable(T.Integer()),
  cast: T.Array(T.String()),
};
export const PersonProfile = obj("PersonProfile", {
  record: T.Ref(Person),
  ...filmographyFacts,
});
export const FranchiseProfile = obj("FranchiseProfile", {
  record: T.Ref(Franchise),
  ...filmographyFacts,
});
export const FranchiseCreate = obj("FranchiseCreate", {
  coverId: T.Optional(nullable(id())),
  name: T.String({ minLength: 1, maxLength: 300 }),
  description: T.Optional(nullable(T.String({ maxLength: 10000 }))),
  categoryId: id(),
});
export const FranchisePatch = obj("FranchisePatch", {
  coverId: T.Optional(nullable(id())),
  expectedRevision: T.Integer({ minimum: 1 }),
  name: T.Optional(FranchiseCreate.properties.name),
  description: FranchiseCreate.properties.description,
  categoryId: T.Optional(id()),
});
export const Media = obj("Media", {
  episodeNumber: T.Optional(nullable(T.Integer())),
  posterId: T.Optional(nullable(id())),
  backdropId: T.Optional(nullable(id())),
  durationMs: T.Optional(nullable(T.Integer({ format: "int64" }))),
  resumeMs: T.Optional(nullable(T.Integer({ format: "int64" }))),

  id: id(),
  title: T.String(),
  summary: nullable(T.String()),
  kind: T.String(),
  releaseYear: nullable(T.Integer()),
  categoryId: id(),
  categoryName: T.String(),
  supportsChinese: T.Union([T.Boolean(), T.Null()]),
  createdAt: T.String(),
  revision: T.Integer(),
  isFavorite: T.Boolean(),
  rating: nullable(T.Integer()),
  watchedAt: nullable(T.String()),
  stateRevision: T.Integer(),
});
export const ManagementMedia = obj("ManagementMedia", {
  ...Media.properties,
  identifier: nullable(T.String()),
  actorNames: T.Array(T.String()),
  editionCount: T.Integer(),
  fileCount: T.Integer(),
  needsFileCheck: T.Boolean(),
});
const dictLinks = {
  tagIds: T.Optional(T.Array(id(), { uniqueItems: true, maxItems: 200 })),
  studioIds: T.Optional(T.Array(id(), { uniqueItems: true, maxItems: 100 })),
};
const stillIds = T.Optional(
  T.Array(id(), { uniqueItems: true, maxItems: 100 }),
);
export const EditionInfo = obj("EditionInfo", {
  id: id(),
  name: T.String(),
  isDefault: T.Boolean(),
  filename: T.String(),
  width: nullable(T.Integer()),
  height: nullable(T.Integer()),
  availability: T.String(),
});
export const EditionTarget = obj("EditionTarget", {
  mediaId: id(),
  name: T.String({ minLength: 1, maxLength: 160 }),
});

export const MediaDetail = obj("MediaDetail", {
  ...dictLinks,
  stillIds,
  directors: T.Optional(T.Array(T.Ref(Person))),
  editions: T.Optional(T.Array(T.Ref(EditionInfo))),
  resumeEditionId: T.Optional(nullable(id())),
  releaseDate: T.Optional(nullable(T.String({ format: "date" }))),
  identifier: T.Optional(nullable(T.String())),
  episodes: T.Optional(T.Array(T.Ref(Media))),
  linkedFileCount: T.Optional(T.Integer({ minimum: 0 })),
  ...Media.properties,
  notes: nullable(T.String()),
  actors: T.Array(T.Ref(Person)),
  franchises: T.Array(T.Ref(Franchise)),
});
export const MediaPatch = obj("MediaPatch", {
  episodeOrder: T.Optional(
    T.Array(id(), { uniqueItems: true, minItems: 1, maxItems: 1000 }),
  ),
  stillIds,
  releaseDate: T.Optional(T.String({ format: "date" })),
  identifier: T.Optional(nullable(T.String({ maxLength: 160 }))),
  directorIds: T.Optional(T.Array(id(), { uniqueItems: true, maxItems: 200 })),
  ...dictLinks,
  posterId: T.Optional(nullable(id())),
  backdropId: T.Optional(nullable(id())),
  expectedRevision: T.Integer({ minimum: 1 }),
  title: T.Optional(T.String({ minLength: 1, maxLength: 1000 })),
  summary: T.Optional(nullable(T.String({ maxLength: 50000 }))),
  notes: T.Optional(nullable(T.String({ maxLength: 10000 }))),
  categoryId: T.Optional(id()),
  supportsChinese: T.Optional(T.Union([T.Boolean(), T.Null()])),
  actorIds: T.Optional(T.Array(id(), { uniqueItems: true, maxItems: 200 })),
  franchiseIds: T.Optional(T.Array(id(), { uniqueItems: true, maxItems: 100 })),
});
export const MediaStatePatch = obj("MediaStatePatch", {
  expectedRevision: T.Integer({ minimum: 0 }),
  isFavorite: T.Optional(T.Boolean()),
  rating: T.Optional(
    T.Union([T.Integer({ minimum: 1, maximum: 5 }), T.Null()]),
  ),
  watched: T.Optional(T.Boolean()),
});
export const Collection = obj("Collection", {
  coverIds: T.Optional(T.Array(id())),
  coverId: T.Optional(nullable(id())),
  id: id(),
  name: T.String(),
  description: nullable(T.String()),
  mediaIds: T.Array(id()),
  revision: T.Integer(),
});
export const CollectionCreate = obj("CollectionCreate", {
  name: T.String({ minLength: 1, maxLength: 120 }),
  description: T.Optional(nullable(T.String({ maxLength: 10000 }))),
});
export const CollectionPatch = obj("CollectionPatch", {
  ...CollectionCreate.properties,
  expectedRevision: T.Integer({ minimum: 1 }),
});
export const CollectionItems = obj("CollectionItems", {
  expectedRevision: T.Integer({ minimum: 1 }),
  mediaIds: T.Array(id(), { uniqueItems: true, maxItems: 1000 }),
});
export const IdParams = T.Object({ id: id() }, { additionalProperties: false });
const commonQuery = {
  q: T.Optional(T.String({ maxLength: 200 })),
  categoryId: T.Optional(id()),
  direction: T.Optional(T.Union([T.Literal("asc"), T.Literal("desc")])),
  page: T.Optional(T.Integer({ minimum: 1, maximum: 10000, default: 1 })),
  pageSize: T.Optional(T.Integer({ minimum: 1, maximum: 100, default: 24 })),
};
export const DictionaryEntry = obj("DictionaryEntry", {
  id: id(),
  name: T.String(),
  kind: T.String(),
  categoryId: nullable(id()),
  detail: nullable(T.String()),
  isVisible: T.Boolean(),
  workCount: T.Integer(),
  revision: T.Integer(),
});
export const DictionaryWrite = obj("DictionaryWrite", {
  kind: T.Union([T.Literal("tag"), T.Literal("studio")]),
  name: T.String({ minLength: 1, maxLength: 300 }),
  categoryId: T.Optional(nullable(id())),
  detail: T.Optional(nullable(T.String({ maxLength: 10000 }))),
  isVisible: T.Optional(T.Boolean()),
});
export const DictionaryEdit = obj("DictionaryEdit", {
  ...DictionaryWrite.properties,
  expectedRevision: T.Integer({ minimum: 1 }),
});
export const ArchiveEntry = obj("ArchiveEntry", {
  id: id(),
  name: T.String(),
  kind: T.String(),
  archivedAt: T.String(),
});
export const BrowseFacts = obj("BrowseFacts", {
  films: T.Integer(),
  actors: T.Integer(),
  series: T.Integer(),
  favorites: T.Integer(),
  watched: T.Integer(),
  years: T.Array(T.Integer()),
});
export const MediaListQuery = T.Object(
  {
    ...commonQuery,
    favorite: T.Optional(T.Boolean()),
    watched: T.Optional(T.Boolean()),
    year: T.Optional(T.Integer({ minimum: 1800, maximum: 2500 })),
    ratingMin: T.Optional(T.Integer({ minimum: 1, maximum: 5 })),
    unrated: T.Optional(T.Boolean()),
    resumable: T.Optional(T.Boolean()),
    episodesOnly: T.Optional(T.Boolean()),
    includeEpisodes: T.Optional(T.Boolean()),
    sort: T.Optional(
      T.Union([
        T.Literal("createdAt"),
        T.Literal("name"),
        T.Literal("year"),
        T.Literal("rating"),
        T.Literal("lastPlayed"),
      ]),
    ),
    actorId: T.Optional(id()),
    franchiseId: T.Optional(id()),
    collectionId: T.Optional(id()),
  },
  { additionalProperties: false },
);
export const ManagementMediaListQuery = T.Object(
  {
    ...MediaListQuery.properties,
    resolution: T.Optional(
      T.Union(
        [
          T.Literal("2160p"),
          T.Literal("1080p"),
          T.Literal("720p"),
          T.Literal("576p"),
          T.Literal("480p"),
          T.Literal("below360p"),
          T.Literal("unknown"),
        ],
        { description: "Resolution tier of the default edition." },
      ),
    ),
    chineseSubtitles: T.Optional(
      T.Union(
        [
          T.Literal("supported"),
          T.Literal("unsupported"),
          T.Literal("unknown"),
        ],
        {
          description:
            "Catalog's Chinese support flag, as recorded in the film's metadata.",
        },
      ),
    ),
  },
  { additionalProperties: false },
);
export type ManagementMediaQuery = Static<typeof ManagementMediaListQuery>;

export const RelatedListQuery = T.Object(
  {
    ...commonQuery,
    sort: T.Optional(
      T.Union([T.Literal("createdAt"), T.Literal("name"), T.Literal("count")]),
    ),
  },
  { additionalProperties: false },
);
export type Query = Omit<Static<typeof MediaListQuery>, "sort"> & {
  sort?: "createdAt" | "name" | "year" | "count" | "rating" | "lastPlayed";
};
const page = <S extends TSchema>(name: string, item: S) =>
  obj(name, {
    items: T.Array(T.Ref(item)),
    total: T.Integer(),
    page: T.Integer(),
    pageSize: T.Integer(),
  });
export const DictionaryChoice = obj("DictionaryChoice", {
  id: id(),
  name: T.String(),
  detail: nullable(T.String()),
});
export const DictionaryChoicePage = page(
  "DictionaryChoicePage",
  DictionaryChoice,
);
export const DictionaryChoiceQuery = T.Object(
  {
    ...commonQuery,
    kind: T.Union([T.Literal("tag"), T.Literal("studio")]),
    ids: T.Optional(T.String({ maxLength: 8000, pattern: "^[0-9a-fA-F,-]+$" })),
  },
  { additionalProperties: false },
);
export const PublishEdition = obj("PublishEdition", {
  ...EditionTarget.properties,
  expectedRevision: T.Integer({ minimum: 1 }),
});
export const MediaPage = page("MediaPage", Media),
  ManagementMediaPage = page("ManagementMediaPage", ManagementMedia),
  PersonPage = page("PersonPage", Person),
  FranchisePage = page("FranchisePage", Franchise);
const names = T.Array(T.String({ minLength: 1, maxLength: 300 }), {
  maxItems: 100,
  uniqueItems: true,
});
export const SourceNames = obj("SourceNames", {
  actors: names,
  directors: names,
  series: names,
  tags: T.Array(T.String({ minLength: 1, maxLength: 120 }), {
    maxItems: 100,
    uniqueItems: true,
  }),
  studios: names,
});
export const SourceCandidate = obj("SourceCandidate", {
  ...SourceNames.properties,
  previews: T.Optional(T.Array(T.String())),
  references: T.Optional(
    T.Array(
      T.Object({
        kind: T.Union([
          T.Literal("actors"),
          T.Literal("series"),
          T.Literal("tags"),
          T.Literal("directors"),
          T.Literal("studios"),
        ]),
        name: T.String(),
        url: T.String(),
      }),
    ),
  ),
  title: T.String(),
  identifier: T.String(),
  url: T.String(),
  releaseDate: nullable(T.String()),
  summary: nullable(T.String()),
  posterId: nullable(id()),
  supportsChinese: nullable(T.Boolean()),
});
export const LookupChoice = obj("LookupChoice", {
  title: T.String(),
  identifier: T.String(),
  url: T.String(),
});
export const SourceLookup = obj("SourceLookup", {
  id: id(),
  provider: T.String(),
  query: T.String(),
  state: T.Union([
    T.Literal("queued"),
    T.Literal("running"),
    T.Literal("failed"),
    T.Literal("choices"),
    T.Literal("succeeded"),
  ]),
  candidate: nullable(T.Ref(SourceCandidate)),
  choices: T.Array(T.Ref(LookupChoice)),
  message: nullable(T.String()),
  appliedFields: T.Array(T.String()),
});
export const SourceProvider = obj("SourceProvider", {
  code: T.String(),
  name: T.String(),
});
export const NewDraft = obj("NewDraft", {
  releaseDate: T.String({ format: "date" }),
  title: T.String({ minLength: 1, maxLength: 1000 }),
  identifier: T.Optional(T.String({ maxLength: 160 })),
});
export const RunLookup = obj("RunLookup", {
  provider: T.String({ minLength: 1, maxLength: 64 }),
  query: T.String({ minLength: 1, maxLength: 420 }),
  expectedRevision: T.Integer({ minimum: 1 }),
});
export const ApplyLookup = obj("ApplyLookup", {
  lookupId: id(),
  expectedRevision: T.Integer({ minimum: 1 }),
  fields: T.Array(
    T.Union([
      T.Literal("title"),
      T.Literal("identifier"),
      T.Literal("summary"),
      T.Literal("releaseDate"),
      T.Literal("posterId"),
      T.Literal("supportsChinese"),
      T.Literal("actors"),
      T.Literal("directors"),
      T.Literal("series"),
      T.Literal("tags"),
      T.Literal("studios"),
    ]),
    { minItems: 1, uniqueItems: true },
  ),
});
export const ImportFields = obj("ImportFields", {
  stillIds,
  sourceNames: T.Optional(T.Ref(SourceNames)),
  identifier: T.Optional(nullable(T.String({ maxLength: 160 }))),
  releaseDate: T.Optional(nullable(T.String({ format: "date" }))),
  directorIds: T.Optional(T.Array(id(), { uniqueItems: true, maxItems: 200 })),
  ...dictLinks,
  posterId: T.Optional(nullable(id())),
  backdropId: T.Optional(nullable(id())),
  title: T.String({ minLength: 1, maxLength: 1000 }),
  summary: nullable(T.String({ maxLength: 50000 })),
  notes: nullable(T.String({ maxLength: 10000 })),
  releaseYear: nullable(T.Integer({ minimum: 1800, maximum: 2500 })),
  categoryId: id(),
  supportsChinese: T.Union([T.Boolean(), T.Null()]),
  actorIds: T.Array(id(), { uniqueItems: true, maxItems: 200 }),
  franchiseIds: T.Array(id(), { uniqueItems: true, maxItems: 100 }),
});
export const RevisionInput = obj("RevisionInput", {
  expectedRevision: T.Integer({ minimum: 1 }),
});
export const ImportEdit = obj("ImportEdit", {
  ...RevisionInput.properties,
  fields: T.Ref(ImportFields),
});
export const ManualFile = obj("ManualFile", {
  expectedInbox: T.Optional(T.String({ maxLength: 2048 })),
  relativePath: T.String({ minLength: 1, maxLength: 2048 }),
});
export const BindFile = obj("BindFile", {
  ...ManualFile.properties,
  ...RevisionInput.properties,
});
export const ScanResult = obj("ScanResult", { id: id() });
export const GroupMember = obj("GroupMember", {
  id: id(),
  revision: T.Integer({ minimum: 1 }),
});
export const GroupInput = obj("GroupInput", {
  title: T.String({ minLength: 1, maxLength: 300 }),
  sourceId: T.Optional(id()),
  startNumber: T.Optional(T.Integer({ minimum: 1, maximum: 9000 })),
  members: T.Array(T.Ref(GroupMember), { minItems: 2, maxItems: 100 }),
});
export const GroupInfo = obj("GroupInfo", {
  sourceId: T.Optional(id()),
  id: id(),
  title: T.String(),
  position: T.Integer(),
});
export const DownloadDirectory = obj("DownloadDirectory", {
  dir: T.String({ minLength: 1, maxLength: 2048 }),
  expected: nullable(T.String({ maxLength: 2048 })),
});
export const DirectoryView = obj("DirectoryView", {
  volume: T.Optional(T.String()),
  inbox: nullable(T.String()),
  targets: T.Array(T.Object({ key: T.String(), label: T.String() })),
  entries: T.Array(
    T.Object({
      name: T.String(),
      folder: T.Boolean(),
      videoCount: T.Optional(T.Integer({ minimum: 0 })),
      draftId: T.Optional(id()),
    }),
  ),
  used: T.Integer(),
  totalVideoCount: T.Optional(T.Integer({ minimum: 0 })),
  pending: T.Optional(T.Integer()),
  availableBytes: T.Optional(T.String()),
  limit: T.Integer(),
});
export const BrowseDirectory = T.Object(
  {
    summaryOnly: T.Optional(T.Boolean()),
    area: T.Optional(
      T.Union([T.Literal("inbox"), T.Literal("volume"), T.Literal("target")]),
    ),
    target: T.Optional(T.String()),
    dir: T.Optional(T.String({ maxLength: 2048 })),
  },
  { additionalProperties: false },
);
export const TargetPlan = obj("TargetPlan", {
  members: T.Array(
    T.Object({ id: id(), revision: T.Integer({ minimum: 1 }) }),
    { minItems: 1, maxItems: 200 },
  ),
  target: T.String(),
  dir: T.String({ maxLength: 2048 }),
  newFolder: T.Optional(T.String({ minLength: 1, maxLength: 255 })),
});
export const PlanCount = obj("PlanCount", { count: T.Integer() });
export const MoveInfo = obj("MoveInfo", {
  target: T.String(),
  directory: T.String(),
  source: T.String(),
  state: T.String(),
  error: nullable(T.String()),
});
export const ImportRow = obj("ImportRow", {
  editionTarget: T.Optional(nullable(T.Ref(EditionTarget))),
  needsTarget: T.Optional(T.Boolean()),
  move: T.Optional(nullable(T.Ref(MoveInfo))),
  lookup: T.Optional(nullable(T.Ref(SourceLookup))),
  directors: T.Optional(T.Array(T.String())),
  group: T.Optional(nullable(T.Ref(GroupInfo))),
  id: id(),
  revision: T.Integer(),
  fields: T.Ref(ImportFields),
  relativePath: T.String(),
  sizeBytes: T.String(),
  durationMs: nullable(T.Integer({ format: "int64" })),
  format: nullable(T.String()),
  probeStatus: T.String(),
  availability: T.String(),
  reviewed: T.Boolean(),
  publishedMediaId: nullable(id()),
  categoryName: T.String(),
  actors: T.Array(T.String()),
  series: T.Array(T.String()),
  videoCodec: nullable(T.String()),
});
export const ImportQueue = obj("ImportQueue", {
  rootPath: T.Optional(T.String()),
  items: T.Array(T.Ref(ImportRow)),
  total: T.Integer(),
  page: T.Integer(),
  pageSize: T.Integer(),
  scanning: T.Boolean(),
  lookingUp: T.Boolean(),
  rootStatus: T.String(),
});
export const ImportQuery = T.Object(
  {
    groupId: T.Optional(id()),
    stage: T.Optional(
      T.Union([
        T.Literal("pending"),
        T.Literal("reviewed"),
        T.Literal("published"),
      ]),
    ),
    q: commonQuery.q,
    page: commonQuery.page,
    pageSize: commonQuery.pageSize,
    status: T.Optional(
      T.Union([
        T.Literal("episode"),
        T.Literal("all"),
        T.Literal("pending"),
        T.Literal("missing"),
        T.Literal("blocked"),
        T.Literal("failed"),
        T.Literal("unbound"),
        T.Literal("lookupFailed"),
        T.Literal("retrieved"),
        T.Literal("reviewed"),
        T.Literal("published"),
      ]),
    ),
  },
  { additionalProperties: false },
);
export const PlaybackRequest = obj("PlaybackRequest", {
  editionId: T.Optional(id()),
  mediaId: id(),
  intent: T.Union([
    T.Literal("play"),
    T.Literal("resume"),
    T.Literal("restart"),
  ]),
});
export const PlaybackOpen = obj("PlaybackOpen", {
  ...PlaybackRequest.properties,
  requestId: id(),
});
export const PlaybackPlan = obj("PlaybackPlan", {
  mediaId: id(),
  editionId: id(),
  partId: id(),
  positionMs: T.Integer({ format: "int64" }),
  durationMs: T.Integer({ format: "int64" }),
  mode: T.String(),
  completed: T.Boolean(),
  mime: T.String(),
  videoCodec: nullable(T.String()),
  audioCodec: nullable(T.String()),
});
export const PlaybackSession = obj("PlaybackSession", {
  ...PlaybackPlan.properties,
  sessionId: id(),
  streamUrl: T.String(),
});
export const PlaybackEvent = obj("PlaybackEvent", {
  eventId: id(),
  seq: T.Integer({ minimum: 1, maximum: 2147483647 }),
  partId: id(),
  positionMs: T.Integer({
    format: "int64",
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  }),
  kind: T.Union([
    T.Literal("start"),
    T.Literal("progress"),
    T.Literal("seek"),
    T.Literal("pause"),
    T.Literal("ended"),
  ]),
});
export const PlaybackAck = obj("PlaybackAck", { status: T.String() });
export const schemas = [
  GroupMember,
  GroupInput,
  GroupInfo,
  EditionInfo,
  EditionTarget,
  DictionaryChoice,
  DictionaryChoicePage,
  PublishEdition,
  DictionaryEntry,
  DictionaryWrite,
  DictionaryEdit,
  ArchiveEntry,
  BrowseFacts,
  PlaybackRequest,
  PlaybackOpen,
  PlaybackPlan,
  PlaybackSession,
  PlaybackEvent,
  PlaybackAck,
  SourceNames,
  SourceCandidate,
  LookupChoice,
  SourceLookup,
  SourceProvider,
  NewDraft,
  RunLookup,
  ApplyLookup,
  BindFile,
  ImportFields,
  RevisionInput,
  ImportEdit,
  ManualFile,
  ScanResult,
  MoveInfo,
  DirectoryView,
  DownloadDirectory,
  TargetPlan,
  PlanCount,
  ImportRow,
  ImportQueue,
  ErrorResponse,
  Health,
  RuntimeStatus,
  Profile,
  Login,
  LoginResult,
  Category,
  CategoryVisibility,
  CategoryCreate,
  Person,
  PersonCreate,
  PersonPatch,
  Franchise,
  FranchiseCreate,
  FranchisePatch,
  Media,
  MediaDetail,
  MediaPatch,
  MediaStatePatch,
  Collection,
  CollectionPatch,
  CollectionCreate,
  CollectionItems,
  MediaPage,
  ManagementMedia,
  ManagementMediaPage,
  PersonPage,
  FranchisePage,
  PersonProfile,
  FranchiseProfile,
];
export type MediaDto = Static<typeof Media>;
export type MediaDetailDto = Static<typeof MediaDetail>;
export type PersonDto = Static<typeof Person>;
export type FranchiseDto = Static<typeof Franchise>;
export type CollectionDto = Static<typeof Collection>;
export type ProfileDto = Static<typeof Profile>;
export { T };
