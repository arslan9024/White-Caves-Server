// @ts-nocheck
import { KYCPolicyEngine } from './kyc/kycPolicies.js';
import { kycWorkflowMethods } from './kyc/kycWorkflows.js';
import { kycQueryMethods } from './kyc/kycQueries.js';

class KYCService extends KYCPolicyEngine {}
Object.assign(KYCService, kycWorkflowMethods, kycQueryMethods);

export default KYCService;
