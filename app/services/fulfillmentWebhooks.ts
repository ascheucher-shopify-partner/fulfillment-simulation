import type { Order } from "../types/admin.types";

import prisma from "../db.server";
import shopify from "../shopify.server";
import {
  createGraphQLClient,
  formatGraphQLErrors,
  type GraphQLClient,
} from "../lib/graphqlClient";
import type {
  FulfillmentOrderRequestStatus,
  FulfillmentOrderStatus,
  OrderDisplayFinancialStatus,
  OrderDisplayFulfillmentStatus,
} from "../types/admin.types";
import type { FulfillmentCompositeState } from "./stateMachine";
import { logError, logInfo } from "./logger";

interface FulfillmentOrderWebhookContext {
  topic: string;
  shop: string;
  payload: unknown;
}

interface OrderSnapshot {
  id: string;
  name: string | null;
  displayFulfillmentStatus: OrderDisplayFulfillmentStatus | null;
  displayFinancialStatus: OrderDisplayFinancialStatus | null;
  processedAt: string | null;
  currencyCode: string | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

interface FulfillmentOrderSnapshot {
  id: string;
  status: FulfillmentOrderStatus;
  requestStatus: FulfillmentOrderRequestStatus;
  fulfillAt: string | null;
  supportedActions: Array<{ action: string; externalUrl?: string | null }>;
  assignedLocationId: string | null;
}

export async function handleFulfillmentOrderWebhook({
  topic,
  shop,
  payload,
}: FulfillmentOrderWebhookContext) {
  const fulfillmentResource = extractFulfillmentOrderResource(payload);
  if (!fulfillmentResource) {
    await logError(
      `Webhook ${topic}: No fulfillment_order resource present in payload`,
    );
    return;
  }

  const fulfillmentOrderId = toGid("FulfillmentOrder", fulfillmentResource.id);

  try {
    const { admin } = await shopify.unauthenticated.admin(shop);
    const graphql = createGraphQLClient(
      (query, options) => admin.graphql(query, options ?? {}),
      { context: topic },
    );

    await syncFulfillmentOrderState({
      shop,
      topic,
      graphql,
      fulfillmentOrderId,
    });
  } catch (error) {
    const message = [
      `Webhook ${topic}: Failed to process fulfillment order ${fulfillmentOrderId} – ${(error as Error).message}`,
      formatGraphQLErrors(
        ((error as Record<string, unknown>).graphQLErrors as unknown[]) ?? [],
      ),
      (() => {
        const body = (error as { responseBody?: unknown }).responseBody;
        if (!body) {
          return null;
        }
        try {
          return `Response body: ${JSON.stringify(body, null, 2)}`;
        } catch {
          return `Response body: ${String(body)}`;
        }
      })(),
    ]
      .filter(Boolean)
      .join("\n");

    await logError(message);
    throw error;
  }
}

export async function syncFulfillmentOrderState({
  shop,
  topic,
  graphql,
  fulfillmentOrderId,
}: {
  shop: string;
  topic: string;
  graphql: GraphQLClient;
  fulfillmentOrderId: string;
}) {
  const state = await fetchFulfillmentState(graphql, fulfillmentOrderId);
  if (!state) {
    await logError(
      `Sync ${topic}: Unable to load fulfillment order ${fulfillmentOrderId}`,
    );
    return;
  }

  await persistState({
    shop,
    topic,
    order: state.order,
    fulfillmentOrder: state.fulfillmentOrder,
  });
}

function extractFulfillmentOrderResource(payload: unknown):
  | { id: number | string }
  | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const candidateKeys = [
    "fulfillment_order",
    "original_fulfillment_order",
    "submitted_fulfillment_order",
    "unsubmitted_fulfillment_order",
    "replacement_fulfillment_order",
  ];

  for (const key of candidateKeys) {
    const value = (payload as Record<string, unknown>)[key];
    if (value && typeof value === "object" && "id" in value) {
      return value as { id: number | string };
    }
  }

  return undefined;
}

