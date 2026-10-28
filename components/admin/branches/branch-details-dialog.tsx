"use client";

import Modal from "@/components/ui/modal";
import type { BranchRecord } from "@/lib/admin/branches";

type BranchDetailsDialogProps = {
  branch: BranchRecord;
  onClose: () => void;
};

export default function BranchDetailsDialog({
  branch,
  onClose,
}: BranchDetailsDialogProps) {
  const details: Array<[string, string | number]> = [
    ["Branch ID", branch.id],
    ["Company", branch.branch],
    ["Branch code", branch.branch_code],
    ["Branch name", branch.branch_name],
    ["Acronym", branch.acronym],
  ];

  return (
    <Modal
      open
      title="Branch information"
      onClose={onClose}
    >
      <div className="border-b border-line/60 pb-6">
        <h3 className="text-2xl leading-tight font-semibold wrap-anywhere">
          {branch.branch_name}
        </h3>

        <p className="mt-2 text-base leading-7 text-muted wrap-anywhere">
          {branch.branch_code} · {branch.acronym}
        </p>
      </div>

      <dl className="my-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm leading-6 text-muted">
              {label}
            </dt>
            <dd className="mt-1 text-base leading-7 font-medium wrap-anywhere">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}