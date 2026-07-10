import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { DualSessionReportEntry, WipeRecord } from '@/types/wiper';

function formatDate(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleString();
}

// ── CSV ──────────────────────────────────────────────────────────────────────

function recordsToCsvRows(records: WipeRecord[]): string {
  if (records.length === 0) return 'No records\n';
  const header = 'Seq,Dir,Angle (deg),Pressure (bar)\n';
  const rows = records
    .map((r) => `${r.seq},${r.dir},${r.angle.toFixed(1)},${r.pressure.toFixed(2)}`)
    .join('\n');
  return header + rows + '\n';
}

function buildCsvContent(entry: DualSessionReportEntry): string {
  const date = formatDate(entry.timestamp);
  return [
    'Wiper Session Report',
    `Date,${date}`,
    '',
    `Left Wiper,${entry.left.wiperNo},Wipes,${entry.left.wipes},Strokes,${entry.left.strokes}`,
    `Right Wiper,${entry.right.wiperNo},Wipes,${entry.right.wipes},Strokes,${entry.right.strokes}`,
    '',
    `Left Wiper ${entry.left.wiperNo} Records`,
    recordsToCsvRows(entry.left.records).trimEnd(),
    '',
    `Right Wiper ${entry.right.wiperNo} Records`,
    recordsToCsvRows(entry.right.records).trimEnd(),
  ].join('\n');
}

export async function shareCsv(entry: DualSessionReportEntry): Promise<void> {
  const content = buildCsvContent(entry);
  const file = new File(Paths.cache, `wiper_report_${entry.timestamp}.csv`);
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Share Report CSV' });
}

// ── PDF ──────────────────────────────────────────────────────────────────────

function recordsToHtmlTable(records: WipeRecord[]): string {
  if (records.length === 0) {
    return '<p class="empty">No records for this wiper.</p>';
  }
  const rows = records
    .map(
      (r) =>
        `<tr${r.seq % 2 === 0 ? ' class="alt"' : ''}>
          <td>${r.seq}</td>
          <td>${r.dir}</td>
          <td>${r.angle.toFixed(1)}°</td>
          <td>${r.pressure.toFixed(2)} bar</td>
        </tr>`,
    )
    .join('\n');
  return `
    <table>
      <thead>
        <tr><th>Seq</th><th>Dir</th><th>Angle</th><th>Pressure</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildPdfHtml(entry: DualSessionReportEntry): string {
  const date = formatDate(entry.timestamp);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 20px; color: #1A8A9A; margin-bottom: 4px; }
  .date { color: #666; font-size: 12px; margin-bottom: 24px; }
  .summary { display: flex; gap: 24px; margin-bottom: 28px; }
  .summary-card { flex: 1; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; }
  .summary-card h3 { font-size: 13px; color: #1A8A9A; margin-bottom: 8px; }
  .stat-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .stat-label { color: #666; }
  .stat-val { font-weight: bold; }
  h2 { font-size: 15px; color: #333; margin: 24px 0 10px; border-bottom: 2px solid #1A8A9A; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1A8A9A; color: white; padding: 8px 10px; text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #e8e8e8; }
  tr.alt td { background: #f5f5f5; }
  .empty { color: #888; font-style: italic; padding: 8px 0; }
</style>
</head>
<body>
  <h1>Wiper Session Report</h1>
  <p class="date">${date}</p>

  <div class="summary">
    <div class="summary-card">
      <h3>Left Wiper ${entry.left.wiperNo}</h3>
      <div class="stat-row"><span class="stat-label">Wipes</span><span class="stat-val">${entry.left.wipes}</span></div>
      <div class="stat-row"><span class="stat-label">Strokes</span><span class="stat-val">${entry.left.strokes}</span></div>
    </div>
    <div class="summary-card">
      <h3>Right Wiper ${entry.right.wiperNo}</h3>
      <div class="stat-row"><span class="stat-label">Wipes</span><span class="stat-val">${entry.right.wipes}</span></div>
      <div class="stat-row"><span class="stat-label">Strokes</span><span class="stat-val">${entry.right.strokes}</span></div>
    </div>
  </div>

  <h2>Left Wiper ${entry.left.wiperNo} — Records</h2>
  ${recordsToHtmlTable(entry.left.records)}

  <h2>Right Wiper ${entry.right.wiperNo} — Records</h2>
  ${recordsToHtmlTable(entry.right.records)}
</body>
</html>`;
}

export async function sharePdf(entry: DualSessionReportEntry): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: buildPdfHtml(entry) });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Report PDF' });
}
