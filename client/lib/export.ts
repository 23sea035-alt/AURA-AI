// Data export, client half (E-2): write the GDPR bundle to a JSON file and hand it to the iOS
// share sheet. JSON via share sheet is the decided shape — GDPR Art. 20 wants machine-readable,
// and the share sheet beats an emailed link (weaker channel) while covering the same destinations
// (Files, AirDrop, Mail) in one system surface.
import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

import type { DataExportBundle } from '@/lib/models';

/** Date-stamped (aura-export-2026-07-10.json) so repeat exports read distinctly in Files. */
export function exportFileName(now = new Date()): string {
  return `aura-export-${now.toISOString().slice(0, 10)}.json`;
}

/** Pretty-printed — "machine-readable" shouldn't mean human-hostile. */
export function serializeExport(bundle: DataExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Write the bundle to the cache directory and present the share sheet. The file is deleted after
 * the sheet completes (shared or dismissed) — this is the most sensitive payload the app handles,
 * so it never lingers on disk beyond the share itself.
 */
export async function shareDataExport(bundle: DataExportBundle): Promise<void> {
  const file = new File(Paths.cache, exportFileName());
  file.write(serializeExport(bundle));
  try {
    await Share.share({ url: file.uri });
  } finally {
    try {
      file.delete();
    } catch {
      // cache eviction may have beaten us to it — nothing to clean up
    }
  }
}
