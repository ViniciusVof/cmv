# MVP - Módulo de Precificação
## Documentação de Regras de Negócio

Este documento descreve as regras de negócio do MVP de Precificação, que inclui:
- Gestão de Insumos
- Gestão de Fornecedores
- Fichas Técnicas
- Precificação
- Configurações

---

## 1. Insumos

### 1.1. Cadastro de Insumo

**Campos Obrigatórios:**
- **Código**: Gerado automaticamente (sequencial: 1, 2, 3...)
- **Nome**: Nome do insumo
- **R$ Pago**: Valor total pago na compra (deve ser > 0)
- **Volume**: Quantidade comprada (deve ser > 0)
- **Unidade**: KG, UN, LT ou CX
- **Fator de Correção**: Multiplicador para ajustar custos (padrão: 1.0)
- **Fornecedor**: Obrigatório (pode ser criado automaticamente)

**Campos Opcionais:**
- **Estoque Mínimo**: Quantidade mínima recomendada
- **Estoque Ideal**: Quantidade ideal de estoque
- **Estoque Máximo**: Quantidade máxima permitida

### 1.2. Cálculo do Valor Final

**Fórmula:**
```
Valor Final (R$) = (R$ Pago ÷ Volume) × Fator de Correção
```

**Exemplo:**
- R$ Pago: R$ 100,00
- Volume: 5 KG
- Fator de Correção: 1.05
- **Valor Final**: (100 ÷ 5) × 1.05 = R$ 21,00/kg

**Regras:**
- Calculado automaticamente
- Não pode ser editado manualmente
- Se volume = 0, valor final = 0
- Representa o custo unitário do insumo

### 1.3. Fator de Correção

**O que é:**
Multiplicador usado para ajustar o custo considerando perdas, desperdícios ou variações.

**Exemplos de uso:**
- Se compra 10kg mas só usa 9.5kg (há perda): Fator = 1.05
- Se compra 1kg mas pesa 1.1kg (ganho): Fator = 0.91

**Valores:**
- Padrão: 1.0 (sem ajuste)
- Aceita decimais: 0.95, 1.05, 1.10, etc.
- Pode ser calculado usando calculadora de fator de correção

### 1.4. Fornecedor

**Regras:**
- Obrigatório no cadastro de insumo
- Pode selecionar de lista existente
- Se digitar nome que não existe, cria automaticamente
- Um fornecedor pode fornecer vários insumos
- Um insumo tem apenas um fornecedor

### 1.5. Movimentações de Estoque

**Tipos:**
- **Entrada (IN)**: Adiciona estoque
  - Requer: quantidade > 0 e custo unitário > 0
  - Registra o custo da entrada
  
- **Saída (OUT)**: Remove estoque
  - Requer: quantidade > 0
  - Só permite se houver estoque suficiente
  - Não requer custo unitário

**Cálculo do Estoque:**
```
Estoque Atual = Soma(Entradas) - Soma(Saídas)
```

**Regras:**
- Ao criar insumo com volume > 0, cria automaticamente entrada inicial
  - Custo unitário = R$ Pago ÷ Volume
  - Marca como movimentação inicial
- Volume do insumo sempre reflete o estoque atual
- Não permite saída maior que estoque disponível

### 1.6. Alertas de Estoque

**Insights:**
- **Abaixo do Mínimo**: Estoque < Estoque Mínimo
- **Abaixo do Ideal**: Estoque < Estoque Ideal
- **Acima do Máximo**: Estoque > Estoque Máximo

**Visualização:**
- Badges coloridos na listagem
- Filtros para ver apenas insumos com problemas

---

## 2. Fornecedores

### 2.1. Cadastro de Fornecedor

**Campos Obrigatórios:**
- **Nome**: Nome do fornecedor
- **ID**: Gerado automaticamente

**Campos Opcionais:**
- Email
- Telefone
- Endereço
- CNPJ/CPF
- Observações

### 2.2. Criação Automática

**Quando acontece:**
- Ao cadastrar insumo, se fornecedor não existir
- Cria automaticamente com o nome informado
- Outros campos podem ser preenchidos depois

**Regras:**
- Busca case-insensitive (não diferencia maiúsculas/minúsculas)
- Se encontrar fornecedor existente, vincula ao insumo
- Se não encontrar, cria novo fornecedor

### 2.3. Relacionamento

- Um fornecedor pode fornecer vários insumos
- Um insumo tem apenas um fornecedor
- Antes de excluir fornecedor, validar se há insumos vinculados

---

## 3. Fichas Técnicas

### 3.1. Cadastro de Ficha Técnica

