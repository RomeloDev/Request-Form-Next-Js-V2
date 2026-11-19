"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useProtectedImage } from "@/components/profile/use-protected-image";
import {
  loadAdminUserProfilePicture,
  loadAdminUserSignature,
} from "@/lib/admin/users";

type AdminUserProtectedMediaProps = {
  userId: number;
  available: boolean;
  kind: "photo" | "signature";
  onSessionExpired: () => void;
};

export default function AdminUserProtectedMedia({
  userId,
  available,
  kind,
  onSessionExpired,
}: AdminUserProtectedMediaProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const load = useCallback(
    (signal: AbortSignal) =>
      kind === "photo"
        ? loadAdminUserProfilePicture(userId, signal)
        : loadAdminUserSignature(userId, signal),
    [kind, userId],
  );
  const image = useProtectedImage(available, load);

  useEffect(() => {
    if (image.status === "expired") {
      onSessionExpired();
    }
  }, [image.status, onSessionExpired]);

  const isPhoto = kind === "photo";
  const containerClass = isPhoto
    ? "grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-slate-50"
    : "grid min-h-40 w-full place-items-center overflow-hidden rounded-xl border border-line bg-white";
  const fallbackClass = `${containerClass} border-dashed p-4 text-center text-sm leading-6 text-muted`;

  if (!available || image.status === "idle") {
    return (
      <div className={fallbackClass}>
        {isPhoto ? "No photo" : "No signature provided"}
      </div>
    );
  }

  if (image.status === "loading") {
    return (
      <div role="status" className={fallbackClass}>
        {isPhoto ? "Loading photo…" : "Loading signature…"}
      </div>
    );
  }

  if (image.status === "missing") {
    return (
      <div className={fallbackClass}>
        {isPhoto ? "Photo not found" : "Signature not found"}
      </div>
    );
  }

  if (image.status === "expired") {
    return (
      <div role="status" className={fallbackClass}>
        Session expired. Redirecting…
      </div>
    );
  }

  const decodeFailed = image.url !== null && failedUrl === image.url;

  if (image.status === "error" || decodeFailed || image.url === null) {
    return (
      <div className={fallbackClass}>
        <div>
          <p>{isPhoto ? "Photo unavailable" : "Signature unavailable"}</p>
          <button
            type="button"
            onClick={() => {
              setFailedUrl(null);
              image.reload();
            }}
            className="mt-2 min-h-11 rounded-lg px-3 font-semibold text-brand underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <Image
        unoptimized
        src={image.url}
        width={isPhoto ? 96 : 600}
        height={isPhoto ? 96 : 200}
        alt={isPhoto ? "User profile photo" : "User signature"}
        onError={() => setFailedUrl(image.url)}
        className={
          isPhoto
            ? "size-24 object-cover"
            : "h-40 w-full select-none object-contain p-3"
        }
        draggable={false}
      />
    </div>
  );
}
