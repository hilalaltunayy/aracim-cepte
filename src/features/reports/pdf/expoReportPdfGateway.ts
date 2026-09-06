import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { ReportPdfGateway } from './vehicleReportPdf';

/**
 * The only module in the PDF feature that touches native APIs.
 *
 * expo-print renders the HTML with the platform's own print engine, so the PDF
 * carries real selectable text and vector line-art rather than a bitmap of the
 * screen. The file is written to the cache directory, which the OS is free to
 * reclaim — the user keeps their copy through the share sheet.
 */
export const expoReportPdfGateway: ReportPdfGateway = {
  async printToFile(html) {
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  async rename(uri, fileName) {
    const source = new File(uri);
    const destination = new File(Paths.cache, fileName);
    // A leftover from a previous export would otherwise block the move.
    if (destination.exists) destination.delete();
    source.move(destination);
    return destination.uri;
  },

  isSharingAvailable() {
    return Sharing.isAvailableAsync();
  },

  async share(uri, fileName) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: fileName,
    });
  },
};