**Campos Obrigatórios:**
- **Código**: Gerado automaticamente (sequencial)
- **Nome**: Nome do produto
- **Itens**: Pelo menos um item deve ser adicionado
- **Preço Normal**: Preço de venda normal
- **Preço IFood**: Preço de venda no IFood

**Campos Opcionais:**
- **Descrição**: Descrição do produto
- **% de Perda**: Percentual de perda/desperdício (0-100)
- **Markup**: Multiplicador customizado (se não informado, usa padrão das configurações)
- **É Combo**: Indica se é um combo

### 3.2. Itens da Ficha Técnica

**Tipos de Itens:**

1. **Insumo**: Item do estoque
   - Busca por código ou nome
   - Mostra unidade e fator de correção
   - Usa o custo do insumo

2. **Produto (Sub-receita)**: Outra ficha técnica
   - Permite criar receitas compostas
   - Só pode usar produtos que têm `isProduct: true`
   - Usa o custo da receita

**Campos do Item:**
- **Insumo/Produto**: Seleciona da lista
- **Quantidade Líquida**: Quantidade usada na receita
- **Unidade**: Herdada do insumo ou 'UN' para produtos
- **Fator de Correção**: Herdado do insumo ou 1.0 para produtos

**Conversão de Unidades:**
- Para insumos em KG, permite digitar em KG ou G
- Conversão automática: 1 KG = 1000 G
- Se digitar em G, converte para KG: G ÷ 1000

### 3.3. Cálculo de Custos dos Itens

**Para Insumos:**
```
Custo Base = finalValue do insumo

// Método 1: Custo Atual
Custo Unitário = finalValue × fatorCorreção

// Método 2: Média Mensal (últimos 30 dias)
Custo Unitário = médiaPonderada × fatorCorreção

Custo Total = Custo Unitário × Quantidade
```

**Para Produtos (Sub-receitas):**
```
Custo Unitário = recipeCost da receita
Custo Total = Custo Unitário × Quantidade
```

**Método de Cálculo:**
- Configurável nas Configurações
- **Custo Atual**: Usa o `finalValue` do insumo
- **Média Mensal**: Média ponderada das entradas dos últimos 30 dias
  - Fórmula: `soma(quantidade × custo) / soma(quantidade)`
  - Se não houver movimentações nos últimos 30 dias, usa `finalValue`

### 3.4. Custo da Receita

**Fórmula:**
```
Custo da Receita = Soma(Custo Total de todos os itens)
```

**Custo com Segurança:**
```
Custo com Segurança = Custo da Receita × (1 + % de Perda / 100)
```

**Percentual por Item:**
```
% do Item = (Custo Total do Item / Custo da Receita) × 100
```

### 3.5. Precificação

#### Preço Sugerido Normal

**Fórmula:**
```
Preço Sugerido = Custo da Receita × Markup
```

**Markup:**
- Se informado na ficha técnica, usa esse valor
- Caso contrário, usa o markup padrão das Configurações

#### Preço Sugerido IFood

**Fórmula:**
```
Preço IFood = Preço Base / (1 - Taxa IFood / 100)
```

**Onde:**
- `Preço Base = Preço Normal Praticado ou Preço Normal Sugerido`
- `Taxa IFood`: Percentual configurado nas Configurações

**Exemplo:**
- Custo: R$ 10,00
- Markup: 3.0
- Preço Normal: R$ 30,00
- Taxa IFood: 15.2%
- **Preço IFood**: 30,00 / (1 - 0.152) = R$ 35,41

#### Preços Praticados

- **Preço Normal**: Informado manualmente (pode ser diferente do sugerido)
- **Preço IFood**: Informado manualmente (pode ser diferente do sugerido)
- Se não informados, assumem os valores sugeridos

### 3.6. CMV (Custo da Mercadoria Vendida)

**Fórmula:**
```
CMV (%) = (Custo da Receita / Preço de Venda) × 100
```

**Onde:**
- `Preço de Venda = Preço Normal Praticado ou Preço Normal Sugerido`

**Exemplo:**
- Custo: R$ 8,00
- Preço: R$ 24,00
- **CMV**: (8 / 24) × 100 = 33,33%

### 3.7. Lucro Bruto

**Fórmula:**
```
Lucro Bruto = Preço Sugerido - Custo da Receita
```

### 3.8. Sincronização de Custos

**Quando usar:**
- Após alterações nos custos dos insumos
- Após mudanças no método de cálculo de custo
- Manualmente pelo botão "Sincronizar Custos"

**O que faz:**
1. Recalcula custos de todos os itens de todas as fichas técnicas
2. Recalcula métricas (custo da receita, preços sugeridos, CMV)
3. Atualiza no banco de dados

