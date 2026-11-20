import { describe, expect, it, vi } from 'vitest';
import {
  ensureUnitStructure,
  inspectUnitFolder,
  STANDARD_UNIT_SUBFOLDERS,
  verifyInventoryRootAccess,
} from './driveInventoryManager.js';

function createMockDrive() {
  const folders = new Map<string, { id: string; name: string; parents: string[]; mimeType: string }>([
    ['root-dh2', { id: 'root-dh2', name: 'White Caves Inventory', parents: [], mimeType: 'application/vnd.google-apps.folder' }],
  ]);
  let seq = 1;

  const drive = {
    files: {
      get: vi.fn(async ({ fileId }: { fileId: string }) => {
        const node = folders.get(fileId);
        if (!node) throw new Error(`File not found: ${fileId}`);
        return {
          data: {
            ...node,
            capabilities: { canEdit: true, canAddChildren: true, canListChildren: true, canRename: true },
          },
        };
      }),
      list: vi.fn(async ({ q }: { q: string }) => {
        const match = /'([^']+)' in parents/.exec(q);
        const parentId = match ? match[1] : '';
        const items = Array.from(folders.values()).filter(f => f.parents.includes(parentId));
        return { data: { files: items } };
      }),
      create: vi.fn(async ({ requestBody }: { requestBody: { name: string; mimeType: string; parents: string[] } }) => {
        const id = `node-${seq++}`;
        const created = { id, name: requestBody.name, mimeType: requestBody.mimeType, parents: requestBody.parents };
        folders.set(id, created);
        return { data: created };
      }),
    },
  } as any;

  return { drive, email: 'gorahabot@white-caves-fb-486818.iam.gserviceaccount.com' };
}

describe('driveInventoryManager (Area -> Project -> Unit -> Standard Subfolders)', () => {
  it('verifies root access and edit capabilities cleanly', async () => {
    const client = createMockDrive();
    const ok = await verifyInventoryRootAccess('root-dh2', client);
    expect(ok.accessible).toBe(true);
    expect(ok.canEdit).toBe(true);
    expect(ok.canAddChildren).toBe(true);

    const missing = await verifyInventoryRootAccess('unshared-id', client);
    expect(missing.accessible).toBe(false);
    expect(missing.actionRequired).toContain('gorahabot@white-caves-fb-486818.iam.gserviceaccount.com');
  });

  it('creates idempotent Area -> Project -> Unit -> 5 standard subfolders + custom subfolder', async () => {
    const client = createMockDrive();
    const first = await ensureUnitStructure({
      areaName: 'DAMAC Hills 2',
      projectName: 'Pacifica',
      unitNumber: '343',
      rootFolderId: 'root-dh2',
      extraSubfolders: ['06_Maintenance_Logs'],
      clientOverride: client,
    });
    expect(first.area.name).toBe('DAMAC Hills 2');
    expect(first.project.name).toBe('Pacifica');
    expect(first.unit.name).toBe('343');
    expect(first.subfolders.housePictures.name).toBe(STANDARD_UNIT_SUBFOLDERS.housePictures);
    expect(first.subfolders.landlordDocuments.name).toBe(STANDARD_UNIT_SUBFOLDERS.landlordDocuments);
    expect(first.subfolders.tenantDocuments.name).toBe(STANDARD_UNIT_SUBFOLDERS.tenantDocuments);
    expect(first.subfolders.tenancyContract.name).toBe(STANDARD_UNIT_SUBFOLDERS.tenancyContract);
    expect(first.subfolders['06_Maintenance_Logs'].name).toBe('06_Maintenance_Logs');

    const createsAfterFirst = client.drive.files.create.mock.calls.length;
    const second = await ensureUnitStructure({
      areaName: 'DAMAC Hills 2',
      projectName: 'Pacifica',
      unitNumber: '343',
      rootFolderId: 'root-dh2',
      extraSubfolders: ['06_Maintenance_Logs'],
      clientOverride: client,
    });
    expect(second.unit.id).toBe(first.unit.id);
    expect(client.drive.files.create.mock.calls.length).toBe(createsAfterFirst);

    const inspected = await inspectUnitFolder({
      areaName: 'DAMAC Hills 2',
      projectName: 'Pacifica',
      unitNumber: '343',
      rootFolderId: 'root-dh2',
      clientOverride: client,
    });
    expect(inspected.path).toBe('DAMAC Hills 2 / Pacifica / 343');
    expect(inspected.folders.length).toBe(6);
  });
});
