import React from 'react';
import LegalDocument from '../components/LegalDocument';
import termsContent from '../content/terms.md?raw';

export default function TermsPage() {
  return <LegalDocument content={termsContent} lastUpdated="27 May 2026" />;
}
