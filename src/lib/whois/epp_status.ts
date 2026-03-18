export type EppStatusCategory =
  | "ok"
  | "client"
  | "server"
  | "pending"
  | "grace"
  | "redemption";

export type EppStatusInfo = {
  description: string;
  descriptionZh: string;
  category: EppStatusCategory;
  displayName: string;
};

const categoryColors: Record<EppStatusCategory, string> = {
  ok: "#10b981",
  client: "#3b82f6",
  server: "#8b5cf6",
  pending: "#f59e0b",
  grace: "#0ea5e9",
  redemption: "#ef4444",
};

const categoryLabels: Record<EppStatusCategory, string> = {
  ok: "Active",
  client: "Client Lock",
  server: "Server Lock",
  pending: "Pending",
  grace: "Grace Period",
  redemption: "Redemption",
};

const EPP_STATUS_MAP: Record<string, EppStatusInfo> = {
  ok: {
    displayName: "ok",
    description:
      "This is the standard status for a domain, meaning no pending operations or prohibitions.",
    descriptionZh: "域名处于标准状态，无待处理操作或禁止项。",
    category: "ok",
  },
  active: {
    displayName: "active",
    description: "The domain is active and delegated in the DNS.",
    descriptionZh: "域名已激活并在 DNS 中正常委派解析。",
    category: "ok",
  },
  inactive: {
    displayName: "inactive",
    description:
      "The domain has not been delegated in the DNS and will not resolve.",
    descriptionZh: "域名未在 DNS 中委派，无法解析。",
    category: "redemption",
  },
  addperiod: {
    displayName: "addPeriod",
    description:
      "Initial registration grace period. The domain can be deleted for a refund within a few days of registration.",
    descriptionZh: "初始注册宽限期。注册后数日内可删除域名并获得退款。",
    category: "grace",
  },
  autorenewperiod: {
    displayName: "autoRenewPeriod",
    description:
      "Auto-renewal grace period after automatic renewal. Registrar may delete registration for a refund.",
    descriptionZh: "自动续费后的宽限期。注册商可删除注册以获得退款。",
    category: "grace",
  },
  renewperiod: {
    displayName: "renewPeriod",
    description:
      "Renewal grace period. The registrar may delete the registration for a refund.",
    descriptionZh: "续费宽限期。注册商可在此期间删除注册以获得退款。",
    category: "grace",
  },
  transferperiod: {
    displayName: "transferPeriod",
    description:
      "Transfer grace period after a successful transfer. The new registrar may delete for a refund.",
    descriptionZh: "转移成功后的宽限期。新注册商可在此期间删除域名以获得退款。",
    category: "grace",
  },
  clientdeleteprohibited: {
    displayName: "clientDeleteProhibited",
    description:
      "The registrar has set this status to prevent the domain from being deleted.",
    descriptionZh: "注册商已设置此状态，禁止删除该域名。",
    category: "client",
  },
  clienthold: {
    displayName: "clientHold",
    description:
      "The registrar has suspended the domain. It will not resolve in the DNS.",
    descriptionZh: "注册商已暂停该域名，域名将无法在 DNS 中解析。",
    category: "client",
  },
  clientrenewprohibited: {
    displayName: "clientRenewProhibited",
    description: "The registrar has locked the domain to prevent renewal.",
    descriptionZh: "注册商已锁定该域名，禁止续费。",
    category: "client",
  },
  clienttransferprohibited: {
    displayName: "clientTransferProhibited",
    description:
      "The registrar has locked the domain to prevent transfer to another registrar.",
    descriptionZh: "注册商已锁定该域名，禁止转移至其他注册商。",
    category: "client",
  },
  clientupdateprohibited: {
    displayName: "clientUpdateProhibited",
    description:
      "The registrar has locked the domain to prevent any changes to the domain record.",
    descriptionZh: "注册商已锁定该域名，禁止修改域名记录。",
    category: "client",
  },
  serverdeleteprohibited: {
    displayName: "serverDeleteProhibited",
    description:
      "The registry has set this status to prevent the domain from being deleted.",
    descriptionZh: "注册局已设置此状态，禁止删除该域名。",
    category: "server",
  },
  serverhold: {
    displayName: "serverHold",
    description:
      "The registry has suspended the domain. It will not resolve in the DNS.",
    descriptionZh: "注册局已暂停该域名，域名将无法在 DNS 中解析。",
    category: "server",
  },
  serverrenewprohibited: {
    displayName: "serverRenewProhibited",
    description: "The registry has locked the domain to prevent renewal.",
    descriptionZh: "注册局已锁定该域名，禁止续费。",
    category: "server",
  },
  servertransferprohibited: {
    displayName: "serverTransferProhibited",
    description: "The registry has locked the domain to prevent transfer.",
    descriptionZh: "注册局已锁定该域名，禁止转移。",
    category: "server",
  },
  serverupdateprohibited: {
    displayName: "serverUpdateProhibited",
    description: "The registry has locked the domain to prevent any changes.",
    descriptionZh: "注册局已锁定该域名，禁止任何修改。",
    category: "server",
  },
  pendingcreate: {
    displayName: "pendingCreate",
    description:
      "A request to create the domain has been received and is being processed.",
    descriptionZh: "域名创建请求已收到，正在处理中。",
    category: "pending",
  },
  pendingdelete: {
    displayName: "pendingDelete",
    description:
      "The domain is scheduled for deletion. It cannot be restored and will be purged soon.",
    descriptionZh: "域名已被计划删除，无法恢复，即将被清除。",
    category: "pending",
  },
  pendingrenew: {
    displayName: "pendingRenew",
    description:
      "A request to renew the domain has been received and is being processed.",
    descriptionZh: "域名续费请求已收到，正在处理中。",
    category: "pending",
  },
  pendingrestore: {
    displayName: "pendingRestore",
    description:
      "A restore request has been received after redemption period. Pending registry approval.",
    descriptionZh: "赎回期后已收到恢复请求，等待注册局审批。",
    category: "pending",
  },
  pendingtransfer: {
    displayName: "pendingTransfer",
    description:
      "A transfer request has been received and is pending approval or rejection.",
    descriptionZh: "转移请求已收到，等待批准或拒绝。",
    category: "pending",
  },
  pendingupdate: {
    displayName: "pendingUpdate",
    description:
      "A request to update the domain has been received and is being processed.",
    descriptionZh: "域名更新请求已收到，正在处理中。",
    category: "pending",
  },
  redemptionperiod: {
    displayName: "redemptionPeriod",
    description:
      "The domain has been deleted but can still be restored by the registrar for an additional fee.",
    descriptionZh: "域名已被删除，但注册商仍可付费恢复。",
    category: "redemption",
  },
};

export function getEppStatusInfo(status: string): EppStatusInfo | null {
  const normalized = status.toLowerCase().replace(/[\s_-]/g, "");
  return EPP_STATUS_MAP[normalized] || null;
}

export function getEppStatusColor(status: string): string {
  const info = getEppStatusInfo(status);
  if (!info) return "#71717a";
  return categoryColors[info.category];
}

export function getEppStatusDisplayName(status: string): string {
  const info = getEppStatusInfo(status);
  if (!info) return status;
  return info.displayName;
}

export function getEppStatusLink(status: string): string {
  const info = getEppStatusInfo(status);
  if (!info) return "https://icann.org/epp";
  return `https://icann.org/epp#${info.displayName}`;
}

export function getEppStatusLabel(status: string): string {
  const info = getEppStatusInfo(status);
  if (!info) return "Unknown";
  return categoryLabels[info.category];
}

export function getEppStatusDescription(
  status: string,
  locale: string,
): string | null {
  const info = getEppStatusInfo(status);
  if (!info) return null;
  if (locale === "zh" || locale === "zh-tw") return info.descriptionZh;
  return info.description;
}

export { categoryColors, categoryLabels };
