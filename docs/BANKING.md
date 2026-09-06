# Integração bancária

Uma interface bancária só, com implementações por banco (§56). O financeiro fala
com `BankProvider` e nunca com um banco em particular — adicionar um banco novo é
escrever uma classe e acrescentar um `case` no registro, sem tocar em contas a
receber, a pagar ou conciliação.

## A interface (§56)

`packages/types/src/banking/index.ts` — os sete métodos:

| Método            | O que faz                                                        |
| ----------------- | ---------------------------------------------------------------- |
| `createBoleto`    | Registra a cobrança e devolve linha digitável e código de barras |
| `cancelBoleto`    | Baixa o título                                                   |
| `getBoleto`       | Consulta a situação                                              |
| `createPixCharge` | Cobrança imediata, com copia-e-cola                              |
| `getPixCharge`    | Consulta a cobrança                                              |
| `getTransactions` | Extrato do período, para conciliação                             |
| `handleWebhook`   | Traduz a notificação do banco num evento nosso                   |

Todo método devolve `Promise` e **rejeita** em caso de erro — nunca lança de
forma síncrona, senão o `.catch()` de quem chama não pega.

O identificador do título no Synapse (`referencia`) vai ao banco e volta na
notificação. É ele que amarra a baixa ao contas a receber sem precisar adivinhar
pelo valor.

## Estado de cada banco

| Banco             | Interface   | Configuração | Chamadas HTTP     |
| ----------------- | ----------- | ------------ | ----------------- |
| **MOCK**          | ✅          | ✅           | ✅ completo       |
| **Sicredi** (§20) | ✅          | ✅ validada  | ⛔ falta contrato |
| **Itaú** (§21)    | ✅          | ✅ validada  | ⛔ falta contrato |
| Banco do Brasil   | ✅ prevista | —            | ⛔ sem provider   |
| Bradesco          | ✅ prevista | —            | ⛔ sem provider   |
| Santander         | ✅ prevista | —            | ⛔ sem provider   |
| Sicoob            | ✅ prevista | —            | ⛔ sem provider   |

### Por que Sicredi e Itaú não chamam a API ainda

Porque **não inventamos endpoint nem nome de campo**. Um palpite errado não
falha na hora: passa pelo build, passa pelo teste e só aparece em homologação
com o banco, quando já custa caro e já pode ter gerado cobrança errada.

Cada método pendente rejeita com `ContratoBancarioPendente`, dizendo qual parte
da documentação oficial resolve:

```
SICREDI: createBoleto ainda não implementado — falta o endpoint de registro
de cobrança e o nome dos campos do título. O que está pendente por banco
está em docs/BANKING.md.
```

O que **já funciona e está testado** nesses dois: a configuração validada, a
separação de ambientes, a resolução do provider e a abertura das credenciais no
cofre. Falta só a camada HTTP.

### O que é preciso pedir a cada banco

Para destravar Sicredi e Itaú, a documentação oficial precisa responder:

1. **URL base** de cada ambiente (sandbox, homologação, produção).
2. **Fluxo de autenticação** — escopos do OAuth2 e se o mTLS usa o mesmo
   certificado da assinatura.
3. **Registro de cobrança** — caminho, corpo, e como o "seu número" viaja.
4. **Baixa** — caminho e os códigos de motivo aceitos.
5. **Consulta** — caminho e o mapa de situação do título para o nosso
   `BoletoStatus`.
6. **Pix** — cobrança imediata, formato do `txid` e da consulta.
7. **Extrato** — caminho, paginação e formato de data.
8. **Webhook** — formato da notificação e **como validar a assinatura**.

Enquanto isso não chega, o ambiente `MOCK` roda o financeiro de ponta a ponta.

## Ambientes

`MOCK · SANDBOX · HOMOLOGACAO · PRODUCAO`, **separados por banco**: a mesma
empresa pode estar em produção no Sicredi e ainda em homologação no Itaú.

`MOCK` atende qualquer banco e dispensa credencial. Nos outros três, a conta só
resolve com `baseUrl` preenchida — o endereço vem da documentação oficial, e o
sistema recusa em vez de chutar.

## Segredos (§62)

**Segredo bancário nunca no React. Nunca.** A configuração guardada tem só
_referências_ ao cofre (`clientIdSecretRef`, `clientSecretSecretRef`,
`certificadoSecretRef`); o valor só existe dentro do backend.

O cofre é AES-256-GCM (`apps/api/src/common/crypto/secret-vault.ts`), com
chave-mestra em `BANKING_MASTER_KEY` — 32 bytes em base64, separada da chave
fiscal, para o vazamento de uma não entregar a outra.

```bash
# gerar a chave-mestra
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Duas limitações conhecidas, para quem for continuar:

- O cofre guarda **em memória**: o segredo cifrado não sobrevive a um restart.
  Trocar por Secret Manager mexe só no `Map` interno.
- O módulo fiscal tem hoje uma cópia dessa mesma criptografia, presa a
  `FISCAL_MASTER_KEY`. Deve migrar para este cofre genérico — é uma troca de
  import, deixada fora deste cartão para não mexer em módulo em
  desenvolvimento ativo.

## Configuração do Sicredi (§20)

| Campo                   | Observação              |
| ----------------------- | ----------------------- |
| `cooperativa`           | numérica, até 5 dígitos |
| `posto`                 | 1 ou 2 dígitos          |
| `conta`                 |                         |
| `carteira`              |                         |
| `chavePix`              |                         |
| `clientIdSecretRef`     | referência ao cofre     |
| `clientSecretSecretRef` | referência ao cofre     |
| `certificadoSecretRef`  | referência ao cofre     |

O beneficiário é montado como `cooperativa/posto/conta`.

## Configuração do Itaú (§21)

Mesmo padrão; muda a identificação da conta — `agencia` (4 dígitos) e `conta`,
sem cooperativa nem posto. O beneficiário é `agencia/conta`.

Essa é exatamente a diferença que a interface existe para absorver.

## Adicionar um banco novo

1. Crie o provider estendendo `ProviderBancarioBase` — ele já entrega os sete
   métodos rejeitando com a mensagem de pendência.
2. Adicione a configuração em `packages/types/src/banking`.
3. Acrescente o `case` em `BankProviderRegistry`.
4. Implemente os métodos conforme a documentação for chegando.

Nada disso toca no financeiro.

## Testes

`MockBankProvider` cobre os sete métodos, incluindo pagamento a menor,
notificação desconhecida (que **não** move dinheiro) e notificação de título que
não é nosso. O mock é determinístico: nosso número e `txid` saem de um hash da
referência, então o teste afirma igualdade em vez de "existe alguma coisa".
