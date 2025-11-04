import {
  FulfillmentOrderRequestStatus,
  FulfillmentOrderStatus,
  FulfillmentStatus,
  OrderDisplayFinancialStatus,
  OrderDisplayFulfillmentStatus,
} from "../types/admin.types";

/**
 * Composite snapshot of Shopify's order + fulfillment order state.
 *
 * Note: Shopify's public diagram labels occasionally diverge from enum names in the
 * Admin API (for example, "IN PROGRESS" vs `IN_PROGRESS`). Whenever that happens we
 * favour the generated enum values below and document the difference inline.
 */
export interface FulfillmentCompositeState {
  orderStatus: OrderDisplayFulfillmentStatus | null;
  orderFinancialStatus: OrderDisplayFinancialStatus | null;
  fulfillmentOrderStatus: FulfillmentOrderStatus | null;
  fulfillmentRequestStatus: FulfillmentOrderRequestStatus | null;
  fulfillmentStatus: FulfillmentStatus | null;
}

export type TransitionKind = "api" | "mock" | "system";

export type TransitionId =
  | "ACCEPT_FULFILLMENT_REQUEST"
  | "REJECT_FULFILLMENT_REQUEST"
  | "CREATE_FULFILLMENT"
  | "UPDATE_TRACKING"
  | "CANCEL_FULFILLMENT"
  | "ACCEPT_CANCELLATION"
  | "REJECT_CANCELLATION"
  | "PLACE_HOLD"
  | "RELEASE_HOLD"
  | "CLOSE_FULFILLMENT_ORDER"
  | "MOCK_EXTERNAL_FULFILLMENT"
  | "MOCK_MOVE_FULFILLMENT_ORDER"
  | "MOCK_SYSTEM_CANCELLATION";

export interface TransitionDefinition {
  id: TransitionId;
  label: string;
  description?: string;
  kind: TransitionKind;
  guard: (state: FulfillmentCompositeState) => boolean;
  /**
   * Expected state delta following a successful mutation.
   * The actual source of truth remains Shopify; call sites should re-fetch and
   * reconcile with the persisted snapshot after execution.
   */
  apply: (state: FulfillmentCompositeState) => FulfillmentCompositeState;
}

