import { createFileRoute } from "@tanstack/react-router";

import { SubmitForm } from "@/components/kaizen/SubmitForm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shopfloor Kaizen — Submit a Suggestion" },
      {
        name: "description",
        content:
          "Scan, speak and submit a Kaizen suggestion in Marathi, Hindi or English. Voice note plus photo, straight from the production line.",
      },
      { property: "og:title", content: "Shopfloor Kaizen — Submit a Suggestion" },
      {
        property: "og:description",
        content: "Fast voice-first Kaizen entry for shopfloor operators. Marathi, Hindi and English.",
      },
    ],
  }),
  component: SubmitForm,
});
