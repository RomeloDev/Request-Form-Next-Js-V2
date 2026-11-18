"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useProtectedImage } from "@/components/profile/use-protected-image";
import {
  getProfilePicture,
  PROFILE_PICTURE_CHANGED_EVENT,
} from "@/lib/profile";

/** Load the signed-in user's avatar through the protected profile endpoint. */
export default function AccountAvatar() {
  const { status, url, reload } = useProtectedImage(true, getProfilePicture);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPicture =
    status === "ready" && url !== null && failedUrl !== url;

  useEffect(() => {
    const refresh = () => reload();

    window.addEventListener(PROFILE_PICTURE_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(PROFILE_PICTURE_CHANGED_EVENT, refresh);
    };
  }, [reload]);

  return (
    <span
      aria-hidden="true"
      className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-50 text-brand"
    >
      {showPicture && url !== null ? (
        <Image
          src={url}
          alt=""
          width={72}
          height={72}
          unoptimized
          onError={() => setFailedUrl(url)}
          className="size-full object-cover"
        />
      ) : (
        <Icon name="profile" className="size-6" />
      )}
    </span>
  );
}
