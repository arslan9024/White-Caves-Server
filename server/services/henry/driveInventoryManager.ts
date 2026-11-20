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

export const STANDARD_UNIT_SUBFOLDERS = {
  housePictures: '01_House_Pictures',
  landlordDocuments: '02_Landlord_Documents',
  tenantDocuments: '03_Tenant_Documents',
  tenancyContract: '04_Tenancy_Contract',
  otherRelated: '05_Other_Related',
} as const;

export type UnitSubfolderKey = keyof typeof STANDARD_UNIT_SUBFOLDERS;

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
  area: { id: string; name: string };
  project: { id: string; name: string };
  unit: { id: string; name: string };
  subfolders: Record<UnitSubfolderKey, { id: string; name: string }> & Record<string, { id: string; name: string }>;
}

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

export async function findChildFolderByName(
  parentId: string,
  name: string,
  clientOverride?: { drive: drive_v3.Drive; email: string }
): Promise<DriveNode | null> {
  const children = await listChildNodes(parentId, true, clientOverride);
  const target = name.trim().toLowerCase();
  return children.find(c => c.name.trim().toLowerCase() === target) || null;
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
    requestBody: {
      name: name.trim(),
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: 'id,name',
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new AppError(`Failed creating Drive folder "${name}"`, 502);
  return { id: created.data.id, name: created.data.name || name.trim(), created: true };
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
 * Ensures full canonical inventory hierarchy:
 * Root -> Area (e.g. "DAMAC Hills 2") -> Project (e.g. "Pacifica") -> Unit (e.g. "343")
 * -> [01_House_Pictures, 02_Landlord_Documents, 03_Tenant_Documents, 04_Tenancy_Contract, 05_Other_Related, ...extra]
 */
export async function ensureUnitStructure(input: {
  areaName: string;
  projectName: string;
  unitNumber: string;
  rootFolderId?: string;
  extraSubfolders?: string[];
  clientOverride?: { drive: drive_v3.Drive; email: string };
}): Promise<UnitFolderStructure> {
  const rootFolderId = input.rootFolderId || DEFAULT_INVENTORY_ROOT_ID;
  const client = input.clientOverride || createInventoryDriveClient();

  const area = await ensureFolder(rootFolderId, input.areaName, client);
  const project = await ensureFolder(area.id, input.projectName, client);
  const unit = await ensureFolder(project.id, input.unitNumber, client);

  const subfolders = {} as UnitFolderStructure['subfolders'];
  for (const [key, folderName] of Object.entries(STANDARD_UNIT_SUBFOLDERS)) {
    const ensured = await ensureFolder(unit.id, folderName, client);
    subfolders[key as UnitSubfolderKey] = { id: ensured.id, name: ensured.name };
  }
  for (const customName of input.extraSubfolders || []) {
    const clean = customName.trim();
    if (!clean) continue;
    const ensured = await ensureFolder(unit.id, clean, client);
    subfolders[clean] = { id: ensured.id, name: ensured.name };
  }

  return {
    rootFolderId,
    area: { id: area.id, name: area.name },
    project: { id: project.id, name: project.name },
    unit: { id: unit.id, name: unit.name },
    subfolders,
  };
}

export async function inspectUnitFolder(input: {
  areaName: string;
  projectName: string;
  unitNumber: string;
  rootFolderId?: string;
  clientOverride?: { drive: drive_v3.Drive; email: string };
}) {
  const rootFolderId = input.rootFolderId || DEFAULT_INVENTORY_ROOT_ID;
  const client = input.clientOverride || createInventoryDriveClient();

  const area = await findChildFolderByName(rootFolderId, input.areaName, client);
  if (!area) throw new AppError(`Area "${input.areaName}" not found`, 404);
  const project = await findChildFolderByName(area.id, input.projectName, client);
  if (!project) throw new AppError(`Project "${input.projectName}" not found`, 404);
  const unit = await findChildFolderByName(project.id, input.unitNumber, client);
  if (!unit) throw new AppError(`Unit "${input.unitNumber}" not found`, 404);

  const directChildren = await listChildNodes(unit.id, false, client);
  const folders = directChildren.filter(c => c.mimeType === FOLDER_MIME);
  const loosePhotos = directChildren.filter(c => IMAGE_MIMES.has(c.mimeType));
  const looseDocuments = directChildren.filter(c => c.mimeType !== FOLDER_MIME && !IMAGE_MIMES.has(c.mimeType));

  const sections: Record<string, DriveNode[]> = {};
  for (const folder of folders) {
    sections[folder.name] = await listChildNodes(folder.id, false, client);
  }

  return {
    path: `${area.name} / ${project.name} / ${unit.name}`,
    unitFolderId: unit.id,
    folders: folders.map(f => ({ id: f.id, name: f.name })),
    sections,
    loosePhotos,
    looseDocuments,
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
    extraSubfolders:
      input.subfolder in STANDARD_UNIT_SUBFOLDERS ? undefined : [input.subfolder],
    clientOverride: client,
  });

  const target = structure.subfolders[input.subfolder];
  if (!target) throw new AppError(`Target subfolder "${input.subfolder}" could not be resolved`, 400);

  const uploaded = await client.drive.files.create({
    requestBody: {
      name: input.fileName,
      parents: [target.id],
    },
    media: {
      mimeType: input.mimeType,
      body: Readable.from(input.content),
    },
    fields: 'id,name,mimeType,webViewLink,thumbnailLink,size',
    supportsAllDrives: true,
  });

  return {
    file: uploaded.data,
    destination: `${structure.area.name} / ${structure.project.name} / ${structure.unit.name} / ${target.name}`,
    folderId: target.id,
  };
}
