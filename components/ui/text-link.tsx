import Link from "next/link";
import type { ComponentProps } from "react";

export default function TextLink({ children, className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      prefetch={false}
      {...props}
      className={`inline-flex min-h-11 items-center rounded px-1 text-base leading-7 font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${className}`}
    >
      {children}
    </Link>
  );
}
