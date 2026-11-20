import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { google, type drive_v3 } from 'googleapis';
import { AppError } from '../../middleware/errorHandler.js';
import { CENTRAL_SECRETS_DIR } from '../../config/env.js';

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export const DEFAULT_INVENTORY_ROOT_ID =
  process.env.GOOGLE_DRIVE_INVENTORY_ROOT_FOLDER_ID || '1g9Vd21YBJ-GB1bLl2jR7pgVGsHeqpi-N';

/**
 * Canonical Property Unit Subfolder Formula:
 * Inventory Areas / <Area> / <Project> / <Unit Number> / <Subfolder>
 */
export const STANDARD_UNIT_SUBFOLDERS = {
  housePictures: 'House Pictures',
  landlordDocuments: 'Landlord Documents',
  tenantDocuments: 'Tenant Documents',
  tenancyContract: 'Tenancy Contract',
  otherDocuments: 'Other Documents',
} as const;

export type UnitSubfolderKey = keyof typeof STANDARD_UNIT_SUBFOLDERS;

const SUBFOLDER_ALIASES: Record<UnitSubfolderKey, string[]> = {
  housePictures: ['house pictures', '01_house_pictures', 'pictures', 'photos', 'house photos', 'unit photos', 'images', 'villa photos'],
  landlordDocuments: ['landlord documents', '02_landlord_documents', 'landlord docs', 'landlord', 'owner documents', 'owner docs', 'owner', 'title deed'],
  tenantDocuments: ['tenant documents', '03_tenant_documents', 'tenant docs', 'tenant', 'tenants', 'old tenant', 'tenant id'],
  tenancyContract: ['tenancy contract', '04_tenancy_contract', 'tenancy contracts', 'tenancy', 'contract', 'contracts', 'ejari', 'lease'],
  otherDocuments: ['other documents', '05_other_related', 'other related', 'other', 'misc', 'maintenance', 'quotations'],
};

export interface InventoryAccessReport {
  rootFolderId: string;
  serviceAccountEmail: string;
  accessible: boolean;
  canEdit: boolean;
  canAddChildren: boolean;
  canListChildren: boolean;
  canRename: boolean;
  folderName?: string;
  actionRequired?: string;
}

export interface DriveNode {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string | null;
  webViewLink?: string | null;
  thumbnailLink?: string | null;
  size?: string | null;
}

export interface UnitFolderStructure {
  rootFolderId: string;
  queryPath: string;
  area: { id: string; name: string };
  project: { id: string; name: string };
  unit: { id: string; name: string };
  subfolders: Record<UnitSubfolderKey, { id: string; name: string }> & Record<string, { id: string; name: string }>;
}

export interface FormulaAction {
  type: 'create_folder' | 'rename_folder' | 'merge_duplicate_folder' | 'move_child' | 'mark_empty_duplicate' | 'trash_empty_duplicate';
  targetId?: string;
  fromName?: string;
  toName?: string;
  detail: string;
  applied: boolean;
}

