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
  const topicSuffix = rawTopic.startsWith(FULFILLMENT_TOPIC_PREFIX)
    ? rawTopic.slice(FULFILLMENT_TOPIC_PREFIX.length)
    : rawTopic;

  if (params.topic !== topicSuffix) {
    console.warn(
      `Webhook route mismatch: expected ${params.topic}, received ${rawTopic}`,
    );
  }

  if (SUPPORTED_TOPICS.has(topicSuffix)) {
    await logInfo(`Received ${rawTopic} webhook for ${webhook.shop}`);
    await handleFulfillmentOrderWebhook({
      shop: webhook.shop,
      topic: rawTopic,
      payload: webhook.payload,
    });
  } else {
    console.warn(`Unhandled fulfillment webhook topic: ${rawTopic}`);
  }

  return new Response();
};
