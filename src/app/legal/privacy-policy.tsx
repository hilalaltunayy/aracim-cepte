import { LegalDocumentScreen } from '@/features/legal/LegalDocumentScreen';
import { privacyPolicySections } from '@/features/legal/legalContent';

export default function PrivacyPolicyScreen() {
  return <LegalDocumentScreen title="Gizlilik Politikası" sections={privacyPolicySections} />;
}
