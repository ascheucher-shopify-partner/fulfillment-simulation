import "dotenv/config";

import type {
  Catalog,
  FulfillmentServiceCreatePayload,
  FulfillmentServiceUpdatePayload,
  InventoryLevel,
  Location,
  LocationEditInput,
  MutationFulfillmentServiceCreateArgs,
  MutationFulfillmentServiceUpdateArgs,
  MutationInventoryActivateArgs,
  MutationInventorySetOnHandQuantitiesArgs,
  MutationLocationEditArgs,
  MutationProductCreateArgs,
  MutationProductCreateMediaArgs,
  MutationProductVariantsBulkUpdateArgs,
  MutationPublishablePublishArgs,
  Product,
  ProductCreatePayload,
  ProductCreateMediaPayload,
  ProductVariantsBulkUpdatePayload,
  Publication,
  PublishablePublishPayload,
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
const PRODUCT_IMAGE_URL =
  process.env.DEMO_PRODUCT_IMAGE_URL ??
  "https://images.unsplash.com/photo-1451976426598-a7593bd6d0b2?auto=format&fit=crop&w=600&h=400&q=80";
const PRODUCT_IMAGE_ALT =
  process.env.DEMO_PRODUCT_IMAGE_ALT ??
  "Warehouse aisle with stacked boxes on shelves";

const INVENTORY_REASON =
  process.env.DEMO_INVENTORY_REASON ?? "cycle_count_available";
const INVENTORY_REFERENCE =
  process.env.DEMO_INVENTORY_REFERENCE ??
  "gid://fulfillment-simulation/Seed/INITIAL";

const TARGET_PUBLICATIONS = [
  { key: "onlineStore", tokens: ["onlinestore"] as const },
  { key: "pos", tokens: ["pointofsale", "pos"] as const },
  { key: "shop", tokens: ["shopapp", "shop"] as const },
] as const;

type PublicationTargetKey = (typeof TARGET_PUBLICATIONS)[number]["key"];

let cachedPublicationIds:
  | Partial<Record<PublicationTargetKey, string>>
  | null = null;

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
            requiresShippingMethod
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
    await ensureServiceSupportsShipping(graphql, existing);
    await updateLocation(graphql, existing.location.id);
    return { serviceId: existing.id, locationId: existing.location.id };
  }

  const variables: MutationFulfillmentServiceCreateArgs = {
    name: SERVICE_NAME,
    inventoryManagement: true,
    trackingSupport: true,
    requiresShippingMethod: true,
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

async function ensureServiceSupportsShipping(
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
  service: {
    id: string;
    requiresShippingMethod?: boolean | null;
  },
) {
  if (service.requiresShippingMethod) {
    return;
  }

  const variables: MutationFulfillmentServiceUpdateArgs = {
    id: service.id,
    requiresShippingMethod: true,
  };

  const result = await graphql<{
    fulfillmentServiceUpdate?: FulfillmentServiceUpdatePayload;
  }>(
    `#graphql
      mutation ProvisionUpdateFulfillmentService(
        $id: ID!
        $requiresShippingMethod: Boolean
      ) {
        fulfillmentServiceUpdate(
          id: $id
          requiresShippingMethod: $requiresShippingMethod
        ) {
          fulfillmentService {
            id
            requiresShippingMethod
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

  const userErrors = result.fulfillmentServiceUpdate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(
      `Failed to update fulfillment service shipping support: ${userErrors
        .map((error) => error.message)
        .join(", ")}`,
    );
  }
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

function normalizePublicationValue(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesPublicationTarget(
  node: Pick<Publication, "name"> & {
    catalog?: Pick<Catalog, "title"> | null;
  },
  tokens: readonly string[],
): boolean {
  const values = [node.name, node.catalog?.title]
    .filter((entry): entry is string => Boolean(entry))
    .map(normalizePublicationValue);

  return values.some((value) =>
    tokens.some((token) => value === token || value.endsWith(token)),
  );
}

async function resolveTargetPublicationIds(
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
): Promise<Partial<Record<PublicationTargetKey, string>>> {
  if (cachedPublicationIds) {
    return cachedPublicationIds;
  }

  const data = await graphql<{
    publications: {
      edges: Array<{
        node: Pick<Publication, "id" | "name"> & {
          catalog?: Pick<Catalog, "title"> | null;
        };
      }>;
    };
  }>(
    `#graphql
      query ProvisionPublications {
        publications(first: 50) {
          edges {
            node {
              id
              name
              catalog {
                title
              }
            }
          }
        }
      }
    `,
  );

  const ids: Partial<Record<PublicationTargetKey, string>> = {};
  for (const target of TARGET_PUBLICATIONS) {
    const match = data.publications.edges.find(({ node }) =>
      matchesPublicationTarget(node, target.tokens),
    );
    if (match) {
      ids[target.key] = match.node.id;
    }
  }

  const missing = TARGET_PUBLICATIONS.filter(
    (target) => !ids[target.key],
  ).map((target) => target.key);

  if (missing.length > 0) {
    console.warn(
      `⚠️ Provision: Could not find publication(s) for ${missing.join(
        ", ",
      )}. Demo product will skip publishing to these channels.`,
    );
  }

  cachedPublicationIds = ids;
  return ids;
}

async function ensureProductPublished(
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
  productId: string,
) {
  const publicationMap = await resolveTargetPublicationIds(graphql);
  const publicationIds = TARGET_PUBLICATIONS.map((target) => {
    const id = publicationMap[target.key];
    return id ?? null;
  }).filter((id): id is string => Boolean(id));

  if (publicationIds.length === 0) {
    return;
  }

  const productData = await graphql<{
    product?: {
      resourcePublications: {
        nodes: Array<{
          publication: Pick<Publication, "id" | "name">;
        }>;
      };
    };
  }>(
    `#graphql
      query ProvisionProductPublications($id: ID!) {
        product(id: $id) {
          resourcePublications(first: 50) {
            nodes {
              publication {
                id
                name
              }
            }
          }
        }
      }
    `,
    { id: productId },
  );

  const publishedIds = new Set(
    (productData.product?.resourcePublications.nodes ?? []).map(
      (node) => node.publication.id,
    ),
  );

  const missingPublicationIds = publicationIds.filter(
    (publicationId) => !publishedIds.has(publicationId),
  );

  if (missingPublicationIds.length === 0) {
    return;
  }

  const variables: MutationPublishablePublishArgs = {
    id: productId,
    input: missingPublicationIds.map((publicationId) => ({ publicationId })),
  };

  const publishResult = await graphql<{
    publishablePublish?: PublishablePublishPayload;
  }>(
    `#graphql
      mutation ProvisionPublishProduct(
        $id: ID!
        $input: [PublicationInput!]!
      ) {
        publishablePublish(id: $id, input: $input) {
          publishable {
            ... on Product {
              id
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

  const publishErrors = publishResult.publishablePublish?.userErrors ?? [];
  if (publishErrors.length > 0) {
    throw new Error(
      `Failed to publish product: ${publishErrors
        .map((error) => error.message)
        .join(", ")}`,
    );
  }
}

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  const [base] = trimmed.split("?");
  return base;
}

async function ensureProductImage(
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
  productId: string,
) {
  if (!PRODUCT_IMAGE_URL) {
    return;
  }

  const productData = await graphql<{
    product?: {
      images: {
        nodes: Array<{
          id?: string | null;
          url: string;
        }>;
      };
    };
  }>(
    `#graphql
      query ProvisionProductImages($id: ID!) {
        product(id: $id) {
          images(first: 10) {
            nodes {
              id
              url
            }
          }
        }
      }
    `,
    { id: productId },
  );

  const normalizedTargetUrl = normalizeImageUrl(PRODUCT_IMAGE_URL);
  const hasImage = Boolean(
    normalizedTargetUrl &&
      (productData.product?.images.nodes ?? []).some((image) =>
        normalizeImageUrl(image.url) === normalizedTargetUrl,
      ),
  );

  if (hasImage) {
    return;
  }

  const variables: MutationProductCreateMediaArgs = {
    productId,
    media: [
      {
        mediaContentType: "IMAGE",
        originalSource: PRODUCT_IMAGE_URL,
        alt: PRODUCT_IMAGE_ALT,
      },
    ],
  };

  const mediaResult = await graphql<{
    productCreateMedia?: ProductCreateMediaPayload;
  }>(
    `#graphql
      mutation ProvisionAttachProductImage(
        $productId: ID!
        $media: [CreateMediaInput!]!
      ) {
        productCreateMedia(productId: $productId, media: $media) {
          mediaUserErrors {
            field
            message
          }
        }
      }
    `,
    variables,
  );

  const mediaErrors = mediaResult.productCreateMedia?.mediaUserErrors ?? [];
  if (mediaErrors.length > 0) {
    throw new Error(
      `Failed to attach product image: ${mediaErrors
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

    await ensureProductPublished(graphql, product.id);
    await ensureProductImage(graphql, product.id);
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

  await ensureProductPublished(graphql, payload.product.id);
  await ensureProductImage(graphql, payload.product.id);

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
