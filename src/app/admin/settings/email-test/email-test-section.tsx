"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FaEnvelope } from "react-icons/fa";
import { EmailTestModal } from "@/components/email-test-modal";

export function EmailTestSection() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setModalOpen(true)}
        className="h-7 px-3 text-[10px] gap-1"
      >
        <FaEnvelope className="h-3 w-3" />
        Email test
      </Button>
      <EmailTestModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
