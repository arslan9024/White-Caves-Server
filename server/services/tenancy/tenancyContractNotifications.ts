// @ts-nocheck
import NotificationService from '../NotificationService.js';

export function getSignatureEmailTemplate(party, contract, signUrl) {
  return `
      <h2>Tenancy Agreement Signature Request</h2>
      <p>Dear ${party},</p>
      <p>You have been requested to sign the tenancy agreement for the following property:</p>
      <ul>
        <li><strong>Property:</strong> ${contract.propertyInfo?.description}</li>
        <li><strong>Address:</strong> ${contract.propertyInfo?.address}</li>
        <li><strong>Lease Period:</strong> ${new Date(contract.tenancyTerms?.leaseStartDate).toLocaleDateString()} to ${new Date(contract.tenancyTerms?.leaseEndDate).toLocaleDateString()}</li>
        <li><strong>Monthly Rent:</strong> AED ${contract.tenancyTerms?.rentAmount}</li>
        <li><strong>Contract Reference:</strong> ${contract.referenceNumber}</li>
      </ul>
      <p>Please click the link below to review and sign the agreement:</p>
      <a href="${signUrl}" style="display: inline-block; padding: 10px 20px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 5px;">Sign Agreement</a>
      <p>This link will expire in 7 days.</p>
      <p>Best regards,<br>White Caves Real Estate LLC</p>
    `;
}

export async function sendSignatureRequestNotifications(contract, landlordSignUrl, tenantSignUrl) {
  await NotificationService.sendEmail(
    contract.landlordInfo?.email,
    'Tenancy Agreement Signature Required',
    getSignatureEmailTemplate('Landlord', contract, landlordSignUrl)
  );

  await NotificationService.sendEmail(
    contract.tenantInfo?.email,
    'Tenancy Agreement Signature Required',
    getSignatureEmailTemplate('Tenant', contract, tenantSignUrl)
  );

  if (contract.landlordInfo?.mobileNumber) {
    await NotificationService.sendWhatsApp(
      contract.landlordInfo.mobileNumber,
      `Dear ${contract.landlordInfo?.name}, please sign your tenancy agreement here: ${landlordSignUrl}`
    );
  }

  if (contract.tenantInfo?.mobileNumber) {
    await NotificationService.sendWhatsApp(
      contract.tenantInfo.mobileNumber,
      `Dear ${contract.tenantInfo?.name}, please sign your tenancy agreement here: ${tenantSignUrl}`
    );
  }
}

export async function notifyFullySignedContract(contract) {
  try {
    const message = `Tenancy agreement ${contract.referenceNumber} has been fully signed by both parties. The contract is now official.`;

    if (contract.landlordInfo?.email) {
      await NotificationService.sendEmail(
        contract.landlordInfo.email,
        'Tenancy Agreement Signed',
        `<p>Dear ${contract.landlordInfo?.name},</p><p>${message}</p><p>Contract Reference: ${contract.referenceNumber}</p>`
      );
    }

    if (contract.tenantInfo?.email) {
      await NotificationService.sendEmail(
        contract.tenantInfo.email,
        'Tenancy Agreement Signed',
        `<p>Dear ${contract.tenantInfo?.name},</p><p>${message}</p><p>Contract Reference: ${contract.referenceNumber}</p>`
      );
    }

    if (contract.landlordInfo?.mobileNumber) {
      await NotificationService.sendWhatsApp(contract.landlordInfo.mobileNumber, message);
    }

    if (contract.tenantInfo?.mobileNumber) {
      await NotificationService.sendWhatsApp(contract.tenantInfo.mobileNumber, message);
    }
  } catch (error) {
    console.error('Error notifying parties:', error);
  }
}
