import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Complaint, Language } from '../types';
import { formatNepalDateTime } from './nepalTime';

/**
 * Generates and triggers download of an official Municipal Receipt PDF
 */
export async function generateReceiptPDF(complaint: Complaint, lang: Language = 'ne'): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sakhuwanankarkatti.gov.np';
  const trackingUrl = `${origin}/?ref=${encodeURIComponent(complaint.referenceNumber)}`;

  // Generate QR code data URL
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(trackingUrl, {
      width: 150,
      margin: 1,
      color: { dark: '#163a63', light: '#ffffff' },
    });
  } catch (e) {
    console.error('Failed to generate QR for PDF', e);
  }

  // Header Background Bar
  doc.setFillColor(22, 58, 99); // #163A63
  doc.rect(0, 0, 210, 32, 'F');

  // Title in Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Sakhuwanankarkatti Rural Municipality', 105, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Office of Rural Municipal Executive | Siraha, Madhesh Province, Nepal', 105, 18, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 212, 191); // Teal
  doc.text('CITIZEN GRIEVANCE OFFICIAL REGISTRATION RECEIPT', 105, 25, { align: 'center' });

  // Pilot Notice Banner
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.setDrawColor(251, 191, 36); // Amber-400
  doc.rect(14, 36, 182, 10, 'FD');
  doc.setTextColor(146, 64, 14); // Amber-800
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PILOT PROJECT SYSTEM - MUNICIPAL CITIZEN ASSISTANCE DESK', 105, 42.5, { align: 'center' });

  // Main Reference Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.roundedRect(14, 50, 182, 28, 3, 3, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL REFERENCE NUMBER (DARTA NO.)', 105, 57, { align: 'center' });

  doc.setTextColor(22, 58, 99);
  doc.setFontSize(18);
  doc.setFont('courier', 'bold');
  doc.text(complaint.referenceNumber, 105, 67, { align: 'center' });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Keep this reference number safe to track progress and receive updates.', 105, 73, { align: 'center' });

  // Grievance Information Grid
  let y = 84;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);

  const drawRow = (label: string, value: string, rowY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, rowY, 55, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, rowY, 55, 8, 'D');

    doc.rect(69, rowY, 127, 8, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(label, 16, rowY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(value, 72, rowY + 5.5);
  };

  drawRow('Submission Date (NPT)', formatNepalDateTime(complaint.createdAt, lang), y);
  y += 8;
  drawRow('Ward Number', `Ward No. ${complaint.wardNumber} (Sakhuwanankarkatti)`, y);
  y += 8;
  drawRow('Location / Landmark', complaint.landmark || 'Sakhuwanankarkatti', y);
  y += 8;
  drawRow('Grievance Category', complaint.category.replace(/_/g, ' ').toUpperCase(), y);
  y += 8;
  drawRow('Current Status', complaint.status.toUpperCase(), y);
  y += 8;

  const citizenInfo = complaint.isConfidentialIdentity
    ? 'CONFIDENTIAL (Identity Protected under Municipal Guidelines)'
    : `${complaint.citizenName || 'Citizen'} (${complaint.citizenPhone || 'No phone provided'})`;
  drawRow('Grievant Details', citizenInfo, y);
  y += 8;

  const attention = complaint.isChairpersonAttentionRequested ? 'YES (Chairperson Briefing Requested)' : 'Normal Queue';
  drawRow('Executive Attention', attention, y);
  y += 12;

  // Description Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 58, 99);
  doc.text('Grievance Title & Summary:', 14, y);
  y += 5;

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const splitTitle = doc.splitTextToSize(`Title: ${complaint.title}`, 174);
  doc.text(splitTitle, 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const splitDesc = doc.splitTextToSize(`Description: ${complaint.description}`, 174);
  doc.text(splitDesc, 18, y + 14);

  y += 40;

  // QR Code & Verification Block
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 182, 42, 3, 3, 'FD');

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 18, y + 3, 36, 36);
    } catch (e) {
      console.error('Could not attach image to PDF', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 58, 99);
  doc.text('SECURE VERIFICATION & DIRECT TRACKING', 58, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Scan this QR code with any smartphone camera to open the direct tracking page.', 58, y + 17);
  doc.text('No public personal data is exposed without proper authentication.', 58, y + 23);

  doc.setTextColor(185, 28, 28); // Red
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SECURITY NOTICE: Keep this receipt private. Contains sensitive grievance reference.', 58, y + 32);

  // Signoff & Footer
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 275, 196, 275);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sakhuwanankarkatti Citizen Grievance Handling System | Computer Generated Official Receipt', 14, 280);
  doc.text(`Generated on: ${new Date().toISOString()}`, 196, 280, { align: 'right' });

  // Download PDF
  doc.save(`SKK-Receipt-${complaint.referenceNumber}.pdf`);
}
