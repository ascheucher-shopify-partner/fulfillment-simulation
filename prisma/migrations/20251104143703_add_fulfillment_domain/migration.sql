-- CreateTable
CREATE TABLE "ShopifyOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "name" TEXT,
    "customerFirstName" TEXT,
    "customerLastName" TEXT,
    "customerEmail" TEXT,
    "currencyCode" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FulfillmentOrderRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "assignedLocationId" TEXT,
    "status" TEXT NOT NULL,
    "requestStatus" TEXT NOT NULL,
    "supportedActionsJson" TEXT,
    "fulfillAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FulfillmentOrderRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopifyOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FulfillmentStateSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT NOT NULL,
    "orderStatus" TEXT,
    "orderFinancialStatus" TEXT,
    "fulfillmentOrderStatus" TEXT,
    "fulfillmentRequestStatus" TEXT,
    "fulfillmentStatus" TEXT,
    "lastShopifySyncAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FulfillmentStateSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopifyOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FulfillmentStateSnapshot_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "FulfillmentOrderRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FulfillmentTransitionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT,
    "kind" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "previousState" TEXT,
    "nextState" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FulfillmentTransitionLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopifyOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FulfillmentTransitionLog_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "FulfillmentOrderRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FulfillmentOrderRecord_orderId_idx" ON "FulfillmentOrderRecord"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentStateSnapshot_orderId_fulfillmentOrderId_key" ON "FulfillmentStateSnapshot"("orderId", "fulfillmentOrderId");

-- CreateIndex
CREATE INDEX "FulfillmentTransitionLog_orderId_idx" ON "FulfillmentTransitionLog"("orderId");

-- CreateIndex
CREATE INDEX "FulfillmentTransitionLog_fulfillmentOrderId_idx" ON "FulfillmentTransitionLog"("fulfillmentOrderId");

-- CreateIndex
CREATE INDEX "FulfillmentTransitionLog_kind_idx" ON "FulfillmentTransitionLog"("kind");
