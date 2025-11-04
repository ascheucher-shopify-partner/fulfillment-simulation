import type { GraphQLClient } from "../lib/graphqlClient";
import type {
  FulfillmentOrderHoldInput,
  FulfillmentOrderLineItemsInput,
  FulfillmentTrackingInput,
} from "../types/admin.types";

export async function acceptFulfillmentRequest(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<{
    fulfillmentOrderAcceptFulfillmentRequest: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(ACCEPT_FULFILLMENT_REQUEST, {
    id: params.fulfillmentOrderId,
    message: params.message,
  });

  return data.fulfillmentOrderAcceptFulfillmentRequest;
}

export async function rejectFulfillmentRequest(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<{
    fulfillmentOrderRejectFulfillmentRequest: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(REJECT_FULFILLMENT_REQUEST, {
    id: params.fulfillmentOrderId,
    message: params.message,
  });

  return data.fulfillmentOrderRejectFulfillmentRequest;
}

export async function createFulfillment(
  graphql: GraphQLClient,
  params: {
    lineItems: Array<FulfillmentOrderLineItemsInput>;
    notifyCustomer?: boolean;
    trackingInfo?: FulfillmentTrackingInput;
  },
) {
  const data = await graphql<{
    fulfillmentCreateV2: {
      fulfillment?: {
        id: string;
        status: string;
        trackingInfo?: Array<{
          number?: string | null;
          url?: string | null;
          company?: string | null;
        }> | null;
      } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(CREATE_FULFILLMENT, {
    fulfillment: {
      notifyCustomer: params.notifyCustomer ?? false,
      trackingInfo: params.trackingInfo ?? null,
      lineItemsByFulfillmentOrder: params.lineItems,
    },
  });

  return data.fulfillmentCreateV2;
}

export async function updateTrackingInfo(
  graphql: GraphQLClient,
  params: {
    fulfillmentId: string;
    trackingInfo: FulfillmentTrackingInput;
    notifyCustomer?: boolean;
  },
) {
  const data = await graphql<{
    fulfillmentTrackingInfoUpdate: {
      fulfillment?: {
        id: string;
        status: string;
        trackingInfo?: Array<{
          number?: string | null;
          url?: string | null;
          company?: string | null;
        }> | null;
      } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(UPDATE_TRACKING_INFO, {
    fulfillmentId: params.fulfillmentId,
    trackingInfoInput: params.trackingInfo,
    notifyCustomer: params.notifyCustomer ?? false,
  });

  return data.fulfillmentTrackingInfoUpdate;
}

export async function cancelFulfillment(
  graphql: GraphQLClient,
  fulfillmentId: string,
) {
  const data = await graphql<{
    fulfillmentCancel: {
      fulfillment?: { id: string; status: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(CANCEL_FULFILLMENT, { id: fulfillmentId });

  return data.fulfillmentCancel;
}

export async function acceptCancellationRequest(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<{
    fulfillmentOrderAcceptCancellationRequest: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(ACCEPT_CANCELLATION_REQUEST, params);

  return data.fulfillmentOrderAcceptCancellationRequest;
}

export async function rejectCancellationRequest(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<{
    fulfillmentOrderRejectCancellationRequest: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(REJECT_CANCELLATION_REQUEST, params);

  return data.fulfillmentOrderRejectCancellationRequest;
}

export async function placeFulfillmentHold(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; hold: FulfillmentOrderHoldInput },
) {
  const data = await graphql<{
    fulfillmentOrderHold: {
      fulfillmentOrder: { id: string; status: string };
      userErrors: Array<{ message: string }>;
    };
  }>(PLACE_FULFILLMENT_HOLD, {
    id: params.fulfillmentOrderId,
    fulfillmentHold: params.hold,
  });

  return data.fulfillmentOrderHold;
}

export async function releaseFulfillmentHold(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; holdIds?: string[]; externalId?: string },
) {
  const data = await graphql<{
    fulfillmentOrderReleaseHold: {
      fulfillmentOrder: { id: string; status: string };
      userErrors: Array<{ message: string }>;
    };
  }>(RELEASE_FULFILLMENT_HOLD, {
    id: params.fulfillmentOrderId,
    holdIds: params.holdIds,
    externalId: params.externalId,
  });

  return data.fulfillmentOrderReleaseHold;
}

export async function closeFulfillmentOrder(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<{
    fulfillmentOrderClose: {
      fulfillmentOrder: { id: string; status: string; requestStatus: string };
      userErrors: Array<{ message: string }>;
    };
  }>(CLOSE_FULFILLMENT_ORDER, params);

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
        trackingInfo {
          number
          url
          company
        }
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
        trackingInfo {
          number
          url
          company
        }
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
