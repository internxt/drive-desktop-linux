# 2. Lazy sync and drive early mount

Date: 2026-10-27

## Status

Accepted

## Context

The virtual drive used to mount only after the remote sync engine reported its first successful full sync (`INITIAL_SYNC_READY`). Until then, FUSE was not available, so file managers could not show the Internxt folder even though the local database was already open.

That coupling had two costs:

1. **Time to first mount** — Large accounts must pull a lot of folder and file metadata before the drive appears. Users perceive the app as slow or stuck during login.
2. **Work done up front** — The sync engine indexed the entire remote tree into SQLite even when the user only needed a small subtree.

At the same time, mounting before sync finishes means the local metadata store is incomplete. FUSE operations that list or resolve paths must be able to fetch directory contents from the API on demand without fighting the background sync engine, which continues to apply batched updates to the same SQLite tables.

## Decision

We split startup into **early mount** (when the drive becomes visible) and **lazy metadata sync** (how directory contents stay correct). Background sync remains responsible for incremental updates but must respect fresh lazy snapshots.

### Drive early mount

- **Trigger** — `startVirtualDrive` runs on `APP_DATA_SOURCE_INITIALIZED`, in parallel with `remoteSyncManager.startRemoteSync` (see `registerVirtualDriveHandlers` and `registerRemoteSyncHandlers`). It no longer waits for `INITIAL_SYNC_READY`.
- **Minimum local tree** — On each mount, `seedVirtualDriveRootFolders` inserts only `/`, `/.Trash`, and `/.Trash-$uid` into the in-memory folder repository so FUSE can expose a valid root immediately.
- **Lifecycle** — `DirectoryStateRepository.clear()` runs at mount time so directory freshness does not leak across sessions. Hydration cache and block storage are cleared as before.
- **UI signal** — `INITIAL_SYNC_READY` is still emitted when the first background sync reaches `SYNCED`; it informs the UI but does not gate mounting.

### Lazy virtual-drive metadata sync

Directory children are loaded **on demand** when FUSE needs them:

| FUSE path | Lazy entry point |
|-----------|------------------|
| `opendir` | `readDirectory` → refresh parent folder children if stale |
| `open` / `getattr` on a path | `ensurePathMetadataSynchronized` → refresh the parent directory if stale |

Core behavior:

1. **Freshness** — `drive_directory_state` (via `DirectoryStateRepository`) records when a folder’s `EXISTS` children were last loaded. Entries younger than `DIRECTORY_STATE_TTL_MS` (30s) are treated as fresh; no API call is made.
2. **Fetch** — Stale folders call `fetchFolder` and persist children through `synchronizeDirectoryMetadata`, which updates SQLite in batch, removes stale local children, updates repositories, and marks the directory loaded.
3. **Concurrency** — `synchronizeChildrenIfStale` deduplicates in-flight refreshes per folder. Virtual trash paths skip server sync (local-only folders).
4. **Errors** — Failures record `fetch_state` and an error cooldown (`DIRECTORY_STATE_ERROR_COOLDOWN_MS`). When a refresh failed before mutating local data, `readDirectory` may still serve previously cached children (`canUseCachedChildren`).

### Background sync compatibility

Lazy refresh and remote sync both write folder/file metadata in SQLite. To avoid races:

- **`runWithDirectoryMetadataWriteLock`** — Serializes lazy directory writes and sync batch persistence so a stale sync batch cannot overwrite a fresher lazy snapshot.
- **`filterStaleRemoteFiles` / `filterStaleRemoteFolders`** — During batch persist, skip remote rows whose `updatedAt` is not newer than the parent directory’s fresh lazy load timestamp. Genuinely newer rows are kept and the parent directory state is **invalidated** so the next FUSE access re-fetches from the API.

## Consequences

### Easier

- The virtual drive mount point appears shortly after login, without waiting for a full remote index.
- Memory and SQLite work scale with **accessed** directories, not the entire account tree.
- Background sync can continue incrementally while the user browses the mount.

### Harder

- FUSE handlers may block on network I/O when opening stale directories; latency depends on API response time and refresh size.
- Two writers (lazy refresh + sync batches) require the write lock and stale-item filtering; new features that mutate directory metadata must use the same coordination.
- Partial or failed lazy loads need careful error semantics (cooldown, cached fallback, `ENOENT` for missing folders).

### Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Stale sync overwriting fresh lazy data | Write lock + filter by `updatedAt` vs `children_loaded_at` + invalidate on newer remote rows |
| Duplicate concurrent refreshes | Per-folder in-flight map in `synchronizeChildrenIfStale` |
| Empty or misleading listings right after mount | Root is seeded; subfolders populate on first `opendir`/`open`/`getattr` |
| Trash folders sent to the API | `isVirtualTrashPath` / `isVirtualTrashFolder` exclusions |

### References in code

- Early mount: `virtual-drive.service.ts`, `seed-virtual-drive-root-folders.ts`, `ipc/handlers.ts`
- Lazy sync: `services/lazy/metadata-synchronizer/`, `synchronize-directory-metadata.ts`, `directory-state-sqlite-repository.ts`
- Sync coordination: `filter-stale-remote-items.ts`, `persist-*-sync-batch.ts`, `run-with-directory-metadata-write-lock.ts`
- Regression tests: `early-mount-wiring.test.ts`, `lazy-virtual-drive-metadata-synchronizer.test.ts`, `remote-sync-race-conditions.test.ts`, `directory-metadata-write-coordination.test.ts`
