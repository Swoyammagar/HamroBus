import React from 'react';
import { LegalScreen } from '../components/legal/LegalScreen';
import { legalPages } from '../constants/legalContent';

export default function PrivacyScreen() {
  return <LegalScreen content={legalPages.privacy} />;
}
