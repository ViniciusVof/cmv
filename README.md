# Sistema de Controle - Whitelabel

Sistema de gerenciamento whitelabel com controle de custos, estoque, fornecedores, CMV e PDV.

## 🚀 Tecnologias

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Zustand** - Gerenciamento de estado
- **React Router** - Navegação

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn

## 🛠️ Instalação

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
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
├── services/       # Serviços (mocks por enquanto)
├── stores/         # Stores do Zustand
└── types/          # Tipos TypeScript
```

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter

## 🎯 Funcionalidades Implementadas

- ✅ Autenticação com mocks
- ✅ Dashboard inicial
- ✅ Rotas protegidas
- ✅ Layout com Header

## 📦 Próximos Módulos

- [ ] PDV (Ponto de Venda)
- [ ] Controle de Estoque
- [ ] Gestão de Fornecedores
- [ ] Cálculo de CMV
- [ ] CMV Global
- [ ] Controle de Custo Fixo
- [ ] Relatórios

