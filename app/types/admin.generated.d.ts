/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type FetchFulfillmentServicesQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type FetchFulfillmentServicesQuery = { shop: { fulfillmentServices: Array<(
      Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName' | 'type' | 'callbackUrl'>
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

export type ProvisionUpdateLocationMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  input: AdminTypes.LocationEditInput;
}>;


export type ProvisionUpdateLocationMutation = { locationEdit?: AdminTypes.Maybe<{ location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'id' | 'name'>>, userErrors: Array<Pick<AdminTypes.LocationEditUserError, 'field' | 'message'>> }> };

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

export type ProvisionInventorySetOnHandMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.InventorySetOnHandQuantitiesInput;
}>;


export type ProvisionInventorySetOnHandMutation = { inventorySetOnHandQuantities?: AdminTypes.Maybe<{ userErrors: Array<Pick<AdminTypes.InventorySetOnHandQuantitiesUserError, 'message'>> }> };

export type PopulateProductMutationVariables = AdminTypes.Exact<{
  product: AdminTypes.ProductCreateInput;
}>;


export type PopulateProductMutation = { productCreate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<(
      Pick<AdminTypes.Product, 'id' | 'title' | 'handle' | 'status'>
      & { variants: { edges: Array<{ node: Pick<AdminTypes.ProductVariant, 'id' | 'price' | 'barcode' | 'createdAt'> }> } }
    )> }> };

export type ShopifyReactRouterTemplateUpdateVariantMutationVariables = AdminTypes.Exact<{
  productId: AdminTypes.Scalars['ID']['input'];
  variants: Array<AdminTypes.ProductVariantsBulkInput> | AdminTypes.ProductVariantsBulkInput;
}>;


export type ShopifyReactRouterTemplateUpdateVariantMutation = { productVariantsBulkUpdate?: AdminTypes.Maybe<{ productVariants?: AdminTypes.Maybe<Array<Pick<AdminTypes.ProductVariant, 'id' | 'price' | 'barcode' | 'createdAt'>>> }> };

interface GeneratedQueryTypes {
  "#graphql\n      query FetchFulfillmentServices {\n        shop {\n          fulfillmentServices {\n            id\n            serviceName\n            type\n            callbackUrl\n            location {\n              id\n              name\n            }\n          }\n        }\n      }\n    ": {return: FetchFulfillmentServicesQuery, variables: FetchFulfillmentServicesQueryVariables},
  "#graphql\n      query ProvisionProductByHandle($handle: String!) {\n        productByHandle(handle: $handle) {\n          id\n          title\n          variants(first: 1) {\n            edges {\n              node {\n                id\n                sku\n                inventoryItem {\n                  id\n                  tracked\n                }\n              }\n            }\n          }\n        }\n      }\n    ": {return: ProvisionProductByHandleQuery, variables: ProvisionProductByHandleQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n      mutation ProvisionFulfillmentService(\n        $name: String!\n        $inventoryManagement: Boolean!\n        $trackingSupport: Boolean!\n      ) {\n        fulfillmentServiceCreate(\n          name: $name\n          inventoryManagement: $inventoryManagement\n          trackingSupport: $trackingSupport\n        ) {\n          fulfillmentService {\n            id\n            serviceName\n            location {\n              id\n              name\n            }\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionFulfillmentServiceMutation, variables: ProvisionFulfillmentServiceMutationVariables},
  "#graphql\n      mutation ProvisionUpdateLocation($id: ID!, $input: LocationEditInput!) {\n        locationEdit(id: $id, input: $input) {\n          location {\n            id\n            name\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionUpdateLocationMutation, variables: ProvisionUpdateLocationMutationVariables},
  "#graphql\n      mutation ProvisionCreateProduct($product: ProductCreateInput!) {\n        productCreate(product: $product) {\n          product {\n            id\n            title\n            variants(first: 1) {\n              edges {\n                node {\n                  id\n                  inventoryItem {\n                    id\n                    tracked\n                  }\n                }\n              }\n            }\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionCreateProductMutation, variables: ProvisionCreateProductMutationVariables},
  "#graphql\n      mutation ProvisionUpdateVariant(\n        $productId: ID!\n        $variants: [ProductVariantsBulkInput!]!\n      ) {\n        productVariantsBulkUpdate(productId: $productId, variants: $variants) {\n          productVariants {\n            id\n            sku\n            price\n            inventoryItem {\n              id\n              tracked\n            }\n          }\n          userErrors {\n            field\n            message\n          }\n        }\n      }\n    ": {return: ProvisionUpdateVariantMutation, variables: ProvisionUpdateVariantMutationVariables},
  "#graphql\n      mutation ProvisionInventoryActivate(\n        $inventoryItemId: ID!\n        $locationId: ID!\n        $onHand: Int\n      ) {\n        inventoryActivate(\n          inventoryItemId: $inventoryItemId\n          locationId: $locationId\n          onHand: $onHand\n        ) {\n          inventoryLevel {\n            id\n          }\n          userErrors {\n            message\n          }\n        }\n      }\n    ": {return: ProvisionInventoryActivateMutation, variables: ProvisionInventoryActivateMutationVariables},
  "#graphql\n      mutation ProvisionInventorySetOnHand(\n        $input: InventorySetOnHandQuantitiesInput!\n      ) {\n        inventorySetOnHandQuantities(input: $input) {\n          userErrors {\n            message\n          }\n        }\n      }\n    ": {return: ProvisionInventorySetOnHandMutation, variables: ProvisionInventorySetOnHandMutationVariables},
  "#graphql\n      mutation populateProduct($product: ProductCreateInput!) {\n        productCreate(product: $product) {\n          product {\n            id\n            title\n            handle\n            status\n            variants(first: 10) {\n              edges {\n                node {\n                  id\n                  price\n                  barcode\n                  createdAt\n                }\n              }\n            }\n          }\n        }\n      }": {return: PopulateProductMutation, variables: PopulateProductMutationVariables},
  "#graphql\n    mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {\n      productVariantsBulkUpdate(productId: $productId, variants: $variants) {\n        productVariants {\n          id\n          price\n          barcode\n          createdAt\n        }\n      }\n    }": {return: ShopifyReactRouterTemplateUpdateVariantMutation, variables: ShopifyReactRouterTemplateUpdateVariantMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
