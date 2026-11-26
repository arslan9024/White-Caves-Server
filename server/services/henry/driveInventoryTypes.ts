export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

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

export const SUBFOLDER_ALIASES: Record<UnitSubfolderKey, string[]> = {
  housePictures: [
    'house pictures',
    '01_house_pictures',
    'pictures',
    'photos',
    'house photos',
    'unit photos',
    'images',
    'villa photos',
  ],
  landlordDocuments: [
    'landlord documents',
    '02_landlord_documents',
    'landlord docs',
    'landlord',
    'owner documents',
    'owner docs',
    'owner',
    'title deed',
  ],
  tenantDocuments: [
    'tenant documents',
    '03_tenant_documents',
    'tenant docs',
    'tenant',
    'tenants',
    'old tenant',
    'tenant id',
  ],
  tenancyContract: [
    'tenancy contract',
    '04_tenancy_contract',
    'tenancy contracts',
    'tenancy',
    'contract',
    'contracts',
    'ejari',
    'lease',
  ],
  otherDocuments: [
    'other documents',
    '05_other_related',
    'other related',
    'other',
    'misc',
    'maintenance',
    'quotations',
  ],
};

export const TENANCY_CONTRACT_STAGE_SUBFOLDERS = {
  offersAndApprovals: '01_Offer_&_Approvals',
  chequesAndReceipts: '02_Cheques_&_Receipts',
  signedContracts: '03_Signed_Contracts',
  ejariAndDewa: '04_Ejari_&_DEWA',
} as const;

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
  subfolders: Record<UnitSubfolderKey, { id: string; name: string }> &
    Record<string, { id: string; name: string }>;
}

export interface FormulaAction {
  type:
    | 'create_folder'
    | 'rename_folder'
    | 'merge_duplicate_folder'
    | 'move_child'
    | 'mark_empty_duplicate'
    | 'trash_empty_duplicate';
  targetId?: string;
  fromName?: string;
  toName?: string;
  detail: string;
  applied: boolean;
}

export function normalizeNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function escapeQuery(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
