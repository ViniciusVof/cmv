# Sistema de Controle - Whitelabel

Sistema de gerenciamento whitelabel com controle de custos, estoque, fornecedores, CMV e PDV.

## 🚀 Tecnologias

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Zustand** - Gerenciamento de estado
- **React Router** - Navegação
- **JSON Server** - API REST simulada
- **Axios** - Cliente HTTP

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn

## 🛠️ Instalação

1. Instale as dependências:
```bash
npm install
```

2. Inicie o JSON Server e o servidor de desenvolvimento:
```bash
npm run dev:all
```

Ou inicie separadamente:

**Terminal 1 - JSON Server (API):**
```bash
npm run server
```
A API estará disponível em `http://localhost:3001`

**Terminal 2 - Vite (Frontend):**
```bash
npm run dev
```

3. Acesse `http://localhost:5173`

## 🔐 Credenciais de Acesso

- **Admin**: admin@system.com / 123456

> Por enquanto, o sistema suporta apenas usuários com permissão de administrador.

## 📁 Estrutura do Projeto

```
src/
├── components/      # Componentes reutilizáveis
├── pages/          # Páginas da aplicação
├── services/       # Serviços (API calls)
├── stores/         # Stores do Zustand
├── types/          # Tipos TypeScript
├── config/         # Configurações (API, etc.)
└── ...
db.json             # Banco de dados do JSON Server
```

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento (Vite)
- `npm run server` - Inicia JSON Server (API REST)
- `npm run dev:all` - Inicia ambos os servidores simultaneamente
- `npm run build` - Gera build de produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter
- `npm run reset:db` - Limpa dados operacionais e preserva dados iniciais (fornecedores, estoque inicial, custos fixos/variáveis)
- `npm run reset:hard` - Reset completo (zera tudo exceto usuários)
- `npm run reset:only-users` - Preserva apenas usuários, limpa todas as outras coleções

## 🌐 API Endpoints

O JSON Server cria automaticamente os seguintes endpoints REST:

- `GET /fixedCosts` - Lista todos os custos fixos
- `POST /fixedCosts` - Cria um novo custo fixo
- `GET /fixedCosts/:id` - Busca um custo fixo por ID
- `PUT /fixedCosts/:id` - Atualiza um custo fixo
- `DELETE /fixedCosts/:id` - Exclui um custo fixo

- `GET /variableCosts` - Lista todos os custos variáveis
- `POST /variableCosts` - Cria um novo custo variável
- `GET /variableCosts/:id` - Busca um custo variável por ID
- `PUT /variableCosts/:id` - Atualiza um custo variável
- `DELETE /variableCosts/:id` - Exclui um custo variável

- `GET /users` - Lista todos os usuários

## 🎯 Funcionalidades Implementadas

### Core
- ✅ Autenticação com API REST
- ✅ Dashboard inicial
- ✅ Rotas protegidas
- ✅ Layout com Header e Sidebar responsivo
- ✅ Backend customizado com JSON Server (lógica de negócios no servidor)

### Gestão Financeira
- ✅ Custos Fixos (CRUD + insights e ordenação)
- ✅ Custos Variáveis (CRUD + insights e ordenação)
- ✅ Gestão de Caixa: abertura/fechamento, transações (entradas/saídas), relatório detalhado
- ✅ Validação de fechamento (impede fechar caixa com pedidos em aberto)
- ✅ Histórico de caixas com visualização de relatórios anteriores
- ✅ Baixa de pagamentos de entregadores

### Estoque e Insumos
- ✅ Gestão de Insumos: cadastro completo com cálculo de valor final (R$ Pago ÷ Volume × Fator de Correção)
- ✅ Movimentações de Estoque: entradas e saídas individuais
- ✅ Movimentações em Lote: importação de múltiplas entradas
- ✅ Conciliação de Estoque: comparação físico vs sistema, geração de ajustes automáticos e relatório
- ✅ Limites de Estoque: mínimo, ideal e máximo por insumo
- ✅ Insights de Estoque: alertas para abaixo do mínimo, abaixo do ideal e acima do máximo
- ✅ Filtros de Estoque: filtro por status de estoque
- ✅ Calculadora de Fator de Correção integrada
- ✅ Baixa automática de estoque ao criar pedidos (com base em fichas técnicas)

