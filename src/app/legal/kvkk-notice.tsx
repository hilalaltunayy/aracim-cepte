import { LegalDocumentScreen } from '@/features/legal/LegalDocumentScreen';
import { kvkkNoticeSections } from '@/features/legal/legalContent';

export default function KvkkNoticeScreen() {
  return <LegalDocumentScreen title="KVKK Aydınlatma Metni" sections={kvkkNoticeSections} />;
}