**Processo:**
- Processa fichas técnicas em ordem
- Usa cache de receitas já processadas (para sub-receitas)
- Evita loops infinitos em dependências circulares

### 3.9. Sub-receitas (Receitas Compostas)

**O que é:**
Uma ficha técnica que usa outra ficha técnica como ingrediente.

**Exemplo:**
- Receita "Hambúrguer" usa:
  - Carne (insumo)
  - Pão (sub-receita "Pão Artesanal")
  - Queijo (insumo)

**Regras:**
- Só pode usar receitas que têm `isProduct: true`
- Suporta recursão (sub-receita pode ter outra sub-receita)
- Custo da sub-receita é o `recipeCost` dela

---

## 4. Configurações de Precificação

### 4.1. Markup Padrão

**O que é:**
Multiplicador aplicado ao custo para calcular o preço de venda.

**Exemplo:**
- Custo: R$ 10,00
- Markup: 3.0
- **Preço**: 10,00 × 3.0 = R$ 30,00

**Valores:**
- Tipo: Número decimal (ex: 3.00)
- Deve ser > 0
- Recomendado: entre 2.0 e 5.0

### 4.2. Taxa IFood

**O que é:**
Percentual cobrado pelo IFood sobre as vendas.

**Fórmula de aplicação:**
```
Preço IFood = Preço Normal / (1 - Taxa IFood / 100)
```

**Valores:**
- Tipo: Percentual (0-100)
- Deve estar entre 0 e 100
- Típico: entre 10% e 20%

**Exemplo:**
- Preço Normal: R$ 30,00
- Taxa IFood: 15.2%
- **Preço IFood**: 30,00 / (1 - 0.152) = R$ 35,41

### 4.3. Método de Cálculo de Custo

**Opções:**

1. **Custo Atual**
   - Usa o `finalValue` do insumo (último custo registrado)
   - Mais simples e direto

2. **Média Mensal**
   - Calcula média ponderada das entradas dos últimos 30 dias
   - Fórmula: `soma(quantidade × custo) / soma(quantidade)`
   - Se não houver movimentações nos últimos 30 dias, usa `finalValue`
   - Mais preciso para variações de preço

**Exemplo de Média Mensal:**
- Entrada 1: 10 KG a R$ 20,00/kg
- Entrada 2: 5 KG a R$ 22,00/kg
- Entrada 3: 8 KG a R$ 21,50/kg
- **Média**: (10×20 + 5×22 + 8×21,50) / (10+5+8) = 482 / 23 = R$ 20,96/kg

---

## 5. Regras Gerais

### 5.1. Códigos Automáticos

**Geração:**
- Sequenciais numéricos (1, 2, 3...)
- Inicia em "1" se não houver registros
- Incrementa baseado no maior código existente

### 5.2. Validações

**Valores Numéricos:**
- Monetários: 2 casas decimais
- Quantidades: 3 casas decimais
- Percentuais: 2 casas decimais, entre 0 e 100

**Campos Obrigatórios:**
- Não podem ser vazios ou nulos
- Valores numéricos devem ser > 0

### 5.3. Formatação

**Valores Monetários:**
- Formato brasileiro: R$ 1.234,56
- 2 casas decimais

**Percentuais:**
- Formato: 15,20%
- 2 casas decimais

### 5.4. Timestamps

**Campos:**
- `createdAt`: Data de criação (não alterável)
- `updatedAt`: Data da última atualização (atualizado automaticamente)

**Regras:**
- Ao criar: define ambos com data atual
- Ao atualizar: atualiza apenas `updatedAt`

### 5.5. Exclusão

**Regras:**
- Requer confirmação do usuário
- Exclusão é permanente
- Validações de dependências:
  - Não permitir excluir insumo usado em fichas técnicas
  - Não permitir excluir ficha técnica usada em outras fichas técnicas
  - Não permitir excluir fornecedor com insumos vinculados

---

## 6. Fluxos Principais

### 6.1. Cadastrar Insumo

1. Preenche dados do insumo (nome, valor pago, volume, etc.)
2. Seleciona ou cria fornecedor
3. Sistema calcula automaticamente o Valor Final
4. Se volume > 0, cria movimentação inicial de entrada
5. Salva insumo

### 6.2. Cadastrar Ficha Técnica

1. Preenche dados básicos (nome, descrição)
2. Adiciona itens (insumos ou produtos)
3. Sistema calcula custos em tempo real (preview)
4. Sistema calcula preços sugeridos
5. Informa preços praticados
6. Sistema calcula CMV e lucro bruto
7. Salva ficha técnica

### 6.3. Precificar Produto

