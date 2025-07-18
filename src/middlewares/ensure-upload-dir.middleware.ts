// src/middleware/ensure-upload-dir.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class EnsureUploadDirMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const publicPath = join(process.cwd(), 'public');
    const uploadsPath = join(publicPath, 'uploads');

    if (!existsSync(publicPath)) {
      mkdirSync(publicPath, { recursive: true });
    }

    if (!existsSync(uploadsPath)) {
      mkdirSync(uploadsPath, { recursive: true });
    }

    next();
  }
}
