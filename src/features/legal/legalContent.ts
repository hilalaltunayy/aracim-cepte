import { generatedLegalDocuments } from './generatedLegalContent';

export interface LegalSection {
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export interface LegalDocument {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly sourcePath: string;
  readonly sections: readonly LegalSection[];
}

const combinedApplicationAndDeletion = generatedLegalDocuments.kvkkApplicationAndAccountDeletion;

function selectCombinedSections(
  id: string,
  title: string,
  includedSectionNumbers: readonly number[],
): LegalDocument {
  const prefixes = includedSectionNumbers.map((sectionNumber) => `${sectionNumber}. `);
  return {
    ...combinedApplicationAndDeletion,
    id,
    title,
    sections: combinedApplicationAndDeletion.sections.filter(
      (section) =>
        section.title === 'Belge durumu' ||
        prefixes.some((prefix) => section.title.startsWith(prefix)),
    ),
  };
}

export const legalDocuments = {
  kvkkNotice: generatedLegalDocuments.kvkkNotice,
  privacyPolicy: generatedLegalDocuments.privacyPolicy,
  retentionAndDeletion: generatedLegalDocuments.retentionAndDeletion,
  accountAndDataDeletion: selectCombinedSections(
    'accountAndDataDeletion',
    'Hesap ve Veri Silme',
    [4, 5, 6, 7, 10],
  ),
  kvkkApplication: selectCombinedSections(
    'kvkkApplication',
    'KVKK Başvuru Bilgileri',
    [1, 2, 3, 7, 8, 9],
  ),
} as const satisfies Record<string, LegalDocument>;
