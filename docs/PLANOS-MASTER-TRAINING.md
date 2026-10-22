# Premium LM — Planos e checkout Master Training

## Valores finais informados (22/10/2026)

| Plano | Total | Equivalente mensal | Desconto aproximado | Economia sobre o mensal |
|---|---:|---:|---:|---:|
| Mensal | R$ 229,90 | R$ 229,90 | — | — |
| Trimestral | R$ 600,00 | R$ 200,00 | 13,0% | R$ 89,70 |
| Semestral | R$ 1.080,00 | R$ 180,00 | 21,7% | R$ 299,40 |

Cálculo: mensal × 3 = R$ 689,70; desconto trimestral = R$ 89,70 (13,0057%). Mensal × 6 = R$ 1.379,40; desconto semestral = R$ 299,40 (21,704%). Os valores totais prevalecem sobre percentuais arredondados.

## Parcelamento com juros repassados ao aluno (capturas do checkout em 22/10/2026)

- Trimestral: 3 × R$ 212,08 = R$ 636,24, acréscimo de R$ 36,24 sobre R$ 600,00 à vista.
- Semestral: 6 × R$ 199,30 = R$ 1.195,80, acréscimo de R$ 115,80 sobre R$ 1.080,00 à vista.
- Não anunciar parcelamento sem juros nem valores equivalentes mensais como se fossem parcelas.
- Os descontos de 13% e 21,7% são **somente sobre o preço à vista** frente ao preço mensal de referência.
- O checkout externo pode atualizar condições e taxas. Revalidar antes de publicar e periodicamente.

## Checkouts oficiais informados

- Mensal: https://mtapp.com.br/pay/c/d8751e51
- Trimestral: https://mtapp.com.br/pay/c/4752f1f2
- Semestral: https://mtapp.com.br/pay/c/d07d7803

Os links trimestral e semestral substituem expressamente os links anteriores. A associação foi informada pelo responsável, mas ainda precisa ser validada na página de checkout antes de publicação.

## Critérios para publicação

1. Abrir cada checkout e conferir nome, valor total, prazo de acesso, recorrência, parcelamento, renovação e cancelamento.
2. Testar os três botões, navegação e analytics em desktop e mobile (360px, 390px, tablet).
3. Verificar acessibilidade por teclado, carregamento e layout.
4. Validar o ambiente de staging e revisar o PR antes de mesclar em main.

## Escopo

Integração por links oficiais. Não há API de catálogo, cobrança ou webhook configurados nesta etapa. A landing não armazena dados de cartão nem confirma pagamento; o Master Training controla a transação.
