import { resolveFrameworkType } from './frameworkUtils';

/**
 * Returns the correct KYC form route for a given organization sector.
 * Single source of truth — every KYC entry point must call this instead of
 * hardcoding a path.
 *
 * @param {string} sector - organization.sector value
 * @param {string|null} clientId - existing kyc_clients row ID for "Complete KYC" flows
 * @returns {string|null} route path, or null if sector is not configured for KYC
 */
export function getKycFormRoute(sector, clientId = null) {
  const frameworkType = resolveFrameworkType(sector);

  switch (frameworkType) {
    case 'audit_firm':
      return clientId ? null : '/accountant-kyc-form';

    case 'insurer':
      return clientId ? `/kyc-form/${clientId}` : '/kyc-form';

    case 'legal_professionals':
      return clientId ? `/kyc-form/${clientId}` : '/kyc-form';

    default:
      // null / general_dnfbp / unknown — no KYC form configured for this sector
      return null;
  }
}
