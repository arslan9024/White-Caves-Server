import fs from 'node:fs';
import path from 'node:path';
import { google, type drive_v3 } from 'googleapis';
import { AppError } from '../../middleware/errorHandler.js';
import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('HenryDriveServiceAccount');
const db = prisma as any;

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOC_MIMES = new Set(['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.google-apps.document']);

export interface ServiceAccountStatus {
  configured: boolean;
  clientEmail?: string;
  projectId?: string;
  keySource?: string;
}

export interface DriveFolderItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string | null;
  parents?: string[] | null;
  webViewLink?: string | null;
  thumbnailLink?: string | null;
  size?: string | null;
}

export interface IndexedDH2Unit {
  folderId: string;
  cluster: string;
  unitName: string;
  photos: Array<{ id: string; name: string; mimeType: string; webViewLink?: string | null; thumbnailLink?: string | null }>;
  documents: Array<{ id: string; name: string; mimeType: string; webViewLink?: string | null }>;
  descriptionText?: string;
}

interface RawServiceAccountKey {
  type?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function loadServiceAccountCredentials(): { credentials: RawServiceAccountKey; keySource: string } | null {
  const b64 = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_BASE64 || process.env.GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64;
  if (b64 && b64.trim()) {
    try {
      const parsed = JSON.parse(Buffer.from(b64.trim(), 'base64').toString('utf8')) as RawServiceAccountKey;
      if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) {
        return { credentials: parsed, keySource: 'env_base64' };
      }
    } catch {
      log.warn('Failed to parse base64 service account credentials');
    }
  }

  const candidates = [
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH,
    '../secrets/google/goraha-key.json',
    '../secrets/goraha-key.json',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const resolved = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(resolved)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8')) as RawServiceAccountKey;
        if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) {
          return { credentials: parsed, keySource: candidate };
        }
      } catch {
        log.warn(`Failed reading service account JSON at ${candidate}`);
      }
    }
  }
  return null;
}

export function getServiceAccountStatus(): ServiceAccountStatus {
  const loaded = loadServiceAccountCredentials();
  if (!loaded) return { configured: false };
  return {
    configured: true,
    clientEmail: loaded.credentials.client_email,
    projectId: loaded.credentials.project_id,
    keySource: loaded.keySource,
  };
}

function createServiceAccountDriveClient(): { drive: drive_v3.Drive; status: ServiceAccountStatus } {
  const loaded = loadServiceAccountCredentials();
  if (!loaded) {
    throw new AppError('Google Drive Service Account not configured (set GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH or GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64)', 503);
  }
  const auth = new google.auth.GoogleAuth({
    credentials: loaded.credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return {
    drive: google.drive({ version: 'v3', auth }),
    status: {
      configured: true,
      clientEmail: loaded.credentials.client_email,
      projectId: loaded.credentials.project_id,
      keySource: loaded.keySource,
    },
  };
}

export async function listServiceAccountFolders(parentId?: string): Promise<{
  serviceAccount: ServiceAccountStatus;
  folders: DriveFolderItem[];
}> {
  const { drive, status } = createServiceAccountDriveClient();
  const q = parentId
    ? `'${parentId.replace(/'/g, '')}' in parents and trashed = false`
    : `mimeType = '${FOLDER_MIME}' and trashed = false`;

  const response = await drive.files.list({
    q,
    fields: 'files(id,name,mimeType,modifiedTime,parents,webViewLink,thumbnailLink,size)',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    orderBy: 'folder,name',
  });

  const folders: DriveFolderItem[] = (response.data.files || []).map(f => ({
    id: f.id || '',
    name: f.name || 'Untitled',
    mimeType: f.mimeType || '',
    modifiedTime: f.modifiedTime,
    parents: f.parents,
    webViewLink: f.webViewLink,
    thumbnailLink: f.thumbnailLink,
    size: f.size,
  }));

  return { serviceAccount: status, folders };
}

async function readTextFile(drive: drive_v3.Drive, fileId: string, mimeType: string): Promise<string | undefined> {
  try {
    if (mimeType === 'application/vnd.google-apps.document') {
      const exported = await drive.files.export({ fileId, mimeType: 'text/plain' }, { responseType: 'text' });
      return String(exported.data || '').slice(0, 4000);
    }
    const res = await drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'text' });
    return String(res.data || '').slice(0, 4000);
  } catch {
    return undefined;
  }
}

