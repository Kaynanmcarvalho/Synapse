import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/** Ponte entre os schemas de @synapse/validation e o pipeline do Nest. */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      throw new BadRequestException(details);
    }
    return parsed.data;
  }
}
