# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shopify fulfillment service app simulator built with React Router that demonstrates the complete fulfillment lifecycle using Shopify Admin API 2026-01. The app operates as a custom distribution app with webhook-driven state management, simulating a third-party fulfillment service that receives and processes fulfillment orders.

## Development Commands

```bash
# Core development
pnpm dev          # Start Shopify app development server with tunneling
pnpm build        # Production build
pnpm setup        # Initialize Prisma (generate + migrate)

# Code quality & types
pnpm graphql-codegen    # Regenerate Admin API types from schema
pnpm typecheck         # TypeScript validation
pnpm lint             # ESLint validation

# Database
npx prisma migrate dev  # Create and apply new migration
npx prisma db push     # Push schema changes without migration
npx prisma studio      # Open database browser
```

## Architecture Overview

### State-First Design Pattern
The app follows a **state-first architecture** where:
- Shopify is the single source of truth for all fulfillment states
- Local database stores snapshots for reconciliation and audit trails
- Webhook events trigger state synchronization, never prediction
- UI actions execute transitions then reconcile state from Shopify

### Core Service Layer (`/app/services/`)

**`stateMachine.ts`** - Defines composite fulfillment states and valid transitions using generated Admin API types. Contains the business logic for determining available actions based on current state.

**`fulfillmentWebhooks.ts`** - Processes incoming Shopify webhooks, fetches current state from Admin API, and reconciles with local snapshots. Key function: `handleFulfillmentOrderWebhook()` at line 50.

**`fulfillmentTransitions.ts`** - GraphQL mutation wrappers for all fulfillment operations (accept, reject, fulfill, cancel, etc.). Each function handles API calls and error responses.

**`logger.ts`** - Centralized logging with structured output for debugging webhook processing and state transitions.

### Data Flow Patterns

**Webhook Processing:**
```
Shopify Event → /webhooks.fulfillment_orders.$topic.tsx → 
fulfillmentWebhooks.handleFulfillmentOrderWebhook() → 
Fetch current state via FULFILLMENT_STATE_QUERY → 
Compare with local snapshot → Update database → Log changes
```

**UI Actions:**
```
Button Click → Form Action → fulfillmentTransitions function → 
Admin API mutation → State reconciliation → UI update
```

### Database Schema (Prisma)

**Key Models:**
- `ShopifyOrder` - Cached order data with customer information
- `FulfillmentOrderRecord` - Fulfillment order state with supported actions JSON
- `FulfillmentStateSnapshot` - Composite state snapshots for reconciliation
- `FulfillmentTransitionLog` - Complete audit trail with state changes and errors

### GraphQL & Type Generation

- **Generated Types**: Import from `/app/types/admin.generated.d.ts` and `admin.types.d.ts`
- **Schema Source**: Uses Admin API 2026-01 with comprehensive fulfillment scopes
- **GraphQL Client**: Custom wrapper in `/app/lib/graphqlClient.ts` with error handling and response validation
- **After Scope Changes**: Run `pnpm graphql-codegen` to regenerate types

### Webhook Configuration

The app subscribes to 11 fulfillment order webhook topics defined in `shopify.app.toml`:
- All fulfillment order lifecycle events (requests, holds, cancellations, etc.)
- Webhook route: `/app/routes/webhooks.fulfillment_orders.$topic.tsx`
- Processing extracts fulfillment order resource from various payload structures

### Admin UI Pattern

Single embedded admin page at `/app/routes/app._index.tsx`:
- Loads all fulfillment orders and their current states
- Uses state machine to determine available transition buttons
- Form actions execute transitions via service layer
- Real-time state updates after each operation

## Development Guidelines

### Working with States
- Always use the composite state types from `stateMachine.ts`
- State transitions must go through the service layer functions
- After mutations, always reconcile state with Shopify using webhook sync

### Error Handling
- Use the GraphQL client wrapper for consistent error formatting
- GraphQL errors are logged with full context in webhook processing
- Manual vs automated topic mismatches are flagged as errors

### Adding New Transitions
1. Add transition function to `fulfillmentTransitions.ts`
2. Update state machine guards if needed
3. Add UI button with form action in admin route
4. Test with webhook reconciliation

### Database Changes
- Use Prisma migrations for schema changes
- Generated types depend on database schema matching Admin API structure
- Snapshot comparison relies on consistent JSON serialization

## Key Configuration Files

- `shopify.app.toml` - App configuration with webhook subscriptions and scopes
- `prisma/schema.prisma` - Database schema with fulfillment domain models
- `app/types/admin-2026-01.schema.json` - GraphQL schema for code generation
- `.graphqlrc.ts` - GraphQL code generation configuration

## Important Implementation Notes

- The app requires custom distribution for protected fulfillment data access
- Webhook topics prefixed with "manual/" indicate simulator-triggered events
- State mismatches between manual events and actual Shopify state are logged as errors
- The `FULFILLMENT_STATE_QUERY` fetches comprehensive state including nested fulfillments and tracking
- Supported actions are stored as JSON and parsed dynamically for UI rendering