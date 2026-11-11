import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface PdfQuotationData {
  quoteNumber: string;
  revision: number;
  status: string;
  currency: string;
  subtotal: string | number;
  discount: string | number;
  taxAmount: string | number;
  grandTotal: string | number;
  createdAt: Date;
  validUntil: Date;
  termsAndConditions: string;
  notes?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  destination?: string | null;
  agencyName: string;
  agencyAddress?: string | null;
  agencyPhone?: string | null;
  agencyEmail?: string | null;
  approvedByName?: string | null;
  approvedAt?: Date | null;
  items: Array<{
    title: string;
    description?: string | null;
    quantity: number;
    unitPrice: string | number;
    totalPrice: string | number;
  }>;
}

@Injectable()
export class QuotationPdfService {
  async generatePdf(data: PdfQuotationData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.1, 0.35, 0.6); // Deep Navy
    const textColor = rgb(0.15, 0.15, 0.15);
    const mutedColor = rgb(0.45, 0.45, 0.45);
    const lightBg = rgb(0.95, 0.96, 0.98);

    let y = height - 50;

    // 1. Header: Agency Branding
    page.drawText(data.agencyName, {
      x: 50,
      y,
      size: 20,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('OFFICIAL QUOTATION', {
      x: width - 200,
      y,
      size: 16,
      font: fontBold,
      color: primaryColor,
    });

    y -= 18;
    if (data.agencyAddress) {
      page.drawText(data.agencyAddress, {
        x: 50,
        y,
        size: 9,
        font: fontRegular,
        color: mutedColor,
      });
    }

    page.drawText(`Quote #: ${data.quoteNumber} (Rev ${data.revision})`, {
      x: width - 200,
      y,
      size: 10,
      font: fontBold,
      color: textColor,
    });

    y -= 14;
    const contactText = [data.agencyPhone, data.agencyEmail].filter(Boolean).join(' | ');
    if (contactText) {
      page.drawText(contactText, {
        x: 50,
        y,
        size: 9,
        font: fontRegular,
        color: mutedColor,
      });
    }

    const issueDateStr = new Date(data.createdAt).toISOString().split('T')[0];
    page.drawText(`Date: ${issueDateStr}`, {
      x: width - 200,
      y,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });

    y -= 14;
    const validUntilStr = new Date(data.validUntil).toISOString().split('T')[0];
    page.drawText(`Valid Until: ${validUntilStr}`, {
      x: width - 200,
      y,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });

    // Divider Line
    y -= 20;
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    // 2. Customer & Trip Details Box
    y -= 25;
    page.drawText('PREPARED FOR:', {
      x: 50,
      y,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    y -= 16;
    page.drawText(data.customerName, {
      x: 50,
      y,
      size: 12,
      font: fontBold,
      color: textColor,
    });

    y -= 14;
    const clientContact = [data.customerPhone, data.customerEmail].filter(Boolean).join(' | ');
    if (clientContact) {
      page.drawText(clientContact, {
        x: 50,
        y,
        size: 9,
        font: fontRegular,
        color: mutedColor,
      });
    }

    if (data.destination) {
      y -= 14;
      page.drawText(`Destination: ${data.destination}`, {
        x: 50,
        y,
        size: 9,
        font: fontRegular,
        color: textColor,
      });
    }

    // 3. Itemized Table
    y -= 30;
    page.drawRectangle({
      x: 50,
      y: y - 5,
      width: width - 100,
      height: 22,
      color: lightBg,
    });

    page.drawText('ITEM DESCRIPTION', { x: 60, y: y + 2, size: 9, font: fontBold, color: primaryColor });
    page.drawText('QTY', { x: 340, y: y + 2, size: 9, font: fontBold, color: primaryColor });
    page.drawText(`UNIT (${data.currency})`, { x: 390, y: y + 2, size: 9, font: fontBold, color: primaryColor });
    page.drawText(`TOTAL (${data.currency})`, { x: 470, y: y + 2, size: 9, font: fontBold, color: primaryColor });

    y -= 22;

    for (const item of data.items) {
      page.drawText(item.title, { x: 60, y, size: 10, font: fontBold, color: textColor });
      page.drawText(String(item.quantity), { x: 345, y, size: 9, font: fontRegular, color: textColor });
      page.drawText(Number(item.unitPrice).toFixed(2), { x: 390, y, size: 9, font: fontRegular, color: textColor });
      page.drawText(Number(item.totalPrice).toFixed(2), { x: 470, y, size: 9, font: fontBold, color: textColor });

      if (item.description) {
        y -= 12;
        page.drawText(item.description.slice(0, 75), { x: 60, y, size: 8, font: fontRegular, color: mutedColor });
      }

      y -= 16;
      page.drawLine({
        start: { x: 50, y: y + 8 },
        end: { x: width - 50, y: y + 8 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9),
      });
    }

    // 4. Financial Totals Section
    y -= 15;
    const totalsX = width - 220;

    page.drawText('Subtotal:', { x: totalsX, y, size: 9, font: fontRegular, color: mutedColor });
    page.drawText(`${Number(data.subtotal).toFixed(2)} ${data.currency}`, { x: width - 100, y, size: 9, font: fontRegular, color: textColor });

    if (Number(data.discount) > 0) {
      y -= 14;
      page.drawText('Discount:', { x: totalsX, y, size: 9, font: fontRegular, color: mutedColor });
      page.drawText(`- ${Number(data.discount).toFixed(2)} ${data.currency}`, { x: width - 100, y, size: 9, font: fontRegular, color: rgb(0.8, 0.2, 0.2) });
    }

    if (Number(data.taxAmount) > 0) {
      y -= 14;
      page.drawText('Tax / VAT:', { x: totalsX, y, size: 9, font: fontRegular, color: mutedColor });
      page.drawText(`${Number(data.taxAmount).toFixed(2)} ${data.currency}`, { x: width - 100, y, size: 9, font: fontRegular, color: textColor });
    }

    y -= 16;
    page.drawRectangle({
      x: totalsX - 10,
      y: y - 5,
      width: width - totalsX - 40,
      height: 24,
      color: lightBg,
    });

    page.drawText('GRAND TOTAL:', { x: totalsX, y: y + 2, size: 11, font: fontBold, color: primaryColor });
    page.drawText(`${Number(data.grandTotal).toFixed(2)} ${data.currency}`, { x: width - 100, y: y + 2, size: 11, font: fontBold, color: primaryColor });

    // 5. Approval & Validity Stamp
    y -= 40;
    if (data.status === 'APPROVED' && data.approvedByName) {
      const approvedDateStr = data.approvedAt ? new Date(data.approvedAt).toISOString().split('T')[0] : '';
      page.drawText(`APPROVED BY: ${data.approvedByName} on ${approvedDateStr}`, {
        x: 50,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.6, 0.3),
      });
    }

    // 6. Terms & Conditions
    y -= 25;
    page.drawText('TERMS & CONDITIONS', { x: 50, y, size: 9, font: fontBold, color: primaryColor });
    y -= 14;

    const termsLines = data.termsAndConditions.split('\n');
    for (const line of termsLines.slice(0, 6)) {
      page.drawText(line.trim(), { x: 50, y, size: 8, font: fontRegular, color: mutedColor });
      y -= 11;
    }

    // Footer
    page.drawText('TravelPilot — Confidential Agency Quotation', {
      x: width / 2 - 100,
      y: 25,
      size: 8,
      font: fontRegular,
      color: mutedColor,
    });

    return pdfDoc.save();
  }
}

