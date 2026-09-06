import { describe, expect, it } from 'vitest';
import type {
  BodyPartCondition,
  ExpertiseReport,
  Reminder,
  Vehicle,
  VehicleDocument,
  VehicleNote,
  VehicleRecord,
} from '@/domain/entities';
import { buildVehicleReportDocument, REPORT_PDF_MAX_ROWS } from './vehicleReportDocument';

const NOW = new Date('2026-09-06T10:00:00');

const vehicle: Vehicle = {
  id: 'v1',
  ownerId: 'u1',
  brand: 'Kia',
  model: 'Sportage',
  year: 2022,
  plate: '34 ABC 123',
  currentKm: 86_400,
  fuelType: 'diesel',
  bodyType: 'suv',
  colorId: 'blue',
  color: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  archivedAt: null,
};

function record(overrides: Partial<VehicleRecord> & Pick<VehicleRecord, 'id'>): VehicleRecord {
  return {
    vehicleId: 'v1',
    ownerId: 'u1',
    recordType: 'fuel',
    category: 'Yakıt',
    amount: 1_000,
    recordDate: '2026-08-10',
    kilometer: 86_000,
    liters: 20,
    description: null,
    createdAt: '2026-08-10',
    updatedAt: '2026-08-10',
    ...overrides,
  };
}

