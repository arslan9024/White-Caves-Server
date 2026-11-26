/**
 * aiSaritaSheetsService.ts
 * White Caves Real Estate LLC — AI Sarita Sheets Operations Engine
 * Standard: AEGIS Canonical Single Purpose (< 350 lines, AEG-042)
 *
 * Dedicated Google Sheets Supervisor service for AI Mary (MGR-06-1) & AI Sarita (SUP-06-1-01).
 * Supports authenticated reads, row appends, cell updates, and range mutations using the
 * GorahaBot service account stored in CENTRAL_SECRETS_DIR.
 */

import { createAkoyaSheetsClient, DEFAULT_AKOYA_SHEET_ID } from '../whatsapp/dh2AkoyaSheetIngestor.js';

export const AKOYA_PMS_SHEET_ID =
  process.env.AKOYA_PMS_SHEET_ID || '1NRqC1GywTZqKGfzeqM3ZrGb2nh9WOyOQr3xHMP4c1-o';
export const AKOYA_PMS1_VIEW_SHEET_ID =
  process.env.AKOYA_PMS1_VIEW_SHEET_ID || '16msSvbMZ9Quli-eL97lu6wMkXwJAeeQLje92gUf_tGk';
export const AKOYA_RAW_SHEET_ID = DEFAULT_AKOYA_SHEET_ID;

export interface SheetUpdateResult {
  spreadsheetId: string;
  range: string;
  updatedCells?: number;
  updatedRows?: number;
  updatedColumns?: number;
}

export interface SheetAppendResult {
  spreadsheetId: string;
  tableRange?: string;
  updatedRange?: string;
  updatedRows?: number;
}

class AiSaritaSheetsService {
  /**
   * Get values from a specific sheet range
   */
  async getRange(spreadsheetId: string = AKOYA_PMS_SHEET_ID, range: string = 'DB_Properties!A1:J50') {
    const sheets = createAkoyaSheetsClient(false);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return {
      success: true,
      spreadsheetId,
      range,
      values: response.data.values || [],
      rowCount: response.data.values?.length || 0,
    };
  }

  /**
   * Update / edit specific cells in a spreadsheet range
   */
  async updateRange(
    spreadsheetId: string = AKOYA_PMS_SHEET_ID,
    range: string,
    values: (string | number | boolean | null)[][]
  ): Promise<SheetUpdateResult> {
    const sheets = createAkoyaSheetsClient(false);
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return {
      spreadsheetId,
      range: response.data.updatedRange || range,
      updatedCells: response.data.updatedCells ?? undefined,
      updatedRows: response.data.updatedRows ?? undefined,
      updatedColumns: response.data.updatedColumns ?? undefined,
    };
  }

  /**
   * Append one or multiple rows to an existing sheet
   */
  async appendRows(
    spreadsheetId: string = AKOYA_PMS_SHEET_ID,
    range: string,
    rows: (string | number | boolean | null)[][]
  ): Promise<SheetAppendResult> {
    const sheets = createAkoyaSheetsClient(false);
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });

    const updates = response.data.updates;
    return {
      spreadsheetId,
      tableRange: response.data.tableRange ?? undefined,
      updatedRange: updates?.updatedRange ?? undefined,
      updatedRows: updates?.updatedRows ?? undefined,
    };
  }

  /**
   * Fetch spreadsheet metadata (tabs / sheet titles)
   */
  async getSpreadsheetMetadata(spreadsheetId: string = AKOYA_PMS_SHEET_ID) {
    const sheets = createAkoyaSheetsClient(false);
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties(sheetId,title,gridProperties)',
    });

    const title = meta.data.properties?.title || 'Untitled Spreadsheet';
    const sheetsList = (meta.data.sheets || []).map(s => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title || '',
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    }));

    return {
      success: true,
      spreadsheetId,
      title,
      sheets: sheetsList,
    };
  }
}

export const aiSaritaSheetsService = new AiSaritaSheetsService();
export default aiSaritaSheetsService;
