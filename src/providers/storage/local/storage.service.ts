import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { PRODUCT_PHOTO_URL_PREFIX, PRODUCT_UPLOAD_DIR } from './multer.options';

@Injectable()
export class LocalStorageService {
  toProductPhotoUrl(filename: string): string {
    return `${PRODUCT_PHOTO_URL_PREFIX}/${filename}`;
  }

  // The mimetype is sent by the client and can be faked, so check the real file header too.
  // On failure the file is deleted and a 400 is thrown.
  async assertValidImage(file: Express.Multer.File): Promise<void> {
    let detected: string | null = null;
    try {
      const handle = await fs.open(file.path, 'r');
      try {
        const header = Buffer.alloc(12);
        await handle.read(header, 0, 12, 0);
        detected = this.detectImageType(header);
      } finally {
        await handle.close();
      }
    } catch {
      detected = null;
    }

    if (!detected || detected !== file.mimetype) {
      await this.deleteFile(file.path);
      throw new BadRequestException('The uploaded file is not a valid JPEG, PNG or WebP image');
    }
  }

  // remove an uploaded file by its disk path; never throws
  async deleteFile(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch {
      // already gone, nothing to do
    }
  }

  // remove a product photo by its stored url (/uploads/products/<file>); other urls are ignored
  async deleteProductPhoto(imageUrl: string | null | undefined): Promise<void> {
    if (!imageUrl || !imageUrl.startsWith(`${PRODUCT_PHOTO_URL_PREFIX}/`)) return;
    // basename() stops anything like ../ from leaving the uploads folder
    await this.deleteFile(join(PRODUCT_UPLOAD_DIR, basename(imageUrl)));
  }

  private detectImageType(header: Buffer): string | null {
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return 'image/jpeg';
    }
    if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return 'image/png';
    }
    if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') {
      return 'image/webp';
    }
    return null;
  }
}