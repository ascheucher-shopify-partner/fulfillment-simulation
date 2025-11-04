import { useState, type ChangeEvent } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";
import {
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  acceptCancellationRequest,
  acceptFulfillmentRequest,
  closeFulfillmentOrder,
  createFulfillment,
  placeFulfillmentHold,
  rejectCancellationRequest,
  rejectFulfillmentRequest,
  releaseFulfillmentHold,
} from "../services/fulfillmentTransitions";
import {
  applyTransition,
  getAvailableTransitions,
  TRANSITIONS,
  type FulfillmentCompositeState,
  type TransitionDefinition,
  type TransitionId,
} from "../services/stateMachine";
import { syncFulfillmentOrderState } from "../services/fulfillmentWebhooks";
import { logError, logInfo } from "../services/logger";
import {
  createGraphQLClient,
  formatGraphQLErrors,
  type GraphQLClient,
} from "../lib/graphqlClient";
import type {
  OrderDisplayFinancialStatus,
  OrderDisplayFulfillmentStatus,
  FulfillmentOrderRequestStatus,
  FulfillmentOrderStatus,
  FulfillmentStatus,
  FulfillmentHoldReason,
  FulfillmentOrderHoldInput,
} from "../types/admin.types";

const SUPPORTED_TRANSITIONS: TransitionId[] = [
  "ACCEPT_FULFILLMENT_REQUEST",
  "REJECT_FULFILLMENT_REQUEST",
  "CREATE_FULFILLMENT",
  "ACCEPT_CANCELLATION",
  "REJECT_CANCELLATION",
  "PLACE_HOLD",
  "RELEASE_HOLD",
  "CLOSE_FULFILLMENT_ORDER",
  "MOCK_EXTERNAL_FULFILLMENT",
  "MOCK_MOVE_FULFILLMENT_ORDER",
  "MOCK_SYSTEM_CANCELLATION",
];

const MOCK_TRANSITION_GUIDE: Partial<Record<TransitionId, { title: string; steps: string[] }>> = {
  MOCK_EXTERNAL_FULFILLMENT: {
    title: "External fulfillment complete",
    steps: [
      "In Shopify admin, request fulfillment for the order so the fulfillment order is submitted to the service.",
      "Allow the external fulfillment provider to accept the request and create the fulfillment (typically by calling the Admin API's fulfillmentCreateV2).",
      "When the fulfillment is created Shopify emits the same webhook events that this mock transition simulates.",
    ],
  },
  MOCK_MOVE_FULFILLMENT_ORDER: {
    title: "Move fulfillment order",
    steps: [
      "In Shopify admin, open the order and from the fulfillment order card choose More actions → Move fulfillment.",
      "Pick the new fulfillment location and confirm. Shopify will close the original fulfillment order and create a replacement.",
      "That action triggers Shopify's move webhooks; the mock button simply demonstrates the resulting state change.",
    ],
  },
  MOCK_SYSTEM_CANCELLATION: {
    title: "System-driven cancellation",
    steps: [
      "Reduce available/on-hand inventory for the assigned location so that the fulfillment order can no longer be fulfilled.",
      "From the Shopify admin fulfillment order card choose Cancel fulfillment order (or accept the merchant cancellation request).",
      "Shopify then emits the cancellation webhooks that this mock transition mimics.",
    ],
  },
};

type TransitionLogView = {
  id: string;
  createdAt: string;
  action: string;
  message: string | null;
  kind: string;
  actor: string | null;
};

type FulfillmentOrderView = {
  id: string;
  status: string | null;
  requestStatus: string | null;
  fulfillAt: string | null;
  assignedLocationId: string | null;
  supportedActions: Array<{ action: string; externalUrl: string | null }>;
  state: FulfillmentCompositeState;
};

