export function hidesMatters(sector) {
  return sector === 'insurance' || sector === 'accounting';
}

export function getSectorLabels(sector) {
  if (sector === 'insurance' || sector === 'insurer') {
    return {
      // StaffDashboard overview
      subtitle:           'Client management, KYC operations, and policy handling',
      myMatters:          'My Policies',
      myClients:          'My Policyholders',
      myActiveMatters:    'My Active Policies',
      myAssignedClients:  'My Assigned Policyholders',
      noMatters:          'No policies assigned',
      noClients:          'No policyholders assigned',
      manageMatters:      'Manage Policies',
      manageClients:      'Manage Policyholders',
      firmDashboard:      'Company Dashboard',
      // MatterManagement
      matterMgmtTitle:    'Policy Management',
      matterMgmtSubtitle: 'Policy tracking and compliance monitoring',
      addMatter:          '+ Add New Policy',
      totalMatters:       'Total Policies',
      openMatters:        'Open Policies',
      highRiskMatters:    'High Risk Policies',
      tabAllMatters:      'All Policies',
      noMattersFound:     'No policies found. Add your first policy to get started.',
      // KYCClientManagement
      kycMgmtTitle:       'KYC Policyholder Management',
      kycMgmtSubtitle:    'Risk-based customer due diligence system',
      addClient:          '+ Add New Policyholder',
      totalClients:       'Total Policyholders',
      activeClients:      'Active Policyholders',
      highRiskClients:    'High Risk Policyholders',
      pepClients:         'PEP Policyholders',
      tabAllClients:      'All Policyholders',
      noClientsFound:     'No policyholders found. Add your first policyholder to get started.',
      // NewClientModal — Step 1
      modalTitle:         'Add New Policyholder',
      clientTypeLabel:    'Policyholder Type*',
      clientNameLabel:    'Policyholder Name*',
      pepCheckbox:        'Policyholder is a Politically Exposed Person (PEP)',
      sowPlaceholder:     'Describe how the policyholder accumulated their overall wealth (e.g., career earnings, business ownership, inheritance, investments)',
      sowHelper:          'How did the policyholder accumulate their total wealth over time? This is required for Enhanced DD.',
      // NewClientModal — Step 3
      reviewClientName:   'Policyholder Name',
      reviewClientType:   'Policyholder Type',
      // NewClientModal — actions
      createButton:       'Create Policyholder',
      creatingButton:     'Creating...',
      // NewClientModal — alerts
      alertNameRequired:  'Policyholder name is required.',
      alertCreateError:   'Error creating policyholder: ',
    };
  }
  // Default — law firm and all other sectors
  return {
    subtitle:           'Client management, KYC operations, and matter handling',
    myMatters:          'My Matters',
    myClients:          'My Clients',
    myActiveMatters:    'My Active Matters',
    myAssignedClients:  'My Assigned Clients',
    noMatters:          'No matters assigned',
    noClients:          'No clients assigned',
    manageMatters:      'Manage Matters',
    manageClients:      'Manage Clients',
    firmDashboard:      'Firm Dashboard',
    matterMgmtTitle:    'Matter Management',
    matterMgmtSubtitle: 'Legal matter tracking and compliance monitoring',
    addMatter:          '+ Add New Matter',
    totalMatters:       'Total Matters',
    openMatters:        'Open Matters',
    highRiskMatters:    'High Risk Matters',
    tabAllMatters:      'All Matters',
    noMattersFound:     'No matters found. Add your first matter to get started.',
    kycMgmtTitle:       'KYC Client Management',
    kycMgmtSubtitle:    'Risk-based customer due diligence system',
    addClient:          '+ Add New Client',
    totalClients:       'Total Clients',
    activeClients:      'Active Clients',
    highRiskClients:    'High Risk Clients',
    pepClients:         'PEP Clients',
    tabAllClients:      'All Clients',
    noClientsFound:     'No clients found. Add your first client to get started.',
    // NewClientModal — Step 1
    modalTitle:         'Add New Client',
    clientTypeLabel:    'Client Type*',
    clientNameLabel:    'Client Name*',
    pepCheckbox:        'Client is a Politically Exposed Person (PEP)',
    sowPlaceholder:     'Describe how the client accumulated their overall wealth (e.g., career earnings, business ownership, inheritance, investments)',
    sowHelper:          'How did the client accumulate their total wealth over time? This is required for Enhanced DD.',
    // NewClientModal — Step 3
    reviewClientName:   'Client Name',
    reviewClientType:   'Client Type',
    // NewClientModal — actions
    createButton:       'Create Client',
    creatingButton:     'Creating...',
    // NewClientModal — alerts
    alertNameRequired:  'Client name is required.',
    alertCreateError:   'Error creating client: ',
  };
}
