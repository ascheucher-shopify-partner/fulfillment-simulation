import type {
  FulfillmentOrderHoldInput,
  FulfillmentOrderLineItemsInput,
  FulfillmentTrackingInput,
} from "../types/admin.types";

type GraphqlClient = (
  query: string,
  options?: {
    variables?: Record<string, unknown>;
  },
) => Promise<Response>;

type GraphqlResult<T> = {
  data: T;
  errors?: Array<{ message: string }>;
};

async function execute<T>(
  graphql: GraphqlClient,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await graphql(query, variables ? { variables } : undefined);
  const json = (await response.json()) as GraphqlResult<T>;

  if (json.errors?.length) {
    throw new Error(
      `GraphQL errors: ${json.errors.map((error) => error.message).join(", ")}`,
    );
  }

  if (!json.data) {
    throw new Error("GraphQL response missing data");
  }

  return json.data;
}

export async function acceptFulfillmentRequest(
  graphql: GraphqlClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await execute<{
    fulfillmentOrderAcceptFulfillmentRequest: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, ACCEPT_FULFILLMENT_REQUEST, {
    id: params.fulfillmentOrderId,
    message: params.message,
  });

  return data.fulfillmentOrderAcceptFulfillmentRequest;
}

export async function rejectFulfillmentRequest(
  graphql: GraphqlClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await execute<{
    fulfillmentOrderRejectFulfillmentRequest: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, REJECT_FULFILLMENT_REQUEST, {
    id: params.fulfillmentOrderId,
    message: params.message,
  });

  return data.fulfillmentOrderRejectFulfillmentRequest;
}

