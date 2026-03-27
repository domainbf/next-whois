import { useEffect } from "react";
import { useRouter } from "next/router";

export default function NavRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/directory");
  }, [router]);
  return null;
}
