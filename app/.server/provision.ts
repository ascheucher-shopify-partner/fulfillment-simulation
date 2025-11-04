import "dotenv/config";

import type {
  FulfillmentServiceCreatePayload,
  InventoryLevel,
  Location,
  LocationEditInput,
  MutationFulfillmentServiceCreateArgs,
  MutationInventoryActivateArgs,
  MutationInventorySetOnHandQuantitiesArgs,
  MutationLocationEditArgs,
  MutationProductCreateArgs,
  MutationProductVariantsBulkUpdateArgs,
  Product,
  ProductCreatePayload,
  ProductVariantsBulkUpdatePayload,
  Shop,
} from "../types/admin.types";

import shopify from "../shopify.server";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

const SERVICE_NAME =
  process.env.DEMO_FULFILLMENT_SERVICE_NAME ?? "Demo Fulfillment Service";
const LOCATION_NAME =
  process.env.DEMO_FULFILLMENT_LOCATION_NAME ?? "Demo Fulfillment Warehouse";
const LOCATION_ADDRESS: NonNullable<LocationEditInput["address"]> = {
  address1: process.env.DEMO_FULFILLMENT_ADDRESS1 ?? "123 Demo Street",
  city: process.env.DEMO_FULFILLMENT_CITY ?? "Demo City",
  provinceCode: process.env.DEMO_FULFILLMENT_PROVINCE ?? "CA",
  countryCode:
    (process.env.DEMO_FULFILLMENT_COUNTRY as NonNullable<
      LocationEditInput["address"]
    >["countryCode"]) ?? "US",
  zip: process.env.DEMO_FULFILLMENT_ZIP ?? "90001",
  phone: process.env.DEMO_FULFILLMENT_PHONE ?? undefined,
};

const PRODUCT_TITLE =
  process.env.DEMO_PRODUCT_TITLE ?? "Demo Fulfillment Product";
const PRODUCT_HANDLE =
  process.env.DEMO_PRODUCT_HANDLE ?? "demo-fulfillment-product";
const PRODUCT_VENDOR = process.env.DEMO_PRODUCT_VENDOR ?? "Fulfillment Simulation";
const PRODUCT_TYPE = process.env.DEMO_PRODUCT_TYPE ?? "Demo";
const PRODUCT_PRICE = process.env.DEMO_PRODUCT_PRICE ?? "29.99";
const PRODUCT_SKU = process.env.DEMO_PRODUCT_SKU ?? "DEMO-FULFILLMENT-SKU";
const INITIAL_STOCK = Number(process.env.DEMO_PRODUCT_QUANTITY ?? 25);

const INVENTORY_REASON =
  process.env.DEMO_INVENTORY_REASON ?? "cycle_count_available";
const INVENTORY_REFERENCE =
  process.env.DEMO_INVENTORY_REFERENCE ??
  "gid://fulfillment-simulation/Seed/INITIAL";

async function main() {
  const shop = getShopDomain();
  const { admin } = await shopify.unauthenticated.admin(shop);

  const graphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ) => {
    const response = await admin.graphql(query, variables ? { variables } : {});
    const json = (await response.json()) as GraphQLResponse<T>;
    if (json.errors?.length) {
      throw new Error(
        `GraphQL errors: ${json.errors
          .map((error) => error.message)
          .join(", ")}`,
      );
    }
    if (!json.data) {
      throw new Error("GraphQL response missing data");
    }
    return json.data;
  };

  const { serviceId, locationId } = await ensureFulfillmentService(graphql);
  const { productId, variantId, inventoryItemId } = await ensureDemoProduct(
    graphql,
  );

  await ensureInventory(graphql, {
    inventoryItemId,
    locationId,
  });

  console.log("✅ Provisioning complete. Summary:");
  console.log(`  Shop: ${shop}`);
  console.log(`  Fulfillment service: ${serviceId}`);
  console.log(`  Location: ${locationId}`);
  console.log(`  Product: ${productId}`);
  console.log(`  Variant: ${variantId}`);
  console.log(`  Inventory item: ${inventoryItemId}`);
}

function getShopDomain(): string {
  const fromEnv = process.env.SHOP ?? process.env.SHOPIFY_SHOP;
  const fromArgs = process.argv[2];
  const shop = fromEnv ?? fromArgs;
  if (!shop) {
    throw new Error(
      "Provide a shop domain via SHOP environment variable or as the first argument.",
    );
  }
  return shop;
}

