import { z } from 'zod';

/** Pedaços que os cadastros do Syndata repetem (fornecedor, funcionário): campo
 *  vazio vira `null`, número vira só dígitos e o aviso diz o que corrigir. */

export const digitos = (valor: string): string => valor.replace(/\D/g, '');

export const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Use até ${maximo} caracteres`)
    .transform((valor) => valor || null)
    .nullable()
    .default(null);

export const digitosOpcionais = (minimo: number, maximo: number, aviso: string) =>
  z
    .string()
    .transform(digitos)
    .refine((valor) => valor === '' || (valor.length >= minimo && valor.length <= maximo), aviso)
    .transform((valor) => valor || null)
    .nullable()
    .default(null);

export const telefoneOpcional = digitosOpcionais(10, 11, 'Telefone inválido: informe DDD e número');

export const emailOpcional = z
  .string()
  .trim()
  .max(200)
  .transform((valor) => valor || null)
  .nullable()
  .default(null)
  .refine(
    (valor) => valor === null || z.string().email().safeParse(valor).success,
    'E-mail inválido',
  );

export const dataOpcional = (aviso: string) =>
  z
    .string()
    .trim()
    .refine((valor) => valor === '' || /^\d{4}-\d{2}-\d{2}$/.test(valor), aviso)
    .transform((valor) => valor || null)
    .nullable()
    .default(null);

export const referenciaDeTabelaSchema = z
  .object({
    codigo: z.number().int().positive('Escolha um item da tabela'),
    nome: z.string().trim().min(1).max(60),
  })
  .default({ codigo: 1, nome: 'GERAL' });

export const ufOpcional = z
  .string()
  .trim()
  .transform((valor) => valor.toUpperCase())
  .refine((valor) => valor === '' || /^[A-Z]{2}$/.test(valor), 'UF tem 2 letras')
  .default('');

export const cepOpcional = z
  .string()
  .transform(digitos)
  .refine((valor) => valor === '' || valor.length === 8, 'CEP tem 8 dígitos')
  .default('');

export const codigoIbgeOpcional = digitosOpcionais(7, 7, 'Código IBGE tem 7 dígitos');
