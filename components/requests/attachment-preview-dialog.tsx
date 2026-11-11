"use client";

import Image from "next/image";
import Modal from "@/components/ui/modal";

type AttachmentPreviewDialogProps = {
  fileName: string;
  mimeType: string;
  objectUrl: string;
  onClose: () => void;
};

export default function AttachmentPreviewDialog({
  fileName,
  mimeType,
  objectUrl,
  onClose,
}: AttachmentPreviewDialogProps) {
  const isImage = mimeType.startsWith("image/");

  return (
    <Modal
      open
      title={`Preview: ${fileName}`}
      onClose={onClose}
      maxWidth="5xl"
    >
      <div className="overflow-hidden rounded-xl border border-line/60 bg-slate-100">
        {isImage ? (
          <div className="relative min-h-[60svh] w-full">
            <Image
              src={objectUrl}
              alt={`Preview of ${fileName}`}
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        ) : (
          <iframe
            src={objectUrl}
            title={`Preview of ${fileName}`}
            className="h-[70svh] w-full bg-white"
          />
        )}
      </div>
    </Modal>
  );
}
