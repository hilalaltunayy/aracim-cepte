# Document archive UX

TASK-037 keeps the existing document status helper as the single source of truth:
`active`, `expiring_soon`, `expired` and `no_expiry`.

The document list defaults to **Aktif**. A compact segmented filter exposes **Aktif**, **Yaklaşan**
and **Arşiv** with counts derived from the loaded vehicle's documents. Active includes both active
and no-expiry records; no-expiry documents are neutral and are never treated as expired. Archive is
a view of expired documents, not a database state or move operation.

Expired documents remain readable and editable/deletable through the existing detail flow. They are
never auto-deleted. The existing Yeni belge action remains above the filters, so creation does not
depend on the selected view. Empty states explain each view without adding a new illustration or
visual system.

No schema or remote Supabase change is required. The implementation is local UI/domain filtering on
the already vehicle-scoped `documents` collection; existing attachment and ownership behavior is
unchanged.
