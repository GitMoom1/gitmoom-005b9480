# Plano de Implementação: Reestruturação do Sistema de Planos e IA

Vou implementar a nova arquitetura de planos e funcionalidades de IA conforme solicitado.

## 1. Banco de Dados (Supabase SQL)
Vou criar uma nova migração para adicionar as tabelas necessárias:
- **`subscriptions`**: Gerenciamento de planos (Starter, Pro, Business).
- **`copilot_subscriptions`**: Assinaturas separadas para o Copilot.
- **`ai_usage`**: Registro detalhado de uso de IA (Code Review, Refactoring, etc).
- **`copilot_usage`**: Registro de uso do Copilot.
- **Enums**: Tipos de planos e tipos de ações de IA.

## 2. Lógica de Negócio (Server Functions)
- **`plans.functions.ts`**: Listagem dinâmica de planos e limites.
- **`subscriptions.functions.ts`**: Criação de sessões de checkout do Stripe integradas aos novos preços.
- **`ai-agent.functions.ts`**: Implementação do `GitMoomAgent` para processar ações de IA (Auto-fix, Review, etc).

## 3. Interface (Landing Page & Dashboard)
- **Novo componente `PricingPlans.tsx`**: Interface organizada para exibir os novos valores de mensalidade/anuidade.
- **Atualização da Landing Page**: Substituição da seção de preços atual pela nova estrutura.
- **Configurações de Assinatura**: Painel para o usuário gerenciar seus planos ativos.

## Detalhes Técnicos (Conversão Prisma -> SQL)
Os modelos Prisma fornecidos serão convertidos para tabelas PostgreSQL com suporte nativo a RLS (Row Level Security), garantindo que usuários só acessem seus próprios dados de uso e assinatura.

---
Vou começar agora com a migração do banco de dados.