const transitions: TransitionDefinition[] = [
  {
    id: "ACCEPT_FULFILLMENT_REQUEST",
    label: "Accept fulfillment request",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FulfillmentOrderStatus.Open,
        fulfillmentRequestStatus: FulfillmentOrderRequestStatus.Submitted,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FulfillmentOrderStatus.InProgress,
      fulfillmentRequestStatus: FulfillmentOrderRequestStatus.Accepted,
    }),
  },
  {
    id: "REJECT_FULFILLMENT_REQUEST",
    label: "Reject fulfillment request",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FulfillmentOrderStatus.Open,
        fulfillmentRequestStatus: FulfillmentOrderRequestStatus.Submitted,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentRequestStatus: FulfillmentOrderRequestStatus.Rejected,
    }),
  },
  {
    id: "CREATE_FULFILLMENT",
    label: "Create fulfillment",
    description:
      "Creates a fulfillment via fulfillmentCreateV2 (+ tracking optional).",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FulfillmentOrderStatus.InProgress,
        fulfillmentRequestStatus: FulfillmentOrderRequestStatus.Accepted,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FulfillmentOrderStatus.Closed,
      fulfillmentStatus: FulfillmentStatus.Success,
    }),
  },
  {
    id: "UPDATE_TRACKING",
    label: "Update tracking",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentStatus: FulfillmentStatus.Success,
      }),
    apply: (state) => state,
  },
  {
    id: "CANCEL_FULFILLMENT",
    label: "Cancel fulfillment",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentStatus: FulfillmentStatus.Success,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentStatus: FulfillmentStatus.Cancelled,
      fulfillmentOrderStatus: FulfillmentOrderStatus.Open,
      fulfillmentRequestStatus:
        FulfillmentOrderRequestStatus.CancellationRequested,
    }),
  },
  {
    id: "ACCEPT_CANCELLATION",
    label: "Accept cancellation",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentRequestStatus:
          FulfillmentOrderRequestStatus.CancellationRequested,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentRequestStatus:
        FulfillmentOrderRequestStatus.CancellationAccepted,
      fulfillmentOrderStatus: FulfillmentOrderStatus.Cancelled,
    }),
  },
  {
    id: "REJECT_CANCELLATION",
    label: "Reject cancellation",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentRequestStatus:
          FulfillmentOrderRequestStatus.CancellationRequested,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentRequestStatus:
        FulfillmentOrderRequestStatus.CancellationRejected,
      fulfillmentOrderStatus: FulfillmentOrderStatus.InProgress,
    }),
  },
  {
    id: "PLACE_HOLD",
    label: "Place hold",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FulfillmentOrderStatus.Open,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FulfillmentOrderStatus.OnHold,
    }),
  },
  {
    id: "RELEASE_HOLD",
    label: "Release hold",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FulfillmentOrderStatus.OnHold,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FulfillmentOrderStatus.Open,
    }),
  },
  {
    id: "CLOSE_FULFILLMENT_ORDER",
    label: "Close fulfillment order",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FulfillmentOrderStatus.InProgress,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FulfillmentOrderStatus.Incomplete,
      fulfillmentRequestStatus: FulfillmentOrderRequestStatus.Closed,
    }),
  },
  {
    id: "MOCK_EXTERNAL_FULFILLMENT",
    label: "Mock: External fulfillment complete",
    description:
      "Represents an external 3PL marking the order fulfilled outside Shopify.",
    kind: "mock",
    guard: (state) =>
      matches(state, {
        fulfillmentRequestStatus: FulfillmentOrderRequestStatus.Submitted,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FulfillmentOrderStatus.Closed,
      fulfillmentRequestStatus: FulfillmentOrderRequestStatus.Accepted,
      fulfillmentStatus: FulfillmentStatus.Success,
    }),
  },
  {
    id: "MOCK_MOVE_FULFILLMENT_ORDER",
    label: "Mock: Move fulfillment order",
    description:
      "Simulates re-routing work to another location. In practice Shopify splits the fulfillment order.",
    kind: "mock",
    guard: (state) =>
      matches(state, { fulfillmentOrderStatus: FulfillmentOrderStatus.Open }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FulfillmentOrderStatus.Open,
      fulfillmentRequestStatus: FulfillmentOrderRequestStatus.Unsubmitted,
    }),
  },
  {
    id: "MOCK_SYSTEM_CANCELLATION",
    label: "Mock: System cancellation",
    description:
      "Emulates Shopify automatically cancelling the fulfillment order (e.g. inventory shortfall).",
    kind: "system",
    guard: () => true,
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FulfillmentOrderStatus.Cancelled,
      fulfillmentRequestStatus:
        FulfillmentOrderRequestStatus.CancellationAccepted,
      fulfillmentStatus: FulfillmentStatus.Cancelled,
    }),
  },
];

export function getAvailableTransitions(
  state: FulfillmentCompositeState,
): TransitionDefinition[] {
  return transitions.filter((transition) => transition.guard(state));
}

export function applyTransition(
  state: FulfillmentCompositeState,
  transitionId: TransitionId,
): FulfillmentCompositeState {
  const transition = transitions.find((item) => item.id === transitionId);
  if (!transition) {
    throw new Error(`Unknown transition '${transitionId}'`);
  }
  return transition.apply(state);
}

export function matches(
  state: FulfillmentCompositeState,
  expected: Partial<FulfillmentCompositeState>,
): boolean {
  return Object.entries(expected).every(([key, value]) => {
    const current = state[key as keyof FulfillmentCompositeState];
    return value === undefined || value === null || current === value;
  });
}

export const TRANSITIONS: TransitionDefinition[] = transitions;
