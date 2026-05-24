import React from 'react';
import { LegalScreen } from '../components/legal/LegalScreen';
import { legalPages } from '../constants/legalContent';

export default function AboutScreen() {
  return <LegalScreen content={legalPages.about} />;
}
