/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type FetchFulfillmentServicesQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type FetchFulfillmentServicesQuery = { shop: { fulfillmentServices: Array<(
      Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName' | 'type' | 'requiresShippingMethod' | 'callbackUrl'>
      & { location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'id' | 'name'>> }
    )> } };

export type ProvisionFulfillmentServiceMutationVariables = AdminTypes.Exact<{
  name: AdminTypes.Scalars['String']['input'];
  inventoryManagement: AdminTypes.Scalars['Boolean']['input'];
  trackingSupport: AdminTypes.Scalars['Boolean']['input'];
}>;


export type ProvisionFulfillmentServiceMutation = { fulfillmentServiceCreate?: AdminTypes.Maybe<{ fulfillmentService?: AdminTypes.Maybe<(
      Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName'>
      & { location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'id' | 'name'>> }
    )>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type ProvisionUpdateFulfillmentServiceMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  requiresShippingMethod?: AdminTypes.InputMaybe<AdminTypes.Scalars['Boolean']['input']>;
}>;


export type ProvisionUpdateFulfillmentServiceMutation = { fulfillmentServiceUpdate?: AdminTypes.Maybe<{ fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'id' | 'requiresShippingMethod'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type ProvisionUpdateLocationMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  input: AdminTypes.LocationEditInput;
}>;


export type ProvisionUpdateLocationMutation = { locationEdit?: AdminTypes.Maybe<{ location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'id' | 'name'>>, userErrors: Array<Pick<AdminTypes.LocationEditUserError, 'field' | 'message'>> }> };

export type ProvisionPublicationsQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type ProvisionPublicationsQuery = { publications: { edges: Array<{ node: (
        Pick<AdminTypes.Publication, 'id' | 'name'>
        & { catalog?: AdminTypes.Maybe<Pick<AdminTypes.AppCatalog, 'title'> | Pick<AdminTypes.CompanyLocationCatalog, 'title'> | Pick<AdminTypes.MarketCatalog, 'title'>> }
      ) }> } };

export type ProvisionProductPublicationsQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type ProvisionProductPublicationsQuery = { product?: AdminTypes.Maybe<{ resourcePublications: { nodes: Array<{ publication: Pick<AdminTypes.Publication, 'id' | 'name'> }> } }> };

export type ProvisionPublishProductMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  input: Array<AdminTypes.PublicationInput> | AdminTypes.PublicationInput;
}>;


export type ProvisionPublishProductMutation = { publishablePublish?: AdminTypes.Maybe<{ publishable?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type ProvisionProductImagesQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type ProvisionProductImagesQuery = { product?: AdminTypes.Maybe<{ images: { nodes: Array<Pick<AdminTypes.Image, 'id' | 'url'>> } }> };

export type ProvisionAttachProductImageMutationVariables = AdminTypes.Exact<{
  productId: AdminTypes.Scalars['ID']['input'];
  media: Array<AdminTypes.CreateMediaInput> | AdminTypes.CreateMediaInput;
}>;


export type ProvisionAttachProductImageMutation = { productCreateMedia?: AdminTypes.Maybe<{ mediaUserErrors: Array<Pick<AdminTypes.MediaUserError, 'field' | 'message'>> }> };

export type ProvisionProductByHandleQueryVariables = AdminTypes.Exact<{
  handle: AdminTypes.Scalars['String']['input'];
}>;


export type ProvisionProductByHandleQuery = { productByHandle?: AdminTypes.Maybe<(
    Pick<AdminTypes.Product, 'id' | 'title'>
    & { variants: { edges: Array<{ node: (
          Pick<AdminTypes.ProductVariant, 'id' | 'sku'>
          & { inventoryItem: Pick<AdminTypes.InventoryItem, 'id' | 'tracked'> }
        ) }> } }
  )> };

export type ProvisionCreateProductMutationVariables = AdminTypes.Exact<{
  product: AdminTypes.ProductCreateInput;
}>;


export type ProvisionCreateProductMutation = { productCreate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<(
      Pick<AdminTypes.Product, 'id' | 'title'>
      & { variants: { edges: Array<{ node: (
            Pick<AdminTypes.ProductVariant, 'id'>
            & { inventoryItem: Pick<AdminTypes.InventoryItem, 'id' | 'tracked'> }
          ) }> } }
    )>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type ProvisionUpdateVariantMutationVariables = AdminTypes.Exact<{
  productId: AdminTypes.Scalars['ID']['input'];
  variants: Array<AdminTypes.ProductVariantsBulkInput> | AdminTypes.ProductVariantsBulkInput;
}>;


export type ProvisionUpdateVariantMutation = { productVariantsBulkUpdate?: AdminTypes.Maybe<{ productVariants?: AdminTypes.Maybe<Array<(
      Pick<AdminTypes.ProductVariant, 'id' | 'sku' | 'price'>
      & { inventoryItem: Pick<AdminTypes.InventoryItem, 'id' | 'tracked'> }
    )>>, userErrors: Array<Pick<AdminTypes.ProductVariantsBulkUpdateUserError, 'field' | 'message'>> }> };

export type ProvisionInventoryActivateMutationVariables = AdminTypes.Exact<{
  inventoryItemId: AdminTypes.Scalars['ID']['input'];
  locationId: AdminTypes.Scalars['ID']['input'];
  onHand?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type ProvisionInventoryActivateMutation = { inventoryActivate?: AdminTypes.Maybe<{ inventoryLevel?: AdminTypes.Maybe<Pick<AdminTypes.InventoryLevel, 'id'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type ProvisionInventoryActivateRetryMutationVariables = AdminTypes.Exact<{
  inventoryItemId: AdminTypes.Scalars['ID']['input'];
  locationId: AdminTypes.Scalars['ID']['input'];
}>;


export type ProvisionInventoryActivateRetryMutation = { inventoryActivate?: AdminTypes.Maybe<{ inventoryLevel?: AdminTypes.Maybe<Pick<AdminTypes.InventoryLevel, 'id'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type ProvisionInventorySetOnHandMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.InventorySetOnHandQuantitiesInput;
}>;


export type ProvisionInventorySetOnHandMutation = { inventorySetOnHandQuantities?: AdminTypes.Maybe<{ userErrors: Array<Pick<AdminTypes.InventorySetOnHandQuantitiesUserError, 'message'>> }> };

export type FulfillmentOrderLineItemsQueryVariables = AdminTypes.Exact<{
  fulfillmentOrderId: AdminTypes.Scalars['ID']['input'];
}>;


export type FulfillmentOrderLineItemsQuery = { fulfillmentOrder?: AdminTypes.Maybe<(
    Pick<AdminTypes.FulfillmentOrder, 'id'>
    & { lineItems: { edges: Array<{ node: Pick<AdminTypes.FulfillmentOrderLineItem, 'id' | 'remainingQuantity'> }> } }
  )> };

export type FetchFulfillmentOriginAddressQueryVariables = AdminTypes.Exact<{
  fulfillmentOrderId: AdminTypes.Scalars['ID']['input'];
}>;


export type FetchFulfillmentOriginAddressQuery = { fulfillmentOrder?: AdminTypes.Maybe<(
    Pick<AdminTypes.FulfillmentOrder, 'id'>
    & { assignedLocation: (
      Pick<AdminTypes.FulfillmentOrderAssignedLocation, 'address1' | 'address2' | 'city' | 'countryCode' | 'province' | 'zip'>
      & { location?: AdminTypes.Maybe<{ address: Pick<AdminTypes.LocationAddress, 'address1' | 'address2' | 'city' | 'countryCode' | 'provinceCode' | 'zip'> }> }
    ) }
  )> };

export type AcceptFulfillmentRequestMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  message?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type AcceptFulfillmentRequestMutation = { fulfillmentOrderAcceptFulfillmentRequest?: AdminTypes.Maybe<{ fulfillmentOrder?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentOrder, 'id' | 'status' | 'requestStatus'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type RejectFulfillmentRequestMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  message?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type RejectFulfillmentRequestMutation = { fulfillmentOrderRejectFulfillmentRequest?: AdminTypes.Maybe<{ fulfillmentOrder?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentOrder, 'id' | 'status' | 'requestStatus'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type CreateFulfillmentMutationVariables = AdminTypes.Exact<{
  fulfillment: AdminTypes.FulfillmentInput;
}>;


export type CreateFulfillmentMutation = { fulfillmentCreate?: AdminTypes.Maybe<{ fulfillment?: AdminTypes.Maybe<(
      Pick<AdminTypes.Fulfillment, 'id' | 'status'>
      & { trackingInfo: Array<Pick<AdminTypes.FulfillmentTrackingInfo, 'number' | 'url' | 'company'>>, originAddress?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentOriginAddress, 'address1' | 'address2' | 'city' | 'zip' | 'provinceCode' | 'countryCode'>> }
    )>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type UpdateTrackingInfoMutationVariables = AdminTypes.Exact<{
  fulfillmentId: AdminTypes.Scalars['ID']['input'];
  trackingInfoInput: AdminTypes.FulfillmentTrackingInput;
  notifyCustomer?: AdminTypes.InputMaybe<AdminTypes.Scalars['Boolean']['input']>;
}>;


export type UpdateTrackingInfoMutation = { fulfillmentTrackingInfoUpdate?: AdminTypes.Maybe<{ fulfillment?: AdminTypes.Maybe<(
      Pick<AdminTypes.Fulfillment, 'id' | 'status'>
      & { trackingInfo: Array<Pick<AdminTypes.FulfillmentTrackingInfo, 'number' | 'url' | 'company'>> }
    )>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type CancelFulfillmentMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type CancelFulfillmentMutation = { fulfillmentCancel?: AdminTypes.Maybe<{ fulfillment?: AdminTypes.Maybe<Pick<AdminTypes.Fulfillment, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type AcceptCancellationRequestMutationVariables = AdminTypes.Exact<{
  fulfillmentOrderId: AdminTypes.Scalars['ID']['input'];
  message?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type AcceptCancellationRequestMutation = { fulfillmentOrderAcceptCancellationRequest?: AdminTypes.Maybe<{ fulfillmentOrder?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentOrder, 'id' | 'status' | 'requestStatus'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type RejectCancellationRequestMutationVariables = AdminTypes.Exact<{
  fulfillmentOrderId: AdminTypes.Scalars['ID']['input'];
  message?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type RejectCancellationRequestMutation = { fulfillmentOrderRejectCancellationRequest?: AdminTypes.Maybe<{ fulfillmentOrder?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentOrder, 'id' | 'status' | 'requestStatus'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type PlaceFulfillmentHoldMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  fulfillmentHold: AdminTypes.FulfillmentOrderHoldInput;
}>;


export type PlaceFulfillmentHoldMutation = { fulfillmentOrderHold?: AdminTypes.Maybe<{ fulfillmentOrder?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentOrder, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.FulfillmentOrderHoldUserError, 'message'>> }> };

export type ReleaseFulfillmentHoldMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  holdIds?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['ID']['input']> | AdminTypes.Scalars['ID']['input']>;
  externalId?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type ReleaseFulfillmentHoldMutation = { fulfillmentOrderReleaseHold?: AdminTypes.Maybe<{ fulfillmentOrder?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentOrder, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.FulfillmentOrderReleaseHoldUserError, 'message'>> }> };

export type CloseFulfillmentOrderMutationVariables = AdminTypes.Exact<{
  fulfillmentOrderId: AdminTypes.Scalars['ID']['input'];
  message?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type CloseFulfillmentOrderMutation = { fulfillmentOrderClose?: AdminTypes.Maybe<{ fulfillmentOrder?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentOrder, 'id' | 'status' | 'requestStatus'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message'>> }> };

export type FulfillmentStateQueryVariables = AdminTypes.Exact<{
  fulfillmentOrderId: AdminTypes.Scalars['ID']['input'];
}>;


export type FulfillmentStateQuery = { fulfillmentOrder?: AdminTypes.Maybe<(
    Pick<AdminTypes.FulfillmentOrder, 'id' | 'status' | 'requestStatus' | 'fulfillAt'>
    & { supportedActions: Array<Pick<AdminTypes.FulfillmentOrderSupportedAction, 'action' | 'externalUrl'>>, assignedLocation: { location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'id'>> }, fulfillments: { edges: Array<{ node: (
          Pick<AdminTypes.Fulfillment, 'id' | 'status'>
          & { trackingInfo: Array<Pick<AdminTypes.FulfillmentTrackingInfo, 'number' | 'url' | 'company'>> }
        ) }> }, order: (
      Pick<AdminTypes.Order, 'id' | 'name' | 'displayFulfillmentStatus' | 'displayFinancialStatus' | 'processedAt' | 'currencyCode'>
      & { customer?: AdminTypes.Maybe<Pick<AdminTypes.Customer, 'firstName' | 'lastName' | 'email'>> }
    ) }
  )> };

interface GeneratedQueryTypes {
  "#graphql\n      query FetchFulfillmentServices {\n        shop {\n          fulfillmentServices {\n            id\n            serviceName\n            type\n            requiresShippingMethod\n            callbackUrl\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    ": {return: FetchFulfillmentServicesQuery, variables: FetchFulfillmentServicesQueryVariables},
  "#graphql\n      query ProvisionPublications {\n        publications(first: 50) {\n          edges {\n            node {\n              id\n              name\n              catalog {\n                title\n              }\n            }\n          }\n        }\n      }\n    ": {return: ProvisionPublicationsQuery, variables: ProvisionPublicationsQueryVariables},
  "#graphql\n      query ProvisionProductPublications($id: ID!) {\n        product(id: $id) {\n          resourcePublications(first: 50) {\n            nodes {\n              publication {\n                id\n                name\n              }\n            }\n          }\n        }\n      }\n    ": {return: ProvisionProductPublicationsQuery, variables: ProvisionProductPublicationsQueryVariables},
  "#graphql\n      query ProvisionProductImages($id: ID!) {\n        product(id: $id) {\n          images(first: 10) {\n            nodes {\n              id\n              url\n            }\n          }\n        }\n      }\n    ": {return: ProvisionProductImagesQuery, variables: ProvisionProductImagesQueryVariables},
  "#graphql\n      query ProvisionProductByHandle($handle: String!) {\n        productByHandle(handle: $handle) {\n          id\n          title\n          variants(first: 1) {\n            edges {\n              node {\n                id\n                sku\n                inventoryItem {\n                  id\n                  tracked\n                }\n              }\n            }\n          }\n        }\n      }\n    ": {return: ProvisionProductByHandleQuery, variables: ProvisionProductByHandleQueryVariables},
  "#graphql\n  query FulfillmentOrderLineItems($fulfillmentOrderId: ID!) {\n    fulfillmentOrder(id: $fulfillmentOrderId) {\n      id\n      lineItems(first: 50) {\n        edges {\n          node {\n            id\n            remainingQuantity\n          }\n        }\n      }\n    }\n  }\n": {return: FulfillmentOrderLineItemsQuery, variables: FulfillmentOrderLineItemsQueryVariables},
  "#graphql\n  query FetchFulfillmentOriginAddress($fulfillmentOrderId: ID!) {\n    fulfillmentOrder(id: $fulfillmentOrderId) {\n      id\n      assignedLocation {\n        address1\n        address2\n        city\n        countryCode\n        province\n        zip\n        location {\n          address {\n            address1\n            address2\n            city\n            countryCode\n            provinceCode\n            zip\n          }\n        }\n      }\n    }\n  }\n": {return: FetchFulfillmentOriginAddressQuery, variables: FetchFulfillmentOriginAddressQueryVariables},
  "#graphql\n  query FulfillmentState($fulfillmentOrderId: ID!) {\n    fulfillmentOrder(id: $fulfillmentOrderId) {\n      id\n      status\n      requestStatus\n      fulfillAt\n      supportedActions {\n        action\n        externalUrl\n      }\n      assignedLocation {\n        location {\n          id\n        }\n      }\n      fulfillments(first: 10) {\n        edges {\n          node {\n            id\n            status\n            trackingInfo {\n              number\n              url\n              company\n            }\n          }\n        }\n      }\n      order {\n        id\n        name\n        displayFulfillmentStatus\n        displayFinancialStatus\n        processedAt\n        currencyCode\n        customer {\n          firstName\n          lastName\n          email\n        }\n      }\n    }\n  }\n": {return: FulfillmentStateQuery, variables: FulfillmentStateQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n      mutation ProvisionFulfillmentService(\n        $name: String!\n        $inventoryManagement: Boolean!\n        $trackingSupport: Boolean!\n      ) {\n        fulfillmentServiceCreate(\n          name: $name\n          inventoryManagement: $inventoryManagement\n          trackingSupport: $trackingSupport\n        ) {\n          fulfillmentService {\n            id\n            serviceName\n            location {\n              id\n              name\n            }\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionFulfillmentServiceMutation, variables: ProvisionFulfillmentServiceMutationVariables},
  "#graphql\n      mutation ProvisionUpdateFulfillmentService(\n        $id: ID!\n        $requiresShippingMethod: Boolean\n      ) {\n        fulfillmentServiceUpdate(\n          id: $id\n          requiresShippingMethod: $requiresShippingMethod\n        ) {\n          fulfillmentService {\n            id\n            requiresShippingMethod\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionUpdateFulfillmentServiceMutation, variables: ProvisionUpdateFulfillmentServiceMutationVariables},
  "#graphql\n      mutation ProvisionUpdateLocation($id: ID!, $input: LocationEditInput!) {\n        locationEdit(id: $id, input: $input) {\n          location {\n            id\n            name\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionUpdateLocationMutation, variables: ProvisionUpdateLocationMutationVariables},
  "#graphql\n      mutation ProvisionPublishProduct(\n        $id: ID!\n        $input: [PublicationInput!]!\n      ) {\n        publishablePublish(id: $id, input: $input) {\n          publishable {\n            ... on Product {\n              id\n            }\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionPublishProductMutation, variables: ProvisionPublishProductMutationVariables},
  "#graphql\n      mutation ProvisionAttachProductImage(\n        $productId: ID!\n        $media: [CreateMediaInput!]!\n      ) {\n        productCreateMedia(productId: $productId, media: $media) {\n          mediaUserErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionAttachProductImageMutation, variables: ProvisionAttachProductImageMutationVariables},
  "#graphql\n      mutation ProvisionCreateProduct($product: ProductCreateInput!) {\n        productCreate(product: $product) {\n          product {\n            id\n            title\n            variants(first: 1) {\n              edges {\n                node {\n                  id\n                  inventoryItem {\n                    id\n                    tracked\n                  }\n                }\n              }\n            }\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionCreateProductMutation, variables: ProvisionCreateProductMutationVariables},
  "#graphql\n      mutation ProvisionUpdateVariant(\n        $productId: ID!\n        $variants: [ProductVariantsBulkInput!]!\n      ) {\n        productVariantsBulkUpdate(productId: $productId, variants: $variants) {\n          productVariants {\n            id\n            sku\n            price\n            inventoryItem {\n              id\n              tracked\n            }\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionUpdateVariantMutation, variables: ProvisionUpdateVariantMutationVariables},
  "#graphql\n      mutation ProvisionInventoryActivate(\n        $inventoryItemId: ID!\n        $locationId: ID!\n        $onHand: Int\n      ) {\n        inventoryActivate(\n          inventoryItemId: $inventoryItemId\n          locationId: $locationId\n          onHand: $onHand\n        ) {\n          inventoryLevel {\n            id\n          }\n          userErrors {\n            message\n          }\n        }\n      }\n    ": {return: ProvisionInventoryActivateMutation, variables: ProvisionInventoryActivateMutationVariables},
  "#graphql\n        mutation ProvisionInventoryActivateRetry(\n          $inventoryItemId: ID!\n          $locationId: ID!\n        ) {\n          inventoryActivate(\n            inventoryItemId: $inventoryItemId\n            locationId: $locationId\n          ) {\n            inventoryLevel {\n              id\n            }\n            userErrors {\n              message\n            }\n          }\n        }\n      ": {return: ProvisionInventoryActivateRetryMutation, variables: ProvisionInventoryActivateRetryMutationVariables},
  "#graphql\n      mutation ProvisionInventorySetOnHand(\n        $input: InventorySetOnHandQuantitiesInput!\n      ) {\n        inventorySetOnHandQuantities(input: $input) {\n          userErrors {\n            message\n          }\n        }\n      }\n    ": {return: ProvisionInventorySetOnHandMutation, variables: ProvisionInventorySetOnHandMutationVariables},
  "#graphql\n  mutation AcceptFulfillmentRequest($id: ID!, $message: String) {\n    fulfillmentOrderAcceptFulfillmentRequest(id: $id, message: $message) {\n      fulfillmentOrder {\n        id\n        status\n        requestStatus\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: AcceptFulfillmentRequestMutation, variables: AcceptFulfillmentRequestMutationVariables},
  "#graphql\n  mutation RejectFulfillmentRequest($id: ID!, $message: String) {\n    fulfillmentOrderRejectFulfillmentRequest(id: $id, message: $message) {\n      fulfillmentOrder {\n        id\n        status\n        requestStatus\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: RejectFulfillmentRequestMutation, variables: RejectFulfillmentRequestMutationVariables},
  "#graphql\n  mutation CreateFulfillment(\n    $fulfillment: FulfillmentInput!\n  ) {\n    fulfillmentCreate(fulfillment: $fulfillment) {\n      fulfillment {\n        id\n        status\n        trackingInfo {\n          number\n          url\n          company\n        }\n        originAddress {\n          address1\n          address2\n          city\n          zip\n          provinceCode\n          countryCode\n        }\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: CreateFulfillmentMutation, variables: CreateFulfillmentMutationVariables},
  "#graphql\n  mutation UpdateTrackingInfo(\n    $fulfillmentId: ID!\n    $trackingInfoInput: FulfillmentTrackingInput!\n    $notifyCustomer: Boolean\n  ) {\n    fulfillmentTrackingInfoUpdate(\n      fulfillmentId: $fulfillmentId\n      trackingInfoInput: $trackingInfoInput\n      notifyCustomer: $notifyCustomer\n    ) {\n      fulfillment {\n        id\n        status\n        trackingInfo {\n          number\n          url\n          company\n        }\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: UpdateTrackingInfoMutation, variables: UpdateTrackingInfoMutationVariables},
  "#graphql\n  mutation CancelFulfillment($id: ID!) {\n    fulfillmentCancel(id: $id) {\n      fulfillment {\n        id\n        status\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: CancelFulfillmentMutation, variables: CancelFulfillmentMutationVariables},
  "#graphql\n  mutation AcceptCancellationRequest($fulfillmentOrderId: ID!, $message: String) {\n    fulfillmentOrderAcceptCancellationRequest(\n      id: $fulfillmentOrderId\n      message: $message\n    ) {\n      fulfillmentOrder {\n        id\n        status\n        requestStatus\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: AcceptCancellationRequestMutation, variables: AcceptCancellationRequestMutationVariables},
  "#graphql\n  mutation RejectCancellationRequest($fulfillmentOrderId: ID!, $message: String) {\n    fulfillmentOrderRejectCancellationRequest(\n      id: $fulfillmentOrderId\n      message: $message\n    ) {\n      fulfillmentOrder {\n        id\n        status\n        requestStatus\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: RejectCancellationRequestMutation, variables: RejectCancellationRequestMutationVariables},
  "#graphql\n  mutation PlaceFulfillmentHold(\n    $id: ID!\n    $fulfillmentHold: FulfillmentOrderHoldInput!\n  ) {\n    fulfillmentOrderHold(\n      id: $id\n      fulfillmentHold: $fulfillmentHold\n    ) {\n      fulfillmentOrder {\n        id\n        status\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: PlaceFulfillmentHoldMutation, variables: PlaceFulfillmentHoldMutationVariables},
  "#graphql\n  mutation ReleaseFulfillmentHold(\n    $id: ID!\n    $holdIds: [ID!]\n    $externalId: String\n  ) {\n    fulfillmentOrderReleaseHold(\n      id: $id\n      holdIds: $holdIds\n      externalId: $externalId\n    ) {\n      fulfillmentOrder {\n        id\n        status\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: ReleaseFulfillmentHoldMutation, variables: ReleaseFulfillmentHoldMutationVariables},
  "#graphql\n  mutation CloseFulfillmentOrder($fulfillmentOrderId: ID!, $message: String) {\n    fulfillmentOrderClose(id: $fulfillmentOrderId, message: $message) {\n      fulfillmentOrder {\n        id\n        status\n        requestStatus\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: CloseFulfillmentOrderMutation, variables: CloseFulfillmentOrderMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
