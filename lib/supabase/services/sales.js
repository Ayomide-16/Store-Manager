
/**
 * Sales Management Service
 * 
 * Handles recording sales and retrieving transaction history.
 * Note: Stock updates are handled by a Database Trigger on the backend.
 */

import { supabase } from '../client'

/**
 * Create a new sale with its line items
 * 
 * @param {Object} saleData - The main sale record
 * @param {Array} items - Array of sale items
 */
export async function recordSale(saleData, items) {
  try {
    // 1. Insert the main sale record
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        sale_number: saleData.saleNumber,
        status: 'completed',
        subtotal: saleData.subtotal,
        additional_charges: saleData.additionalCharges,
        total_amount: saleData.totalAmount,
        profit_amount: saleData.profitAmount,
        payment_method: saleData.paymentMethod,
        created_by: saleData.createdBy,
        sale_date: new Date().toISOString()
      })
      .select()
      .single()

    if (saleError) throw saleError

    // 2. Prepare line items
    const lineItems = items.map(item => ({
      sale_id: sale.id,
      item_id: item.id,
      item_name: item.name,
      quantity: item.cartQuantity,
      unit_price: item.sellingPrice,
      cost_price: item.costPrice,
      line_total: item.sellingPrice * item.cartQuantity,
      profit_margin: ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100
    }))

    // 3. Insert line items
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(lineItems)

    if (itemsError) throw itemsError

    return { data: sale, error: null }
  } catch (error) {
    console.error('Record sale error:', error)
    return { data: null, error }
  }
}

/**
 * Fetch sales history
 */
export async function fetchSales() {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}