type LoaderData = {
  orders: Array<{ id: string; name: string; createdAt: string }>;
  activeOrderId: string | null;
  activeOrder: {
    id: string;
    name: string;
    transitionLogs: TransitionLogView[];
    fulfillmentOrders: FulfillmentOrderView[];
  } | null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const selectedOrderId = url.searchParams.get("orderId");

  const orders = await prisma.shopifyOrder.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });

  const activeOrderId = selectedOrderId ?? orders[0]?.id ?? null;

  let activeOrder = null;
  if (activeOrderId) {
    activeOrder = await prisma.shopifyOrder.findUnique({
      where: { id: activeOrderId },
      include: {
        fulfillmentOrders: {
          include: {
            stateSnapshots: true,
          },
          orderBy: { createdAt: "desc" },
        },
        transitionLogs: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });
  }

  return buildLoaderData({ orders, activeOrder, activeOrderId });
};

function buildLoaderData({
  orders,
  activeOrder,
  activeOrderId,
}: {
  orders: Array<{
    id: string;
    name: string | null;
    createdAt: Date;
  }>;
  activeOrder: any;
  activeOrderId: string | null;
}): LoaderData {
  const orderSummaries = orders.map((order) => ({
    id: order.id,
    name: order.name ?? order.id,
    createdAt: order.createdAt.toISOString(),
  }));

  if (!activeOrderId || !activeOrder) {
    return {
      orders: orderSummaries,
      activeOrder: null,
      activeOrderId,
    };
  }

  const fulfillmentOrders = activeOrder.fulfillmentOrders.map((fo: any) => {
    const snapshot = fo.stateSnapshots[0] ?? null;
    const state: FulfillmentCompositeState = {
      orderStatus: (snapshot?.orderStatus as OrderDisplayFulfillmentStatus | null) ?? null,
      orderFinancialStatus:
        (snapshot?.orderFinancialStatus as OrderDisplayFinancialStatus | null) ?? null,
      fulfillmentOrderStatus:
        (snapshot?.fulfillmentOrderStatus as FulfillmentOrderStatus | null) ??
        (fo.status as FulfillmentOrderStatus | null),
      fulfillmentRequestStatus:
        (snapshot?.fulfillmentRequestStatus as FulfillmentOrderRequestStatus | null) ??
        (fo.requestStatus as FulfillmentOrderRequestStatus | null),
      fulfillmentStatus:
        (snapshot?.fulfillmentStatus as FulfillmentStatus | null) ?? null,
    };

    return {
      id: fo.id,
      status: fo.status,
      requestStatus: fo.requestStatus,
      fulfillAt: fo.fulfillAt ? fo.fulfillAt.toISOString() : null,
      assignedLocationId: fo.assignedLocationId,
      supportedActions: parseSupportedActions(fo.supportedActionsJson),
      state,
    };
  });

  const logs = activeOrder.transitionLogs
    .map((log: any) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      action: log.action,
      message: log.message,
      kind: log.kind,
      actor: log.actor,
    }))
    .sort((a: TransitionLogView, b: TransitionLogView) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );

  return {
    orders: orderSummaries,
    activeOrder: {
      id: activeOrder.id,
      name: activeOrder.name ?? activeOrder.id,
      transitionLogs: logs,
      fulfillmentOrders,
    },
    activeOrderId,
  };
}

