import { BadRequestException } from '@nestjs/common';
import { NfeXmlParserService } from './nfe-xml-parser.service';

const ACCESS_KEY = '35260312345678000199550010000012345123456789';

const nfeXml = (idPrefix = 'NFe') => `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="${idPrefix}${ACCESS_KEY}" versao="4.00">
    <ide>
      <dhEmi>2026-03-15T10:00:00-03:00</dhEmi>
    </ide>
    <emit>
      <CNPJ>12345678000199</CNPJ>
      <xNome>Fornecedor XYZ Ltda</xNome>
    </emit>
    <det nItem="1">
      <prod>
        <cProd>SKU001</cProd>
        <xProd>Semente de Milho AG 8700</xProd>
        <qCom>10.0000</qCom>
        <vUnCom>25.50</vUnCom>
      </prod>
    </det>
    <det nItem="2">
      <prod>
        <cProd>SKU002</cProd>
        <xProd>Fertilizante NPK 04-14-08</xProd>
        <qCom>5.0000</qCom>
        <vUnCom>100.00</vUnCom>
      </prod>
    </det>
  </infNFe>
</NFe>`;

const nfeProcXml = () => `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${ACCESS_KEY}" versao="4.00">
      <ide><dhEmi>2026-03-15T10:00:00-03:00</dhEmi></ide>
      <emit><CNPJ>12345678000199</CNPJ></emit>
      <det nItem="1">
        <prod>
          <cProd>SKU001</cProd>
          <xProd>Semente de Milho AG 8700</xProd>
          <qCom>3.0000</qCom>
          <vUnCom>25.50</vUnCom>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;

describe('NfeXmlParserService', () => {
  const parser = new NfeXmlParserService();

  it('extrai a chave de acesso, o CNPJ emitente e os itens de uma NF-e', () => {
    const result = parser.parse(nfeXml());
    expect(result.accessKey).toBe(ACCESS_KEY);
    expect(result.issuerTaxId).toBe('12345678000199');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      code: 'SKU001',
      description: 'Semente de Milho AG 8700',
      quantity: 10,
      unitCostCentavos: 2550,
    });
  });

  it('lida com um único item sem virar objeto solto (isArray)', () => {
    const result = parser.parse(nfeProcXml());
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.unitCostCentavos).toBe(2550);
  });

  it('aceita o XML processado (nfeProc), o formato que normalmente chega do fornecedor', () => {
    const result = parser.parse(nfeProcXml());
    expect(result.accessKey).toBe(ACCESS_KEY);
  });

  it('rejeita XML sem a chave de acesso no formato esperado', () => {
    expect(() => parser.parse(nfeXml('XX'))).toThrow(BadRequestException);
  });

  it('rejeita um XML que não é uma NF-e', () => {
    expect(() => parser.parse('<root><foo>bar</foo></root>')).toThrow(BadRequestException);
  });

  it('rejeita XML malformado', () => {
    expect(() => parser.parse('<NFe><infNFe')).toThrow(BadRequestException);
  });
});