function reminder(overrides: Partial<Reminder> & Pick<Reminder, 'id' | 'title'>): Reminder {
  return {
    vehicleId: 'v1',
    ownerId: 'u1',
    reminderType: 'periodic_maintenance',
    dueDate: null,
    dueKilometer: null,
    completed: false,
    completedAt: null,
    notificationId: null,
    notificationStatus: 'pending',
    notificationLastAttemptAt: null,
    notificationErrorCode: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

function build(overrides: Partial<Parameters<typeof buildVehicleReportDocument>[0]> = {}) {
  return buildVehicleReportDocument({
    vehicle,
    records: [],
    reminders: [],
    bodyConditions: [],
    documents: [],
    expertiseReports: [],
    notes: [],
    periodId: 'six_months',
    now: NOW,
    ...overrides,
  });
}

describe('buildVehicleReportDocument', () => {
  it('reports the vehicle identity from stored profile fields', () => {
    const document = build();
    expect(document.identity).toEqual([
      { label: 'Marka', value: 'Kia' },
      { label: 'Model', value: 'Sportage' },
      { label: 'Model yılı', value: '2022' },
      { label: 'Plaka', value: '34 ABC 123' },
      { label: 'Renk', value: 'Mavi' },
      { label: 'Yakıt tipi', value: 'Dizel' },
      { label: 'Kasa tipi', value: 'SUV' },
      { label: 'Güncel kilometre', value: '86.400 km' },
    ]);
    expect(document.vehicleHeading).toBe('Kia Sportage');
  });

  it('names missing identity fields instead of inventing them', () => {
    const document = build({
      vehicle: { ...vehicle, plate: null, year: null, colorId: null, color: null },
    });
    expect(document.missingIdentityFields).toContain('Plaka');
    expect(document.missingIdentityFields).toContain('Model yılı');
    expect(document.identity.find((field) => field.label === 'Plaka')?.value).toBe('—');
  });

  it('derives the financial summary from the same deterministic report data', () => {
    const document = build({
      records: [
        record({ id: 'f1', amount: 2_000, liters: 40, recordDate: '2026-08-01', kilometer: 85_000 }),
        record({ id: 'f2', amount: 1_000, liters: 20, recordDate: '2026-08-20', kilometer: 86_000 }),
        record({
          id: 'm1',
          recordType: 'maintenance',
          category: 'Yağ değişimi',
          amount: 3_000,
          liters: null,
          recordDate: '2026-07-05',
        }),
        record({
          id: 'e1',
          recordType: 'expense',
          category: 'Otopark',
          amount: 500,
          liters: null,
          recordDate: '2026-07-06',
        }),
      ],
    });
    const value = (label: string) =>
      document.summary.find((field) => field.label === label)?.value;
    expect(value('Yakıt harcaması')).toContain('3.000');
    expect(value('Bakım harcaması')).toContain('3.000');
    expect(value('Diğer harcamalar')).toContain('500');
    expect(value('Toplam kayıtlı harcama')).toContain('6.500');
    expect(value('Toplam yakıt')).toBe('60 L');
    expect(value('Kayıtlı bakım sayısı')).toBe('1');
    // 3 categories present -> 3 distribution slices summing to 100%.
    expect(document.distribution.map((slice) => slice.label)).toEqual(['Yakıt', 'Bakım', 'Diğer']);
  });

  it('does not turn an unknown fuel total into zero', () => {
    const document = build({
      records: [record({ id: 'f1', liters: null, amount: 800 })],
    });
    expect(document.summary.find((field) => field.label === 'Toplam yakıt')?.value).toBe('—');
    expect(
      document.summary.find((field) => field.label === 'Ortalama litre fiyatı')?.value,
    ).toBe('—');
  });

  it('caps history tables and says so', () => {
    const many = Array.from({ length: REPORT_PDF_MAX_ROWS + 4 }, (_, index) =>
      record({
        id: `m${index}`,
        recordType: 'maintenance',
        liters: null,
        amount: 100,
        recordDate: `2026-08-${String((index % 28) + 1).padStart(2, '0')}`,
      }),
    );
    const document = build({ records: many });
    expect(document.maintenanceRows).toHaveLength(REPORT_PDF_MAX_ROWS);
    expect(document.maintenanceTruncated).toBe(true);
  });

  it('maps every body part of the vehicle schema, marking unrecorded ones honestly', () => {
    const conditions: BodyPartCondition[] = [
      {
        id: 'b1',
        vehicleId: 'v1',
        ownerId: 'u1',
        schemaType: 'suv_crossover',
        partKey: 'hood',
        conditions: ['painted'],
        condition: 'painted',
        note: 'Ön kaput boyalı',
        createdAt: 'x',
        updatedAt: 'x',
      },
    ];
    const document = build({ bodyConditions: conditions });
    const hood = document.bodyParts.find((part) => part.key === 'hood');
    expect(hood?.conditionLabel).toBe('Boyalı');
    expect(hood?.note).toBe('Ön kaput boyalı');
    // Every part carries real line-art geometry, so the PDF is not a screenshot.
    expect(document.bodyParts.every((part) => part.path.length > 0)).toBe(true);
    expect(document.bodySchema.silhouettePath.length).toBeGreaterThan(0);
    const roof = document.bodyParts.find((part) => part.key === 'roof');
    expect(roof?.conditionLabel).toBe('Kayıt yok');
    expect(roof?.condition).toBeNull();
  });

  it('separates overdue reminders from upcoming ones', () => {
    const document = build({
      reminders: [
        reminder({ id: 'r1', title: 'Muayene', dueDate: '2026-01-01' }),
        reminder({ id: 'r2', title: 'Yağ bakımı', dueKilometer: 86_500 }),
        reminder({ id: 'r3', title: 'Uzak bakım', dueKilometer: 200_000 }),
        reminder({ id: 'r4', title: 'Tamamlanan', dueDate: '2026-01-01', completed: true }),
      ],
    });
    expect(document.overdueReminders).toHaveLength(1);
    expect(document.overdueReminders[0].cells[0]).toBe('Muayene');
    expect(document.upcomingReminders.map((row) => row.cells[0])).toEqual(['Yağ bakımı']);
  });

  it('summarises documents and lists only the ones needing attention', () => {
    const documents: VehicleDocument[] = [
      {
        id: 'd1',
        vehicleId: 'v1',
        ownerId: 'u1',
        documentType: 'inspection',
        title: 'Muayene 2026',
        documentNumber: null,
        issuerName: null,
        startDate: null,
        eventDate: null,
        issueDate: null,
        expiryDate: '2026-09-20',
        note: null,
        attachmentPath: null,
        attachments: [],
        createdAt: 'x',
        updatedAt: 'x',
      },
      {
        id: 'd2',
        vehicleId: 'v1',
        ownerId: 'u1',
        documentType: 'traffic_insurance',
        title: 'Trafik 2027',
        documentNumber: null,
        issuerName: null,
        startDate: null,
        eventDate: null,
        issueDate: null,
        expiryDate: '2027-12-31',
        note: null,
        attachmentPath: null,
        attachments: [],
        createdAt: 'x',
        updatedAt: 'x',
      },
    ];
    const document = build({ documents });
    expect(document.documentSummary.find((f) => f.label === 'Kayıtlı belge')?.value).toBe('2');
    expect(document.expiringDocuments).toHaveLength(1);
    expect(document.expiringDocuments[0].cells[1]).toBe('Muayene 2026');
  });

  it('carries expertise and note highlights without embedding the files themselves', () => {
    const expertise: ExpertiseReport[] = [
      {
        id: 'e1',
        vehicleId: 'v1',
        ownerId: 'u1',
        reportDate: '2026-02-01',
        companyName: 'Test Ekspertiz',
        overallNote: 'Genel durum iyi.',
        reportNumber: null,
        attachmentPath: 'private/path.pdf',
        attachments: [],
        createdAt: 'x',
        updatedAt: 'x',
      },
    ];
    const notes: VehicleNote[] = [
      {
        id: 'n1',
        vehicleId: 'v1',
        ownerId: 'u1',
        title: 'Lastik',
        content: 'Kışlık lastikler depoda.',
        createdAt: 'x',
        updatedAt: '2026-08-01',
      },
    ];
    const document = build({ expertiseReports: expertise, notes });
    expect(document.expertiseSummary[0]).toEqual({
      label: 'Kayıtlı ekspertiz raporu',
      value: '1',
    });
    expect(document.expertiseNotes).toEqual(['Genel durum iyi.']);
    expect(document.noteHighlights).toEqual([
      { title: 'Lastik', content: 'Kışlık lastikler depoda.' },
    ]);
    // Storage paths are never part of the printable document.
    expect(JSON.stringify(document)).not.toContain('private/path.pdf');
  });

  it('ignores records and reminders belonging to another vehicle', () => {
    const document = build({
      records: [record({ id: 'other', vehicleId: 'v2', amount: 99_999 })],
      reminders: [reminder({ id: 'r9', title: 'Başka araç', vehicleId: 'v2', dueDate: '2026-01-01' })],
    });
    expect(document.summary.find((f) => f.label === 'Toplam kayıtlı harcama')?.value).not.toContain(
      '99.999',
    );
    expect(document.overdueReminders).toHaveLength(0);
  });
});
