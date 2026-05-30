import { supabase } from '../supabaseClient';

export async function getFrameworkMappingForCategory(categoryValue) {
  if (!categoryValue) {
    return {
      framework_type: 'dnfbp',
      assessment_route: '/assessment/form',
      kyc_route: '/kyc-form'
    };
  }

  const { data, error } = await supabase
    .from('dnfbp_framework_mappings')
    .select('framework_type, assessment_route, kyc_route')
    .eq('category_value', categoryValue)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching framework mapping:', error);
    return {
      framework_type: 'dnfbp',
      assessment_route: '/assessment/form',
      kyc_route: '/kyc-form'
    };
  }

  return data || {
    framework_type: 'dnfbp',
    assessment_route: '/assessment/form',
    kyc_route: '/kyc-form'
  };
}

export async function getRoutesForOrganization(organizationId) {
  if (!organizationId) {
    return {
      framework_type: 'dnfbp',
      assessment_route: '/assessment/form',
      kyc_route: '/kyc-form'
    };
  }

  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('dnfbp_category')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError || !orgData) {
    console.error('Error fetching organization:', orgError);
    return {
      framework_type: 'dnfbp',
      assessment_route: '/assessment/form',
      kyc_route: '/kyc-form'
    };
  }

  return getFrameworkMappingForCategory(orgData.dnfbp_category);
}

export function getKYCRouteForCategory(categoryValue) {
  switch (categoryValue) {
    case 'accountant':
      return '/accountant-kyc-form';
    case 'insurance_company':
      return '/kyc-form';
    default:
      return '/kyc-form';
  }
}
