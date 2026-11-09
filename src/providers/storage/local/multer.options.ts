import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';

// files live on disk in <project>/uploads/products and are served from /uploads/products
export const PRODUCT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'products');
export const PRODUCT_PHOTO_URL_PREFIX = '/uploads/products';

export const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// the extension comes from the checked mimetype, never from the client's file name
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const productPhotoMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });
      cb(null, PRODUCT_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${randomUUID()}${ALLOWED_IMAGE_TYPES[file.mimetype]}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    // refuse before anything is written, so a bad id never leaves a stray file behind
    if (!/^\d+$/.test(String(req.params?.id ?? ''))) {
      return cb(new BadRequestException('Invalid product id'), false);
    }
    if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
      return cb(new BadRequestException('Only JPEG, PNG or WebP images are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_PHOTO_SIZE_BYTES,
    files: 1,
  },
};