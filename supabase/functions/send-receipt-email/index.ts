// DUKA POS - Send Receipt Email
// Sends sale receipt to admin email after each sale

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ReceiptRequest {
  sale_id: string;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { sale_id } = (await req.json()) as ReceiptRequest;

    // Fetch sale with items
    const { data: sale } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(*),
        cashier:users!cashier_id(full_name)
      `)
      .eq('id', sale_id)
      .single();

    if (!sale) {
      return new Response(JSON.stringify({ error: 'Sale not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch store settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['store_name', 'store_address', 'store_phone', 'admin_notification_email']);

    const config: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => { config[s.key] = s.value; });

    const adminEmail = config.admin_notification_email;
    if (!adminEmail) {
      return new Response(JSON.stringify({ error: 'No admin email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentLabel = sale.payment_method === 'cash' ? 'Cash' : 'M-Pesa';
    const dateStr = new Date(sale.created_at).toLocaleString('en-KE');

    const itemRows = (sale.items || []).map((item: any) =>
      `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.product_name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">KSh ${Number(item.unit_price).toLocaleString()}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">KSh ${Number(item.line_total).toLocaleString()}</td>
      </tr>`
    ).join('');

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">
      <div style="background:#1B5E20;color:white;padding:16px;text-align:center;">
        <h2 style="margin:0;">${config.store_name || 'DUKA POS'}</h2>
        ${config.store_address ? `<p style="margin:4px 0 0;font-size:12px;opacity:0.8;">${config.store_address}</p>` : ''}
        ${config.store_phone ? `<p style="margin:2px 0 0;font-size:12px;opacity:0.8;">Tel: ${config.store_phone}</p>` : ''}
      </div>
      <div style="padding:16px;">
        <table style="width:100%;font-size:13px;margin-bottom:12px;">
          <tr><td style="color:#757575;">Receipt #</td><td style="text-align:right;font-weight:bold;">${sale.receipt_number}</td></tr>
          <tr><td style="color:#757575;">Date</td><td style="text-align:right;">${dateStr}</td></tr>
          <tr><td style="color:#757575;">Cashier</td><td style="text-align:right;">${sale.cashier?.full_name || '-'}</td></tr>
          <tr><td style="color:#757575;">Payment</td><td style="text-align:right;">${paymentLabel}</td></tr>
          ${sale.mpesa_ref ? `<tr><td style="color:#757575;">M-Pesa Ref</td><td style="text-align:right;">${sale.mpesa_ref}</td></tr>` : ''}
        </table>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <thead>
            <tr style="background:#F5F5F5;">
              <th style="padding:8px;text-align:left;">Item</th>
              <th style="padding:8px;text-align:center;">Qty</th>
              <th style="padding:8px;text-align:right;">Price</th>
              <th style="padding:8px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="margin-top:12px;border-top:2px solid #1B5E20;padding-top:12px;">
          <table style="width:100%;font-size:13px;">
            <tr><td>Subtotal</td><td style="text-align:right;">KSh ${Number(sale.subtotal).toLocaleString()}</td></tr>
            ${Number(sale.discount_amount) > 0 ? `<tr><td style="color:#F57F17;">Discount</td><td style="text-align:right;color:#F57F17;">-KSh ${Number(sale.discount_amount).toLocaleString()}</td></tr>` : ''}
            <tr><td style="font-size:18px;font-weight:bold;">TOTAL</td><td style="text-align:right;font-size:18px;font-weight:bold;color:#1B5E20;">KSh ${Number(sale.total_amount).toLocaleString()}</td></tr>
          </table>
        </div>
        <p style="text-align:center;color:#757575;font-size:12px;margin-top:16px;">Thank you for shopping with us.</p>
      </div>
    </div>`;

    // Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${config.store_name || 'DUKA POS'} <noreply@duka.pos>`,
          to: [adminEmail],
          subject: `Receipt ${sale.receipt_number} - KSh ${Number(sale.total_amount).toLocaleString()}`,
          html,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
