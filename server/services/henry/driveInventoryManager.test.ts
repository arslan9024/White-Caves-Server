import { describe, expect, it, vi } from 'vitest';
import {
  enforceUnitFormula,
  queryPropertyUnit,
  STANDARD_UNIT_SUBFOLDERS,
  verifyInventoryRootAccess,
} from './driveInventoryManager.js';

function createMockDrive() {
  const items = new Map<string, { id: string; name: string; parents: string[]; mimeType: string; trashed?: boolean }>([
    ['root-dh2', { id: 'root-dh2', name: 'Inventory Areas ', parents: [], mimeType: 'application/vnd.google-apps.folder' }],
    ['area-1', { id: 'area-1', name: 'Damac Hills 2 ', parents: ['root-dh2'], mimeType: 'application/vnd.google-apps.folder' }],
    ['proj-1', { id: 'proj-1', name: 'Pacifica', parents: ['area-1'], mimeType: 'application/vnd.google-apps.folder' }],
    ['u343-a', { id: 'u343-a', name: '343', parents: ['proj-1'], mimeType: 'application/vnd.google-apps.folder' }],
    ['u343-b', { id: 'u343-b', name: '343 ', parents: ['proj-1'], mimeType: 'application/vnd.google-apps.folder' }],
    ['sub-tc', { id: 'sub-tc', name: 'Tenancy Contract', parents: ['u343-a'], mimeType: 'application/vnd.google-apps.folder' }],
    ['sub-old-t', { id: 'sub-old-t', name: 'Old Tenant ', parents: ['u343-a'], mimeType: 'application/vnd.google-apps.folder' }],
    ['pic-dup', { id: 'pic-dup', name: 'villa-front.jpg', parents: ['u343-b'], mimeType: 'image/jpeg' }],
  ]);
  let seq = 1;

  const drive = {
    files: {
      get: vi.fn(async ({ fileId }: { fileId: string }) => {
        const node = items.get(fileId);
        if (!node || node.trashed) throw new Error(`File not found: ${fileId}`);
        return {
          data: { ...node, capabilities: { canEdit: true, canAddChildren: true, canListChildren: true, canRename: true } },
        };
      }),
      list: vi.fn(async ({ q }: { q: string }) => {
        const match = /'([^']+)' in parents/.exec(q);
        const parentId = match ? match[1] : '';
        const foldersOnly = q.includes('application/vnd.google-apps.folder');
        const list = Array.from(items.values()).filter(
          f => !f.trashed && f.parents.includes(parentId) && (!foldersOnly || f.mimeType === 'application/vnd.google-apps.folder')
        );
        return { data: { files: list } };
      }),
      create: vi.fn(async ({ requestBody }: { requestBody: { name: string; mimeType: string; parents: string[] } }) => {
        const id = `node-${seq++}`;
        const created = { id, name: requestBody.name, mimeType: requestBody.mimeType, parents: [...requestBody.parents] };
        items.set(id, created);
        return { data: created };
      }),
      update: vi.fn(async ({ fileId, requestBody, addParents, removeParents }: any) => {
        const node = items.get(fileId);
        if (!node) throw new Error(`Missing ${fileId}`);
        if (requestBody?.name) node.name = requestBody.name;
        if (requestBody?.trashed) node.trashed = true;
        if (removeParents) node.parents = node.parents.filter(p => p !== removeParents);
        if (addParents && !node.parents.includes(addParents)) node.parents.push(addParents);
        return { data: node };
      }),
    },
  } as any;

  return { drive, items, email: 'gorahabot@white-caves-fb-486818.iam.gserviceaccount.com' };
}

describe('driveInventoryManager formula enforcement & querying', () => {
  it('verifies root access and edit capabilities cleanly', async () => {
    const client = createMockDrive();
    const ok = await verifyInventoryRootAccess('root-dh2', client);
    expect(ok.accessible).toBe(true);
    expect(ok.canEdit).toBe(true);
    expect(ok.canAddChildren).toBe(true);
  });

  it('enforces formula: trims names, merges duplicate 343 folders, renames Old Tenant -> Tenant Documents, and reuses Tenancy Contract', async () => {
    const client = createMockDrive();
    const res = await enforceUnitFormula({
      areaName: 'Damac Hills 2',
      projectName: 'Pacifica',
      unitNumber: '343',
      rootFolderId: 'root-dh2',
      dryRun: false,
      mergeDuplicates: true,
      clientOverride: client,
    });

    expect(res.queryPath).toBe('Damac Hills 2/Pacifica/343');
    expect(res.structure.subfolders.housePictures.name).toBe(STANDARD_UNIT_SUBFOLDERS.housePictures);
    expect(res.structure.subfolders.landlordDocuments.name).toBe(STANDARD_UNIT_SUBFOLDERS.landlordDocuments);
    expect(res.structure.subfolders.tenantDocuments.name).toBe(STANDARD_UNIT_SUBFOLDERS.tenantDocuments);
    expect(res.structure.subfolders.tenancyContract.id).toBe('sub-tc');
    expect(res.structure.subfolders.tenantDocuments.id).toBe('sub-old-t');
    // Moved file from duplicate 343 folder into primary 343 folder
    expect(client.items.get('pic-dup')?.parents).toEqual(['u343-a']);
    // Duplicate 343 marked safely as [MERGED_EMPTY]
    expect(client.items.get('u343-b')?.name).toContain('[MERGED_EMPTY]');

    const queried = await queryPropertyUnit({
      area: 'Damac Hills 2',
      project: 'Pacifica',
      unitNumber: '343',
      rootFolderId: 'root-dh2',
      clientOverride: client,
    });
    expect(queried.found).toBe(true);
    expect(queried.queryKey).toBe('Damac Hills 2/Pacifica/343');
    expect(queried.uncategorizedFiles?.length).toBe(1);
  });
});
