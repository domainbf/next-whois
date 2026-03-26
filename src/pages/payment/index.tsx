import { useEffect } from "react";
import { useRouter } from "next/router";
import { RiLoader4Line } from "@remixicon/react";

export default function PaymentIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/payment/checkout");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}
