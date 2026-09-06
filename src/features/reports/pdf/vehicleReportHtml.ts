import type { BodyCondition } from '@/domain/entities';
import type {
  ReportBodyPart,
  ReportField,
  ReportTableRow,
  VehicleReportDocument,
} from './vehicleReportDocument';

/**
 * Renders the deterministic report document to a print-friendly HTML string.
 *
 * This is NOT a screenshot of the dashboard: the app UI is a dark, interactive,
 * touch-sized surface, while a report that people print, e-mail or hand to a
 * buyer needs a light corporate page with real tables and selectable text. So
 * the two share their data, not their markup.
 */

/** Every value that reaches the page goes through this — titles, notes and the plate are user input. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const CONDITION_FILLS: Readonly<Record<BodyCondition, string>> = {
  original: '#DCEFE4',
  painted: '#FBE6C8',
  locally_painted: '#FDF3DC',
  replaced: '#F6D6D6',
  damaged: '#EFB9B9',
  unknown: '#E8ECEE',
};
const NO_RECORD_FILL = '#F2F5F6';

const CONDITION_SWATCHES: readonly { label: string; fill: string }[] = [
  { label: 'Orijinal', fill: CONDITION_FILLS.original },
  { label: 'Boyalı', fill: CONDITION_FILLS.painted },
  { label: 'Lokal Boyalı', fill: CONDITION_FILLS.locally_painted },
  { label: 'Değişen', fill: CONDITION_FILLS.replaced },
  { label: 'Hasarlı', fill: CONDITION_FILLS.damaged },
  { label: 'Kayıt yok', fill: NO_RECORD_FILL },
];

function fieldGrid(fields: readonly ReportField[]): string {
  return `<div class="grid">${fields
    .map(
      (field) =>
        `<div class="cell"><span class="cell-label">${escapeHtml(
          field.label,
        )}</span><span class="cell-value">${escapeHtml(field.value)}</span></div>`,
    )
    .join('')}</div>`;
}

function table(headers: readonly string[], rows: readonly ReportTableRow[], empty: string): string {
  if (!rows.length) return `<p class="empty">${escapeHtml(empty)}</p>`;
  return `<table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${rows
        .map(
          (row) =>
            `<tr>${row.cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
        )
        .join('')}</tbody>
    </table>`;
}

function bodyDiagram(document: VehicleReportDocument): string {
  const fill = (part: ReportBodyPart) =>
    part.condition ? CONDITION_FILLS[part.condition] : NO_RECORD_FILL;
  return `<svg viewBox="0 0 260 440" class="diagram" role="img" aria-label="Araç gövde şeması">
      <path d="${document.bodySchema.silhouettePath}" fill="#FFFFFF" stroke="#9AA9B0" stroke-width="1.6"/>
      ${document.bodyParts
        .map(
          (part) =>
            `<path d="${part.path}" fill="${fill(part)}" stroke="#8C9BA3" stroke-width="1"/>`,
        )
        .join('')}
      <path d="${document.bodySchema.windshieldPath}" fill="#E4EFF3" stroke="#8C9BA3" stroke-width="1"/>
      <path d="${document.bodySchema.rearWindowPath}" fill="#E4EFF3" stroke="#8C9BA3" stroke-width="1"/>
    </svg>`;
}

function trendChart(document: VehicleReportDocument): string {
  if (!document.trend.length) {
    return '<p class="empty">Bu dönem için eğilim verisi yok.</p>';
  }
  return `<div class="bars">${document.trend
    .map(
      (point) =>
        `<div class="bar-slot">
           <div class="bar-amount">${escapeHtml(point.formattedTotal)}</div>
           <div class="bar-track"><div class="bar-fill" style="height:${point.heightPercent}%"></div></div>
           <div class="bar-label">${escapeHtml(point.label)}</div>
         </div>`,
    )
    .join('')}</div>`;
}

function distributionBars(document: VehicleReportDocument): string {
  if (!document.distribution.length) {
    return '<p class="empty">Bu dönem için harcama kaydı yok.</p>';
  }
  return `<div class="dist">${document.distribution
    .map(
      (slice) =>
        `<div class="dist-row">
           <span class="dist-label">${escapeHtml(slice.label)}</span>
           <span class="dist-track"><span class="dist-fill" style="width:${slice.sharePercent}%"></span></span>
           <span class="dist-value">${escapeHtml(slice.formattedAmount)} · %${slice.sharePercent}</span>
         </div>`,
    )
    .join('')}</div>`;
}

function bulletList(items: readonly string[], empty: string): string {
  if (!items.length) return `<p class="empty">${escapeHtml(empty)}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

const STYLES = `
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, "Noto Sans", sans-serif;
    color: #16323F;
    font-size: 10.5px;
    line-height: 1.45;
    background: #FFFFFF;
  }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  header.masthead {
    display: flex; align-items: flex-start; justify-content: space-between;
    border-bottom: 2px solid #0F8FA8; padding-bottom: 10px; margin-bottom: 16px;
  }
  .brand { display: flex; align-items: center; gap: 9px; }
  .brand-mark {
    width: 30px; height: 30px; border-radius: 8px; background: #0F8FA8;
    color: #FFFFFF; font-weight: 700; font-size: 14px;
    display: flex; align-items: center; justify-content: center; letter-spacing: -0.5px;
  }
  .brand-name { font-size: 14px; font-weight: 700; letter-spacing: -0.2px; }
  .brand-sub { font-size: 9px; color: #5C7581; letter-spacing: 0.6px; text-transform: uppercase; }
  .doc-title { text-align: right; }
  .doc-title h1 { margin: 0; font-size: 15px; letter-spacing: -0.2px; }
  .doc-meta { font-size: 9px; color: #5C7581; margin-top: 3px; }
  h2 {
    font-size: 11.5px; margin: 18px 0 8px; padding-bottom: 4px;
    border-bottom: 1px solid #D3E0E5; letter-spacing: 0.2px;
  }
  h2:first-of-type { margin-top: 0; }
  h3 { font-size: 10px; margin: 12px 0 6px; color: #34505D; }
  .grid { display: flex; flex-wrap: wrap; gap: 0; border: 1px solid #DCE6EA; border-radius: 4px; overflow: hidden; }
  .cell {
    width: 25%; padding: 7px 9px; border-right: 1px solid #E8EFF2; border-bottom: 1px solid #E8EFF2;
    display: flex; flex-direction: column; gap: 2px;
  }
  .cell-label { font-size: 8.5px; color: #5C7581; text-transform: uppercase; letter-spacing: 0.4px; }
  .cell-value { font-size: 11px; font-weight: 600; word-break: break-word; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th {
    text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.4px;
    color: #4A6470; background: #F2F7F9; padding: 6px 8px; border-bottom: 1px solid #D3E0E5;
  }
  td { padding: 6px 8px; border-bottom: 1px solid #EDF2F4; font-size: 10px; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #FAFCFD; }
  .empty { color: #6B818C; font-style: italic; margin: 8px 0 0; }
  .note { color: #5C7581; font-size: 9px; margin-top: 6px; }
  .bars { display: flex; align-items: flex-end; gap: 6px; height: 130px; margin-top: 8px; }
  .bar-slot { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
  .bar-amount { font-size: 7.5px; color: #4A6470; margin-bottom: 3px; }
  .bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; background: #F4F8F9; border-radius: 2px; }
  .bar-fill { width: 100%; background: #0F8FA8; border-radius: 2px 2px 0 0; min-height: 1px; }
  .bar-label { font-size: 8.5px; color: #4A6470; margin-top: 4px; text-transform: capitalize; }
  .dist { display: flex; flex-direction: column; gap: 7px; margin-top: 8px; }
  .dist-row { display: flex; align-items: center; gap: 8px; }
  .dist-label { width: 58px; font-size: 10px; font-weight: 600; }
  .dist-track { flex: 1; height: 9px; background: #F0F5F7; border-radius: 5px; overflow: hidden; }
  .dist-fill { display: block; height: 100%; background: #0F8FA8; border-radius: 5px; }
  .dist-value { width: 150px; text-align: right; font-size: 9.5px; color: #34505D; }
  .body-layout { display: flex; gap: 14px; align-items: flex-start; }
  .diagram { width: 190px; height: 320px; flex-shrink: 0; }
  .body-table { flex: 1; }
  .legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 9px; color: #4A6470; }
  .swatch { width: 11px; height: 11px; border-radius: 2px; border: 1px solid #9AA9B0; }
  ul { margin: 6px 0 0; padding-left: 16px; }
  li { margin-bottom: 3px; }
  .callout {
    border-left: 3px solid #0F8FA8; background: #F5FAFB; padding: 8px 10px;
    border-radius: 0 4px 4px 0; margin-top: 8px;
  }
  .callout-title { font-weight: 600; font-size: 10px; }
  .callout-body { color: #34505D; margin-top: 2px; white-space: pre-wrap; }
  footer.disclaimer {
    margin-top: 18px; padding-top: 8px; border-top: 1px solid #D3E0E5;
    font-size: 8.5px; color: #6B818C;
  }
`;

function masthead(document: VehicleReportDocument): string {
  return `<header class="masthead">
      <div class="brand">
        <div class="brand-mark">AC</div>
        <div>
          <div class="brand-name">Aracım Cepte</div>
          <div class="brand-sub">Araç Geçmiş Dosyası</div>
        </div>
      </div>
      <div class="doc-title">
        <h1>${escapeHtml(document.title)}</h1>
        <div class="doc-meta">Oluşturulma: ${escapeHtml(document.generatedAtLabel)}</div>
        <div class="doc-meta">Raporlanan dönem: ${escapeHtml(document.periodLabel)}</div>
      </div>
    </header>`;
}

export function renderVehicleReportHtml(document: VehicleReportDocument): string {
  const pageOne = `<section class="page">
      ${masthead(document)}
      <h2>Araç Kimliği</h2>
      ${fieldGrid(document.identity)}
      <h2>Dönem Özeti</h2>
      ${fieldGrid(document.summary)}
      <footer class="disclaimer">
        Bu rapor kullanıcının Aracım Cepte'ye girdiği kayıtlardan otomatik olarak üretilmiştir.
        Resmi ekspertiz, muayene veya hasar tespit belgesi yerine geçmez.
      </footer>
    </section>`;

  const pageTwo = `<section class="page">
      <h2>Harcama Eğilimi</h2>
      ${trendChart(document)}
      <h2>Harcama Dağılımı</h2>
      ${distributionBars(document)}
      <h2>Bakım Kayıtları</h2>
      ${table(
        ['Tarih', 'Kilometre', 'İşlem', 'Tutar'],
        document.maintenanceRows,
        'Bu dönemde kayıtlı bakım bulunmuyor.',
      )}
      ${
        document.maintenanceTruncated
          ? '<p class="note">Yalnızca en son 15 bakım kaydı listelenmiştir.</p>'
          : ''
      }
      <h2>Yakıt Kayıtları</h2>
      ${table(
        ['Tarih', 'Litre', 'Litre fiyatı', 'Tutar', 'İstasyon'],
        document.fuelRows,
        'Bu dönemde kayıtlı yakıt alımı bulunmuyor.',
      )}
      ${
        document.fuelTruncated
          ? '<p class="note">Yalnızca en son 15 yakıt kaydı listelenmiştir.</p>'
          : ''
      }
    </section>`;

  const pageThree = `<section class="page">
      <h2>Gövde Durumu</h2>
      <div class="body-layout">
        ${bodyDiagram(document)}
        <div class="body-table">
          ${table(
            ['Parça', 'Durum', 'Not'],
            document.bodyParts.map((part) => ({
              cells: [part.label, part.conditionLabel, part.note ?? '—'],
            })),
            'Gövde durumu kaydı bulunmuyor.',
          )}
        </div>
      </div>
      <div class="legend">
        ${CONDITION_SWATCHES.map(
          (swatch) =>
            `<span class="legend-item"><span class="swatch" style="background:${swatch.fill}"></span>${escapeHtml(
              swatch.label,
            )}</span>`,
        ).join('')}
      </div>
      <h2>Ekspertiz Özeti</h2>
      ${fieldGrid(document.expertiseSummary)}
      ${
        document.expertiseNotes.length
          ? document.expertiseNotes
              .map(
                (note) =>
                  `<div class="callout"><div class="callout-title">Ekspertiz notu</div><div class="callout-body">${escapeHtml(
                    note,
                  )}</div></div>`,
              )
              .join('')
          : ''
      }
      <h2>Belgeler</h2>
      ${fieldGrid(document.documentSummary)}
      ${table(
        ['Tür', 'Başlık', 'Son kullanma', 'Durum'],
        document.expiringDocuments,
        'Süresi dolmuş veya yaklaşan belge bulunmuyor.',
      )}
    </section>`;

  const pageFour = `<section class="page">
      <h2>Dikkat Edilmesi Gerekenler</h2>
      <h3>Gecikmiş hatırlatıcılar</h3>
      ${table(
        ['Hatırlatıcı', 'Tarih', 'Kilometre', 'Durum'],
        document.overdueReminders,
        'Gecikmiş hatırlatıcı bulunmuyor.',
      )}
      <h3>Yaklaşan hatırlatıcılar</h3>
      ${table(
        ['Hatırlatıcı', 'Tarih', 'Kilometre', 'Durum'],
        document.upcomingReminders,
        'Yaklaşan hatırlatıcı bulunmuyor.',
      )}
      <h3>Eksik araç bilgileri</h3>
      ${bulletList(document.missingIdentityFields, 'Temel araç bilgilerinin tamamı kayıtlı.')}
      <h3>Araç notları</h3>
      ${
        document.noteHighlights.length
          ? document.noteHighlights
              .map(
                (note) =>
                  `<div class="callout"><div class="callout-title">${escapeHtml(
                    note.title,
                  )}</div><div class="callout-body">${escapeHtml(note.content)}</div></div>`,
              )
              .join('')
          : '<p class="empty">Kayıtlı araç notu bulunmuyor.</p>'
      }
      <footer class="disclaimer">
        Bu bölümdeki tüm değerler kullanıcının kendi kayıtlarından deterministik olarak
        hesaplanmıştır. Rapor mekanik teşhis veya değer takdiri içermez.
      </footer>
    </section>`;

  return `<html lang="tr"><head><meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(document.title)} — ${escapeHtml(document.vehicleHeading)}</title>
      <style>${STYLES}</style>
    </head><body>${pageOne}${pageTwo}${pageThree}${pageFour}</body></html>`;
}
