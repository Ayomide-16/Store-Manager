
/**
 * POS Withdrawal Service
 * 
 * Manages daily cash floats and customer withdrawal transactions.
 */

import { supabase } from '../client'

/**
 * Start a new POS float for the day
 */
export async function startPosFloat(openingBalance, userId) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('pos_floats')
      .insert({
        date: today,
        opening_balance: openingBalance,
        current_balance: openingBalance,
        status: 'active',
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Start POS float error:', error)
    return { data: null, error }
  }
}

/**
 * Record a POS withdrawal
 */
export async function recordPosWithdrawal(txData) {
  try {
    const { data, error } = await supabase
      .from('pos_transactions')
      .insert({
        float_id: txData.floatId,
        transaction_number: txData.transactionNumber,
        customer_name: txData.customerName,
        withdrawal_amount: txData.withdrawalAmount,
        service_charge: txData.serviceCharge,
        total_paid: txData.totalPaid,
        payment_method: txData.paymentMethod,
        created_by: txData.createdBy,
        transaction_date: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    
    // The current balance update is handled by a database trigger
    return { data, error: null }
  } catch (error) {
    console.error('Record POS withdrawal error:', error)
    return { data: null, error }
  }
}