### Fornecedores
- ✅ Gestão de Fornecedores (CRUD completo)

### Produtos e Fichas Técnicas
- ✅ Produtos do PDV: cadastro com vínculo opcional à Ficha Técnica
- ✅ Categorias de Produto: criação e uso no PDV com autocomplete/criação rápida
- ✅ Fichas Técnicas (Receitas): cadastro com itens, cálculo de custo, markup sugerido
- ✅ Suporte a sub-receitas (produtos compostos por outros produtos)
- ✅ CMV por produto baseado em fichas técnicas

### Pedidos e Entregas
- ✅ Sistema de Pedidos completo: criação, edição, cancelamento
- ✅ Kanban de Pedidos: visualização por status (cozinha, em entrega, concluído, cancelado)
- ✅ Gestão de Clientes: cadastro com múltiplos endereços
- ✅ Áreas de Entrega: cadastro com taxa de entrega e tempo estimado
- ✅ Entregadores: cadastro com taxa diária e configuração de repasse de taxa de entrega
- ✅ Métodos de Pagamento: suporte a dinheiro, cartão (crédito/débito), PIX com taxas configuráveis
- ✅ Cálculo automático de taxas de cartão/PIX
- ✅ Vinculação de pedidos ao caixa aberto
- ✅ Baixa automática de estoque ao criar pedidos (recursiva para sub-receitas)

### Relatórios e Análises
- ✅ Relatório de Movimentação de Estoque: histórico completo com filtros de data
- ✅ Relatório de Conciliação de Estoque: histórico de todas as conciliações realizadas
- ✅ Relatório de Caixa: detalhado com todas as transações, saldo esperado vs real
- ✅ CMV Global: módulo completo com:
  - Filtros de período (últimos 7 dias, este mês, último mês, período customizado)
  - KPIs: Custo Consumido, Vendas, CMV %
  - Tabela detalhada por insumo: quantidade, custo unitário, custo total, participação, CMV %
  - Ordenação por qualquer coluna
  - Insights: Maior contribuição, Top 5 cobertura, Regra 80/20 (Pareto)
  - Filtros interativos nos insights (Top 5, 80/20)
  - Visualização gráfica dos dados

### Configurações
- ✅ Configurações de Negócio: markup padrão, taxa iFood, método de cálculo de CMV
- ✅ Taxas de pagamento configuráveis (cartão de crédito, débito, PIX)
- ✅ Taxa de entregador configurável

### Utilitários
- ✅ Scripts de reset do banco de dados:
  - `npm run reset:db` - Limpa dados operacionais e preserva dados iniciais (fornecedores, estoque inicial, custos fixos/variáveis)
  - `npm run reset:hard` - Reset completo (zera tudo)
  - `npm run reset:only-users` - Preserva apenas usuários
- ✅ Variáveis de ambiente para configuração de API (VITE_API_URL)

## 🧭 Roadmap

### Melhorias Futuras
- [ ] Integrações externas (ex.: iFood API)
- [ ] Permissões e perfis de usuário (além de Admin)
- [ ] Dashboard executivo com gráficos e métricas consolidadas
- [ ] Exportação de relatórios (PDF, Excel)
- [ ] Notificações e alertas em tempo real
- [ ] Sistema de backup e restore
- [ ] Modo offline/PWA
- [ ] Multi-tenancy (suporte a múltiplos negócios)

### Otimizações Técnicas
- [ ] Migração de JSON Server para banco de dados real (PostgreSQL/SQLite)
- [ ] Cache e otimização de queries
- [ ] Testes automatizados (unitários e E2E)
- [ ] Documentação da API (Swagger/OpenAPI)
- [ ] CI/CD pipeline
- [ ] Logs e monitoramento de erros

### Features Adicionais
- [ ] Compras e pedidos de compra a fornecedores
- [ ] Controle de prazo de validade de insumos
- [ ] Previsão de estoque baseada em histórico
- [ ] Relatórios de lucratividade por produto
- [ ] Dashboard de vendas por período
- [ ] Integração com sistemas de pagamento
- [ ] App mobile para entregadores

