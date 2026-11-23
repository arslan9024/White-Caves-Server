import { prisma } from '../../database.js';
import logger from '../../utils/logger.js';
import {
  type GeneratedFile,
  XLSX_MIME,
  CSV_MIME,
  safeDate,
  buildCsvBuffer,
} from './documentTypes.js';

export async function generateLeadsExcel(): Promise<GeneratedFile> {
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      source: true,
      budget: true,
      score: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const exceljsModule = await import('exceljs').catch(() => null);
  if (!exceljsModule) {
    const rows = leads.map(lead => [
      lead.id,
      lead.name,
      lead.email,
      lead.phone,
      lead.status,
      lead.source,
      lead.budget,
      lead.score,
      safeDate(lead.createdAt),
    ]);

    return {
      buffer: buildCsvBuffer(
        ['ID', 'Name', 'Email', 'Phone', 'Status', 'Source', 'Budget', 'Score', 'Created At'],
        rows
      ),
      mimeType: CSV_MIME,
      filename: `leads-report-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  const ExcelJS = (exceljsModule as any)?.default || (exceljsModule as any);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 26 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Source', key: 'source', width: 14 },
    { header: 'Budget', key: 'budget', width: 14 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Created At', key: 'createdAt', width: 16 },
  ];

  leads.forEach(lead =>
    sheet.addRow({
      ...lead,
      createdAt: safeDate(lead.createdAt),
    })
  );

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: XLSX_MIME,
    filename: `leads-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

export async function generatePropertiesExcel(): Promise<GeneratedFile> {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      price: true,
      location: true,
      bedrooms: true,
      bathrooms: true,
      sqft: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const exceljsModule = await import('exceljs').catch(() => null);
  if (!exceljsModule) {
    const rows = properties.map(property => [
      property.id,
      property.title,
      property.type,
      property.status,
      property.price,
      property.location,
      property.bedrooms,
      property.bathrooms,
      property.sqft,
      safeDate(property.createdAt),
    ]);

    return {
      buffer: buildCsvBuffer(
        ['ID', 'Title', 'Type', 'Status', 'Price', 'Location', 'Bedrooms', 'Bathrooms', 'Sqft', 'Created At'],
        rows
      ),
      mimeType: CSV_MIME,
      filename: `properties-report-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  const ExcelJS = (exceljsModule as any)?.default || (exceljsModule as any);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Properties');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 26 },
    { header: 'Title', key: 'title', width: 28 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Price', key: 'price', width: 14 },
    { header: 'Location', key: 'location', width: 26 },
    { header: 'Bedrooms', key: 'bedrooms', width: 10 },
    { header: 'Bathrooms', key: 'bathrooms', width: 10 },
    { header: 'Sqft', key: 'sqft', width: 10 },
    { header: 'Created At', key: 'createdAt', width: 16 },
  ];

  properties.forEach(property =>
    sheet.addRow({
      ...property,
      createdAt: safeDate(property.createdAt),
    })
  );

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: XLSX_MIME,
    filename: `properties-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}