interface RawKey {
  type?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function normalizeNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
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

function escapeQuery(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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

async function mergeFolderListIntoPrimary(input: {
  primary: DriveNode;
  duplicates: DriveNode[];
  canonicalName: string;
  dryRun: boolean;
  trashEmptyDuplicates: boolean;
  client: { drive: drive_v3.Drive; email: string };
  actions: FormulaAction[];
}): Promise<DriveNode> {
  const { primary, duplicates, canonicalName, dryRun, trashEmptyDuplicates, client, actions } = input;

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

export async function listAreas(
  rootFolderId = DEFAULT_INVENTORY_ROOT_ID,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<DriveNode[]> {
  return listChildNodes(rootFolderId, true, clientOverride);
}

export async function listProjectsInArea(
  areaName: string,
  rootFolderId = DEFAULT_INVENTORY_ROOT_ID,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<{ area: DriveNode; projects: DriveNode[] }> {
  const area = await findChildFolderByName(rootFolderId, areaName, clientOverride);
  if (!area) throw new AppError(`Area folder "${areaName}" not found under root ${rootFolderId}`, 404);
  const projects = await listChildNodes(area.id, true, clientOverride);
  return { area, projects };
}

export async function listUnitsInProject(
  areaName: string,
  projectName: string,
  rootFolderId = DEFAULT_INVENTORY_ROOT_ID,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<{ area: DriveNode; project: DriveNode; units: DriveNode[] }> {
  const { area } = await listProjectsInArea(areaName, rootFolderId, clientOverride);
  const project = await findChildFolderByName(area.id, projectName, clientOverride);
  if (!project) throw new AppError(`Project folder "${projectName}" not found under "${area.name}"`, 404);
  const units = await listChildNodes(project.id, true, clientOverride);
  return { area, project, units };
}

/**
 * Enforces the canonical formula:
 * Inventory Areas / <Area> / <Project> / <Unit Number> /
 *   [House Pictures, Landlord Documents, Tenant Documents, Tenancy Contract, Other Documents]
 * Trims spaces, renames alias folders, merges duplicate sibling folders, and creates missing folders.
 */
export async function enforceUnitFormula(input: {
  areaName: string;
  projectName: string;
  unitNumber: string;
  rootFolderId?: string;
  extraSubfolders?: string[];
  dryRun?: boolean;
  mergeDuplicates?: boolean;
  trashEmptyDuplicates?: boolean;
  clientOverride?: { drive: drive_v3.Drive; email: string };
}): Promise<{ dryRun: boolean; queryPath: string; actions: FormulaAction[]; structure: UnitFolderStructure }> {
  const rootFolderId = input.rootFolderId || DEFAULT_INVENTORY_ROOT_ID;
  const client = input.clientOverride || createInventoryDriveClient();
  const dryRun = input.dryRun === true;
  const shouldMerge = input.mergeDuplicates !== false;
  const trashEmpty = input.trashEmptyDuplicates === true;
  const actions: FormulaAction[] = [];

  const ensureAndNormalizeLevel = async (parentId: string, canonicalName: string, aliases: string[] = []) => {
    const cleanTarget = canonicalName.trim().replace(/\s+/g, ' ');
    const matches = await findMatchingChildFolders(parentId, [cleanTarget, ...aliases], client);
    if (matches.length === 0) {
      if (dryRun) {
        actions.push({ type: 'create_folder', toName: cleanTarget, detail: `Would create "${cleanTarget}"`, applied: false });
        return { id: `dry-run:${cleanTarget}`, name: cleanTarget, mimeType: FOLDER_MIME };
      }
      const created = await ensureFolder(parentId, cleanTarget, client);
      actions.push({ type: 'create_folder', targetId: created.id, toName: created.name, detail: `Created "${created.name}"`, applied: true });
      return { id: created.id, name: created.name, mimeType: FOLDER_MIME };
    }

    const exact = matches.find(m => normalizeNameKey(m.name) === normalizeNameKey(cleanTarget)) || matches[0];
    const others = shouldMerge ? matches.filter(m => m.id !== exact.id) : [];
    return mergeFolderListIntoPrimary({
      primary: { ...exact },
      duplicates: others,
      canonicalName: cleanTarget,
      dryRun,
      trashEmptyDuplicates: trashEmpty,
      client,
      actions,
    });
  };

  const area = await ensureAndNormalizeLevel(rootFolderId, input.areaName);
  const project = await ensureAndNormalizeLevel(area.id, input.projectName);
  const unit = await ensureAndNormalizeLevel(project.id, input.unitNumber);

  const subfolders = {} as UnitFolderStructure['subfolders'];
  for (const [key, folderName] of Object.entries(STANDARD_UNIT_SUBFOLDERS)) {
    const aliases = SUBFOLDER_ALIASES[key as UnitSubfolderKey] || [];
    const node = await ensureAndNormalizeLevel(unit.id, folderName, aliases);
    subfolders[key as UnitSubfolderKey] = { id: node.id, name: node.name };
  }
  for (const custom of input.extraSubfolders || []) {
    const clean = custom.trim();
    if (!clean) continue;
    const node = await ensureAndNormalizeLevel(unit.id, clean);
    subfolders[clean] = { id: node.id, name: node.name };
  }

  const queryPath = `${area.name}/${project.name}/${unit.name}`;
  return {
    dryRun,
    queryPath,
    actions,
    structure: {
      rootFolderId,
      queryPath,
      area: { id: area.id, name: area.name },
      project: { id: project.id, name: project.name },
      unit: { id: unit.id, name: unit.name },
      subfolders,
    },
  };
}

export async function ensureUnitStructure(input: {
  areaName: string;
  projectName: string;
  unitNumber: string;
  rootFolderId?: string;
  extraSubfolders?: string[];
  clientOverride?: { drive: drive_v3.Drive; email: string };
}): Promise<UnitFolderStructure> {
  const result = await enforceUnitFormula({ ...input, dryRun: false, mergeDuplicates: true });
  return result.structure;
}

/**
 * Canonical Property Query Engine:
 * Answers: "Which inventory area / project / unit number?" -> structured assets & docs
 */
export async function queryPropertyUnit(input: {
  area: string;
  project: string;
  unitNumber: string;
  rootFolderId?: string;
  clientOverride?: { drive: drive_v3.Drive; email: string };
}) {
  const rootFolderId = input.rootFolderId || DEFAULT_INVENTORY_ROOT_ID;
  const client = input.clientOverride || createInventoryDriveClient();
  const queryKey = `${input.area.trim()}/${input.project.trim()}/${input.unitNumber.trim()}`;

  const areaNode = await findChildFolderByName(rootFolderId, input.area, client);
  if (!areaNode) return { queryKey, found: false, missingLevel: 'area' as const };
  const projectNode = await findChildFolderByName(areaNode.id, input.project, client);
  if (!projectNode) return { queryKey, found: false, missingLevel: 'project' as const, areaId: areaNode.id };
  const unitMatches = await findMatchingChildFolders(projectNode.id, [input.unitNumber], client);
  if (!unitMatches.length) {
    return { queryKey, found: false, missingLevel: 'unit' as const, areaId: areaNode.id, projectId: projectNode.id };
  }

  const unitNode = unitMatches[0];
  const directChildren = await listChildNodes(unitNode.id, false, client);
  const childFolders = directChildren.filter(c => c.mimeType === FOLDER_MIME);
  const uncategorizedFiles = directChildren.filter(c => c.mimeType !== FOLDER_MIME);

  const buckets: Record<UnitSubfolderKey, DriveNode[]> = {
    housePictures: [],
    landlordDocuments: [],
    tenantDocuments: [],
    tenancyContract: [],
    otherDocuments: [],
  };
  const customSubfolders: Record<string, DriveNode[]> = {};

  for (const folder of childFolders) {
    const keyName = normalizeNameKey(folder.name);
    const matchedBucket = (Object.keys(SUBFOLDER_ALIASES) as UnitSubfolderKey[]).find(k =>
      SUBFOLDER_ALIASES[k].includes(keyName)
    );
    const files = await listChildNodes(folder.id, false, client);
    if (matchedBucket) {
      buckets[matchedBucket].push(...files);
    } else {
      customSubfolders[folder.name] = files;
    }
  }

  return {
    queryKey,
    found: true,
    area: { id: areaNode.id, name: areaNode.name },
    project: { id: projectNode.id, name: projectNode.name },
    unit: { id: unitNode.id, name: unitNode.name },
    duplicateUnitFoldersFound: unitMatches.length > 1 ? unitMatches.map(u => ({ id: u.id, name: u.name })) : [],
    ...buckets,
    customSubfolders,
    uncategorizedFiles,
    photoUrls: buckets.housePictures
      .filter(f => IMAGE_MIMES.has(f.mimeType))
      .map(f => f.thumbnailLink?.replace(/=s\d+$/, '=s1200') || `https://drive.google.com/uc?export=view&id=${f.id}`),
  };
}

export async function inspectUnitFolder(input: {
  areaName: string;
  projectName: string;
  unitNumber: string;
  rootFolderId?: string;
  clientOverride?: { drive: drive_v3.Drive; email: string };
}) {
  const result = await queryPropertyUnit({
    area: input.areaName,
    project: input.projectName,
    unitNumber: input.unitNumber,
    rootFolderId: input.rootFolderId,
    clientOverride: input.clientOverride,
  });
  if (!result.found) throw new AppError(`Unit path "${result.queryKey}" not found (missing ${result.missingLevel})`, 404);
  return result;
}

export async function auditAreaFormula(
  areaName: string,
  rootFolderId = DEFAULT_INVENTORY_ROOT_ID,
  clientOverride?: { drive: drive_v3.Drive; email: string }
) {
  const client = clientOverride || createInventoryDriveClient();
  const { area, projects } = await listProjectsInArea(areaName, rootFolderId, client);
  const trailingSpaceProjects = projects.filter(p => p.name !== p.name.trim()).map(p => ({ id: p.id, name: p.name }));
  const duplicateProjects = await detectDuplicateFolders(area.id, client);

  return {
    area: { id: area.id, name: area.name, hasTrailingSpace: area.name !== area.name.trim() },
    totalProjects: projects.length,
    trailingSpaceProjects,
    duplicateProjects: duplicateProjects.map(g => ({
      normalizedName: g.normalizedName,
      count: g.folders.length,
      ids: g.folders.map(f => f.id),
    })),
  };
}

export async function uploadFileToUnitSubfolder(input: {
  areaName: string;
  projectName: string;
  unitNumber: string;
  subfolder: UnitSubfolderKey | string;
  fileName: string;
  mimeType: string;
  content: Buffer;
  rootFolderId?: string;
  clientOverride?: { drive: drive_v3.Drive; email: string };
}) {
  const client = input.clientOverride || createInventoryDriveClient();
  const structure = await ensureUnitStructure({
    areaName: input.areaName,
    projectName: input.projectName,
    unitNumber: input.unitNumber,
    rootFolderId: input.rootFolderId,
    extraSubfolders: input.subfolder in STANDARD_UNIT_SUBFOLDERS ? undefined : [input.subfolder],
    clientOverride: client,
  });

  const target = structure.subfolders[input.subfolder];
  if (!target) throw new AppError(`Target subfolder "${input.subfolder}" could not be resolved`, 400);

  const uploaded = await client.drive.files.create({
    requestBody: { name: input.fileName, parents: [target.id] },
    media: { mimeType: input.mimeType, body: Readable.from(input.content) },
    fields: 'id,name,mimeType,webViewLink,thumbnailLink,size',
    supportsAllDrives: true,
  });

  return {
    file: uploaded.data,
    destination: `${structure.queryPath}/${target.name}`,
    folderId: target.id,
  };
}
