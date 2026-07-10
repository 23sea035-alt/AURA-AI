// E-2 client half: the GDPR bundle becomes a date-stamped JSON file handed to the iOS share
// sheet — and the file must never outlive the share (deleted on completion AND on failure).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factories are hoisted above normal declarations — the mocks must hoist with them.
const { writeMock, deleteMock, shareMock } = vi.hoisted(() => ({
  writeMock: vi.fn(),
  deleteMock: vi.fn(),
  shareMock: vi.fn(async () => ({ action: 'sharedAction' })),
}));

vi.mock('expo-file-system', () => {
  class File {
    uri: string;
    write = writeMock;
    delete = deleteMock;
    constructor(...segments: unknown[]) {
      this.uri = `file:///cache/${String(segments[segments.length - 1])}`;
    }
  }
  return { File, Paths: { cache: { uri: 'file:///cache/' } } };
});
vi.mock('react-native', () => ({ Share: { share: shareMock } }));

import { exportFileName, serializeExport, shareDataExport } from '../export';

beforeEach(() => {
  writeMock.mockClear();
  deleteMock.mockClear();
  shareMock.mockClear();
});

describe('exportFileName', () => {
  it('date-stamps as aura-export-YYYY-MM-DD.json', () => {
    expect(exportFileName(new Date('2026-07-10T15:04:05Z'))).toBe('aura-export-2026-07-10.json');
  });
});

describe('shareDataExport', () => {
  const bundle = { user: { id: 'u1' }, companions: [], messages: [] };

  it('writes the serialized bundle and shares the file uri', async () => {
    await shareDataExport(bundle);
    expect(writeMock).toHaveBeenCalledWith(serializeExport(bundle));
    expect(shareMock).toHaveBeenCalledWith({
      url: `file:///cache/${exportFileName()}`,
    });
  });

  it('deletes the file after the share sheet completes', async () => {
    await shareDataExport(bundle);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it('deletes the file even when the share fails, and propagates the error', async () => {
    shareMock.mockRejectedValueOnce(new Error('no sheet'));
    await expect(shareDataExport(bundle)).rejects.toThrow('no sheet');
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });
});
