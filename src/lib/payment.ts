import { randomBytes, createHash, createHmac } from "crypto";
import { run, one, many } from "@/lib/db-query";

export type PaymentProvider = "stripe" | "xunhupay" | "alipay";
export type OrderStatus = "pending" | "paid" | "failed" | "expired" | "refunded";

export interface PaymentPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number | null;
  is_recurring: boolean;
  grants_subscription: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface PaymentOrder {
  id: string;
  user_id: string | null;
  user_email: string;
  plan_id: string | null;
  plan_name: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  provider_order_id: string | null;
  status: OrderStatus;
  paid_at: string | null;
  created_at: string;
}

export function genOrderId(): string {
  return randomBytes(12).toString("hex").toUpperCase();
}

export async function getActivePlans(): Promise<PaymentPlan[]> {
  const rows = await many<PaymentPlan>(
    `SELECT id, name, description, price::float AS price, currency,
            duration_days, is_recurring, grants_subscription, is_active, sort_order
     FROM payment_plans WHERE is_active = true ORDER BY sort_order ASC, price ASC`
  );
  return rows;
}

export async function createOrder(params: {
  userId: string | null;
  userEmail: string;
  planId: string;
  provider: PaymentProvider;
}): Promise<{ order: PaymentOrder; plan: PaymentPlan }> {
  const plan = await one<PaymentPlan>(
    `SELECT id, name, description, price::float AS price, currency,
            duration_days, is_recurring, grants_subscription, is_active, sort_order
     FROM payment_plans WHERE id = $1 AND is_active = true`,
    [params.planId]
  );
  if (!plan) throw new Error("套餐不存在或已下线");

  const id = genOrderId();
  const expiredAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min to pay

  await run(
    `INSERT INTO payment_orders
       (id, user_id, user_email, plan_id, plan_name, amount, currency, provider, status, expired_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)`,
    [id, params.userId, params.userEmail, plan.id, plan.name,
     plan.price, plan.currency, params.provider, expiredAt.toISOString()]
  );

  const order = await one<PaymentOrder>(
    `SELECT id, user_id, user_email, plan_id, plan_name, amount::float AS amount,
            currency, provider, provider_order_id, status, paid_at, created_at
     FROM payment_orders WHERE id = $1`,
    [id]
  );
  return { order: order!, plan };
}

export async function markOrderPaid(params: {
  orderId: string;
  providerOrderId?: string;
  webhookRaw?: string;
}): Promise<{ alreadyPaid: boolean; userEmail: string; grantsSubscription: boolean }> {
  const order = await one<{
    id: string; status: string; user_id: string | null;
    user_email: string; plan_id: string | null;
  }>(
    `SELECT id, status, user_id, user_email, plan_id FROM payment_orders WHERE id = $1`,
    [params.orderId]
  );
  if (!order) throw new Error("订单不存在");
  if (order.status === "paid") return { alreadyPaid: true, userEmail: order.user_email, grantsSubscription: false };

  await run(
    `UPDATE payment_orders
     SET status='paid', paid_at=NOW(),
         provider_order_id=COALESCE($2, provider_order_id),
         webhook_raw=COALESCE($3, webhook_raw)
     WHERE id=$1`,
    [params.orderId, params.providerOrderId ?? null, params.webhookRaw ?? null]
  );

  let grantsSubscription = false;
  if (order.plan_id) {
    const plan = await one<{ grants_subscription: boolean }>(
      `SELECT grants_subscription FROM payment_plans WHERE id = $1`,
      [order.plan_id]
    );
    grantsSubscription = plan?.grants_subscription ?? false;
  }

  if (grantsSubscription && order.user_id) {
    await run(
      `UPDATE users SET subscription_access = TRUE, updated_at = NOW() WHERE id = $1`,
      [order.user_id]
    );
  } else if (grantsSubscription && order.user_email) {
    await run(
      `UPDATE users SET subscription_access = TRUE, updated_at = NOW() WHERE email = $1`,
      [order.user_email]
    );
  }

  await run(
    `INSERT INTO sponsors (id, name, avatar_url, amount, currency, message, sponsor_date, is_anonymous, is_visible, platform)
     VALUES ($1, $2, NULL, $3, $4, $5, CURRENT_DATE, false, false, $6)
     ON CONFLICT DO NOTHING`,
    [
      randomBytes(8).toString("hex"),
      order.user_email,
      (await one<{ amount: string }>(`SELECT amount FROM payment_orders WHERE id=$1`, [params.orderId]))?.amount ?? 0,
      "CNY",
      "通过支付系统赞助",
      order.plan_id ?? "payment",
    ]
  );

  return { alreadyPaid: false, userEmail: order.user_email, grantsSubscription };
}

export async function getOrderById(orderId: string): Promise<PaymentOrder | null> {
  return one<PaymentOrder>(
    `SELECT id, user_id, user_email, plan_id, plan_name, amount::float AS amount,
            currency, provider, provider_order_id, status, paid_at, created_at
     FROM payment_orders WHERE id = $1`,
    [orderId]
  );
}

export function xunhupaySign(params: Record<string, string>, appSecret: string): string {
  const sorted = Object.keys(params)
    .filter(k => k !== "sign" && params[k] !== "")
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join("&");
  return createHash("md5").update(sorted + appSecret).digest("hex");
}

export function verifyXunhupayWebhook(body: Record<string, string>, appSecret: string): boolean {
  const { sign, ...rest } = body;
  if (!sign) return false;
  const expected = xunhupaySign(rest, appSecret);
  return sign.toLowerCase() === expected.toLowerCase();
}

export function verifyStripeWebhookSignature(
  payload: string,
  sigHeader: string,
  secret: string
): boolean {
  try {
    const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, p) => {
      const [k, v] = p.split("=");
      acc[k.trim()] = v?.trim() ?? "";
      return acc;
    }, {});
    const timestamp = parts["t"];
    const signatures = Object.entries(parts)
      .filter(([k]) => k === "v1")
      .map(([, v]) => v);
    if (!timestamp || signatures.length === 0) return false;
    const signedPayload = `${timestamp}.${payload}`;
    const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
    return signatures.some(s => s === expected);
  } catch {
    return false;
  }
}

export function verifyAlipaySign(
  params: Record<string, string>,
  publicKey: string
): boolean {
  const { sign, sign_type, ...rest } = params;
  if (!sign) return false;
  const sorted = Object.keys(rest)
    .filter(k => rest[k] !== "" && rest[k] !== undefined)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join("&");
  try {
    const { createVerify } = require("crypto");
    const verify = createVerify("RSA-SHA256");
    verify.update(sorted);
    const pubKey = publicKey.includes("BEGIN") ? publicKey :
      `-----BEGIN PUBLIC KEY-----\n${publicKey.match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`;
    return verify.verify(pubKey, sign, "base64");
  } catch {
    return false;
  }
}
