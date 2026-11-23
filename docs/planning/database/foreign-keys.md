# 全量外键清单 · v0.5

[模型入口](README.md) · [分域关系图](relationships.md) · [字段阅读指南](field-guide.md)

以下为候选 schema 实际执行后的 127 条外键，不包含仅由事务用例保证的规则。后置表也在本候选清单内，不代表首版全部启用。复合外键是一条完整约束，不可拆开解释。

| 引用表 | 被引用表 | 外键定义 |
| --- | --- | --- |
| [audit_log](tables-operations.md#audit_log) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (actor_account_id) REFERENCES video_x.accounts(id)` |
| [auth_sessions](tables-personal.md#auth_sessions) | [devices](tables-personal.md#devices) | `FOREIGN KEY (device_id) REFERENCES video_x.devices(id)` |
| [categories](tables-catalog.md#categories) | [categories](tables-catalog.md#categories) | `FOREIGN KEY (parent_id) REFERENCES video_x.categories(id)` |
| [collection_items](tables-personal.md#collection_items) | [collections](tables-personal.md#collections) | `FOREIGN KEY (collection_id) REFERENCES video_x.collections(id)` |
| [collection_items](tables-personal.md#collection_items) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [collections](tables-personal.md#collections) | [assets](tables-catalog.md#assets) | `FOREIGN KEY (cover_asset_id) REFERENCES video_x.assets(id)` |
| [collections](tables-personal.md#collections) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (cover_media_id) REFERENCES video_x.media_items(id)` |
| [collections](tables-personal.md#collections) | [profiles](tables-personal.md#profiles) | `FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id)` |
| [credits](tables-catalog.md#credits) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [credits](tables-catalog.md#credits) | [people](tables-catalog.md#people) | `FOREIGN KEY (person_id) REFERENCES video_x.people(id)` |
| [devices](tables-personal.md#devices) | [profiles](tables-personal.md#profiles) | `FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id)` |
| [edition_parts](tables-library.md#edition_parts) | [editions](tables-library.md#editions) | `FOREIGN KEY (edition_id) REFERENCES video_x.editions(id)` |
| [edition_parts](tables-library.md#edition_parts) | [media_files](tables-library.md#media_files) | `FOREIGN KEY (file_id) REFERENCES video_x.media_files(id)` |
| [edition_subtitles](tables-library.md#edition_subtitles) | [editions](tables-library.md#editions) | `FOREIGN KEY (edition_id) REFERENCES video_x.editions(id)` |
| [edition_subtitles](tables-library.md#edition_subtitles) | [media_files](tables-library.md#media_files) | `FOREIGN KEY (file_id) REFERENCES video_x.media_files(id)` |
| [editions](tables-library.md#editions) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id, media_kind) REFERENCES video_x.media_items(id, kind)` |
| [franchise_field_state](tables-metadata.md#franchise_field_state) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (edited_by) REFERENCES video_x.accounts(id)` |
| [franchise_field_state](tables-metadata.md#franchise_field_state) | [franchises](tables-catalog.md#franchises) | `FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id)` |
| [franchise_field_state](tables-metadata.md#franchise_field_state) | [metadata_snapshots](tables-metadata.md#metadata_snapshots) | `FOREIGN KEY (accepted_snapshot_id) REFERENCES video_x.metadata_snapshots(id)` |
| [franchise_items](tables-catalog.md#franchise_items) | [franchises](tables-catalog.md#franchises) | `FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id)` |
| [franchise_items](tables-catalog.md#franchise_items) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [franchises](tables-catalog.md#franchises) | [assets](tables-catalog.md#assets) | `FOREIGN KEY (cover_asset_id) REFERENCES video_x.assets(id)` |
| [franchises](tables-catalog.md#franchises) | [categories](tables-catalog.md#categories) | `FOREIGN KEY (primary_category_id) REFERENCES video_x.categories(id)` |
| [franchises](tables-catalog.md#franchises) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (cover_media_id) REFERENCES video_x.media_items(id)` |
| [idempotency_keys](tables-operations.md#idempotency_keys) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (account_id) REFERENCES video_x.accounts(id)` |
| [import_batches](tables-operations.md#import_batches) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (created_by) REFERENCES video_x.accounts(id)` |
| [import_batches](tables-operations.md#import_batches) | [libraries](tables-library.md#libraries) | `FOREIGN KEY (library_id) REFERENCES video_x.libraries(id)` |
| [import_batches](tables-operations.md#import_batches) | [storage_roots](tables-library.md#storage_roots) | `FOREIGN KEY (root_id) REFERENCES video_x.storage_roots(id)` |
| [import_candidates](tables-operations.md#import_candidates) | [import_items](tables-operations.md#import_items) | `FOREIGN KEY (item_id) REFERENCES video_x.import_items(id)` |
| [import_candidates](tables-operations.md#import_candidates) | [metadata_snapshots](tables-metadata.md#metadata_snapshots) | `FOREIGN KEY (snapshot_id, source_record_id) REFERENCES video_x.metadata_snapshots(id, source_record_id)` |
| [import_candidates](tables-operations.md#import_candidates) | [source_records](tables-metadata.md#source_records) | `FOREIGN KEY (source_record_id) REFERENCES video_x.source_records(id)` |
| [import_item_files](tables-operations.md#import_item_files) | [import_items](tables-operations.md#import_items) | `FOREIGN KEY (item_id) REFERENCES video_x.import_items(id)` |
| [import_item_files](tables-operations.md#import_item_files) | [media_files](tables-library.md#media_files) | `FOREIGN KEY (file_id) REFERENCES video_x.media_files(id)` |
| [import_items](tables-operations.md#import_items) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (reviewed_by) REFERENCES video_x.accounts(id)` |
| [import_items](tables-operations.md#import_items) | [editions](tables-library.md#editions) | `FOREIGN KEY (published_edition_id, published_media_id) REFERENCES video_x.editions(id, media_id)` |
| [import_items](tables-operations.md#import_items) | [import_batches](tables-operations.md#import_batches) | `FOREIGN KEY (batch_id) REFERENCES video_x.import_batches(id)` |
| [import_items](tables-operations.md#import_items) | [import_candidates](tables-operations.md#import_candidates) | `FOREIGN KEY (selected_candidate_id, id) REFERENCES video_x.import_candidates(id, item_id) DEFERRABLE` |
| [import_items](tables-operations.md#import_items) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (published_media_id) REFERENCES video_x.media_items(id)` |
| [legacy_mappings](tables-operations.md#legacy_mappings) | [categories](tables-catalog.md#categories) | `FOREIGN KEY (category_id) REFERENCES video_x.categories(id)` |
| [legacy_mappings](tables-operations.md#legacy_mappings) | [collections](tables-personal.md#collections) | `FOREIGN KEY (collection_id) REFERENCES video_x.collections(id)` |
| [legacy_mappings](tables-operations.md#legacy_mappings) | [editions](tables-library.md#editions) | `FOREIGN KEY (edition_id) REFERENCES video_x.editions(id)` |
| [legacy_mappings](tables-operations.md#legacy_mappings) | [franchises](tables-catalog.md#franchises) | `FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id)` |
| [legacy_mappings](tables-operations.md#legacy_mappings) | [media_files](tables-library.md#media_files) | `FOREIGN KEY (file_id) REFERENCES video_x.media_files(id)` |
| [legacy_mappings](tables-operations.md#legacy_mappings) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [legacy_mappings](tables-operations.md#legacy_mappings) | [people](tables-catalog.md#people) | `FOREIGN KEY (person_id) REFERENCES video_x.people(id)` |
| [legacy_mappings](tables-operations.md#legacy_mappings) | [tags](tables-catalog.md#tags) | `FOREIGN KEY (tag_id) REFERENCES video_x.tags(id)` |
| [media_field_state](tables-metadata.md#media_field_state) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (edited_by) REFERENCES video_x.accounts(id)` |
| [media_field_state](tables-metadata.md#media_field_state) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [media_field_state](tables-metadata.md#media_field_state) | [metadata_snapshots](tables-metadata.md#metadata_snapshots) | `FOREIGN KEY (accepted_snapshot_id) REFERENCES video_x.metadata_snapshots(id)` |
| [media_files](tables-library.md#media_files) | [storage_roots](tables-library.md#storage_roots) | `FOREIGN KEY (root_id) REFERENCES video_x.storage_roots(id)` |
| [media_genres](tables-catalog.md#media_genres) | [genres](tables-catalog.md#genres) | `FOREIGN KEY (genre_id) REFERENCES video_x.genres(id)` |
| [media_genres](tables-catalog.md#media_genres) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [media_identifiers](tables-catalog.md#media_identifiers) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [media_images](tables-catalog.md#media_images) | [assets](tables-catalog.md#assets) | `FOREIGN KEY (asset_id) REFERENCES video_x.assets(id)` |
| [media_images](tables-catalog.md#media_images) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [media_items](tables-catalog.md#media_items) | [categories](tables-catalog.md#categories) | `FOREIGN KEY (primary_category_id) REFERENCES video_x.categories(id)` |
| [media_items](tables-catalog.md#media_items) | [libraries](tables-library.md#libraries) | `FOREIGN KEY (library_id) REFERENCES video_x.libraries(id)` |
| [media_items](tables-catalog.md#media_items) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (parent_id, parent_kind, library_id) REFERENCES video_x.media_items(id, kind, library_id) DEFERRABLE` |
| [media_organizations](tables-catalog.md#media_organizations) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [media_organizations](tables-catalog.md#media_organizations) | [organizations](tables-catalog.md#organizations) | `FOREIGN KEY (organization_id) REFERENCES video_x.organizations(id)` |
| [media_streams](tables-library.md#media_streams) | [media_files](tables-library.md#media_files) | `FOREIGN KEY (file_id) REFERENCES video_x.media_files(id) ON DELETE CASCADE` |
| [media_tags](tables-catalog.md#media_tags) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [media_tags](tables-catalog.md#media_tags) | [tags](tables-catalog.md#tags) | `FOREIGN KEY (tag_id) REFERENCES video_x.tags(id)` |
| [metadata_change_sets](tables-metadata.md#metadata_change_sets) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (decided_by) REFERENCES video_x.accounts(id)` |
| [metadata_change_sets](tables-metadata.md#metadata_change_sets) | [franchises](tables-catalog.md#franchises) | `FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id)` |
| [metadata_change_sets](tables-metadata.md#metadata_change_sets) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [metadata_change_sets](tables-metadata.md#metadata_change_sets) | [metadata_snapshots](tables-metadata.md#metadata_snapshots) | `FOREIGN KEY (snapshot_id) REFERENCES video_x.metadata_snapshots(id)` |
| [metadata_change_sets](tables-metadata.md#metadata_change_sets) | [people](tables-catalog.md#people) | `FOREIGN KEY (person_id) REFERENCES video_x.people(id)` |
| [metadata_ratings](tables-metadata.md#metadata_ratings) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [metadata_ratings](tables-metadata.md#metadata_ratings) | [metadata_snapshots](tables-metadata.md#metadata_snapshots) | `FOREIGN KEY (snapshot_id, source_record_id) REFERENCES video_x.metadata_snapshots(id, source_record_id)` |
| [metadata_ratings](tables-metadata.md#metadata_ratings) | [provider_media](tables-metadata.md#provider_media) | `FOREIGN KEY (source_record_id, media_id) REFERENCES video_x.provider_media(source_record_id, media_id)` |
| [metadata_ratings](tables-metadata.md#metadata_ratings) | [source_records](tables-metadata.md#source_records) | `FOREIGN KEY (source_record_id) REFERENCES video_x.source_records(id)` |
| [metadata_snapshots](tables-metadata.md#metadata_snapshots) | [source_records](tables-metadata.md#source_records) | `FOREIGN KEY (source_record_id) REFERENCES video_x.source_records(id)` |
| [people](tables-catalog.md#people) | [assets](tables-catalog.md#assets) | `FOREIGN KEY (portrait_asset_id) REFERENCES video_x.assets(id)` |
| [people](tables-catalog.md#people) | [categories](tables-catalog.md#categories) | `FOREIGN KEY (primary_category_id) REFERENCES video_x.categories(id)` |
| [people](tables-catalog.md#people) | [people](tables-catalog.md#people) | `FOREIGN KEY (merged_into_id) REFERENCES video_x.people(id)` |
| [person_field_state](tables-metadata.md#person_field_state) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (edited_by) REFERENCES video_x.accounts(id)` |
| [person_field_state](tables-metadata.md#person_field_state) | [metadata_snapshots](tables-metadata.md#metadata_snapshots) | `FOREIGN KEY (accepted_snapshot_id) REFERENCES video_x.metadata_snapshots(id)` |
| [person_field_state](tables-metadata.md#person_field_state) | [people](tables-catalog.md#people) | `FOREIGN KEY (person_id) REFERENCES video_x.people(id)` |
| [playback_events](tables-personal.md#playback_events) | [edition_parts](tables-library.md#edition_parts) | `FOREIGN KEY (part_id, edition_id) REFERENCES video_x.edition_parts(id, edition_id)` |
| [playback_events](tables-personal.md#playback_events) | [playback_sessions](tables-personal.md#playback_sessions) | `FOREIGN KEY (session_id, edition_id) REFERENCES video_x.playback_sessions(id, edition_id)` |
| [playback_progress](tables-personal.md#playback_progress) | [edition_parts](tables-library.md#edition_parts) | `FOREIGN KEY (part_id, edition_id) REFERENCES video_x.edition_parts(id, edition_id)` |
| [playback_progress](tables-personal.md#playback_progress) | [editions](tables-library.md#editions) | `FOREIGN KEY (edition_id) REFERENCES video_x.editions(id)` |
| [playback_progress](tables-personal.md#playback_progress) | [playback_events](tables-personal.md#playback_events) | `FOREIGN KEY (session_id, last_seq) REFERENCES video_x.playback_events(session_id, seq)` |
| [playback_progress](tables-personal.md#playback_progress) | [playback_sessions](tables-personal.md#playback_sessions) | `FOREIGN KEY (session_id, profile_id, edition_id) REFERENCES video_x.playback_sessions(id, profile_id, edition_id)` |
| [playback_progress](tables-personal.md#playback_progress) | [profiles](tables-personal.md#profiles) | `FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id)` |
| [playback_sessions](tables-personal.md#playback_sessions) | [devices](tables-personal.md#devices) | `FOREIGN KEY (device_id, profile_id) REFERENCES video_x.devices(id, profile_id)` |
| [playback_sessions](tables-personal.md#playback_sessions) | [edition_parts](tables-library.md#edition_parts) | `FOREIGN KEY (start_part_id, edition_id) REFERENCES video_x.edition_parts(id, edition_id)` |
| [playback_sessions](tables-personal.md#playback_sessions) | [editions](tables-library.md#editions) | `FOREIGN KEY (edition_id, media_id) REFERENCES video_x.editions(id, media_id)` |
| [playback_sessions](tables-personal.md#playback_sessions) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [playback_sessions](tables-personal.md#playback_sessions) | [profiles](tables-personal.md#profiles) | `FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id)` |
| [profiles](tables-personal.md#profiles) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (account_id) REFERENCES video_x.accounts(id)` |
| [provider_configs](tables-metadata.md#provider_configs) | [providers](tables-metadata.md#providers) | `FOREIGN KEY (provider_id) REFERENCES video_x.providers(id)` |
| [provider_franchises](tables-metadata.md#provider_franchises) | [franchises](tables-catalog.md#franchises) | `FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id)` |
| [provider_franchises](tables-metadata.md#provider_franchises) | [source_records](tables-metadata.md#source_records) | `FOREIGN KEY (source_record_id, entity_kind) REFERENCES video_x.source_records(id, entity_kind)` |
| [provider_media](tables-metadata.md#provider_media) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [provider_media](tables-metadata.md#provider_media) | [source_records](tables-metadata.md#source_records) | `FOREIGN KEY (source_record_id, entity_kind) REFERENCES video_x.source_records(id, entity_kind)` |
| [provider_people](tables-metadata.md#provider_people) | [people](tables-catalog.md#people) | `FOREIGN KEY (person_id) REFERENCES video_x.people(id)` |
| [provider_people](tables-metadata.md#provider_people) | [source_records](tables-metadata.md#source_records) | `FOREIGN KEY (source_record_id, entity_kind) REFERENCES video_x.source_records(id, entity_kind)` |
| [relationship_sources](tables-metadata.md#relationship_sources) | [credits](tables-catalog.md#credits) | `FOREIGN KEY (credit_id) REFERENCES video_x.credits(id) ON DELETE CASCADE` |
| [relationship_sources](tables-metadata.md#relationship_sources) | [franchise_items](tables-catalog.md#franchise_items) | `FOREIGN KEY (franchise_item_id) REFERENCES video_x.franchise_items(id) ON DELETE CASCADE` |
| [relationship_sources](tables-metadata.md#relationship_sources) | [media_genres](tables-catalog.md#media_genres) | `FOREIGN KEY (genre_link_id) REFERENCES video_x.media_genres(id) ON DELETE CASCADE` |
| [relationship_sources](tables-metadata.md#relationship_sources) | [media_images](tables-catalog.md#media_images) | `FOREIGN KEY (image_link_id) REFERENCES video_x.media_images(id) ON DELETE CASCADE` |
| [relationship_sources](tables-metadata.md#relationship_sources) | [media_organizations](tables-catalog.md#media_organizations) | `FOREIGN KEY (organization_link_id) REFERENCES video_x.media_organizations(id) ON DELETE CASCADE` |
| [relationship_sources](tables-metadata.md#relationship_sources) | [media_tags](tables-catalog.md#media_tags) | `FOREIGN KEY (tag_link_id) REFERENCES video_x.media_tags(id) ON DELETE CASCADE` |
| [relationship_sources](tables-metadata.md#relationship_sources) | [metadata_snapshots](tables-metadata.md#metadata_snapshots) | `FOREIGN KEY (snapshot_id, source_record_id) REFERENCES video_x.metadata_snapshots(id, source_record_id)` |
| [relationship_sources](tables-metadata.md#relationship_sources) | [source_records](tables-metadata.md#source_records) | `FOREIGN KEY (source_record_id) REFERENCES video_x.source_records(id)` |
| [source_records](tables-metadata.md#source_records) | [media_files](tables-library.md#media_files) | `FOREIGN KEY (local_file_id) REFERENCES video_x.media_files(id)` |
| [source_records](tables-metadata.md#source_records) | [providers](tables-metadata.md#providers) | `FOREIGN KEY (provider_id) REFERENCES video_x.providers(id)` |
| [source_value_mappings](tables-metadata.md#source_value_mappings) | [genres](tables-catalog.md#genres) | `FOREIGN KEY (genre_id) REFERENCES video_x.genres(id)` |
| [source_value_mappings](tables-metadata.md#source_value_mappings) | [providers](tables-metadata.md#providers) | `FOREIGN KEY (provider_id) REFERENCES video_x.providers(id)` |
| [source_value_mappings](tables-metadata.md#source_value_mappings) | [tags](tables-catalog.md#tags) | `FOREIGN KEY (tag_id) REFERENCES video_x.tags(id)` |
| [storage_roots](tables-library.md#storage_roots) | [libraries](tables-library.md#libraries) | `FOREIGN KEY (library_id) REFERENCES video_x.libraries(id)` |
| [tags](tables-catalog.md#tags) | [categories](tables-catalog.md#categories) | `FOREIGN KEY (primary_category_id) REFERENCES video_x.categories(id)` |
| [task_items](tables-operations.md#task_items) | [import_items](tables-operations.md#import_items) | `FOREIGN KEY (import_item_id) REFERENCES video_x.import_items(id)` |
| [task_items](tables-operations.md#task_items) | [media_files](tables-library.md#media_files) | `FOREIGN KEY (file_id) REFERENCES video_x.media_files(id)` |
| [task_items](tables-operations.md#task_items) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [task_items](tables-operations.md#task_items) | [people](tables-catalog.md#people) | `FOREIGN KEY (person_id) REFERENCES video_x.people(id)` |
| [task_items](tables-operations.md#task_items) | [storage_roots](tables-library.md#storage_roots) | `FOREIGN KEY (root_id) REFERENCES video_x.storage_roots(id)` |
| [task_items](tables-operations.md#task_items) | [tasks](tables-operations.md#tasks) | `FOREIGN KEY (task_id) REFERENCES video_x.tasks(id)` |
| [tasks](tables-operations.md#tasks) | [accounts](tables-personal.md#accounts) | `FOREIGN KEY (requested_by) REFERENCES video_x.accounts(id)` |
| [tasks](tables-operations.md#tasks) | [import_batches](tables-operations.md#import_batches) | `FOREIGN KEY (batch_id) REFERENCES video_x.import_batches(id)` |
| [user_media_state](tables-personal.md#user_media_state) | [editions](tables-library.md#editions) | `FOREIGN KEY (resume_edition_id, media_id) REFERENCES video_x.editions(id, media_id) DEFERRABLE` |
| [user_media_state](tables-personal.md#user_media_state) | [media_items](tables-catalog.md#media_items) | `FOREIGN KEY (media_id) REFERENCES video_x.media_items(id)` |
| [user_media_state](tables-personal.md#user_media_state) | [profiles](tables-personal.md#profiles) | `FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id)` |
| [user_person_state](tables-personal.md#user_person_state) | [people](tables-catalog.md#people) | `FOREIGN KEY (person_id) REFERENCES video_x.people(id)` |
| [user_person_state](tables-personal.md#user_person_state) | [profiles](tables-personal.md#profiles) | `FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id)` |
