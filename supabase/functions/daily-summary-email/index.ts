// DUKA POS - Daily Summary Email
// Triggered by pg_cron at 23:00 daily or via manual invocation

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    // Fetch admin email
    const { data: emailSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'admin_notification_email')
      .single();

    const adminEmail = emailSetting?.value;
    if (!adminEmail) {
      return new Response(JSON.stringify({ error: 'No admin email configured' }), { status: 400 });
    }

    // Today's sales
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount, payment_method, discount_amount')
      .eq('status', 'completed')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    const totalRevenue = sales?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
    const cashRevenue = sales?.filter(s => s.payment_method === 'cash').reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
    const mpesaRevenue = totalRevenue - cashRevenue;
    const totalSales = sales?.length ?? 0;
    const totalDiscounts = sales?.reduce((s, r) => s + Number(r.discount_amount), 0) ?? 0;

    // Top 5 products
    const { data: topProducts } = await supabase
      .from('sale_items')
      .select('product_name, quantity')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('quantity', { ascending: false })
      .limit(5);

    // Low stock
    const { data: lowStock } = await supabase
      .from('products')
      .select('name, current_stock, reorder_level')
      .eq('is_active', true)
      .is('deleted_at', null)
      .filter('current_stock', 'lte', 'reorder_level');

    // Shift discrepancies
    const { data: shifts } = await supabase
      .from('shifts')
      .select('cashier_id, cash_discrepancy, status')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .not('cash_discrepancy', 'is', null);

    const discrepancies = shifts?.filter(s => s.cash_discrepancy !== 0) ?? [];

    // Build email HTML (team insight: include most painful numbers in big font)
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1B5E20; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">DUKA POS Daily Summary</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">${today}</p>
      </div>
      <div style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="font-size: 42px; font-weight: bold; color: #1B5E20; margin: 0;">
            KSh ${totalRevenue.toLocaleString()}
          </p>
          <p style="color: #757575; margin: 4px 0 0;">Total Revenue (${totalSales} sales)</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #E0E0E0;">Cash Sales</td>
            <td style="padding: 8px; border-bottom: 1px solid #E0E0E0; text-align: right; font-weight: bold;">KSh ${cashRevenue.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #E0E0E0;">M-Pesa Sales</td>
            <td style="padding: 8px; border-bottom: 1px solid #E0E0E0; text-align: right; font-weight: bold;">KSh ${mpesaRevenue.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #E0E0E0;">Total Discounts</td>
            <td style="padding: 8px; border-bottom: 1px solid #E0E0E0; text-align: right; color: #F57F17;">KSh ${totalDiscounts.toLocaleString()}</td>
          </tr>
        </table>
        ${discrepancies.length > 0 ? `
        <div style="background: #FFEBEE; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #D32F2F; margin: 0 0 8px;">Cash Discrepancies</h3>
          ${discrepancies.map(d => `<p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #D32F2F;">KSh ${Number(d.cash_discrepancy).toLocaleString()}</p>`).join('')}
        </div>` : ''}
        ${topProducts && topProducts.length > 0 ? `
        <h3 style="margin-bottom: 8px;">Top Products</h3>
        <ol style="padding-left: 20px;">
          ${topProducts.map(p => `<li>${p.product_name} (${p.quantity} units)</li>`).join('')}
        </ol>` : ''}
        ${lowStock && lowStock.length > 0 ? `
        <div style="background: #FFF9C4; padding: 16px; border-radius: 8px; margin-top: 16px;">
          <h3 style="color: #F57F17; margin: 0 0 8px;">Low Stock Alerts</h3>
          <ul style="padding-left: 20px; margin: 0;">
            ${lowStock.map(p => `<li>${p.name}: ${p.current_stock} remaining (reorder at ${p.reorder_level})</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
      <div style="background: #F5F5F5; padding: 12px; text-align: center; color: #757575; font-size: 12px;">
        Sent by DUKA POS
      </div>
    </div>`;

    // Send via Resend (or any configured email provider)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'DUKA POS <noreply@duka.pos>',
          to: [adminEmail],
          subject: `Daily Summary - KSh ${totalRevenue.toLocaleString()} - ${today}`,
          html,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, revenue: totalRevenue, sales: totalSales }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
