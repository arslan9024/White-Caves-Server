import fs from 'node:fs';
import path from 'node:path';
import { google, type drive_v3 } from 'googleapis';
import { AppError } from '../../middleware/errorHandler.js';
import { CENTRAL_SECRETS_DIR } from '../../config/env.js';
import {
  DEFAULT_INVENTORY_ROOT_ID,
  FOLDER_MIME,
  escapeQuery,
  normalizeNameKey,
  type DriveNode,
  type FormulaAction,
  type InventoryAccessReport,
} from './driveInventoryTypes.js';

interface RawKey {
  type?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function loadCentralGorahaCredentials(): RawKey {
  const candidates = [
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.cwd(), process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH)
      : null,
    path.join(CENTRAL_SECRETS_DIR, 'google', 'goraha-key.json'),
    path.join(CENTRAL_SECRETS_DIR, 'goraha-key.json'),
  ].filter(Boolean) as string[];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as RawKey;
      if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) {
        return parsed;
      }
    }
  }

  const b64 = process.env.GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64;
  if (b64) {
    const parsed = JSON.parse(Buffer.from(b64.trim(), 'base64').toString('utf8')) as RawKey;
    if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) {
      return parsed;
    }
  }

  throw new AppError(
    `GorahaBot service account key not found in centralized secrets vault (${CENTRAL_SECRETS_DIR})`,
    503
  );
}

export function createInventoryDriveClient(): { drive: drive_v3.Drive; email: string } {
  const credentials = loadCentralGorahaCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return {
    drive: google.drive({ version: 'v3', auth }),
    email: credentials.client_email || 'gorahabot@white-caves-fb-486818.iam.gserviceaccount.com',
  };
}

