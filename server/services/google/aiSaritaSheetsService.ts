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
  async getRange(spreadsheetId: string = DEFAULT_AKOYA_SHEET_ID, range: string = 'Sheet1!A1:Z50') {
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
    spreadsheetId: string = DEFAULT_AKOYA_SHEET_ID,
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
    spreadsheetId: string = DEFAULT_AKOYA_SHEET_ID,
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
  async getSpreadsheetMetadata(spreadsheetId: string = DEFAULT_AKOYA_SHEET_ID) {
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
