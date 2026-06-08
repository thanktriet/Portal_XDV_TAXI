import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FilesService {
  private uploadDir: string;
  private maxFileSize: number;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.uploadDir = this.config.get('UPLOAD_DIR', './uploads');
    this.maxFileSize = this.config.get('MAX_FILE_SIZE', 10485760); // 10MB
    // Ensure upload dir exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, userId: string) {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File quá lớn. Tối đa ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const saved = await this.prisma.file.create({
      data: {
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        userId,
      },
    });

    return saved;
  }

  async findOne(id: string) {
    return this.prisma.file.findUnique({ where: { id } });
  }

  async delete(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return this.prisma.file.delete({ where: { id } });
  }
}
