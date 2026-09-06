import { describe, expect, it } from 'vitest';
import type { VehicleReportDocument } from './vehicleReportDocument';
import { renderVehicleReportHtml } from './vehicleReportHtml';

const base: VehicleReportDocument = {
  title: 'Araç Geçmiş ve Durum Raporu',
  generatedAtLabel: '06 Eylül 2026 10:00',
  periodLabel: 'Son 6 ay',
  vehicleHeading: 'Kia Sportage',
  identity: [{ label: 'Plaka', value: '34 ABC 123' }],
  summary: [{ label: 'Toplam kayıtlı harcama', value: '6.500,00 ₺' }],
  trend: [{ label: 'ağu', total: 100, formattedTotal: '100,00 ₺', heightPercent: 100 }],
  distribution: [
    { label: 'Yakıt', amount: 100, formattedAmount: '100,00 ₺', sharePercent: 100 },
  ],
  maintenanceRows: [{ cells: ['01 Ağustos 2026', '86.000 km', 'Yağ değişimi', '3.000,00 ₺'] }],
  maintenanceTruncated: false,
  fuelRows: [],
  fuelTruncated: false,
  bodySchema: {
    silhouettePath: 'M0 0 L10 10 Z',
    windshieldPath: 'M1 1 L2 2 Z',
    rearWindowPath: 'M3 3 L4 4 Z',
  },
  bodyParts: [
    {
      key: 'hood',
      label: 'Kaput',
      path: 'M5 5 L6 6 Z',
      condition: 'painted',
      conditionLabel: 'Boyalı',
      note: null,
    },
  ],
  bodyConditionCounts: [{ label: 'Boyalı', count: 1 }],
  expertiseSummary: [{ label: 'Kayıtlı ekspertiz raporu', value: '1' }],
  expertiseNotes: [],
  documentSummary: [{ label: 'Kayıtlı belge', value: '2' }],
  expiringDocuments: [],
  overdueReminders: [],
  upcomingReminders: [],
  missingIdentityFields: [],
  noteHighlights: [],
};

describe('renderVehicleReportHtml', () => {
  it('produces a printable four-section document with Turkish text intact', () => {
    const html = renderVehicleReportHtml(base);
    expect(html).toContain('<meta charset="utf-8" />');
    expect(html).toContain('@page');
    expect(html.match(/class="page"/g)).toHaveLength(4);
    expect(html).toContain('Araç Geçmiş ve Durum Raporu');
    expect(html).toContain('Kaput');
    expect(html).toContain('Yağ değişimi');
    expect(html).toContain('Aracım Cepte');
  });

  it('draws the body schema as real vector line-art', () => {
    const html = renderVehicleReportHtml(base);
    expect(html).toContain('<svg viewBox="0 0 260 440"');
    expect(html).toContain('d="M0 0 L10 10 Z"');
    expect(html).toContain('d="M5 5 L6 6 Z"');
    // No bitmap of the app UI is embedded anywhere.
    expect(html).not.toContain('data:image');
  });

  it('escapes user-supplied text so a note can never inject markup', () => {
    const html = renderVehicleReportHtml({
      ...base,
      identity: [{ label: 'Plaka', value: '<script>alert(1)</script>' }],
      noteHighlights: [
        { title: 'A & B', content: '<img src=x onerror="alert(2)">' },
      ],
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });

  it('states absent data rather than rendering an empty table', () => {
    const html = renderVehicleReportHtml({ ...base, maintenanceRows: [], fuelRows: [] });
    expect(html).toContain('Bu dönemde kayıtlı bakım bulunmuyor.');
    expect(html).toContain('Bu dönemde kayıtlı yakıt alımı bulunmuyor.');
  });

  it('notes when a history table was capped', () => {
    const html = renderVehicleReportHtml({ ...base, maintenanceTruncated: true });
    expect(html).toContain('Yalnızca en son 15 bakım kaydı listelenmiştir.');
  });

  it('carries a disclaimer so the report is not mistaken for an official document', () => {
    const html = renderVehicleReportHtml(base);
    expect(html).toContain('Resmi ekspertiz, muayene veya hasar tespit belgesi yerine geçmez.');
  });
});
