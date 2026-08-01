import { LegalDocumentScreen } from '@/features/legal/LegalDocumentScreen';
import { legalDocuments } from '@/features/legal/legalContent';

export default function RetentionAndDeletionScreen() {
  return <LegalDocumentScreen document={legalDocuments.retentionAndDeletion} />;
}
