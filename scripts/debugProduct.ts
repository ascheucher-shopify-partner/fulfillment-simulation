import shopify from "../app/shopify.server";

async function main() {
  const shop = process.env.SHOP ?? process.env.SHOPIFY_SHOP;
  if (!shop) {
    throw new Error("Provide SHOP env var");
  }
  const { admin } = await shopify.unauthenticated.admin(shop);
  const response = await admin.graphql(
    `#graphql
      query DebugProduct($handle: String!) {
        productByHandle(handle: $handle) {
          id
          title
          totalInventory
          tracksInventory
          variants(first: 5) {
            edges {
              node {
                id
                title
                availableForSale
                inventoryQuantity
                sellableOnlineQuantity
                sku
                inventoryItem {
                  id
                  tracked
                  inventoryLevels(first: 10) {
                    edges {
                      node {
                        id
                        location {
                          id
                          name
                          isActive
                          shipsInventory
                          fulfillsOnlineOrders
                          legacyResourceId
                        }
                        quantities(names: ["available", "committed", "on_hand"]) {
                          name
                          quantity
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        handle: process.env.HANDLE ?? "demo-fulfillment-product",
      },
    },
  );
  const json = await response.json();
  console.log(JSON.stringify(json, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