async function fetchFulfillmentState(
  graphql: GraphQLClient,
  fulfillmentOrderId: string,
): Promise<{ order: OrderSnapshot; fulfillmentOrder: FulfillmentOrderSnapshot } | undefined> {
  const data = await graphql<{ fulfillmentOrder?: any }>(
    FULFILLMENT_STATE_QUERY,
    { fulfillmentOrderId },
  );

  if (!data?.fulfillmentOrder?.order) {
    return undefined;
  }

  const fo = data.fulfillmentOrder;
  const order = fo.order as Order;

  const orderSnapshot: OrderSnapshot = {
    id: order.id,
    name: order.name ?? null,
    displayFulfillmentStatus:
      (order.displayFulfillmentStatus as OrderDisplayFulfillmentStatus | null) ??
      null,
    displayFinancialStatus:
      (order.displayFinancialStatus as OrderDisplayFinancialStatus | null) ?? null,
    processedAt: order.processedAt ?? null,
    currencyCode: order.currencyCode ?? null,
    customer: order.customer ?? null,
  };

  const rawSupportedActions = (fo.supportedActions ?? []) as Array<
    | { action?: string; externalUrl?: string | null }
    | string
  >;

  const supportedActions = rawSupportedActions.map((entry) => {
    if (typeof entry === "string") {
      return { action: entry, externalUrl: null };
    }
    return {
      action: entry?.action ?? "UNKNOWN",
      externalUrl: entry?.externalUrl ?? null,
    };
  });

  const fulfillmentOrderSnapshot: FulfillmentOrderSnapshot = {
    id: fo.id,
    status: fo.status as FulfillmentOrderStatus,
    requestStatus: fo.requestStatus as FulfillmentOrderRequestStatus,
    fulfillAt: fo.fulfillAt ?? null,
    supportedActions,
    assignedLocationId: fo.assignedLocation?.location?.id ?? null,
  };

  return { order: orderSnapshot, fulfillmentOrder: fulfillmentOrderSnapshot };
}

async function persistState({
  shop,
  topic,
  order,
  fulfillmentOrder,
}: {
  shop: string;
  topic: string;
  order: OrderSnapshot;
  fulfillmentOrder: FulfillmentOrderSnapshot;
}) {
  const orderRecord = await prisma.shopifyOrder.upsert({
    where: { id: order.id },
    update: {
      shopDomain: shop,
      name: order.name ?? null,
      customerFirstName: order.customer?.firstName ?? null,
      customerLastName: order.customer?.lastName ?? null,
      customerEmail: order.customer?.email ?? null,
      currencyCode: order.currencyCode ?? null,
      processedAt: parseDate(order.processedAt),
    },
    create: {
      id: order.id,
      shopDomain: shop,
      name: order.name ?? null,
      customerFirstName: order.customer?.firstName ?? null,
      customerLastName: order.customer?.lastName ?? null,
      customerEmail: order.customer?.email ?? null,
      currencyCode: order.currencyCode ?? null,
      processedAt: parseDate(order.processedAt),
    },
  });

  const fulfillmentOrderRecord = await prisma.fulfillmentOrderRecord.upsert({
    where: { id: fulfillmentOrder.id },
    update: {
      orderId: orderRecord.id,
      assignedLocationId: fulfillmentOrder.assignedLocationId,
      status: fulfillmentOrder.status,
      requestStatus: fulfillmentOrder.requestStatus,
      supportedActionsJson: JSON.stringify(fulfillmentOrder.supportedActions),
      fulfillAt: parseDate(fulfillmentOrder.fulfillAt),
    },
    create: {
      id: fulfillmentOrder.id,
      orderId: orderRecord.id,
      assignedLocationId: fulfillmentOrder.assignedLocationId,
      status: fulfillmentOrder.status,
      requestStatus: fulfillmentOrder.requestStatus,
      supportedActionsJson: JSON.stringify(fulfillmentOrder.supportedActions),
      fulfillAt: parseDate(fulfillmentOrder.fulfillAt),
    },
  });

  const currentState = mapToCompositeState({ order, fulfillmentOrder });

  const existingSnapshot = await prisma.fulfillmentStateSnapshot.findUnique({
    where: {
      orderId_fulfillmentOrderId: {
        orderId: orderRecord.id,
        fulfillmentOrderId: fulfillmentOrderRecord.id,
      },
    },
  });

  const previousState = existingSnapshot
    ? snapshotToComposite(existingSnapshot)
    : null;

  await prisma.fulfillmentStateSnapshot.upsert({
    where: {
      orderId_fulfillmentOrderId: {
        orderId: orderRecord.id,
        fulfillmentOrderId: fulfillmentOrderRecord.id,
      },
    },
    update: {
      orderStatus: currentState.orderStatus,
      orderFinancialStatus: currentState.orderFinancialStatus,
      fulfillmentOrderStatus: currentState.fulfillmentOrderStatus,
      fulfillmentRequestStatus: currentState.fulfillmentRequestStatus,
      fulfillmentStatus: currentState.fulfillmentStatus,
      lastShopifySyncAt: new Date(),
    },
    create: {
      orderId: orderRecord.id,
      fulfillmentOrderId: fulfillmentOrderRecord.id,
      orderStatus: currentState.orderStatus,
      orderFinancialStatus: currentState.orderFinancialStatus,
      fulfillmentOrderStatus: currentState.fulfillmentOrderStatus,
      fulfillmentRequestStatus: currentState.fulfillmentRequestStatus,
      fulfillmentStatus: currentState.fulfillmentStatus,
    },
  });

  const mismatch =
    previousState !== null &&
    JSON.stringify(previousState) !== JSON.stringify(currentState);

  await prisma.fulfillmentTransitionLog.create({
    data: {
      orderId: orderRecord.id,
      fulfillmentOrderId: fulfillmentOrderRecord.id,
      kind: mismatch ? "ERROR" : "STATE_CHANGE",
      action: topic,
      actor: shop,
      previousState: previousState ? JSON.stringify(previousState) : null,
      nextState: JSON.stringify(currentState),
      message: buildLogMessage(topic, currentState, mismatch),
    },
  });

  if (mismatch) {
    await logError(
      `State mismatch detected for ${fulfillmentOrderRecord.id} on topic ${topic}. Previous: ${JSON.stringify(previousState)}, Current: ${JSON.stringify(currentState)}`,
    );
  } else {
    await logInfo(
      `Processed ${topic} for ${fulfillmentOrderRecord.id}. State: ${JSON.stringify(currentState)}`,
    );
  }
}

