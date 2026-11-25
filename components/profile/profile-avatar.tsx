"use client";

import Image from "next/image";
import { useState } from "react";

function initialsFrom(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";

  const first = Array.from(parts[0])[0] ?? "";
  const last =
    parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";

  return `${first}${last}`.toUpperCase();
}

/**
 * Safe avatar with an initials fallback. The only accepted source is a Blob
 * URL created from the protected profile-picture endpoint (or a local
 * preview of a file the user just selected). A failed decode also falls back
 * to initials instead of leaving a broken image.
 */
export default function ProfileAvatar({
  name,
  imageUrl,
  alt,
}: {
  name: string;
  imageUrl: string | null;
  alt?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = imageUrl !== null && failedUrl !== imageUrl;

  return (
    <div
      role={showImage ? undefined : "img"}
      aria-label={showImage ? undefined : `Initials avatar for ${name}`}
      className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-2xl font-semibold text-brand sm:size-28"
    >
      {showImage ? (
        <Image
          src={imageUrl}
          alt={alt ?? `Profile picture of ${name}`}
          width={256}
          height={256}
          unoptimized
          onError={() => {
            setFailedUrl(imageUrl);
          }}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initialsFrom(name)}</span>
      )}
    </div>
  );
}
