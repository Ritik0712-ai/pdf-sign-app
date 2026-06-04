import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Signature, SigningLink } from '../types/index.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Mock storage
const signatures: Signature[] = [];
const signingLinks: SigningLink[] = [];

// Create signature placement
router.post('/', authenticate, (req: AuthRequest, res) => {
  const { documentId, pageNumber, xPercent, yPercent, signatureType, signatureValue } = req.body;

  if (!documentId || pageNumber === undefined || xPercent === undefined || yPercent === undefined) {
    throw new AppError('documentId, pageNumber, xPercent, and yPercent are required', 400);
  }

  // Validate percentage range (0-100)
  if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) {
    throw new AppError('Coordinates must be between 0 and 100', 400);
  }

  const signature: Signature = {
    id: crypto.randomUUID(),
    document_id: documentId,
    signer_id: req.user!.userId,
    page_number: pageNumber,
    x_percent: xPercent,
    y_percent: yPercent,
    signature_type: signatureType || 'typed',
    signature_value: signatureValue || '',
    status: 'pending',
    signed_at: null,
    created_at: new Date().toISOString(),
  };

  signatures.push(signature);
  
  res.status(201).json({ success: true, data: signature, message: 'Signature placement saved' });
});

// Get signatures for document
router.get('/document/:documentId', authenticate, (req: AuthRequest, res) => {
  const docSignatures = signatures.filter(s => s.document_id === req.params.documentId);
  res.json({ success: true, data: docSignatures });
});

// Update signature status (sign/reject)
router.patch('/:id', authenticate, (req: AuthRequest, res) => {
  const { status, signatureValue } = req.body;
  const signature = signatures.find(s => s.id === req.params.id);

  if (!signature) {
    return res.status(404).json({ success: false, message: 'Signature not found' });
  }

  if (!['signed', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  signature.status = status;
  signature.signed_at = status === 'signed' ? new Date().toISOString() : null;
  if (signatureValue) {
    signature.signature_value = signatureValue;
  }

  res.json({ success: true, data: signature, message: `Signature ${status}` });
});

// Generate signing link
router.post('/link', authenticate, (req: AuthRequest, res) => {
  const { documentId, signerName, signerEmail, expiresAt } = req.body;

  if (!documentId || !signerName) {
    throw new AppError('documentId and signerName are required', 400);
  }

  const link: SigningLink = {
    id: crypto.randomUUID(),
    document_id: documentId,
    token: crypto.randomUUID(),
    signer_name: signerName,
    signer_email: signerEmail || null,
    expires_at: expiresAt || null,
    is_active: true,
    created_by: req.user!.userId,
    created_at: new Date().toISOString(),
  };

  signingLinks.push(link);

  res.status(201).json({
    success: true,
    data: {
      ...link,
      signingUrl: `/sign/${link.token}`,
    },
    message: 'Signing link generated',
  });
});

// Validate signing token (public)
router.get('/link/:token', (req, res) => {
  const link = signingLinks.find(l => l.token === req.params.token);

  if (!link) {
    return res.status(404).json({ success: false, message: 'Signing link not found' });
  }

  if (!link.is_active) {
    return res.status(400).json({ success: false, message: 'Signing link is inactive' });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return res.status(400).json({ success: false, message: 'Signing link has expired' });
  }

  res.json({ success: true, data: link });
});

export default router;
