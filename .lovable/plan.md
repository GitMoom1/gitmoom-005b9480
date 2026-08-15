# Plan - GitMoon Pricing & Backend Architecture

Implement the full backend for pricing plans, token usage tracking, and Stripe integration.

## User Review Required

> [!IMPORTANT]
> The CPF limit logic uses a salted SHA-256 hash to identify individuals without storing sensitive personal data (CPF). This ensures privacy compliance while enforcing the 5-account limit.

- **Pricing Tiers**:
    - **Orbit (Free)**: 2.5k tokens, 5 repos (Limit 5 accounts per person).
    - **Eclipse (Basic)**: 7.5k tokens, 20 repos, R$ 19,90/month.
    - **Galaxy (Pro)**: 15k tokens, 40 repos, R$ 49,99/month.
    - **Supernova (Enterprise)**: 30k tokens, 100 repos, R$ 79,00/month.
- **Token Model**: Fair usage with pre-reservation and settlement based on actual model consumption.
- **Stripe**: Embedded checkout with automatic tax calculation for Brazil.

## Technical Details

### Database Schema (Supabase)
1.  **`plans`**: Catalog of available plans and their metadata (tokens, repo limit, price).
2.  **`profiles`**: Extended user data including current `plan_id`, `tokens_remaining`, `tokens_held` (reserved), and `plan_expires_at`.
3.  **`repositories`**: Table to store user repos with a check function for plan limits.
4.  **`token_ledger`**: Immutable log of all token transactions (reserve, settle, grant).
5.  **`free_accounts_control`**: Stores hashed CPF identifiers to enforce the 5-account limit per person.
6.  **`subscriptions`**: Tracks Stripe subscription status and maps back to plans.

### Architecture & Roadmap (As requested)
1.  **Núcleo do Sistema**:
    - **Modelagem de Dados**: Gerenciamento robusto de usuários, permissões, repositórios e tokens. Organização estilo GitHub (Owner/Member).
    - **Mecanismo de Tokens**: Validação de saldo pré-ação. Validação de 5 contas por CPF no cadastro.
2.  **Arquitetura de Processamento**:
    - **Pipeline de Eventos (Inspirado em Kafka)**: Desacoplamento via eventos para ações críticas.
    - **Workers Especializados**: Processamento assíncrono para repositórios, pagamentos e notificações.
3.  **Coração do Git**:
    - **Gitaly/Workhorse Style**: Abstração de operações Git e proxy inteligente para tráfego pesado.
4.  **Tecnologias**: Ruby on Rails (Web), Go (Performance), PostgreSQL (DB), Redis (Cache/Filas), Kubernetes (Orquestração).

### UI Changes
- Update `src/routes/index.tsx` to include the detailed architecture roadmap.
- Integrate `useStripeCheckout` to launch the payment flow directly from the pricing table.
