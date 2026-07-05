import { SERVICE_UNIT_TYPES, SECTORS } from '../data/sectorConfig.js';

// Authoritative slug → human label map covering all sectors.
// Labels for law_firm are taken from the KYC form's canonical hardcoded list
// (which uses "Legal Entities" in entity_creation_management, not sectorConfig's shorter form).
export const AML_TRIGGER_LABELS = {
  // Law firm (9)
  real_property_transaction: 'Purchase/Sale of Real Property',
  commercial_enterprise_transaction: 'Purchase/Sale of Commercial Enterprises',
  client_funds_management: 'Management of Client Funds/Securities/Assets',
  bank_account_management: 'Opening/Management of Bank/Savings Accounts',
  corporation_capital_organization: 'Organizing Capital for Corporations/Legal Entities',
  entity_creation_management: 'Creation/Management/Direction of Corporations/Legal Entities',
  business_entity_transaction: 'Buying/Selling of Business Entities',
  financial_transaction_representation: 'Acting on Behalf of Client in Financial Transactions',
  real_estate_transaction_representation: 'Acting on Behalf of Client in Real Estate Transactions',
  // Insurance (7)
  life_insurance_single_premium: 'Life Insurance – Single Premium',
  life_insurance_product: 'Life Insurance – Regular Premium',
  investment_linked_product: 'Investment-Linked Insurance',
  endowment_product: 'Endowment Policy',
  annuity_product: 'Annuity Product',
  early_termination: 'Policy Surrender / Early Termination',
  beneficiary_change: 'Beneficiary Change',
  // Accounting (6)
  tax_advisory: 'Tax Planning & Advisory',
  trust_foundation_setup: 'Trust/Foundation Setup',
  company_formation: 'Company Formation & Incorporation',
  offshore_structuring: 'Offshore/International Tax Structuring',
  real_estate_services: 'Real Estate Transaction Services',
  cash_intensive_audit: 'Cash-Intensive Business Audit',
  // General DNFBP (6)
  real_estate_transaction: 'Real Estate Sale',
  precious_metals_transaction: 'Precious Metals Sale',
  precious_stones_transaction: 'Precious Stones Sale',
  trust_services: 'Trust Services',
  company_services: 'Company Formation/Management Services',
  large_cash_transaction: 'Large Cash Transaction',
};

/**
 * Returns a deduplicated array of { value, label } trigger objects for a given sector,
 * derived from SERVICE_UNIT_TYPES. Falls back to the law_firm list for unknown sectors.
 */
export function getAMLTriggersForSector(sector) {
  const units = SERVICE_UNIT_TYPES[sector] || SERVICE_UNIT_TYPES[SECTORS.LAW_FIRM];
  const slugs = [...new Set(units.flatMap(u => u.amlTriggers))];
  return slugs.map(slug => ({
    value: slug,
    label: AML_TRIGGER_LABELS[slug] || slug.replace(/_/g, ' '),
  }));
}