function parseSupportedActions(rawJson: string | null): Array<{ action: string; externalUrl: string | null }> {
  if (!rawJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => {
      if (typeof entry === "string") {
        return { action: entry, externalUrl: null };
      }
      if (entry && typeof entry === "object") {
        return {
          action: typeof entry.action === "string" ? entry.action : "UNKNOWN",
          externalUrl:
            typeof entry.externalUrl === "string" ? entry.externalUrl : null,
        };
      }
      return { action: "UNKNOWN", externalUrl: null };
    });
  } catch {
    return [];
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();

  const transitionId = formData.get("transitionId")?.toString() as
    | TransitionId
    | undefined;
  const orderId = formData.get("orderId")?.toString();
  const fulfillmentOrderId = formData.get("fulfillmentOrderId")?.toString();

  if (!transitionId || !orderId || !fulfillmentOrderId) {
    return { error: "Missing transition parameters." } as ActionData;
  }

  const transition = TRANSITIONS.find((entry) => entry.id === transitionId);
  if (!transition) {
    return { error: `Unknown transition ${transitionId}` } as ActionData;
  }


  const graphql = createGraphQLClient(
    (query, options) => admin.graphql(query, options ?? {}),
    { context: `transition/${transitionId}` },
  );

  try {
    if (transition.kind === "mock" || !SUPPORTED_TRANSITIONS.includes(transitionId)) {
      await applyMockTransition({ orderId, fulfillmentOrderId, transitionId, actor: session.shop });
    } else {
      await executeApiTransition({ transitionId, fulfillmentOrderId, graphql });
      await syncFulfillmentOrderState({
        shop: session.shop,
        topic: `manual/${transitionId}`,
        graphql,
        fulfillmentOrderId,
      });
      await logInfo(`Executed ${transitionId} for ${fulfillmentOrderId}`);
    }

    const currentUrl = new URL(request.url);
    currentUrl.searchParams.set("orderId", orderId);
    const target = `${currentUrl.pathname}?${currentUrl.searchParams.toString()}`;
    return redirect(target);
  } catch (error) {
    const message = (error as Error).message ?? "Unknown error";
    const details = formatGraphQLErrors(
      ((error as Record<string, unknown>).graphQLErrors as unknown[]) ?? [],
    );
    const responseBody = (error as { responseBody?: unknown }).responseBody;
    const bodySnippet = (() => {
    if (!responseBody) {
      return null;
    }
      try {
        return `Response body: ${JSON.stringify(responseBody, null, 2)}`;
      } catch {
        return `Response body: ${String(responseBody)}`;
      }
    })();
    const combined = [message, details, bodySnippet].filter(Boolean).join("\n");
    await logError(`Transition ${transitionId} failed: ${combined}`);
    return { error: combined } as ActionData;
  }
};

async function applyMockTransition({
  orderId,
  fulfillmentOrderId,
  transitionId,
  actor,
}: {
  orderId: string;
  fulfillmentOrderId: string;
  transitionId: TransitionId;
  actor: string;
}) {
  const snapshot = await prisma.fulfillmentStateSnapshot.findUnique({
    where: {
      orderId_fulfillmentOrderId: {
        orderId,
        fulfillmentOrderId,
      },
    },
  });

  if (!snapshot) {
    throw new Error("No state snapshot available; trigger a webhook first.");
  }

  const currentState: FulfillmentCompositeState = {
    orderStatus: snapshot.orderStatus as OrderDisplayFulfillmentStatus | null,
    orderFinancialStatus:
      snapshot.orderFinancialStatus as OrderDisplayFinancialStatus | null,
    fulfillmentOrderStatus:
      snapshot.fulfillmentOrderStatus as FulfillmentOrderStatus | null,
    fulfillmentRequestStatus:
      snapshot.fulfillmentRequestStatus as FulfillmentOrderRequestStatus | null,
    fulfillmentStatus: snapshot.fulfillmentStatus as FulfillmentStatus | null,
  };

  const nextState = applyTransition(currentState, transitionId);

  await prisma.fulfillmentStateSnapshot.update({
    where: {
      orderId_fulfillmentOrderId: {
        orderId,
        fulfillmentOrderId,
      },
    },
    data: {
      orderStatus: nextState.orderStatus,
      orderFinancialStatus: nextState.orderFinancialStatus,
      fulfillmentOrderStatus: nextState.fulfillmentOrderStatus,
      fulfillmentRequestStatus: nextState.fulfillmentRequestStatus,
      fulfillmentStatus: nextState.fulfillmentStatus,
      lastShopifySyncAt: new Date(),
    },
  });

  await prisma.fulfillmentTransitionLog.create({
    data: {
      orderId,
      fulfillmentOrderId,
      kind: "MOCK",
      action: `manual/${transitionId}`,
      actor,
      previousState: JSON.stringify(currentState),
      nextState: JSON.stringify(nextState),
      message: `Mock transition ${transitionId} executed from simulator UI`,
    },
  });
}

