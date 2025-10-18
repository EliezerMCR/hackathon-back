import { Router, Response, NextFunction, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { ensureSelfOrAdmin } from '../utils/authorization';
import { verifyIdentityDocumentWithGemini } from '../services/identity/documentVerification.service';
import { HTTP400Error, HTTP404Error } from '../utils/errors';

const router = Router();

const uploadsRoot = path.join(os.tmpdir(), 'hackathon-id-uploads');

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    fs.mkdir(uploadsRoot, { recursive: true }, (err) => cb(err, uploadsRoot));
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new HTTP400Error('Tipo de archivo no soportado. Usa PNG, JPG o PDF.'));
    }
  },
});

router.post(
  '/:id/verify-document',
  authenticate,
  upload.single('document'),
  async (req: AuthRequest & { file?: Express.Multer.File }, res: Response, next: NextFunction) => {
    let fileRemoved = false;
    const cleanup = async () => {
      if (!fileRemoved && req.file) {
        await fs.promises.unlink(req.file.path).catch(() => undefined);
        fileRemoved = true;
      }
    };

    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId)) {
        await cleanup();
        throw new HTTP400Error('Identificador de usuario inválido');
      }

      ensureSelfOrAdmin(req.user, userId);

      if (!req.file) {
        await cleanup();
        throw new HTTP400Error('No se recibió ningún archivo');
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        await cleanup();
        throw new HTTP404Error('Usuario no encontrado');
      }

      const fullName = `${user.name} ${user.lastName}`.trim();
      const documentNumber = String(user.documentId);

      const verification = await verifyIdentityDocumentWithGemini({
        filePath: req.file.path,
        fullName,
        documentNumber,
        mimeType: req.file.mimetype,
      });

      if (!verification.isValid) {
        await cleanup();
        return res.status(400).json({
          message: 'El documento no coincide con los datos del usuario',
          verification,
        });
      }

      await cleanup();

      return res.status(200).json({
        message: 'Documento verificado correctamente',
        verification,
      });
    } catch (error) {
      await cleanup();
      next(error);
    }
  },
);

export default router;
