import type { GraphQLClient } from "../lib/graphqlClient";
import type {
  AcceptCancellationRequestMutation,
  AcceptCancellationRequestMutationVariables,
  AcceptFulfillmentRequestMutation,
  AcceptFulfillmentRequestMutationVariables,
  CancelFulfillmentMutation,
  CancelFulfillmentMutationVariables,
  CloseFulfillmentOrderMutation,
  CloseFulfillmentOrderMutationVariables,
  CreateFulfillmentMutation,
  CreateFulfillmentMutationVariables,
  PlaceFulfillmentHoldMutation,
  PlaceFulfillmentHoldMutationVariables,
  RejectCancellationRequestMutation,
  RejectCancellationRequestMutationVariables,
  RejectFulfillmentRequestMutation,
  RejectFulfillmentRequestMutationVariables,
  ReleaseFulfillmentHoldMutation,
  ReleaseFulfillmentHoldMutationVariables,
  UpdateTrackingInfoMutation,
  UpdateTrackingInfoMutationVariables,
} from "../types/admin.generated";
import type {
  FulfillmentOrderHoldInput,
  FulfillmentOrderLineItemsInput,
  FulfillmentTrackingInput,
} from "../types/admin.types";

function requirePayload<T>(payload: T | null | undefined, operation: string): T {
  if (!payload) {
    throw new Error(`${operation} returned no data`);
  }
  return payload;
}

export async function acceptFulfillmentRequest(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<AcceptFulfillmentRequestMutation>(
    ACCEPT_FULFILLMENT_REQUEST,
    {
      id: params.fulfillmentOrderId,
      message: params.message,
    } satisfies AcceptFulfillmentRequestMutationVariables,
  );

  return requirePayload(
    data.fulfillmentOrderAcceptFulfillmentRequest,
    "fulfillmentOrderAcceptFulfillmentRequest",
  );
}

export async function rejectFulfillmentRequest(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<RejectFulfillmentRequestMutation>(
    REJECT_FULFILLMENT_REQUEST,
    {
      id: params.fulfillmentOrderId,
      message: params.message,
    } satisfies RejectFulfillmentRequestMutationVariables,
  );

  return requirePayload(
    data.fulfillmentOrderRejectFulfillmentRequest,
    "fulfillmentOrderRejectFulfillmentRequest",
  );
}

export async function createFulfillment(
  graphql: GraphQLClient,
  params: {
    lineItems: Array<FulfillmentOrderLineItemsInput>;
    notifyCustomer?: boolean;
    trackingInfo?: FulfillmentTrackingInput;
  },
) {
  const data = await graphql<CreateFulfillmentMutation>(
    CREATE_FULFILLMENT,
    {
      fulfillment: {
        notifyCustomer: params.notifyCustomer ?? false,
        trackingInfo: params.trackingInfo ?? null,
        lineItemsByFulfillmentOrder: params.lineItems,
      },
    } satisfies CreateFulfillmentMutationVariables,
  );

  return requirePayload(data.fulfillmentCreate, "fulfillmentCreate");
}

export async function updateTrackingInfo(
  graphql: GraphQLClient,
  params: {
    fulfillmentId: string;
    trackingInfo: FulfillmentTrackingInput;
    notifyCustomer?: boolean;
  },
) {
  const data = await graphql<UpdateTrackingInfoMutation>(
    UPDATE_TRACKING_INFO,
    {
      fulfillmentId: params.fulfillmentId,
      trackingInfoInput: params.trackingInfo,
      notifyCustomer: params.notifyCustomer ?? false,
    } satisfies UpdateTrackingInfoMutationVariables,
  );

  return requirePayload(
    data.fulfillmentTrackingInfoUpdate,
    "fulfillmentTrackingInfoUpdate",
  );
}

export async function cancelFulfillment(
  graphql: GraphQLClient,
  fulfillmentId: string,
) {
  const data = await graphql<CancelFulfillmentMutation>(
    CANCEL_FULFILLMENT,
    { id: fulfillmentId } satisfies CancelFulfillmentMutationVariables,
  );

  return requirePayload(data.fulfillmentCancel, "fulfillmentCancel");
}

export async function acceptCancellationRequest(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<AcceptCancellationRequestMutation>(
    ACCEPT_CANCELLATION_REQUEST,
    params satisfies AcceptCancellationRequestMutationVariables,
  );

  return requirePayload(
    data.fulfillmentOrderAcceptCancellationRequest,
    "fulfillmentOrderAcceptCancellationRequest",
  );
}

export async function rejectCancellationRequest(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<RejectCancellationRequestMutation>(
    REJECT_CANCELLATION_REQUEST,
    params satisfies RejectCancellationRequestMutationVariables,
  );

  return requirePayload(
    data.fulfillmentOrderRejectCancellationRequest,
    "fulfillmentOrderRejectCancellationRequest",
  );
}

export async function placeFulfillmentHold(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; hold: FulfillmentOrderHoldInput },
) {
  const data = await graphql<PlaceFulfillmentHoldMutation>(
    PLACE_FULFILLMENT_HOLD,
    {
      id: params.fulfillmentOrderId,
      fulfillmentHold: params.hold,
    } satisfies PlaceFulfillmentHoldMutationVariables,
  );

  return requirePayload(
    data.fulfillmentOrderHold,
    "fulfillmentOrderHold",
  );
}

export async function releaseFulfillmentHold(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; holdIds?: string[]; externalId?: string },
) {
  const data = await graphql<ReleaseFulfillmentHoldMutation>(
    RELEASE_FULFILLMENT_HOLD,
    {
      id: params.fulfillmentOrderId,
      holdIds: params.holdIds,
      externalId: params.externalId,
    } satisfies ReleaseFulfillmentHoldMutationVariables,
  );

  return requirePayload(
    data.fulfillmentOrderReleaseHold,
    "fulfillmentOrderReleaseHold",
  );
}

export async function closeFulfillmentOrder(
  graphql: GraphQLClient,
  params: { fulfillmentOrderId: string; message?: string },
) {
  const data = await graphql<CloseFulfillmentOrderMutation>(
    CLOSE_FULFILLMENT_ORDER,
    params satisfies CloseFulfillmentOrderMutationVariables,
  );

  return requirePayload(
    data.fulfillmentOrderClose,
    "fulfillmentOrderClose",
  );
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
    $fulfillment: FulfillmentInput!
  ) {
    fulfillmentCreate(fulfillment: $fulfillment) {
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
