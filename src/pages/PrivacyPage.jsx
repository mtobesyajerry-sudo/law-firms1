import React from 'react';
import LegalDocument from '../components/LegalDocument';
import privacyContent from '../content/privacy.md?raw';

export default function PrivacyPage() {
  return <LegalDocument content={privacyContent} lastUpdated="27 May 2026" centreTop />;
}
