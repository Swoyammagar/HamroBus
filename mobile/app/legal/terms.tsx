import React from 'react';
import { LegalScreen } from '../components/legal/LegalScreen';
import { legalPages } from '../constants/legalContent';

export default function TermsScreen() {
  return <LegalScreen content={legalPages.terms} />;
}
