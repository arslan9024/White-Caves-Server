import type { drive_v3 } from 'googleapis';
import { AppError } from '../../middleware/errorHandler.js';
import {
  DEFAULT_INVENTORY_ROOT_ID,
  FOLDER_MIME,
  IMAGE_MIMES,
  SUBFOLDER_ALIASES,
  normalizeNameKey,
  type DriveNode,
  type UnitSubfolderKey,
} from './driveInventoryTypes.js';
import {
  createInventoryDriveClient,
  detectDuplicateFolders,
  findChildFolderByName,
  findMatchingChildFolders,
  listChildNodes,
} from './driveInventoryClient.js';

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
  if (!project) {
    throw new AppError(`Project folder "${projectName}" not found under "${area.name}"`, 404);
  }
  const units = await listChildNodes(project.id, true, clientOverride);
  return { area, project, units };
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
  if (!projectNode) {
    return { queryKey, found: false, missingLevel: 'project' as const, areaId: areaNode.id };
  }
  const unitMatches = await findMatchingChildFolders(projectNode.id, [input.unitNumber], client);
  if (!unitMatches.length) {
    return {
      queryKey,
      found: false,
      missingLevel: 'unit' as const,
      areaId: areaNode.id,
      projectId: projectNode.id,
    };
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
    duplicateUnitFoldersFound:
      unitMatches.length > 1 ? unitMatches.map(u => ({ id: u.id, name: u.name })) : [],
    ...buckets,
    customSubfolders,
    uncategorizedFiles,
    photoUrls: buckets.housePictures
      .filter(f => IMAGE_MIMES.has(f.mimeType))
      .map(
        f =>
          f.thumbnailLink?.replace(/=s\d+$/, '=s1200') ||
          `https://drive.google.com/uc?export=view&id=${f.id}`
      ),
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
  if (!result.found) {
    throw new AppError(
      `Unit path "${result.queryKey}" not found (missing ${result.missingLevel})`,
      404
    );
  }
  return result;
}

export async function auditAreaFormula(
  areaName: string,
  rootFolderId = DEFAULT_INVENTORY_ROOT_ID,
  clientOverride?: { drive: drive_v3.Drive; email: string }
) {
  const client = clientOverride || createInventoryDriveClient();
  const { area, projects } = await listProjectsInArea(areaName, rootFolderId, client);
  const trailingSpaceProjects = projects
    .filter(p => p.name !== p.name.trim())
    .map(p => ({ id: p.id, name: p.name }));
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
