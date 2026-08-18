import { createFileRoute } from "@tanstack/react-router";

import { SubmitForm } from "@/components/kaizen/SubmitForm";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit a Kaizen — Shopfloor Fast Entry" },
      {
        name: "description",
        content:
          "QR-code landing page for shopfloor operators: enter your 4-digit ID, record a voice note and attach a photo.",
      },
      { property: "og:title", content: "Submit a Kaizen — Shopfloor Fast Entry" },
      {
        property: "og:description",
        content: "Enter your 4-digit ID, record a voice note and attach a photo of the machine or area.",
      },
    ],
  }),
  component: SubmitForm,
});