function mapToCompositeState({
  order,
  fulfillmentOrder,
}: {
  order: OrderSnapshot;
  fulfillmentOrder: FulfillmentOrderSnapshot;
}): FulfillmentCompositeState {
  return {
    orderStatus: order.displayFulfillmentStatus ?? null,
    orderFinancialStatus: order.displayFinancialStatus ?? null,
    fulfillmentOrderStatus: fulfillmentOrder.status ?? null,
    fulfillmentRequestStatus: fulfillmentOrder.requestStatus ?? null,
    fulfillmentStatus: null,
  };
}

function snapshotToComposite(snapshot: {
  orderStatus: string | null;
  orderFinancialStatus: string | null;
  fulfillmentOrderStatus: string | null;
  fulfillmentRequestStatus: string | null;
  fulfillmentStatus: string | null;
}): FulfillmentCompositeState {
  return {
    orderStatus: snapshot.orderStatus as FulfillmentCompositeState["orderStatus"],
    orderFinancialStatus:
      snapshot.orderFinancialStatus as FulfillmentCompositeState["orderFinancialStatus"],
    fulfillmentOrderStatus:
      snapshot.fulfillmentOrderStatus as FulfillmentCompositeState["fulfillmentOrderStatus"],
    fulfillmentRequestStatus:
      snapshot.fulfillmentRequestStatus as FulfillmentCompositeState["fulfillmentRequestStatus"],
    fulfillmentStatus:
      snapshot.fulfillmentStatus as FulfillmentCompositeState["fulfillmentStatus"],
  };
}

function buildLogMessage(
  topic: string,
  state: FulfillmentCompositeState,
  mismatch: boolean,
): string {
  const statusSummary = `${state.fulfillmentOrderStatus ?? "UNKNOWN"}/${state.fulfillmentRequestStatus ?? "UNKNOWN"}`;
  return mismatch
    ? `Mismatch after ${topic}. New state ${statusSummary}`
    : `Applied ${topic}. State ${statusSummary}`;
}

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }
  return new Date(value);
}

function toGid(model: string, id: number | string): string {
  const value = typeof id === "string" ? id.trim() : String(id);
  if (value.toLowerCase().startsWith("gid://")) {
    return value;
  }
  return `gid://shopify/${model}/${value}`;
}

const FULFILLMENT_STATE_QUERY = `#graphql
  query FulfillmentState($fulfillmentOrderId: ID!) {
    fulfillmentOrder(id: $fulfillmentOrderId) {
      id
      status
      requestStatus
      fulfillAt
      supportedActions {
        action
        externalUrl
      }
      assignedLocation {
        location {
          id
        }
      }
      order {
        id
        name
        displayFulfillmentStatus
        displayFinancialStatus
        processedAt
        currencyCode
        customer {
          firstName
          lastName
          email
        }
      }
    }
  }
`;

export type { FulfillmentOrderWebhookContext };