async function executeApiTransition({
  transitionId,
  fulfillmentOrderId,
  graphql,
}: {
  transitionId: TransitionId;
  fulfillmentOrderId: string;
  graphql: GraphQLClient;
}) {
  switch (transitionId) {
    case "ACCEPT_FULFILLMENT_REQUEST": {
      const result = await acceptFulfillmentRequest(graphql, {
        fulfillmentOrderId,
        message: "Accepted via simulator",
      });
      handleUserErrors(result.userErrors);
      return;
    }
    case "REJECT_FULFILLMENT_REQUEST": {
      const result = await rejectFulfillmentRequest(graphql, {
        fulfillmentOrderId,
        message: "Rejected via simulator",
      });
      handleUserErrors(result.userErrors);
      return;
    }
    case "CREATE_FULFILLMENT": {
      const lineItems = await fetchFulfillmentOrderLineItems(graphql, fulfillmentOrderId);
      const result = await createFulfillment(graphql, {
        lineItems: [
          {
            fulfillmentOrderId,
            fulfillmentOrderLineItems: lineItems,
          },
        ],
        notifyCustomer: false,
      });
      handleUserErrors(result.userErrors);
      return;
    }
    case "ACCEPT_CANCELLATION": {
      const result = await acceptCancellationRequest(graphql, {
        fulfillmentOrderId,
        message: "Cancellation accepted via simulator",
      });
      handleUserErrors(result.userErrors);
      return;
    }
    case "REJECT_CANCELLATION": {
      const result = await rejectCancellationRequest(graphql, {
        fulfillmentOrderId,
        message: "Cancellation rejected via simulator",
      });
      handleUserErrors(result.userErrors);
      return;
    }
    case "PLACE_HOLD": {
      const hold: FulfillmentOrderHoldInput = {
        reason: "INVENTORY_OUT_OF_STOCK" as FulfillmentHoldReason,
        notifyMerchant: false,
        reasonNotes: "Hold placed from simulator UI",
        handle: `sim-hold-${Date.now()}`,
      };

      const result = await placeFulfillmentHold(graphql, {
        fulfillmentOrderId,
        hold,
      });
      handleUserErrors(result.userErrors);
      return;
    }
    case "RELEASE_HOLD": {
      const result = await releaseFulfillmentHold(graphql, {
        fulfillmentOrderId,
      });
      handleUserErrors(result.userErrors);
      return;
    }
    case "CLOSE_FULFILLMENT_ORDER": {
      const result = await closeFulfillmentOrder(graphql, {
        fulfillmentOrderId,
        message: "Closed via simulator",
      });
      handleUserErrors(result.userErrors);
      return;
    }
    default:
      throw new Error(`Transition ${transitionId} not supported in simulator.`);
  }
}

function handleUserErrors(userErrors: Array<{ message: string }>) {
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }
}

async function fetchFulfillmentOrderLineItems(
  graphql: GraphQLClient,
  fulfillmentOrderId: string,
) {
  const data = await graphql<{
    fulfillmentOrder?: {
      lineItems?: {
        edges: Array<{
          node?: {
            id: string;
            remainingQuantity: number;
          };
        }>;
      };
    };
  }>(FULFILLMENT_ORDER_LINE_ITEMS_QUERY, { fulfillmentOrderId });

  const edges = data.fulfillmentOrder?.lineItems?.edges ?? [];
  const nodes = edges.flatMap((edge) =>
    edge?.node ? [edge.node] : [],
  ) as Array<{ id: string; remainingQuantity: number }>;

  const lineItems = nodes.map((node) => ({
    id: node.id,
    quantity: node.remainingQuantity,
  }));

  if (lineItems.length === 0) {
    throw new Error("No fulfillable line items found for this fulfillment order.");
  }

  return lineItems;
}

const FULFILLMENT_ORDER_LINE_ITEMS_QUERY = `#graphql
  query FulfillmentOrderLineItems($fulfillmentOrderId: ID!) {
    fulfillmentOrder(id: $fulfillmentOrderId) {
      id
      lineItems(first: 50) {
        edges {
          node {
            id
            remainingQuantity
          }
        }
      }
    }
  }
`;

type ActionData = { error?: string } | null;

