type StorageBucketClient = {
  list: (
    path: string,
    options: { limit: number; offset: number; sortBy: { column: string; order: string } },
  ) => Promise<{
    data: Array<{
      id?: string | null;
      name: string;
      metadata?: Record<string, unknown> | null;
    }> | null;
    error: unknown;
  }>;
  remove: (paths: string[]) => Promise<{ error: unknown }>;
};

const pageSize = 100;

export async function listFilesRecursively(
  bucket: StorageBucketClient,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error('STORAGE_LIST_FAILED');

    const entries = data ?? [];
    for (const entry of entries) {
      const childPath = `${prefix}/${entry.name}`;
      if (entry.id && entry.metadata) files.push(childPath);
      else files.push(...(await listFilesRecursively(bucket, childPath)));
    }

    if (entries.length < pageSize) break;
    offset += pageSize;
  }

  return files;
}

export async function removeFilesInBatches(
  bucket: StorageBucketClient,
  paths: string[],
): Promise<void> {
  for (let index = 0; index < paths.length; index += pageSize) {
    const { error } = await bucket.remove(paths.slice(index, index + pageSize));
    if (error) throw new Error('STORAGE_DELETE_FAILED');
  }
}
