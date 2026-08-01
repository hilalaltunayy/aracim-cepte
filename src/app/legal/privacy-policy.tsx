import { LegalDocumentScreen } from '@/features/legal/LegalDocumentScreen';
import { legalDocuments } from '@/features/legal/legalContent';

export default function PrivacyPolicyScreen() {
  return <LegalDocumentScreen document={legalDocuments.privacyPolicy} />;
}