export async function verifyInventoryRootAccess(
  rootFolderId = DEFAULT_INVENTORY_ROOT_ID,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<InventoryAccessReport> {
  const { drive, email } = clientOverride || createInventoryDriveClient();
  try {
    const res = await drive.files.get({
      fileId: rootFolderId,
      fields: 'id,name,mimeType,capabilities(canEdit,canAddChildren,canListChildren,canRename)',
      supportsAllDrives: true,
    });
    const caps = res.data.capabilities || {};
    const canEdit = Boolean(caps.canEdit);
    const canAddChildren = Boolean(caps.canAddChildren);
    return {
      rootFolderId,
      serviceAccountEmail: email,
      accessible: true,
      canEdit,
      canAddChildren,
      canListChildren: Boolean(caps.canListChildren),
      canRename: Boolean(caps.canRename),
      folderName: res.data.name || undefined,
      actionRequired: canAddChildren
        ? undefined
        : `Upgrade ${email} from Viewer to Editor on folder ${rootFolderId} to create/manage unit subfolders.`,
    };
  } catch {
    return {
      rootFolderId,
      serviceAccountEmail: email,
      accessible: false,
      canEdit: false,
      canAddChildren: false,
      canListChildren: false,
      canRename: false,
      actionRequired: `Share Google Drive folder https://drive.google.com/drive/folders/${rootFolderId} with ${email} as Editor.`,
    };
  }
}

export async function listChildNodes(
  parentId: string,
  foldersOnly = false,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<DriveNode[]> {
  const { drive } = clientOverride || createInventoryDriveClient();
  const mimeClause = foldersOnly ? ` and mimeType = '${FOLDER_MIME}'` : '';
  const res = await drive.files.list({
    q: `'${escapeQuery(parentId)}' in parents and trashed = false${mimeClause}`,
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink,thumbnailLink,size)',
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    orderBy: 'folder,name',
  });
  return (res.data.files || []).map(f => ({
    id: f.id || '',
    name: f.name || 'Untitled',
    mimeType: f.mimeType || '',
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    thumbnailLink: f.thumbnailLink,
    size: f.size,
  }));
}

export async function findMatchingChildFolders(
  parentId: string,
  namesOrAliases: string[],
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<DriveNode[]> {
  const children = await listChildNodes(parentId, true, clientOverride);
  const targets = new Set(namesOrAliases.map(normalizeNameKey));
  return children.filter(c => targets.has(normalizeNameKey(c.name)));
}

export async function findChildFolderByName(
  parentId: string,
  name: string,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<DriveNode | null> {
  const matches = await findMatchingChildFolders(parentId, [name], clientOverride);
  return matches[0] || null;
}

export async function renameFolder(
  folderId: string,
  cleanName: string,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<{ id: string; name: string }> {
  const { drive } = clientOverride || createInventoryDriveClient();
  const updated = await drive.files.update({
    fileId: folderId,
    requestBody: { name: cleanName.trim() },
    fields: 'id,name',
    supportsAllDrives: true,
  });
  return { id: updated.data.id || folderId, name: updated.data.name || cleanName.trim() };
}

export async function ensureFolder(
  parentId: string,
  name: string,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<{ id: string; name: string; created: boolean }> {
  const existing = await findChildFolderByName(parentId, name, clientOverride);
  if (existing) return { id: existing.id, name: existing.name, created: false };

  const { drive } = clientOverride || createInventoryDriveClient();
  const created = await drive.files.create({
    requestBody: { name: name.trim(), mimeType: FOLDER_MIME, parents: [parentId] },
    fields: 'id,name',
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new AppError(`Failed creating Drive folder "${name}"`, 502);
  return { id: created.data.id, name: created.data.name || name.trim(), created: true };
}

export async function detectDuplicateFolders(
  parentId: string,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<Array<{ normalizedName: string; folders: DriveNode[] }>> {
  const folders = await listChildNodes(parentId, true, clientOverride);
  const groups = new Map<string, DriveNode[]>();
  for (const folder of folders) {
    if (folder.name.startsWith('[MERGED_EMPTY]')) continue;
    const key = normalizeNameKey(folder.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(folder);
  }
  return Array.from(groups.entries())
    .filter(([, list]) => list.length > 1)
    .map(([normalizedName, list]) => ({ normalizedName, folders: list }));
}

export async function mergeFolderListIntoPrimary(input: {
  primary: DriveNode;
  duplicates: DriveNode[];
  canonicalName: string;
  dryRun: boolean;
  trashEmptyDuplicates: boolean;
  client: { drive: drive_v3.Drive; email: string };
  actions: FormulaAction[];
}): Promise<DriveNode> {
  const { primary, duplicates, canonicalName, dryRun, trashEmptyDuplicates, client, actions } =
    input;

  if (primary.name !== canonicalName) {
    if (!dryRun) await renameFolder(primary.id, canonicalName, client);
    actions.push({
      type: 'rename_folder',
      targetId: primary.id,
      fromName: primary.name,
      toName: canonicalName,
      detail: `Standardized folder name "${primary.name}" → "${canonicalName}"`,
      applied: !dryRun,
    });
    primary.name = canonicalName;
  }

  for (const dup of duplicates) {
    const dupChildren = await listChildNodes(dup.id, false, client);
    actions.push({
      type: 'merge_duplicate_folder',
      targetId: dup.id,
      fromName: dup.name,
      toName: primary.name,
      detail: `Merging ${dupChildren.length} items from duplicate "${dup.name}" (${dup.id}) into "${primary.name}" (${primary.id})`,
      applied: !dryRun,
    });

    for (const child of dupChildren) {
      if (!dryRun) {
        await client.drive.files.update({
          fileId: child.id,
          addParents: primary.id,
          removeParents: dup.id,
          fields: 'id,parents',
          supportsAllDrives: true,
        });
      }
      actions.push({
        type: 'move_child',
        targetId: child.id,
        fromName: dup.name,
        toName: primary.name,
        detail: `Moved "${child.name}" into primary "${primary.name}"`,
        applied: !dryRun,
      });
    }

    if (trashEmptyDuplicates) {
      if (!dryRun) {
        await client.drive.files.update({
          fileId: dup.id,
          requestBody: { trashed: true },
          supportsAllDrives: true,
        });
      }
      actions.push({
        type: 'trash_empty_duplicate',
        targetId: dup.id,
        fromName: dup.name,
        detail: `Trashed now-empty duplicate folder "${dup.name}" (${dup.id})`,
        applied: !dryRun,
      });
    } else {
      const archiveName = `[MERGED_EMPTY] ${dup.name.trim()} (${dup.id.slice(0, 6)})`;
      if (!dryRun) await renameFolder(dup.id, archiveName, client);
      actions.push({
        type: 'mark_empty_duplicate',
        targetId: dup.id,
        fromName: dup.name,
        toName: archiveName,
        detail: `Marked merged duplicate folder as "${archiveName}" (zero-delete safe mode)`,
        applied: !dryRun,
      });
    }
  }

  return primary;
}

export async function mergeDuplicateFolders(
  parentId: string,
  options?: { dryRun?: boolean; trashEmptyDuplicates?: boolean },
  clientOverride?: { drive: drive_v3.Drive; email: string }
) {
  const client = clientOverride || createInventoryDriveClient();
  const dryRun = options?.dryRun !== false;
  const trashEmptyDuplicates = options?.trashEmptyDuplicates === true;
  const duplicateGroups = await detectDuplicateFolders(parentId, client);
  const actions: FormulaAction[] = [];

  for (const group of duplicateGroups) {
    const [primary, ...duplicates] = group.folders;
    const cleanName = primary.name.trim().replace(/\s+/g, ' ');
    await mergeFolderListIntoPrimary({
      primary,
      duplicates,
      canonicalName: cleanName,
      dryRun,
      trashEmptyDuplicates,
      client,
      actions,
    });
  }

  return { parentId, dryRun, duplicateGroupsFound: duplicateGroups.length, actions };
}
