import { LegalDocumentScreen } from '@/features/legal/LegalDocumentScreen';
import { legalDocuments } from '@/features/legal/legalContent';

export default function KvkkApplicationScreen() {
  return <LegalDocumentScreen document={legalDocuments.kvkkApplication} />;
}
