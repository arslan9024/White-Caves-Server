/**
 * saritaSheets.routes.ts
 * White Caves Real Estate LLC — AI Sarita Google Sheets Management Routes
 * Standard: AEGIS Canonical Single Purpose (< 350 lines, AEG-042)
 *
 * Exposes authenticated endpoints for AI Sarita to read, edit, and append Google Sheets.
 */

import { Router, Request, Response } from 'express';
import { aiSaritaSheetsService } from '../services/google/aiSaritaSheetsService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Retrieve metadata & list of tabs
router.get('/meta', requireAuth, async (req: Request, res: Response) => {
  try {
    const spreadsheetId = typeof req.query.spreadsheetId === 'string' ? req.query.spreadsheetId : undefined;
    const meta = await aiSaritaSheetsService.getSpreadsheetMetadata(spreadsheetId);
    res.json({ success: true, data: meta });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Metadata fetch failed' });
  }
});

// Read a range of cells
router.get('/range', requireAuth, async (req: Request, res: Response) => {
  try {
    const spreadsheetId = typeof req.query.spreadsheetId === 'string' ? req.query.spreadsheetId : undefined;
    const range = typeof req.query.range === 'string' ? req.query.range : 'Sheet1!A1:Z50';
    const data = await aiSaritaSheetsService.getRange(spreadsheetId, range);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Range read failed' });
  }
});

// Edit / update specific cells
router.put('/update', requireAuth, async (req: Request, res: Response) => {
  try {
    const { spreadsheetId, range, values } = req.body || {};
    if (!range || !Array.isArray(values)) {
      return res.status(400).json({ success: false, error: 'range and values array are required' });
    }
    const result = await aiSaritaSheetsService.updateRange(spreadsheetId, range, values);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Cell update failed' });
  }
});

// Append rows
router.post('/append', requireAuth, async (req: Request, res: Response) => {
  try {
    const { spreadsheetId, range, rows } = req.body || {};
    if (!range || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, error: 'range and rows array are required' });
    }
    const result = await aiSaritaSheetsService.appendRows(spreadsheetId, range, rows);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Row append failed' });
  }
});

export default router;
