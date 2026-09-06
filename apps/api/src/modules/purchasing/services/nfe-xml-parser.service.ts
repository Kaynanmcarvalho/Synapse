import { BadRequestException, Injectable } from '@nestjs/common';
import type { ParsedDfe } from '@synapse/types';
import { XMLParser } from 'fast-xml-parser';

interface NfeProdNode {
  readonly cProd: string;
  readonly xProd: string;
  readonly qCom: number | string;
  readonly vUnCom: number | string;
}

interface NfeDetNode {
  readonly prod: NfeProdNode;
}

interface NfeInfNode {
  readonly '@_Id': string;
  readonly ide: { readonly dhEmi: string };
  readonly emit: { readonly CNPJ: string };
  readonly det: NfeDetNode | readonly NfeDetNode[];
}

interface NfeDocument {
  readonly nfeProc?: { readonly NFe: { readonly infNFe: NfeInfNode } };
  readonly NFe?: { readonly infNFe: NfeInfNode };
}

/** §40 "reaproveitar a entrada por XML do DF-e": não existia nenhum parser de
 *  XML de entrada no sistema (Fase 5 só emite nota própria, não lê a de
 *  fornecedor) — esta classe é a primeira implementação, para o recebimento
 *  poder puxar itens direto da NF-e em vez de digitar tudo de novo.
 *
 *  Aceita tanto o XML "cru" da NF-e (`<NFe>`) quanto o processado pela SEFAZ
 *  com protocolo (`<nfeProc>`), que é o que normalmente chega por e-mail do
 *  fornecedor. Preço vem em reais (string decimal) no XML; convertido para
 *  centavos aqui, na borda, para o resto do sistema nunca lidar com ponto
 *  flutuante monetário. */
@Injectable()
export class NfeXmlParserService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => name === 'det',
  });

  parse(xml: string): ParsedDfe {
    let document: NfeDocument;
    try {
      document = this.parser.parse(xml) as NfeDocument;
    } catch (error) {
      throw new BadRequestException(`XML inválido: ${(error as Error).message}`);
    }

    const infNFe = document.nfeProc?.NFe.infNFe ?? document.NFe?.infNFe;
    if (!infNFe) {
      throw new BadRequestException('XML não é uma NF-e reconhecível (faltou <NFe><infNFe>)');
    }

    const accessKey = this.extractAccessKey(infNFe['@_Id']);
    const det = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det];
    if (det.length === 0) {
      throw new BadRequestException('NF-e sem nenhum item (<det>)');
    }

    return {
      accessKey,
      issuerTaxId: String(infNFe.emit.CNPJ),
      issuedAt: infNFe.ide.dhEmi,
      items: det.map((line) => ({
        code: String(line.prod.cProd),
        description: String(line.prod.xProd),
        quantity: Number(line.prod.qCom),
        unitCostCentavos: Math.round(Number(line.prod.vUnCom) * 100),
      })),
    };
  }

  /** O atributo `Id` da infNFe é sempre "NFe" + a chave de 44 dígitos
   *  (§ manual SEFAZ) — remove o prefixo e valida o tamanho. */
  private extractAccessKey(id: string | undefined): string {
    const key = (id ?? '').replace(/^NFe/, '');
    if (!/^\d{44}$/.test(key)) {
      throw new BadRequestException('Chave de acesso da NF-e ausente ou com formato inválido');
    }
    return key;
  }
}