1. Sistema carrega custos dos insumos (conforme método configurado)
2. Calcula custo total da receita
3. Aplica markup para calcular preço sugerido normal
4. Calcula preço sugerido IFood considerando taxa
5. Usuário pode ajustar preços praticados
6. Sistema recalcula CMV baseado no preço praticado

### 6.4. Sincronizar Custos

1. Usuário clica em "Sincronizar Custos"
2. Sistema carrega todas as fichas técnicas
3. Para cada ficha técnica:
   - Recalcula custos de todos os itens
   - Recalcula métricas (custo da receita, preços, CMV)
   - Atualiza no banco de dados
4. Processa em ordem para respeitar dependências (sub-receitas)

---

## 7. Endpoints da API

### 7.1. Insumos
- `GET /ingredients` - Lista todos os insumos
- `GET /ingredients/:id` - Busca insumo por ID
- `POST /ingredients` - Cria novo insumo
- `PUT /ingredients/:id` - Atualiza insumo
- `DELETE /ingredients/:id` - Exclui insumo

### 7.2. Fornecedores
- `GET /suppliers` - Lista todos os fornecedores
- `GET /suppliers/:id` - Busca fornecedor por ID
- `POST /suppliers` - Cria novo fornecedor
- `PUT /suppliers/:id` - Atualiza fornecedor
- `DELETE /suppliers/:id` - Exclui fornecedor

### 7.3. Fichas Técnicas
- `GET /recipes` - Lista todas as fichas técnicas
- `GET /recipes/:id` - Busca ficha técnica por ID
- `POST /recipes` - Cria nova ficha técnica
- `PUT /recipes/:id` - Atualiza ficha técnica
- `DELETE /recipes/:id` - Exclui ficha técnica
- `POST /recipes/sync-costs` - Sincroniza custos (opcional)

### 7.4. Movimentações de Estoque
- `GET /stockMovements` - Lista todas as movimentações
- `GET /stockMovements?ingredientId=:id` - Busca por insumo
- `POST /stockMovements` - Cria nova movimentação
- `GET /stockMovements/summary` - Resumo de estoque (opcional)

### 7.5. Configurações
- `GET /businessSettings` - Busca configurações
- `PUT /businessSettings` - Atualiza configurações (apenas campos de precificação)

---

## 8. Regras de Negócio para Backend

### 8.1. Cálculos Automáticos

**Ao Criar/Atualizar Insumo:**
- Calcular `finalValue` automaticamente
- Fórmula: `(pricePaid / volume) × correctionFactor`
- Buscar `supplierName` do fornecedor e incluir na resposta

**Ao Criar/Atualizar Ficha Técnica:**
- Calcular custos de todos os itens (usar método configurado: atual ou média mensal)
  - Para insumos: usar `finalValue` ou média mensal (conforme configuração)
  - Para produtos (sub-receitas): usar `recipeCost` da receita
  - Aplicar fator de correção de cada item
  - Calcular `unitCost` e `totalCost` de cada item
- Buscar `ingredientCode` e `ingredientName` de cada item (insumo ou produto)
- Calcular `recipeCost` (soma dos custos totais de todos os itens)
- Calcular percentual de cada item: `(item.totalCost / recipeCost) × 100`
- Buscar configurações de negócio (markup padrão, taxa IFood)
- Calcular `suggestedPrice` (recipeCost × markup)
- Calcular `suggestedIfoodPrice` (suggestedPrice / (1 - ifoodTax))
- Se `currentPrice` não informado, usar `suggestedPrice`
- Se `currentIfoodPrice` não informado, usar `suggestedIfoodPrice`
- Calcular `cmv` ((recipeCost / currentPrice) × 100)
- Calcular `grossProfit` (suggestedPrice - recipeCost)
- Processar sub-receitas recursivamente
- Calcular média mensal quando necessário

### 8.2. Validações

**Insumos:**
- Validar se fornecedor existe antes de criar (ou criar automaticamente se não existir)
- Validar se volume > 0 ao criar movimentação inicial
- Validar se estoque suficiente antes de saída (movimentação OUT)
- Validar se R$ Pago > 0
- Validar se fator de correção > 0

**Fichas Técnicas:**
- Validar se todos os itens existem (insumos ou produtos)
- Validar se quantidade > 0 para todos os itens
- Validar se preços praticados são > 0
- Validar se há pelo menos um item antes de salvar
- Validar se não há dependências circulares (sub-receita usando receita que usa ela mesma)

**Fornecedores:**
- Validar se há insumos vinculados antes de excluir
- Validar se nome não está vazio

### 8.3. Regras Automáticas