async function ensureFulfillmentService(
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
): Promise<{ serviceId: string; locationId: string }> {
  const data = await graphql<{
    shop: Pick<Shop, "fulfillmentServices">;
  }>(
    `#graphql
      query FetchFulfillmentServices {
        shop {
          fulfillmentServices {
            id
            serviceName
            type
            callbackUrl
            location {
              id
              name
            }
          }
        }
      }
    `,
  );

  const existing = data.shop.fulfillmentServices.find(
    (service) => service.serviceName === SERVICE_NAME,
  );

  if (existing?.location?.id) {
    await updateLocation(graphql, existing.location.id);
    return { serviceId: existing.id, locationId: existing.location.id };
  }

  const variables: MutationFulfillmentServiceCreateArgs = {
    name: SERVICE_NAME,
    inventoryManagement: true,
    trackingSupport: true,
  };

  const result = await graphql<{
    fulfillmentServiceCreate?: FulfillmentServiceCreatePayload;
  }>(
    `#graphql
      mutation ProvisionFulfillmentService(
        $name: String!
        $inventoryManagement: Boolean!
        $trackingSupport: Boolean!
      ) {
        fulfillmentServiceCreate(
          name: $name
          inventoryManagement: $inventoryManagement
          trackingSupport: $trackingSupport
        ) {
          fulfillmentService {
            id
            serviceName
            location {
              id
              name
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables,
  );

  const payload = result.fulfillmentServiceCreate;
  if (!payload?.fulfillmentService) {
    const messages = payload?.userErrors?.map((error) => error.message) ?? [];
    throw new Error(
      `Failed to create fulfillment service: ${messages.join(", ") || "Unknown error"}`,
    );
  }

  const newLocationId = payload.fulfillmentService.location?.id;
  if (!newLocationId) {
    throw new Error("Fulfillment service creation did not return a location ID.");
  }

  await updateLocation(graphql, newLocationId);

  return {
    serviceId: payload.fulfillmentService.id,
    locationId: newLocationId,
  };
}

async function updateLocation(
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
  locationId: string,
) {
  const input: LocationEditInput = {
    name: LOCATION_NAME,
    address: LOCATION_ADDRESS,
  };

  const variables: MutationLocationEditArgs = {
    id: locationId,
    input,
  };

  const response = await graphql<{
    locationEdit?: {
      location?: Pick<Location, "id" | "name">;
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
      mutation ProvisionUpdateLocation($id: ID!, $input: LocationEditInput!) {
        locationEdit(id: $id, input: $input) {
          location {
            id
            name
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables,
  );

  const userErrors = response.locationEdit?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(
      `Failed to update location: ${userErrors
        .map((error) => error.message)
        .join(", ")}`,
    );
  }
}

async function ensureDemoProduct(
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
): Promise<{ productId: string; variantId: string; inventoryItemId: string }> {
  const existing = await graphql<{
    productByHandle?: Pick<Product, "id" | "title"> & {
      variants: {
        edges: Array<{
          node: {
            id: string;
            sku?: string | null;
            inventoryItem?: { id: string; tracked: boolean } | null;
          };
        }>;
      };
    };
  }>(
    `#graphql
      query ProvisionProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
          title
          variants(first: 1) {
            edges {
              node {
                id
                sku
                inventoryItem {
                  id
                  tracked
                }
              }
            }
          }
        }
      }
    `,
    { handle: PRODUCT_HANDLE },
  );

  const product = existing.productByHandle;
  const variantEdge = product?.variants.edges[0];
  const inventoryItemId = variantEdge?.node.inventoryItem?.id;

  if (product && variantEdge && inventoryItemId) {
    await updateVariant(graphql, {
      productId: product.id,
      variantId: variantEdge.node.id,
      inventoryItemId,
    });
    return {
      productId: product.id,
      variantId: variantEdge.node.id,
      inventoryItemId,
    };
  }

  const variables: MutationProductCreateArgs = {
    product: {
      title: PRODUCT_TITLE,
      handle: PRODUCT_HANDLE,
      status: "ACTIVE",
      vendor: PRODUCT_VENDOR,
      productType: PRODUCT_TYPE,
    },
  };

  const create = await graphql<{
    productCreate?: ProductCreatePayload;
  }>(
    `#graphql
      mutation ProvisionCreateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryItem {
                    id
                    tracked
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables,
  );

  const payload = create.productCreate;
  if (!payload?.product) {
    const messages = payload?.userErrors?.map((error) => error.message) ?? [];
    throw new Error(
      `Failed to create product: ${messages.join(", ") || "Unknown error"}`,
    );
  }

  const createdVariant = payload.product.variants.edges[0]?.node;
  const createdInventoryItemId = createdVariant?.inventoryItem?.id;
  if (!createdVariant || !createdInventoryItemId) {
    throw new Error("Product creation did not return a variant with inventory item.");
  }

  await updateVariant(graphql, {
    productId: payload.product.id,
    variantId: createdVariant.id,
    inventoryItemId: createdInventoryItemId,
  });

  return {
    productId: payload.product.id,
    variantId: createdVariant.id,
    inventoryItemId: createdInventoryItemId,
  };
}

