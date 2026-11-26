import { Readable } from 'node:stream';
import type { drive_v3 } from 'googleapis';
import { AppError } from '../../middleware/errorHandler.js';
import {
  DEFAULT_INVENTORY_ROOT_ID,
  FOLDER_MIME,
  STANDARD_UNIT_SUBFOLDERS,
  SUBFOLDER_ALIASES,
  TENANCY_CONTRACT_STAGE_SUBFOLDERS,
  normalizeNameKey,
  type FormulaAction,
  type UnitFolderStructure,
  type UnitSubfolderKey,
} from './driveInventoryTypes.js';
import {
  createInventoryDriveClient,
  ensureFolder,
  findMatchingChildFolders,
  mergeFolderListIntoPrimary,
} from './driveInventoryClient.js';

export * from './driveInventoryTypes.js';
export * from './driveInventoryClient.js';
export * from './driveInventoryQueries.js';

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
}): Promise<{
  dryRun: boolean;
  queryPath: string;
  actions: FormulaAction[];
  structure: UnitFolderStructure;
}> {
  const rootFolderId = input.rootFolderId || DEFAULT_INVENTORY_ROOT_ID;
  const client = input.clientOverride || createInventoryDriveClient();
  const dryRun = input.dryRun === true;
  const shouldMerge = input.mergeDuplicates !== false;
  const trashEmpty = input.trashEmptyDuplicates === true;
  const actions: FormulaAction[] = [];

  const ensureAndNormalizeLevel = async (
    parentId: string,
    canonicalName: string,
    aliases: string[] = []
  ) => {
    const cleanTarget = canonicalName.trim().replace(/\s+/g, ' ');
    const matches = await findMatchingChildFolders(parentId, [cleanTarget, ...aliases], client);
    if (matches.length === 0) {
      if (dryRun) {
        actions.push({
          type: 'create_folder',
          toName: cleanTarget,
          detail: `Would create "${cleanTarget}"`,
          applied: false,
        });
        return { id: `dry-run:${cleanTarget}`, name: cleanTarget, mimeType: FOLDER_MIME };
      }
      const created = await ensureFolder(parentId, cleanTarget, client);
      actions.push({
        type: 'create_folder',
        targetId: created.id,
        toName: created.name,
        detail: `Created "${created.name}"`,
        applied: true,
      });
      return { id: created.id, name: created.name, mimeType: FOLDER_MIME };
    }

    const exact =
      matches.find(m => normalizeNameKey(m.name) === normalizeNameKey(cleanTarget)) || matches[0];
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
  if (!target) {
    throw new AppError(`Target subfolder "${input.subfolder}" could not be resolved`, 400);
  }

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

/**
 * Creates canonical stage-by-stage Tenancy Contract folders inside:
 * Inventory Areas / <Area> / <Project> / <Unit Number> / Tenancy Contract / <Year>_<NEW|RENEWAL> / [4 Stage Subfolders]
 */
export async function ensureTenancyStageFolders(input: {
  areaName: string;
  projectName: string;
  unitNumber: string;
  contractYear: string | number;
  contractMode: 'NEW' | 'RENEWAL';
  rootFolderId?: string;
  clientOverride?: { drive: drive_v3.Drive; email: string };
}) {
  const client = input.clientOverride || createInventoryDriveClient();
  const structure = await ensureUnitStructure({
    areaName: input.areaName,
    projectName: input.projectName,
    unitNumber: input.unitNumber,
    rootFolderId: input.rootFolderId,
    clientOverride: client,
  });

  const cycleFolderName = `${String(input.contractYear).trim()}_${input.contractMode}`;
  const cycleFolder = await ensureFolder(
    structure.subfolders.tenancyContract.id,
    cycleFolderName,
    client
  );

  const stageFolders: Record<string, { id: string; name: string }> = {};
  for (const [key, name] of Object.entries(TENANCY_CONTRACT_STAGE_SUBFOLDERS)) {
    const ensured = await ensureFolder(cycleFolder.id, name, client);
    stageFolders[key] = { id: ensured.id, name: ensured.name };
  }

  return {
    unitQueryPath: structure.queryPath,
    cyclePath: `${structure.queryPath}/Tenancy Contract/${cycleFolder.name}`,
    cycleFolderId: cycleFolder.id,
    stageFolders,
  };
}
