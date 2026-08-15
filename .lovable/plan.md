# Plan - GitMoon Pricing & Backend Architecture

Implement the full backend for pricing plans, token usage tracking, and Stripe integration.

## User Review Required

> [!IMPORTANT]
> The CPF limit logic uses a salted SHA-256 hash to identify individuals without storing sensitive personal data (CPF). This ensures privacy compliance while enforcing the 5-account limit.

- **Pricing Tiers**:
    - **Free**: 2.5k tokens, 5 repos (Limit 5 accounts per person).
    - **Basic**: 7.5k tokens, 20 repos, R$ 19,90.
    - **Pro**: 15k tokens, 40 repos, R$ 49,99.
    - **Enterprise**: 30k tokens, 100 repos, R$ 79,00.
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

### Logic
- **`create_repository`**: A database function that checks the user's current plan repository limit before allowing a new entry.
- **`reserve_tokens` / `settle_tokens`**: Functions to manage the "fair usage" token consumption flow.
- **Stripe Webhook**: Updates the user's `profile.plan_id` and expiry date upon successful payment.
- **Automated Downgrade**: A routine (invoked by webhook or scheduled check) that deactivates repos exceeding the free limit when a plan expires, preserving the 5 oldest ones.

### UI Changes
- Update `src/routes/index.tsx` to use the new BRL tiers.
- Integrate `useStripeCheckout` to launch the payment flow directly from the pricing table.
