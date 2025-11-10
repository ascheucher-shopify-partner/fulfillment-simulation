import type {
  FulfillmentOrderRequestStatus as FulfillmentOrderRequestStatusType,
  FulfillmentOrderStatus as FulfillmentOrderStatusType,
  FulfillmentStatus as FulfillmentStatusType,
  OrderDisplayFinancialStatus,
  OrderDisplayFulfillmentStatus,
} from "../types/admin.types";

type FulfillmentOrderRequestStatus = FulfillmentOrderRequestStatusType;
type FulfillmentOrderStatus = FulfillmentOrderStatusType;
type FulfillmentStatus = FulfillmentStatusType;

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

const FULFILLMENT_ORDER_STATUS = {
  Cancelled: "CANCELLED" as FulfillmentOrderStatus,
  Closed: "CLOSED" as FulfillmentOrderStatus,
  Incomplete: "INCOMPLETE" as FulfillmentOrderStatus,
  InProgress: "IN_PROGRESS" as FulfillmentOrderStatus,
  OnHold: "ON_HOLD" as FulfillmentOrderStatus,
  Open: "OPEN" as FulfillmentOrderStatus,
  Scheduled: "SCHEDULED" as FulfillmentOrderStatus,
} as const;

const FULFILLMENT_ORDER_REQUEST_STATUS = {
  Accepted: "ACCEPTED" as FulfillmentOrderRequestStatus,
  CancellationAccepted:
    "CANCELLATION_ACCEPTED" as FulfillmentOrderRequestStatus,
  CancellationRejected:
    "CANCELLATION_REJECTED" as FulfillmentOrderRequestStatus,
  CancellationRequested:
    "CANCELLATION_REQUESTED" as FulfillmentOrderRequestStatus,
  Closed: "CLOSED" as FulfillmentOrderRequestStatus,
  Rejected: "REJECTED" as FulfillmentOrderRequestStatus,
  Submitted: "SUBMITTED" as FulfillmentOrderRequestStatus,
  Unsubmitted: "UNSUBMITTED" as FulfillmentOrderRequestStatus,
} as const;

const FULFILLMENT_STATUS = {
  Cancelled: "CANCELLED" as FulfillmentStatus,
  Error: "ERROR" as FulfillmentStatus,
  Failure: "FAILURE" as FulfillmentStatus,
  Open: "OPEN" as FulfillmentStatus,
  Pending: "PENDING" as FulfillmentStatus,
  Success: "SUCCESS" as FulfillmentStatus,
} as const;

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
        fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Open,
        fulfillmentRequestStatus: FULFILLMENT_ORDER_REQUEST_STATUS.Submitted,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.InProgress,
      fulfillmentRequestStatus: FULFILLMENT_ORDER_REQUEST_STATUS.Accepted,
    }),
  },
  {
    id: "REJECT_FULFILLMENT_REQUEST",
    label: "Reject fulfillment request",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Open,
        fulfillmentRequestStatus: FULFILLMENT_ORDER_REQUEST_STATUS.Submitted,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentRequestStatus: FULFILLMENT_ORDER_REQUEST_STATUS.Rejected,
    }),
  },
  {
    id: "CREATE_FULFILLMENT",
    label: "Create fulfillment",
    description:
      "Creates a fulfillment via fulfillmentCreate (+ tracking optional).",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.InProgress,
        fulfillmentRequestStatus: FULFILLMENT_ORDER_REQUEST_STATUS.Accepted,
      }),
    apply: (state) => ({
      ...state,
      orderStatus: "FULFILLED" as OrderDisplayFulfillmentStatus,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Closed,
      // Shopify currently returns a null `fulfillmentStatus` for the order snapshot
      // even after a fulfillment is created, so we avoid predicting SUCCESS here.
      fulfillmentStatus: null,
    }),
  },
  {
    id: "UPDATE_TRACKING",
    label: "Update tracking",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Closed,
      }),
    apply: (state) => state,
  },
  {
    id: "CANCEL_FULFILLMENT",
    label: "Cancel fulfillment",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentStatus: FULFILLMENT_STATUS.Success,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentStatus: FULFILLMENT_STATUS.Cancelled,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Open,
      fulfillmentRequestStatus:
        FULFILLMENT_ORDER_REQUEST_STATUS.CancellationRequested,
    }),
  },
  {
    id: "ACCEPT_CANCELLATION",
    label: "Accept cancellation",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentRequestStatus:
          FULFILLMENT_ORDER_REQUEST_STATUS.CancellationRequested,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentRequestStatus:
        FULFILLMENT_ORDER_REQUEST_STATUS.CancellationAccepted,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Cancelled,
    }),
  },
  {
    id: "REJECT_CANCELLATION",
    label: "Reject cancellation",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentRequestStatus:
          FULFILLMENT_ORDER_REQUEST_STATUS.CancellationRequested,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentRequestStatus:
        FULFILLMENT_ORDER_REQUEST_STATUS.CancellationRejected,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.InProgress,
    }),
  },
  {
    id: "PLACE_HOLD",
    label: "Place hold",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Open,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.OnHold,
    }),
  },
  {
    id: "RELEASE_HOLD",
    label: "Release hold",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.OnHold,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Open,
    }),
  },
  {
    id: "CLOSE_FULFILLMENT_ORDER",
    label: "Close fulfillment order",
    kind: "api",
    guard: (state) =>
      matches(state, {
        fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.InProgress,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Incomplete,
      fulfillmentRequestStatus: FULFILLMENT_ORDER_REQUEST_STATUS.Closed,
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
        fulfillmentRequestStatus: FULFILLMENT_ORDER_REQUEST_STATUS.Submitted,
      }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Closed,
      fulfillmentRequestStatus: FULFILLMENT_ORDER_REQUEST_STATUS.Accepted,
      fulfillmentStatus: FULFILLMENT_STATUS.Success,
    }),
  },
  {
    id: "MOCK_MOVE_FULFILLMENT_ORDER",
    label: "Mock: Move fulfillment order",
    description:
      "Simulates re-routing work to another location. In practice Shopify splits the fulfillment order.",
    kind: "mock",
    guard: (state) =>
      matches(state, { fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Open }),
    apply: (state) => ({
      ...state,
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Open,
      fulfillmentRequestStatus: FULFILLMENT_ORDER_REQUEST_STATUS.Unsubmitted,
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
      fulfillmentOrderStatus: FULFILLMENT_ORDER_STATUS.Cancelled,
      fulfillmentRequestStatus:
        FULFILLMENT_ORDER_REQUEST_STATUS.CancellationAccepted,
      fulfillmentStatus: FULFILLMENT_STATUS.Cancelled,
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
