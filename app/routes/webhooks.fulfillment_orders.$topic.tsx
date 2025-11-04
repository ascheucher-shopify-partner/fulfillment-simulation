import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { handleFulfillmentOrderWebhook } from "../services/fulfillmentWebhooks";
import { logInfo } from "../services/logger";

const FULFILLMENT_TOPIC_PREFIX = "fulfillment_orders/";

const SUPPORTED_TOPICS = new Set([
  "order_routing_complete",
  "fulfillment_request_submitted",
  "fulfillment_request_accepted",
  "fulfillment_request_rejected",
  "placed_on_hold",
  "hold_released",
  "scheduled_fulfillment_order_ready",
  "rescheduled",
  "cancellation_request_submitted",
  "cancellation_request_accepted",
  "cancellation_request_rejected",
  "cancelled",
  "fulfillment_service_failed_to_complete",
]);

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const webhook = await authenticate.webhook(request);

  const rawTopic = webhook.topic;
  const normalizedTopic = normalizeFulfillmentTopic(rawTopic);
  const topicSuffix = normalizedTopic.startsWith(FULFILLMENT_TOPIC_PREFIX)
    ? normalizedTopic.slice(FULFILLMENT_TOPIC_PREFIX.length)
    : normalizedTopic;

  if (params.topic !== topicSuffix) {
    console.warn(
      `Webhook route mismatch: expected ${params.topic}, received ${rawTopic}`,
    );
  }

  if (SUPPORTED_TOPICS.has(topicSuffix)) {
    await logInfo(
      `Received ${normalizedTopic} webhook (${rawTopic}) for ${webhook.shop}`,
    );
    await handleFulfillmentOrderWebhook({
      shop: webhook.shop,
      topic: normalizedTopic,
      payload: webhook.payload,
    });
  } else {
    console.warn(`Unhandled fulfillment webhook topic: ${rawTopic}`);
  }

  return new Response();
};

function normalizeFulfillmentTopic(rawTopic: string): string {
  const lower = rawTopic.toLowerCase();
  if (lower.startsWith("fulfillment_orders/")) {
    return lower;
  }
  if (lower.startsWith("fulfillment_orders_")) {
    return `fulfillment_orders/${lower.slice("fulfillment_orders_".length)}`;
  }
  return lower;
}
