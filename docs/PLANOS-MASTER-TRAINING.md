# Premium LM — Planos e checkout Master Training

## Valores aprovados (22/10/2026)

| Plano | Total | Equivalente mensal | Desconto | Economia sobre o mensal |
|---|---:|---:|---:|---:|
| Mensal | R$ 229,90 | R$ 229,90 | — | — |
| Trimestral | R$ 600,04 | R$ 200,01 | 13% | R$ 89,66 |
| Semestral | R$ 1.089,73 | R$ 181,62 | 21% | R$ 289,67 |

Cálculo: trimestral = 229,90 × 3 × 0,87 = 600,039 (arredondado a R$ 600,04); semestral = 229,90 × 6 × 0,79 = 1.089,726 (arredondado a R$ 1.089,73).

## Checkouts

- Mensal: https://mtapp.com.br/pay/c/d8751e51 (informado pelo responsável).
- Trimestral: **PENDENTE** — criar o plano no Master Training, confirmar valor e condições, obter o link.
- Semestral: **PENDENTE** — criar o plano no Master Training, confirmar valor e condições, obter o link.

Os planos pendentes aparecem sem botão de pagamento para impedir a contratação do produto errado. Não utilizar o link mensal nos outros planos.

## Critérios para liberação

1. Validar no Master Training os valores totais, prazo de acesso, recorrência, parcelamento, renovação e cancelamento. Não assumir que “equivalente mensal” seja valor de parcela.
2. Substituir o aviso de indisponibilidade de cada card pelo botão de checkout com URL individual, `target="_blank"`, `rel="noopener noreferrer"` e `data-track` próprio.
3. Testar checkout de cada plano em mobile e desktop, confirmar nome e valor do plano na página externa antes de publicar.
4. Testar navegação por teclado, layout 360px, 390px, tablet e desktop; verificar rastreamento sem dados pessoais.
5. Não alterar produção sem revisão do PR e validação do ambiente de staging.

## Escopo

A integração é por links oficiais de checkout. Não há API de catálogo, cobrança ou webhook configurados nesta etapa. A landing não armazena dados de cartão nem confirma pagamento; o Master Training controla a transação.
