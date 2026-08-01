import { LegalDocumentScreen } from '@/features/legal/LegalDocumentScreen';
import { legalDocuments } from '@/features/legal/legalContent';

export default function AccountAndDataDeletionScreen() {
  return <LegalDocumentScreen document={legalDocuments.accountAndDataDeletion} />;
}
