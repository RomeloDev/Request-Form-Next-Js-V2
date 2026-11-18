"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

export type ProtectedImageStatus =
  | "idle"
  | "loading"
  | "ready"
  | "missing"
  | "expired"
  | "error";

type LoadProtectedImage = (signal: AbortSignal) => Promise<Blob>;

/**
 * Load one owner-only image through its protected endpoint and expose a Blob
 * URL to the component. Every replaced, abandoned, and unmounted URL is
 * revoked. A 404 means "no stored file", never a successful sign-in.
 */
export function useProtectedImage(
  enabled: boolean,
  load: LoadProtectedImage,
) {
  const [status, setStatus] = useState<ProtectedImageStatus>(
    enabled ? "loading" : "idle",
  );
  const [url, setUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const urlRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const release = useCallback(() => {
    if (urlRef.current !== null) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }

    setUrl(null);
  }, []);

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    release();
    setStatus("idle");
  }, [release]);

  const reload = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    release();
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, [release]);

  useEffect(() => {
    if (!enabled) {
      // The section calls clear() before turning the flag off, so this only
      // protects against a future caller that forgets.
      if (urlRef.current !== null) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }

      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    load(controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;

        const objectUrl = URL.createObjectURL(blob);

        // The request may have been aborted while the blob was being read.
        if (controller.signal.aborted) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        if (urlRef.current !== null) {
          URL.revokeObjectURL(urlRef.current);
        }

        urlRef.current = objectUrl;
        setUrl(objectUrl);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 419)
        ) {
          setStatus("expired");
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setStatus("missing");
          return;
        }

        setStatus("error");
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      });

    return () => {
      controller.abort();
    };
  }, [attempt, enabled, load]);

  // Final safety net for unmounts.
  useEffect(
    () => () => {
      controllerRef.current?.abort();

      if (urlRef.current !== null) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    },
    [],
  );

  return { status, url, reload, clear };
}
