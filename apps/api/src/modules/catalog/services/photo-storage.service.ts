import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { diskStorage, type StorageEngine } from 'multer';
import type { AuthenticatedRequest } from '../../iam/iam.types';

/** Fica fora de src para nao entrar no bundle e sobreviver a um `nest build`
 *  limpo; producao troca isso por um bucket do Firebase Storage — a rota do
 *  controller nao muda, so a implementacao de `buildPhotoStorage`. */
export const UPLOADS_DIR = join(__dirname, '..', '..', '..', '..', 'uploads');

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export const isAllowedPhotoExtension = (filename: string): boolean =>
  ALLOWED_EXTENSIONS.has(extname(filename).toLowerCase());

/** Uma pasta por produto: `uploads/{tenantId}/{productId}/{uuid}.ext`. O nome
 *  original nunca chega ao disco — evita path traversal e colisao. O tenantId
 *  vem de `request.tenant`, resolvido pela sessao (§31) — nunca de um param
 *  de rota, que o cliente poderia forjar. */
export const buildPhotoStorage = (): StorageEngine =>
  diskStorage({
    destination: (request, _file, callback) => {
      const authRequest = request as AuthenticatedRequest;
      const tenantId = authRequest.tenant?.tenantId;
      const productId = authRequest.params['id'];
      if (!tenantId || typeof productId !== 'string') {
        callback(new Error('Requisição sem tenant ou produto resolvido'), '');
        return;
      }
      const dir = join(UPLOADS_DIR, tenantId, productId);
      mkdirSync(dir, { recursive: true });
      callback(null, dir);
    },
    filename: (_request, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  });

export const buildPhotoUrl = (tenantId: string, productId: string, filename: string): string =>
  `/uploads/${tenantId}/${productId}/${filename}`;
