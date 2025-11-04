import shopify from "../app/shopify.server";

async function main() {
  const shop = process.env.SHOP ?? process.env.SHOPIFY_SHOP;
  if (!shop) {
    throw new Error("Provide SHOP env var");
  }
  const { admin } = await shopify.unauthenticated.admin(shop);
  const response = await admin.graphql(
    `#graphql
      query DebugDeliveryProfiles {
        deliveryProfiles(first: 5) {
          edges {
            node {
              id
              name
              default
              profileLocationGroups {
                locationGroup {
                  id
                  name
                }
                locationGroupZones(first: 5) {
                  edges {
                    node {
                      zone {
                        name
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
  );
  const json = await response.json();
  console.log(JSON.stringify(json, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
