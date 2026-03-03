// DUKA POS - M-Pesa C2B Confirmation
// Receives payment confirmation when customer pays to Till number

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();

    // Log every C2B callback (team insight: life-saver for reconciliation)
    await supabase.from('audit_log').insert({
      action: 'mpesa_c2b_confirmation',
      entity_type: 'mpesa',
      new_values: body,
    });

    const {
      TransID,        // M-Pesa receipt number
      TransAmount,    // Amount paid
      BillRefNumber,  // Account reference (receipt number entered by customer)
      MSISDN,         // Customer phone
      TransTime,
    } = body;

    const amount = parseFloat(TransAmount);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Team insight: Match by account reference (receipt number) first, then fall back to amount + time window
    // Never match on amount alone — dangerous for matching bugs
    let sale = null;

    // Strategy 1: Match by BillRefNumber (receipt_number)
    if (BillRefNumber) {
      const { data } = await supabase
        .from('sales')
        .select('id, total_amount, receipt_number')
        .eq('receipt_number', BillRefNumber)
        .eq('payment_status', 'pending')
        .eq('payment_method', 'mpesa_till')
        .single();
      sale = data;
    }

    // Strategy 2: Match by amount + time window (fallback only)
    if (!sale) {
      const { data } = await supabase
        .from('sales')
        .select('id, total_amount, receipt_number')
        .eq('total_amount', amount)
        .eq('payment_status', 'pending')
        .eq('payment_method', 'mpesa_till')
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      sale = data;
    }

    if (sale) {
      // Verify amount matches (or is close enough — within KSh 1 for rounding)
      if (Math.abs(sale.total_amount - amount) <= 1) {
        await supabase
          .from('sales')
          .update({
            payment_status: 'completed',
            status: 'completed',
            mpesa_ref: TransID,
            mpesa_phone: MSISDN,
            completed_at: new Date().toISOString(),
          })
          .eq('id', sale.id);

        await supabase.from('audit_log').insert({
          action: 'mpesa_c2b_payment_matched',
          entity_type: 'sale',
          entity_id: sale.id,
          new_values: { TransID, amount, MSISDN, BillRefNumber, receipt_number: sale.receipt_number },
        });
      } else {
        // Amount mismatch
        await supabase.from('audit_log').insert({
          action: 'mpesa_c2b_amount_mismatch',
          entity_type: 'sale',
          entity_id: sale.id,
          new_values: { TransID, paid: amount, expected: sale.total_amount, MSISDN, BillRefNumber },
        });
      }
    } else {
      // Unmatched payment — log for manual reconciliation
      await supabase.from('audit_log').insert({
        action: 'mpesa_c2b_unmatched',
        entity_type: 'mpesa',
        new_values: { TransID, amount, MSISDN, BillRefNumber, TransTime },
      });
    }

    // Safaricom expects C2B confirmation response
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
});
