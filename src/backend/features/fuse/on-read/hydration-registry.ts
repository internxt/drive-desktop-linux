import { type createDownloadToDisk } from './create-download-to-disk';
export type HydrationEntry = {
  writer: ReturnType<typeof createDownloadToDisk>;
};

const registry = new Map<string, HydrationEntry>();

export function getHydration(contentsId: string): HydrationEntry | undefined {
  return registry.get(contentsId);
}

export function setHydration(contentsId: string, entry: HydrationEntry): void {
  registry.set(contentsId, entry);
}

export function deleteHydration(contentsId: string): void {
  registry.delete(contentsId);
}

export async function destroyAllHydrations(): Promise<void> {
  const destructions = Array.from(registry.values()).map((entry) => entry.writer.destroy());
  registry.clear();
  await Promise.all(destructions);
}
