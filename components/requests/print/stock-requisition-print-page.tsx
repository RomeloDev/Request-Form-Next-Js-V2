"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  getPrintableSignature,
  type PrintablePerson,
  type PrintableRequest,
} from "@/lib/requests/printable-requests";
import styles from "./stock-requisition-print.module.css";

type SignatureUrls = Record<number, string>;

const brandLogos: Record<string, string> = {
  "Strong Moto Centrum, Inc.": "/brand/print/SMCT.png",
  "Des Strong Motors, Inc.": "/brand/print/DSM.jpg",
  "Des Appliance Plaza, Inc.": "/brand/print/DAP.jpg",
  "Honda Des, Inc.": "/brand/print/HDI.jpg",
  "Head Office": "/brand/print/logo.png",
};

function fullName(person: PrintablePerson): string {
  return `${person.firstname} ${person.lastname}`.trim();
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatAmount(value: string, currency: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return value;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function signaturePeople(data: PrintableRequest): PrintablePerson[] {
  const people = [data.requester];

  for (const step of data.approval_steps) {
    if (
      step.status === "Approved" &&
      !people.some((person) => person.id === step.approver.id)
    ) {
      people.push(step.approver);
    }
  }

  return people;
}

async function waitForDocumentImages(): Promise<void> {
  await document.fonts.ready;

  const images = Array.from(document.images);

  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), {
            once: true,
          });
          image.addEventListener("error", () => resolve(), {
            once: true,
          });
        });
      }

      await image.decode().catch(() => undefined);
    }),
  );
}

function SignatureEntry({
  person,
  signatureUrl,
}: {
  person: PrintablePerson;
  signatureUrl?: string;
}) {
  return (
    <div className="relative mr-10 flex flex-col items-center justify-center pt-3">
      {signatureUrl && (
        <Image
          src={signatureUrl}
          alt=""
          width={120}
          height={120}
          unoptimized
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-6 transform"
        />
      )}
      <p className="relative z-10 text-center text-xs font-medium underline">
        {fullName(person)}
      </p>
      <p className="text-center text-xs font-light">
        {person.position ?? ""}
      </p>
    </div>
  );
}