export default function FulfillmentSimulatorPage() {
  const { orders, activeOrder, activeOrderId } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [selectedOrder, setSelectedOrder] = useState(activeOrderId ?? "");

  const isSubmitting = navigation.state === "submitting";

  const handleOrderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedOrder(value);
    submit({ orderId: value }, { method: "get" });
  };

  return (
    <div className="fulfillment-simulator">
      <h1>Fulfillment simulator</h1>

      <section>
        <h2>Select order</h2>
        {orders.length === 0 ? (
          <p>No Shopify orders are synced yet. Place an order and trigger the webhooks.</p>
        ) : (
          <form method="get">
            <label htmlFor="order-select">Order</label>
            <select
              id="order-select"
              name="orderId"
              value={selectedOrder}
              onChange={handleOrderChange}
            >
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name}
                </option>
              ))}
            </select>
          </form>
        )}
      </section>

      {actionData?.error && (
        <div role="alert" style={{ border: "1px solid #d72c0d", padding: "1rem", marginTop: "1rem" }}>
          <strong>Transition failed:</strong> {actionData.error}
        </div>
      )}

      {activeOrder ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1.5rem" }}>
          {activeOrder.fulfillmentOrders.map((fo) => (
            <FulfillmentOrderCard
              key={fo.id}
              orderId={activeOrder.id}
              fulfillmentOrder={fo}
              isSubmitting={isSubmitting}
            />
          ))}

          <section>
            <h2>Event log</h2>
            {activeOrder.transitionLogs.length === 0 ? (
              <p>No events recorded yet.</p>
            ) : (
              <ul style={{ listStyle: "none", paddingLeft: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {activeOrder.transitionLogs.map((log) => (
                  <li key={log.id} style={{ border: "1px solid #d0d5dd", borderRadius: "6px", padding: "0.75rem" }}>
                    <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                      <strong>{new Date(log.createdAt).toLocaleString()}</strong> – {log.kind} – {log.action}
                    </div>
                    <div>{log.message ?? "No message"}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <p>Select an order to view fulfillment progress.</p>
      )}
    </div>
  );
}

function FulfillmentOrderCard({
  orderId,
  fulfillmentOrder,
  isSubmitting,
}: {
  orderId: string;
  fulfillmentOrder: FulfillmentOrderView;
  isSubmitting: boolean;
}) {
  const availableTransitions = getAvailableTransitions(fulfillmentOrder.state).filter(
    (transition) => SUPPORTED_TRANSITIONS.includes(transition.id),
  );

  return (
    <section style={{ border: "1px solid #d0d5dd", borderRadius: "8px", padding: "1rem" }}>
      <h2>Fulfillment order {fulfillmentOrder.id}</h2>
      <dl style={{ display: "grid", gridTemplateColumns: "max-content auto", gap: "0.25rem 1rem" }}>
        <dt>Status</dt>
        <dd>{fulfillmentOrder.state.fulfillmentOrderStatus ?? "UNKNOWN"}</dd>
        <dt>Request status</dt>
        <dd>{fulfillmentOrder.state.fulfillmentRequestStatus ?? "UNKNOWN"}</dd>
        <dt>Order status</dt>
        <dd>{fulfillmentOrder.state.orderStatus ?? "UNKNOWN"}</dd>
        <dt>Financial status</dt>
        <dd>{fulfillmentOrder.state.orderFinancialStatus ?? "UNKNOWN"}</dd>
        <dt>Fulfillment status</dt>
        <dd>{fulfillmentOrder.state.fulfillmentStatus ?? "UNKNOWN"}</dd>
        {fulfillmentOrder.supportedActions.length > 0 && (
          <>
            <dt>Supported actions</dt>
            <dd>
              {fulfillmentOrder.supportedActions
                .map((action) => action.action)
                .join(", ")}
            </dd>
          </>
        )}
      </dl>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
        {availableTransitions.length === 0 ? (
          <p>No transitions available for the current state.</p>
        ) : (
          <>
            {availableTransitions.map((transition: TransitionDefinition) => (
              <form key={transition.id} method="post" style={{ margin: 0 }}>
                <input type="hidden" name="orderId" value={orderId} />
                <input type="hidden" name="fulfillmentOrderId" value={fulfillmentOrder.id} />
                <input type="hidden" name="transitionId" value={transition.id} />
                <button type="submit" disabled={isSubmitting}>
                  {transition.label}
                  {transition.kind === "mock" ? " (mock)" : ""}
                </button>
              </form>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
