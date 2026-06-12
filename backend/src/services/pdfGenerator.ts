import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabaseAdmin } from '../config/supabase.js';

export interface SignatureData {
  id: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  signature_value: string;
  status: string;
}

export interface GenerateSignedPdfResult {
  success: boolean;
  signedFileUrl?: string;
  message: string;
}

export async function generateSignedPdf(documentId: string): Promise<GenerateSignedPdfResult> {
  try {
    // 1. Get document details
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return { success: false, message: 'Document not found' };
    }

    if (!document.original_file_url) {
      return { success: false, message: 'No original file URL' };
    }

    // 2. Get all signed signatures for this document
    const { data: signatures, error: sigError } = await supabaseAdmin
      .from('signatures')
      .select('*')
      .eq('document_id', documentId)
      .eq('status', 'signed');

    if (sigError) {
      return { success: false, message: 'Failed to get signatures' };
    }

    if (!signatures || signatures.length === 0) {
      return { success: false, message: 'No signed signatures found' };
    }

    // 3. Download the original PDF
    const originalUrl = document.original_file_url;
    const response = await fetch(originalUrl);
    
    if (!response.ok) {
      return { success: false, message: 'Failed to download original PDF' };
    }

    const pdfBytes = await response.arrayBuffer();

    // 4. Load PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 5. Embed signatures on each page
    for (const sig of signatures) {
      const page = pdfDoc.getPage(sig.page_number - 1); // pdf-lib pages are 0-indexed
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Convert percentage to pixels
      // Note: PDF coordinates start from bottom-left, so we need to flip Y
      const xPixels = (sig.x_percent / 100) * pageWidth;
      const yPixels = pageHeight - (sig.y_percent / 100) * pageHeight; // Flip Y

      // Draw signature text
      page.drawText(sig.signature_value || 'Signed', {
        x: xPixels,
        y: yPixels - 10, // Adjust for text baseline
        size: 14,
        font: helveticaFont,
        color: rgb(0, 0, 0.5), // Dark blue color
      });

      // Draw a line under the signature
      const lineWidth = (sig.width_percent / 100) * pageWidth;
      page.drawLine({
        start: { x: xPixels, y: yPixels - 12 },
        end: { x: xPixels + lineWidth, y: yPixels - 12 },
        thickness: 1,
        color: rgb(0, 0, 0.5),
      });
    }

    // 6. Save the modified PDF
    const signedPdfBytes = await pdfDoc.save();

    // 7. Upload to Supabase Storage
    const fileName = `${documentId}-signed-${Date.now()}.pdf`;
    const signedPath = `documents/signed/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(signedPath, signedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, message: 'Failed to upload signed PDF' };
    }

    // 8. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(signedPath);

    const signedFileUrl = urlData.publicUrl;

    // 9. Update document record
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ signed_file_url: signedFileUrl })
      .eq('id', documentId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, message: 'Failed to update document' };
    }

    return {
      success: true,
      signedFileUrl,
      message: 'Signed PDF generated successfully',
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    return { success: false, message: 'Failed to generate signed PDF' };
  }
}