export default function StockRequisitionPrintPage({
  data,
}: {
  data: PrintableRequest;
}) {
  const router = useRouter();
  const autoPrintStarted = useRef(false);
  const [signatureUrls, setSignatureUrls] =
    useState<SignatureUrls>({});
  const [signaturesReady, setSignaturesReady] = useState(false);
  const [message, setMessage] = useState("");

  const notedBy = useMemo(
    () =>
      data.approval_steps
        .filter((step) => step.step_type === "noted_by")
        .map((step) => step.approver),
    [data.approval_steps],
  );
  const approvedBy = useMemo(
    () =>
      data.approval_steps
        .filter((step) => step.step_type !== "noted_by")
        .map((step) => step.approver),
    [data.approval_steps],
  );
  const logo = brandLogos[data.branch.branch];

  useEffect(() => {
    const controller = new AbortController();
    const objectUrls: string[] = [];

    async function loadSignatures(): Promise<void> {
      try {
        const results = await Promise.all(
          signaturePeople(data).map(async (person) => {
            try {
              const signature = await getPrintableSignature(
                data.id,
                person.id,
                controller.signal,
              );
              const objectUrl = URL.createObjectURL(signature);
              objectUrls.push(objectUrl);

              return [person.id, objectUrl] as const;
            } catch (error: unknown) {
              if (
                error instanceof ApiError &&
                error.status === 404
              ) {
                return null;
              }

              throw error;
            }
          }),
        );

        if (controller.signal.aborted) return;

        setSignatureUrls(
          Object.fromEntries(
            results.filter(
              (result): result is readonly [number, string] =>
                result !== null,
            ),
          ),
        );
        setSignaturesReady(true);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;

        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 419)
        ) {
          router.replace("/login");
          return;
        }

        if (error instanceof ApiError && error.status === 403) {
          setMessage(
            "You don’t have permission to load the printable signatures.",
          );
        } else if (
          error instanceof ApiError &&
          error.status === 429
        ) {
          setMessage(
            "Too many requests were sent. Wait a moment and reload this page.",
          );
        } else {
          setMessage(
            "The printable signatures could not be loaded. Reload this page and try again.",
          );
        }
      }
    }

    void loadSignatures();

    return () => {
      controller.abort();
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [data, router]);

  useEffect(() => {
    if (!signaturesReady || message || autoPrintStarted.current) {
      return;
    }

    autoPrintStarted.current = true;
    let active = true;

    async function startPrint(): Promise<void> {
      await waitForDocumentImages();

      if (active) window.print();
    }

    void startPrint();

    return () => {
      active = false;
    };
  }, [message, signaturesReady]);

  useEffect(() => {
    const closeAfterPrint = () => window.close();

    window.addEventListener("afterprint", closeAfterPrint);

    return () => {
      window.removeEventListener("afterprint", closeAfterPrint);
    };
  }, []);

  if (!signaturesReady && !message) {
    return (
      <main className={styles.loading}>
        <p role="status">Generating print document…</p>
      </main>
    );
  }

  if (message) {
    return (
      <main className={styles.error}>
        <div>
          <h1 className="text-xl font-semibold">
            Print document unavailable
          </h1>
          <p className="mt-3 text-muted">{message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 min-h-11 rounded-xl bg-brand px-5 py-2.5 font-semibold text-white"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className={styles.screenToolbar}>
        <button
          type="button"
          onClick={() => window.print()}
          className={styles.printButton}
        >
          Print
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className={styles.closeButton}
        >
          Close
        </button>
      </div>

      <main className="h-lvh bg-white text-black">
        <article className="border-2 border-black px-4 pt-2">
          <div className="flex justify-end pr-3">
            <p className="flex text-sm font-medium">
              Date:{" "}
              <span className="ml-2 text-sm font-normal underline">
                {formatDate(data.created_at)}
              </span>
            </p>
          </div>

          <header className="flex flex-col items-center justify-center">
            <div className="flex w-1/2 justify-center text-center text-6xl font-extrabold">
              {logo && (
                <Image
                  src={logo}
                  alt={`${data.branch.branch} logo`}
                  width={150}
                  height={150}
                  priority
                />
              )}
            </div>
            <h1 className="mt-2 text-sm font-semibold uppercase">
              Stock Requisition Slip
            </h1>
            <div className="mt-2 flex flex-col items-center font-bold">
              <p className="text-sm font-medium underline uppercase">
                {data.branch.branch_name}
              </p>
              <p className="text-sm font-semibold">BRANCH</p>
            </div>
          </header>

          <div className="flex justify-start pr-6">
            <p className="mb-1 flex text-sm font-medium">
              Purpose: {data.purpose}
            </p>
          </div>

          <div className="flex w-full justify-center">
            <table className="w-full border-separate border-spacing-x-4">
              <thead>
                <tr>
                  <th className="text-sm font-medium">QUANTITY</th>
                  <th className="text-sm font-medium">DESCRIPTION</th>
                  <th className="text-sm font-medium whitespace-nowrap">
                    UNIT COST
                  </th>
                  <th className="text-sm font-medium whitespace-nowrap">
                    TOTAL AMOUNT
                  </th>
                  <th className="text-sm font-medium">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.line_number} className="text-center">
                    <td className="border-b border-black text-sm font-normal">
                      {item.quantity}
                    </td>
                    <td className="border-b border-black text-sm font-normal">
                      {item.description}
                    </td>
                    <td className="border-b border-black text-sm font-normal">
                      {formatAmount(item.unit_cost, data.currency)}
                    </td>
                    <td className="border-b border-black text-sm font-normal">
                      {formatAmount(item.line_total, data.currency)}
                    </td>
                    <td className="border-b border-black text-sm font-normal">
                      {item.remarks ?? ""}
                    </td>
                  </tr>
                ))}
                <tr aria-hidden="true">
                  <td className="border-b border-black py-2 text-sm font-normal" />
                  <td className="border-b border-black text-sm font-normal" />
                  <td className="border-b border-black text-sm font-normal" />
                  <td className="border-b border-black text-sm font-normal" />
                  <td className="border-b border-black text-sm font-normal" />
                </tr>
                <tr>
                  <td />
                  <td className="pt-2 text-right text-sm font-medium whitespace-nowrap uppercase">
                    Grand Total:
                  </td>
                  <td />
                  <td className="pt-2 text-center text-sm font-medium">
                    ₱ {formatAmount(data.grand_total, data.currency)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <section className="mt-4 ml-8">
            <div className="flex flex-wrap justify-start">
              <div className="mb-4 flex-grow">
                <h2 className="mb-2 text-sm font-normal">
                  Requested By:
                </h2>
                <div className="flex flex-wrap justify-start">
                  <SignatureEntry
                    person={data.requester}
                    signatureUrl={signatureUrls[data.requester.id]}
                  />
                </div>
              </div>

              {notedBy.length > 0 && (
                <div className="mb-4 flex-grow">
                  <h2 className="mb-2 text-sm font-normal">
                    Noted By:
                  </h2>
                  <div className="flex flex-wrap justify-start">
                    {notedBy.map((person) => (
                      <SignatureEntry
                        key={person.id}
                        person={person}
                        signatureUrl={signatureUrls[person.id]}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4 flex-grow">
                <h2 className="mb-2 text-sm font-normal">
                  Approved By:
                </h2>
                <div className="flex flex-wrap justify-start">
                  {approvedBy.map((person) => (
                    <SignatureEntry
                      key={person.id}
                      person={person}
                      signatureUrl={signatureUrls[person.id]}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>
    </>
  );
}
