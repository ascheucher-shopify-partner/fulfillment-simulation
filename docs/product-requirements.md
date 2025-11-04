# Product Requirements Plan

## Objective

- Deliver a minimal working fulfillment service prototype using Admin API 2026-01.
- Operate without legacy callback endpoints; rely exclusively on fulfillment order webhooks.
- Showcase one demo product stocked at the fulfillment service location and walk through the complete fulfillment lifecycle.

## Prototype Scope

1. Seed a single product/variant assigned to the fulfillment service location so customers can purchase it in the dev store.
2. Allow a merchant to submit the fulfillment request from Shopify Admin and then drive every subsequent transition from our app.
3. Persist fulfillment service identifiers (service ID, location ID) needed for subsequent API calls.

## State Machine Requirements

- Model both the Shopify Order and FulfillmentOrder states exactly as depicted in Shopify’s fulfillment flow diagram (see reference image: order status + request status + fulfillment statuses). If any label diverges from the 2026-01 Admin API enums produced by codegen, align to the generated types and annotate the discrepancy in state-machine comments.
- Capture transitions such as `OPEN → IN_PROGRESS → CLOSED`, request statuses (e.g., `SUBMITTED`, `ACCEPTED`, `REJECTED`, `CANCELLATION_REQUESTED`), and fulfillment outcomes (`SUCCESS`, `CANCELLED`).
- Expose the machine to the UI via strongly typed enums/interfaces derived from generated Admin API schema.
- Provide helper utilities to compute allowed transitions for the current state.
- Persist the current state machine snapshot in Prisma. On every webhook refresh, reconcile Shopify’s latest state with the stored snapshot: if they differ, favor Shopify’s data, append an error entry to the transition log, and update the snapshot.

## Admin UI Requirements

- Build a single embedded admin page:
  - Search/select a Shopify order (using order name or ID).
  - Display the current order financial status, fulfillment order status, and request status in real time.
  - Render buttons for only the valid next transitions according to the state machine (e.g., Accept request, Reject request, Create fulfillment, Cancel fulfillment, Update tracking).
- Clicking a transition button should execute the corresponding Admin API mutation (or mock where not yet implemented) and refresh state. Implement the button handlers in a dedicated module (for example `services/fulfillmentTransitions.ts`) so UI components remain declarative and logic stays reusable.
- Include clear status badges plus an event log (timestamped entries showing each state transition and the actor/action) so a demo can walk through every stage visibly.

## Fulfillment Flow Simulation

- After a customer places the demo order, the merchant triggers `fulfillmentOrderSubmitFulfillmentRequest` from Shopify Admin.
- Our admin page surfaces the new request, enabling simulated actions: accept/reject, create fulfillment, update tracking, cancel fulfillment, etc.
- Ensure every transition updates the local state machine and re-queries the order/fulfillment order to confirm the Shopify source of truth.

## Outstanding Tasks

- Implement business logic inside `app/routes/webhooks.fulfillment_orders.$topic.tsx` to update local state/store in response to webhook notifications, delegating to a shared module (for example `services/fulfillmentWebhooks.ts`) to keep route files thin and re-usable.
- Build the state machine module (TypeScript) with serialization helpers for persistence.
- Scaffold the single admin route UI with Polaris, wiring GraphQL mutations/queries through generated types.
- Seed data/migration to guarantee the demo product exists and is assigned to the fulfillment service location.
- Define Prisma models for the state machine snapshot and transition log using normalized columns with foreign keys to Shopify orders and fulfillment orders. Persist only basic fields needed for admin views (customer name, order name/ID, timestamps) and logging.
- Implement reconciliation logic that updates the Prisma snapshot after each webhook and writes discrepancy entries to the transition log.

## Mock Transitions

Some paths in Shopify’s diagram cannot be triggered directly through the Admin API. We will simulate them via mock transitions to showcase the full lifecycle:

- **External fulfillment action** – when routing indicates `Action: EXTERNAL`, merchants are redirected to a third-party system. Provide a mock “Mark external fulfillment complete” transition that closes the fulfillment order and creates a fulfillment record.
- **Move fulfillment order** – rerouting items to another location isn’t exposed in our UI. Add a mock transition to simulate moving the fulfillment order and splitting into new orders.
- **Hold & release toggles initiated by Shopify** – add mock buttons to place/release holds to demonstrate the state paths even if not triggered from Admin.
- **System-driven cancellations** – simulate Shopify auto-cancellation (e.g., stockout) to reach `INCOMPLETE` or `CANCELLED` statuses without a merchant action.

Document each mock action clearly in the UI so demo viewers know it represents an external trigger.

## Open Questions

- None outstanding at this time. Transition logs will keep full history, and the logfile will live in the temp directory without rotation (manual cleanup when needed).

## Observations

- After executing `CREATE_FULFILLMENT`, the Admin API returns `orderStatus: FULFILLED` with `fulfillmentStatus: null`, whereas the published diagram implies `fulfillmentStatus: SUCCESS`. We treat Shopify’s response as canonical and persist the `FULFILLED/null` combination to avoid false mismatch errors.
- The “Place hold” transition only succeeds while the fulfillment order request status is `UNSUBMITTED`. Once the merchant presses “Request fulfillment” in Shopify Admin (transitioning the request status to `SUBMITTED`), Shopify rejects hold attempts.
