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

- ✅ Autenticação com API REST
- ✅ Dashboard inicial
- ✅ Rotas protegidas
- ✅ Layout com Header e Sidebar expansível
- ✅ Módulo de Custo Fixo (CRUD completo)
- ✅ Módulo de Custo Variável (CRUD completo)
- ✅ JSON Server para simulação de API REST

## 📦 Próximos Módulos

- [ ] PDV (Ponto de Venda)
- [ ] Controle de Estoque
- [ ] Gestão de Fornecedores
- [ ] Cálculo de CMV
- [ ] CMV Global
- [ ] Controle de Custo Fixo
- [ ] Relatórios