export async function createFulfillment(
  graphql: GraphqlClient,
  params: {
    lineItems: Array<FulfillmentOrderLineItemsInput>;
    notifyCustomer?: boolean;
    trackingInfo?: FulfillmentTrackingInput;
  },
) {
  const data = await execute<{
    fulfillmentCreateV2: {
      fulfillment?: { id: string; status: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, CREATE_FULFILLMENT, {
    fulfillment: {
      notifyCustomer: params.notifyCustomer ?? false,
      trackingInfo: params.trackingInfo ?? null,
      lineItemsByFulfillmentOrder: params.lineItems,
    },
  });

  return data.fulfillmentCreateV2;
}

export async function updateTrackingInfo(
  graphql: GraphqlClient,
  params: {
    fulfillmentId: string;
    trackingInfo: FulfillmentTrackingInput;
    notifyCustomer?: boolean;
  },
) {
  const data = await execute<{
    fulfillmentTrackingInfoUpdate: {
      fulfillment?: { id: string; status: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, UPDATE_TRACKING_INFO, {
    fulfillmentId: params.fulfillmentId,
    trackingInfoInput: params.trackingInfo,
    notifyCustomer: params.notifyCustomer ?? false,
  });

  return data.fulfillmentTrackingInfoUpdate;
}

export async function cancelFulfillment(
  graphql: GraphqlClient,
  fulfillmentId: string,
) {
  const data = await execute<{
    fulfillmentCancel: {
      fulfillment?: { id: string; status: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, CANCEL_FULFILLMENT, { id: fulfillmentId });

  return data.fulfillmentCancel;
}

export async function acceptCancellationRequest(
  graphql: GraphqlClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await execute<{
    fulfillmentOrderAcceptCancellationRequest: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, ACCEPT_CANCELLATION_REQUEST, params);

  return data.fulfillmentOrderAcceptCancellationRequest;
}

export async function rejectCancellationRequest(
  graphql: GraphqlClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await execute<{
    fulfillmentOrderRejectCancellationRequest: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, REJECT_CANCELLATION_REQUEST, params);

  return data.fulfillmentOrderRejectCancellationRequest;
}

export async function placeFulfillmentHold(
  graphql: GraphqlClient,
  params: { fulfillmentOrderId: string; hold: FulfillmentOrderHoldInput },
) {
  const data = await execute<{
    fulfillmentOrderHold: {
      fulfillmentOrder: { id: string; status: string };
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, PLACE_FULFILLMENT_HOLD, {
    id: params.fulfillmentOrderId,
    fulfillmentHold: params.hold,
  });

  return data.fulfillmentOrderHold;
}

export async function releaseFulfillmentHold(
  graphql: GraphqlClient,
  params: { fulfillmentOrderId: string; holdIds?: string[]; externalId?: string },
) {
  const data = await execute<{
    fulfillmentOrderReleaseHold: {
      fulfillmentOrder: { id: string; status: string };
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, RELEASE_FULFILLMENT_HOLD, {
    id: params.fulfillmentOrderId,
    holdIds: params.holdIds,
    externalId: params.externalId,
  });

  return data.fulfillmentOrderReleaseHold;
}

export async function closeFulfillmentOrder(
  graphql: GraphqlClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await execute<{
    fulfillmentOrderClose: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(graphql, CLOSE_FULFILLMENT_ORDER, params);

  return data.fulfillmentOrderClose;
}

const ACCEPT_FULFILLMENT_REQUEST = `#graphql
  mutation AcceptFulfillmentRequest($id: ID!, $message: String) {
    fulfillmentOrderAcceptFulfillmentRequest(id: $id, message: $message) {
      fulfillmentOrder {
        id
        status
        requestStatus
      }
      userErrors {
        message
      }
    }
  }
`;

const REJECT_FULFILLMENT_REQUEST = `#graphql
  mutation RejectFulfillmentRequest($id: ID!, $message: String) {
    fulfillmentOrderRejectFulfillmentRequest(id: $id, message: $message) {
      fulfillmentOrder {
        id
        status
        requestStatus
      }
      userErrors {
        message
      }
    }
  }
`;

const CREATE_FULFILLMENT = `#graphql
  mutation CreateFulfillment(
    $fulfillment: FulfillmentV2Input!
  ) {
    fulfillmentCreateV2(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
      }
      userErrors {
        message
      }
    }
  }
`;

const UPDATE_TRACKING_INFO = `#graphql
  mutation UpdateTrackingInfo(
    $fulfillmentId: ID!
    $trackingInfoInput: FulfillmentTrackingInput!
    $notifyCustomer: Boolean
  ) {
    fulfillmentTrackingInfoUpdate(
      fulfillmentId: $fulfillmentId
      trackingInfoInput: $trackingInfoInput
      notifyCustomer: $notifyCustomer
    ) {
      fulfillment {
        id
        status
      }
      userErrors {
        message
      }
    }
  }
`;

const CANCEL_FULFILLMENT = `#graphql
  mutation CancelFulfillment($id: ID!) {
    fulfillmentCancel(id: $id) {
      fulfillment {
        id
        status
      }
      userErrors {
        message
      }
    }
  }
`;

const ACCEPT_CANCELLATION_REQUEST = `#graphql
  mutation AcceptCancellationRequest($fulfillmentOrderId: ID!, $message: String) {
    fulfillmentOrderAcceptCancellationRequest(
      id: $fulfillmentOrderId
      message: $message
    ) {
      fulfillmentOrder {
        id
        status
        requestStatus
      }
      userErrors {
        message
      }
    }
  }
`;

const REJECT_CANCELLATION_REQUEST = `#graphql
  mutation RejectCancellationRequest($fulfillmentOrderId: ID!, $message: String) {
    fulfillmentOrderRejectCancellationRequest(
      id: $fulfillmentOrderId
      message: $message
    ) {
      fulfillmentOrder {
        id
        status
        requestStatus
      }
      userErrors {
        message
      }
    }
  }
`;

const PLACE_FULFILLMENT_HOLD = `#graphql
  mutation PlaceFulfillmentHold(
    $id: ID!
    $fulfillmentHold: FulfillmentOrderHoldInput!
  ) {
    fulfillmentOrderHold(
      id: $id
      fulfillmentHold: $fulfillmentHold
    ) {
      fulfillmentOrder {
        id
        status
      }
      userErrors {
        message
      }
    }
  }
`;

const RELEASE_FULFILLMENT_HOLD = `#graphql
  mutation ReleaseFulfillmentHold(
    $id: ID!
    $holdIds: [ID!]
    $externalId: String
  ) {
    fulfillmentOrderReleaseHold(
      id: $id
      holdIds: $holdIds
      externalId: $externalId
    ) {
      fulfillmentOrder {
        id
        status
      }
      userErrors {
        message
      }
    }
  }
`;

const CLOSE_FULFILLMENT_ORDER = `#graphql
  mutation CloseFulfillmentOrder($fulfillmentOrderId: ID!, $message: String) {
    fulfillmentOrderClose(id: $fulfillmentOrderId, message: $message) {
      fulfillmentOrder {
        id
        status
        requestStatus
      }
      userErrors {
        message
      }
    }
  }
`;
