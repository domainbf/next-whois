import type { NextApiRequest, NextApiResponse } from "next";
import { paypalCaptureOrder, markOrderPaid } from "@/lib/payment";
import { isDbReady, one } from "@/lib/db-query";

export const config = { maxDuration: 15 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await isDbReady())) return res.redirect(`/payment/result?status=error&msg=db`);

  const orderId = typeof req.query.order === "string" ? req.query.order : null;
  const paypalToken = typeof req.query.token === "string" ? req.query.token : null;

  if (!orderId) return res.redirect("/payment/result?status=cancel");

  try {
    const order = await one<{ id: string; status: string; provider_order_id: string | null }>(
      `SELECT id, status, provider_order_id FROM payment_orders WHERE id = $1`,
      [orderId]
    );

    if (!order) return res.redirect(`/payment/result?status=cancel`);
    if (order.status === "paid") return res.redirect(`/payment/result?order=${orderId}`);

    const paypalOrderId = paypalToken ?? order.provider_order_id;
    if (!paypalOrderId) return res.redirect(`/payment/result?order=${orderId}&status=cancel`);

    const { status, captureId } = await paypalCaptureOrder(paypalOrderId);

    if (status === "COMPLETED") {
      await markOrderPaid({
        orderId,
        providerOrderId: captureId || paypalOrderId,
        webhookRaw: JSON.stringify({ paypal_order_id: paypalOrderId, capture_id: captureId }),
      });
      console.log(`[paypal capture] Order ${orderId} paid — capture=${captureId}`);
    } else {
      console.warn(`[paypal capture] Order ${orderId} — PayPal status=${status}`);
    }
  } catch (err: any) {
    console.error("[paypal capture]", err.message);
  }

  return res.redirect(`/payment/result?order=${orderId}`);
}
