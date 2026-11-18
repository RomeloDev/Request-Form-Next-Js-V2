"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import RefreshButton from "@/components/ui/refresh-button";

export default function DashboardRefreshButton({
  label = "Refresh overview",
  showLabel = true,
}: {
  label?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <RefreshButton
      label={label}
      showLabel={showLabel}
      loading={pending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    />
  );
}
