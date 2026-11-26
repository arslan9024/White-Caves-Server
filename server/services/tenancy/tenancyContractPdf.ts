// @ts-nocheck
import PDFDocument from 'pdfkit';
import * as pdfLib from 'pdf-lib';
import fs from 'fs';
import admin from 'firebase-admin';

export function validateTenancyContractData(contract) {
  const errors = [];

  if (!contract.propertyInfo?.description) errors.push('Property description is required');
  if (!contract.propertyInfo?.address) errors.push('Property address is required');
  if (!contract.propertyInfo?.unitArea) errors.push('Unit area is required');

  if (!contract.landlordInfo?.name) errors.push('Landlord name is required');
  if (!contract.landlordInfo?.emiratesId && !contract.landlordInfo?.passportNumber) {
    errors.push('Landlord Emirates ID or Passport is required');
  }
  if (!contract.landlordInfo?.email) errors.push('Landlord email is required');

  if (!contract.tenantInfo?.name) errors.push('Tenant name is required');
  if (!contract.tenantInfo?.emiratesId && !contract.tenantInfo?.passportNumber) {
    errors.push('Tenant Emirates ID or Passport is required');
  }
  if (!contract.tenantInfo?.email) errors.push('Tenant email is required');

  if (!contract.tenancyTerms?.leaseStartDate) errors.push('Lease start date is required');
  if (!contract.tenancyTerms?.leaseEndDate) errors.push('Lease end date is required');
  if (!contract.tenancyTerms?.rentAmount) errors.push('Rent amount is required');

  return { isValid: errors.length === 0, errors };
}

export async function createTenancyPdfFromScratch(contract) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('TENANCY AGREEMENT', { align: 'center' });
      doc.fontSize(12).text(`Reference: ${contract.referenceNumber}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text('PROPERTY INFORMATION', { underline: true });
      doc.fontSize(10);
      doc.text(`Description: ${contract.propertyInfo?.description || 'N/A'}`);
      doc.text(`Address: ${contract.propertyInfo?.address || 'N/A'}`);
      doc.text(`City: ${contract.propertyInfo?.city || 'N/A'}`);
      doc.text(`Area: ${contract.propertyInfo?.unitArea || 'N/A'} sq.ft.`);
      doc.text(`Type: ${contract.propertyInfo?.propertyType || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(14).text('LANDLORD INFORMATION', { underline: true });
      doc.fontSize(10);
      doc.text(`Name: ${contract.landlordInfo?.name || 'N/A'}`);
      doc.text(
        `ID: ${contract.landlordInfo?.emiratesId || contract.landlordInfo?.passportNumber || 'N/A'}`
      );
      doc.text(`Email: ${contract.landlordInfo?.email || 'N/A'}`);
      doc.text(`Phone: ${contract.landlordInfo?.phone || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(14).text('TENANT INFORMATION', { underline: true });
      doc.fontSize(10);
      doc.text(`Name: ${contract.tenantInfo?.name || 'N/A'}`);
      doc.text(
        `ID: ${contract.tenantInfo?.emiratesId || contract.tenantInfo?.passportNumber || 'N/A'}`
      );
      doc.text(`Email: ${contract.tenantInfo?.email || 'N/A'}`);
      doc.text(`Phone: ${contract.tenantInfo?.phone || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(14).text('TENANCY TERMS', { underline: true });
      doc.fontSize(10);
      const startDate = contract.tenancyTerms?.leaseStartDate
        ? new Date(contract.tenancyTerms.leaseStartDate).toLocaleDateString()
        : 'N/A';
      const endDate = contract.tenancyTerms?.leaseEndDate
        ? new Date(contract.tenancyTerms.leaseEndDate).toLocaleDateString()
        : 'N/A';
      doc.text(`Lease Period: ${startDate} to ${endDate}`);
      doc.text(`Duration: ${contract.tenancyTerms?.leasePeriodMonths || 'N/A'} months`);
      doc.text(`Monthly Rent: AED ${contract.tenancyTerms?.rentAmount || 'N/A'}`);
      doc.text(`Security Deposit: AED ${contract.tenancyTerms?.securityDeposit || 'N/A'}`);
      doc.text(`Payment Method: ${contract.tenancyTerms?.paymentMethod || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(14).text('SIGNATURES', { underline: true });
      doc.fontSize(10).moveDown();
      doc.text('Landlord Signature: ___________________     Date: ___________');
      doc.moveDown();
      doc.text('Tenant Signature: ___________________     Date: ___________');

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function fillEjariTemplate(templatePath, contract) {
  try {
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await pdfLib.PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    const fieldMappings = {
      property_description: contract.propertyInfo?.description,
      property_address: contract.propertyInfo?.address,
      property_city: contract.propertyInfo?.city,
      property_area: contract.propertyInfo?.unitArea?.toString(),
      property_type: contract.propertyInfo?.propertyType,
      landlord_name: contract.landlordInfo?.name,
      landlord_id: contract.landlordInfo?.emiratesId || contract.landlordInfo?.passportNumber,
      landlord_email: contract.landlordInfo?.email,
      landlord_phone: contract.landlordInfo?.phone,
      tenant_name: contract.tenantInfo?.name,
      tenant_id: contract.tenantInfo?.emiratesId || contract.tenantInfo?.passportNumber,
      tenant_email: contract.tenantInfo?.email,
      tenant_phone: contract.tenantInfo?.phone,
      lease_start_date: contract.tenancyTerms?.leaseStartDate?.toLocaleDateString(),
      lease_end_date: contract.tenancyTerms?.leaseEndDate?.toLocaleDateString(),
      rent_amount: contract.tenancyTerms?.rentAmount?.toString(),
      security_deposit: contract.tenancyTerms?.securityDeposit?.toString(),
    };

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
      try {
        const field = form.getField(fieldName);
        if (field && value) field.setText(String(value));
      } catch {
        // Skip fields absent from template
      }
    });

    form.flatten();
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error filling EJARI template:', error);
    return createTenancyPdfFromScratch(contract);
  }
}

export async function uploadTenancyPdfToFirebase(pdfBuffer, fileName) {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(fileName);
    await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    return url;
  } catch (error) {
    throw new Error(`Error uploading to Firebase: ${error.message}`);
  }
}
