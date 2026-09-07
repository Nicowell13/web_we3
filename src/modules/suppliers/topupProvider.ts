export interface TopUpProvider {
  /**
   * Check balance of the supplier account.
   * Returns raw response as JSON.
   */
  checkBalance(): Promise<any>;

  /**
   * Inquire details for a target account (e.g., game ID).
   */
  inquireAccount(targetId: string): Promise<any>;

  /** Validate PLN customer ID/meter and return supplier customer metadata. */
  inquirePln?(customerNo: string): Promise<any>;

  /**
   * Create order for a product.
   * @param productSku supplier SKU code
   * @param targetId   player/account identifier
   * @param amount     nominal amount (optional; many suppliers infer from SKU)
   */
  createOrder(productSku: string, targetId: string, amount?: number, orderRef?: string, maxPrice?: number): Promise<any>;

  /**
   * Check order status by supplier order reference.
   */
  checkOrderStatus(orderRef: string): Promise<any>;

  /** Fetch supplier product catalog for admin synchronization. */
  getProducts?(): Promise<any[]>;
}