export async function indexDH2ClusterFolders(rootFolderId?: string): Promise<{
  serviceAccount: ServiceAccountStatus;
  rootFolderId: string | null;
  clusters: string[];
  units: IndexedDH2Unit[];
  totalPhotos: number;
  totalDocuments: number;
}> {
  const { drive, status } = createServiceAccountDriveClient();
  let targetRoot = rootFolderId;

  if (!targetRoot) {
    const roots = await listServiceAccountFolders();
    const dh2Folder = roots.folders.find(f => /damac\s*hills\s*2|akoya|dh2/i.test(f.name)) || roots.folders[0];
    if (!dh2Folder) {
      return { serviceAccount: status, rootFolderId: null, clusters: [], units: [], totalPhotos: 0, totalDocuments: 0 };
    }
    targetRoot = dh2Folder.id;
  }

  const level1 = (await listServiceAccountFolders(targetRoot)).folders;
  const clusterFolders = level1.filter(f => f.mimeType === FOLDER_MIME);
  const units: IndexedDH2Unit[] = [];
  const clusters: string[] = [];

  for (const clusterFolder of clusterFolders.slice(0, 30)) {
    clusters.push(clusterFolder.name);
    const clusterChildren = (await listServiceAccountFolders(clusterFolder.id)).folders;
    const subUnitFolders = clusterChildren.filter(f => f.mimeType === FOLDER_MIME);

    const inspectUnit = async (folderId: string, unitName: string, files: DriveFolderItem[]) => {
      const photos = files
        .filter(f => IMAGE_MIMES.has(f.mimeType))
        .map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, webViewLink: f.webViewLink, thumbnailLink: f.thumbnailLink }));
      const documents = files
        .filter(f => DOC_MIMES.has(f.mimeType))
        .map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, webViewLink: f.webViewLink }));
      const descFile = files.find(f => /desc|info|spec|detail|readme/i.test(f.name) && DOC_MIMES.has(f.mimeType));
      const descriptionText = descFile ? await readTextFile(drive, descFile.id, descFile.mimeType) : undefined;
      units.push({ folderId, cluster: clusterFolder.name, unitName, photos, documents, descriptionText });
    };

    if (subUnitFolders.length > 0) {
      for (const unitFolder of subUnitFolders.slice(0, 30)) {
        const unitFiles = (await listServiceAccountFolders(unitFolder.id)).folders;
        await inspectUnit(unitFolder.id, unitFolder.name, unitFiles);
      }
    } else {
      await inspectUnit(clusterFolder.id, clusterFolder.name, clusterChildren);
    }
  }

  return {
    serviceAccount: status,
    rootFolderId: targetRoot,
    clusters,
    units,
    totalPhotos: units.reduce((sum, u) => sum + u.photos.length, 0),
    totalDocuments: units.reduce((sum, u) => sum + u.documents.length, 0),
  };
}

export async function syncDH2UnitFolderToListing(input: {
  folderId: string;
  cluster: string;
  unitName: string;
  propertyId?: string;
  annualRentAed?: number;
  bedrooms?: number;
}) {
  const { drive } = createServiceAccountDriveClient();
  const files = (await listServiceAccountFolders(input.folderId)).folders;
  const photos = files
    .filter(f => IMAGE_MIMES.has(f.mimeType))
    .map(f => f.thumbnailLink?.replace(/=s\d+$/, '=s1200') || `https://drive.google.com/uc?export=view&id=${f.id}`);
  const descFile = files.find(f => /desc|info|spec|detail|readme/i.test(f.name) && DOC_MIMES.has(f.mimeType));
  const description = (descFile ? await readTextFile(drive, descFile.id, descFile.mimeType) : undefined)
    || `Verified DAMAC Hills 2 (${input.cluster}) residence — ${input.unitName}. Media indexed by Henry (MGR-11-1) from Google Drive.`;

  if (input.propertyId) {
    const updated = await db.property.update({
      where: { id: input.propertyId },
      data: {
        description,
        ...(photos.length ? { images: photos } : {}),
      },
    });
    return { mode: 'updated', propertyId: updated.id, photosLinked: photos.length, description };
  }

  return {
    mode: 'preview_ready',
    cluster: input.cluster,
    unitName: input.unitName,
    photosLinked: photos.length,
    photos,
    description,
    annualRentAed: input.annualRentAed || 95000,
    bedrooms: input.bedrooms || 3,
  };
}
