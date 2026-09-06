import { registerAs } from '@nestjs/config';
import { validateEnv } from './env.validation';

export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly prefix: string;
  readonly version: string;
  readonly corsOrigins: readonly string[];
}

export const APP_CONFIG_KEY = 'app';

export const appConfig = registerAs(APP_CONFIG_KEY, (): AppConfig => {
  const env = validateEnv(process.env);
  return {
    nodeEnv: env.NODE_ENV,
    port: env.API_PORT,
    prefix: env.API_PREFIX,
    version: env.API_VERSION,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  };
});