async function updateVariant(
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
  params: { productId: string; variantId: string; inventoryItemId: string },
) {
  const variables: MutationProductVariantsBulkUpdateArgs = {
    productId: params.productId,
    variants: [
      {
        id: params.variantId,
        price: PRODUCT_PRICE,
        inventoryPolicy: "DENY",
        taxable: true,
        inventoryItem: {
          sku: PRODUCT_SKU,
          tracked: true,
          requiresShipping: true,
        },
      },
    ],
  };

  const result = await graphql<{
    productVariantsBulkUpdate?: ProductVariantsBulkUpdatePayload;
  }>(
    `#graphql
      mutation ProvisionUpdateVariant(
        $productId: ID!
        $variants: [ProductVariantsBulkInput!]!
      ) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            sku
            price
            inventoryItem {
              id
              tracked
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables,
  );

  const userErrors = result.productVariantsBulkUpdate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(
      `Failed to update variant: ${userErrors
        .map((error) => error.message)
        .join(", ")}`,
    );
  }
}

async function ensureInventory(
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
  params: { inventoryItemId: string; locationId: string },
) {
  const activateVariables: MutationInventoryActivateArgs = {
    inventoryItemId: params.inventoryItemId,
    locationId: params.locationId,
    onHand: INITIAL_STOCK,
  };

  const activation = await graphql<{
    inventoryActivate?: {
      inventoryLevel?: Pick<InventoryLevel, "id">;
      userErrors: Array<{ message: string }>;
    };
  }>(
    `#graphql
      mutation ProvisionInventoryActivate(
        $inventoryItemId: ID!
        $locationId: ID!
        $onHand: Int
      ) {
        inventoryActivate(
          inventoryItemId: $inventoryItemId
          locationId: $locationId
          onHand: $onHand
        ) {
          inventoryLevel {
            id
          }
          userErrors {
            message
          }
        }
      }
    `,
    activateVariables,
  );

  const activationErrors = activation.inventoryActivate?.userErrors ?? [];
  const activationErrorMessages = activationErrors.map((error) => error.message);
  const alreadyActive = activationErrorMessages.some((message) =>
    message.toLowerCase().includes("already active"),
  );
  const activationFailed =
    activationErrors.length > 0 && !alreadyActive;
  if (activationFailed) {
    throw new Error(
      `Failed to activate inventory level: ${activationErrorMessages.join(", ")}`,
    );
  }

  if (alreadyActive) {
    const retryActivation = await graphql<{
      inventoryActivate?: {
        inventoryLevel?: Pick<InventoryLevel, "id">;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `#graphql
        mutation ProvisionInventoryActivateRetry(
          $inventoryItemId: ID!
          $locationId: ID!
        ) {
          inventoryActivate(
            inventoryItemId: $inventoryItemId
            locationId: $locationId
          ) {
            inventoryLevel {
              id
            }
            userErrors {
              message
            }
          }
        }
      `,
      {
        inventoryItemId: params.inventoryItemId,
        locationId: params.locationId,
      },
    );

    const retryErrors = retryActivation.inventoryActivate?.userErrors ?? [];
    if (retryErrors.length > 0) {
      throw new Error(
        `Failed to activate inventory level: ${retryErrors
          .map((error) => error.message)
          .join(", ")}`,
      );
    }
  }

  const setOnHandVariables: MutationInventorySetOnHandQuantitiesArgs = {
    input: {
      reason: INVENTORY_REASON,
      referenceDocumentUri: INVENTORY_REFERENCE,
      setQuantities: [
        {
          inventoryItemId: params.inventoryItemId,
          locationId: params.locationId,
          quantity: INITIAL_STOCK,
        },
      ],
    },
  };

  const setOnHand = await graphql<{
    inventorySetOnHandQuantities?: {
      userErrors: Array<{ message: string }>;
    };
  }>(
    `#graphql
      mutation ProvisionInventorySetOnHand(
        $input: InventorySetOnHandQuantitiesInput!
      ) {
        inventorySetOnHandQuantities(input: $input) {
          userErrors {
            message
          }
        }
      }
    `,
    setOnHandVariables,
  );

  const onHandErrors = setOnHand.inventorySetOnHandQuantities?.userErrors ?? [];
  if (onHandErrors.length > 0) {
    throw new Error(
      `Failed to set on-hand inventory: ${onHandErrors
        .map((error) => error.message)
        .join(", ")}`,
    );
  }
}

await main().catch((error) => {
  console.error("❌ Provisioning failed");
  console.error(error);
  process.exit(1);
});
