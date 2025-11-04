import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

type TopicHandlerContext = {
  shop: string;
  topic: string;
  payload: unknown;
};

type TopicHandler = (context: TopicHandlerContext) => Promise<void> | void;

const FULFILLMENT_TOPIC_PREFIX = "fulfillment_orders/";

const handlers: Record<string, TopicHandler> = {
  order_routing_complete: logEvent,
  fulfillment_request_submitted: logEvent,
  fulfillment_request_accepted: logEvent,
  fulfillment_request_rejected: logEvent,
  placed_on_hold: logEvent,
  hold_released: logEvent,
  scheduled_fulfillment_order_ready: logEvent,
  rescheduled: logEvent,
  cancellation_request_submitted: logEvent,
  cancellation_request_accepted: logEvent,
  cancellation_request_rejected: logEvent,
  cancelled: logEvent,
  fulfillment_service_failed_to_complete: logEvent,
};

function logEvent({ shop, topic }: TopicHandlerContext) {
  console.log(`[Fulfillment webhook] ${topic} for ${shop}`);
}

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

  const handler = handlers[topicSuffix];

  if (handler) {
    await handler({
      shop: webhook.shop,
      topic: rawTopic,
      payload: webhook.payload,
    });
  } else {
    console.warn(`Unhandled fulfillment webhook topic: ${rawTopic}`);
  }

  return new Response();
};
