import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DeleteObjectCommand, S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { extname } from 'path';

@Injectable()
export class R2Service {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET_NAME ?? '';
    this.publicUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket || !this.publicUrl) {
      throw new InternalServerErrorException('R2 chưa được cấu hình đầy đủ (kiểm tra biến môi trường R2_*)');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'emojis',
  ): Promise<string> {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const key = `${folder}/${unique}${extname(originalName)}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return `${this.publicUrl}/${key}`;
  }

  async deleteByUrl(url: string): Promise<boolean> {
    const key = this.extractKeyFromUrl(url);
    if (!key) {
      return false;
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    return true;
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const publicUrl = new URL(this.publicUrl);
      const targetUrl = new URL(url);

      if (publicUrl.origin !== targetUrl.origin) {
        return null;
      }

      const basePath = publicUrl.pathname.replace(/\/$/, '');
      if (basePath && !targetUrl.pathname.startsWith(`${basePath}/`)) {
        return null;
      }

      const relativePath = targetUrl.pathname.slice(basePath.length).replace(/^\/+/, '');
      return relativePath || null;
    } catch {
      return null;
    }
  }
}