1. **Movimentação inicial**: Ao criar insumo com volume > 0, criar entrada automática
   - Custo unitário = `pricePaid / volume`
   - Tipo: IN
   - Marcar como `isInitial: true`

2. **Cálculo de estoque**: Volume sempre reflete soma de movimentações
   - Fórmula: `volume = soma(entradas) - soma(saídas)`
   - Retornar `quantityOnHand` (estoque atual) e `lastEntryUnitCost` (custo da última entrada)

3. **Cálculo de custos**: Sempre recalcular ao criar/atualizar ficha técnica
   - Buscar configurações, calcular média mensal se necessário, processar sub-receitas recursivamente

4. **Validação de dependências**: Antes de excluir, verificar se está sendo usado
   - Insumo: Verificar se está em alguma ficha técnica
   - Ficha técnica: Verificar se está sendo usada em outra ficha técnica
   - Fornecedor: Verificar se há insumos vinculados
   - Retornar erro se houver dependências

5. **Criação automática de fornecedor**: Se fornecedor não existir ao criar insumo
   - Buscar fornecedor por nome (case-insensitive)
   - Se não existir, criar automaticamente com o nome informado

6. **Cálculo de Média Mensal**: Para método de cálculo "média mensal"
   - Filtrar movimentações IN dos últimos 30 dias
   - Calcular média ponderada: `soma(quantidade × custo) / soma(quantidade)`

7. **Resumo de Estoque**: Ao buscar insumos ou movimentações
   - Calcular `quantityOnHand` (estoque atual)
   - Identificar `lastEntryUnitCost` (custo da última entrada)

### 8.4. Performance

**Otimizações:**
- Cache de insumos e configurações ao recalcular custos
- Processar fichas técnicas em ordem para cache de sub-receitas
- Calcular média mensal in-line para evitar múltiplas consultas
- Usar índices no banco de dados para buscas frequentes
- Retornar resumos de estoque junto com os dados quando possível

---

## 9. Exemplos Práticos

### 9.1. Cadastro de Insumo

**Dados:**
- Nome: "Carne Moída"
- R$ Pago: R$ 100,00
- Volume: 5,0 KG
- Fator de Correção: 1.05
- Fornecedor: "Açougue Central"

**Cálculo:**
```
Valor Final = (100,00 / 5,0) × 1.05 = 21,00
```

**Resultado:**
- Custo unitário: R$ 21,00/kg
- Movimentação inicial criada: 5.0 KG a R$ 20,00/kg

### 9.2. Ficha Técnica

**Dados:**
- Nome: "Hambúrguer"
- Itens:
  - Carne Moída: 0.150 KG (FAT.C: 1.05)
  - Pão: 1 UN (sub-receita com custo R$ 2,50)
  - Queijo: 0.050 KG (FAT.C: 1.0)
- Markup: 3.0
- Taxa IFood: 15.2%

**Cálculos:**
```
Custo Carne: 21,00 × 1.05 × 0.150 = 3,31
Custo Pão: 2,50 × 1 = 2,50
Custo Queijo: 45,00 × 1.0 × 0.050 = 2,25
Custo Total: 3,31 + 2,50 + 2,25 = 8,06

Preço Sugerido Normal: 8,06 × 3.0 = 24,18
Preço Sugerido IFood: 24,18 / (1 - 0.152) = 28,54
CMV: (8,06 / 24,18) × 100 = 33,33%
```

### 9.3. Média Mensal

**Movimentações dos últimos 30 dias:**
- Entrada 1: 10 KG a R$ 20,00/kg
- Entrada 2: 5 KG a R$ 22,00/kg
- Entrada 3: 8 KG a R$ 21,50/kg

**Cálculo:**
```
Total Custo: (10 × 20) + (5 × 22) + (8 × 21,50) = 482
Total Quantidade: 10 + 5 + 8 = 23
Média Mensal: 482 / 23 = 20,96
```

---

## 10. Glossário

- **Insumo**: Matéria-prima ou ingrediente usado na produção
- **Ficha Técnica**: Receita ou fórmula de produção de um produto
- **Fator de Correção**: Multiplicador para ajustar custos (perdas/variações)
- **Markup**: Multiplicador aplicado ao custo para calcular preço de venda
- **CMV**: Custo da Mercadoria Vendida - percentual do custo em relação ao preço
- **Sub-receita**: Ficha técnica que usa outra ficha técnica como ingrediente
- **Valor Final**: Custo unitário do insumo após aplicar fator de correção
- **Custo com Segurança**: Custo da receita considerando percentual de perda

---

**Módulos MVP:** Insumos, Fornecedores, Fichas Técnicas, Precificação, Configurações
