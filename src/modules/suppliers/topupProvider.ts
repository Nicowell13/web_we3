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

  /**
   * Create order for a product.
   * @param productSku supplier SKU code
   * @param targetId   player/account identifier
   * @param amount     nominal amount (optional; many suppliers infer from SKU)
   */
  createOrder(productSku: string, targetId: string, amount?: number): Promise<any>;

  /**
   * Check order status by supplier order reference.
   */
  checkOrderStatus(orderRef: string): Promise<any>;
}
