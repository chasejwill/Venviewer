import { z } from "zod";
import { kuulaEmbedUrl, kuulaUrlSchema } from "@/lib/providers/legacy-kuula";

export { kuulaEmbedUrl, kuulaUrlSchema };

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "embed",
  "login",
  "logout",
  "new",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export const slugSchema = z
  .string()
  .trim()
  .min(3, "Slug must contain at least 3 characters.")
  .max(80, "Slug must contain at most 80 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens only.",
  )
  .refine((slug) => !RESERVED_SLUGS.has(slug), "This slug is reserved.");

export const tourInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  slug: slugSchema,
  kuulaUrl: kuulaUrlSchema,
  published: z.boolean(),
});

export type TourInput = z.infer<typeof tourInputSchema>;

export function parseTourForm(formData: FormData) {
  return tourInputSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    kuulaUrl: formData.get("kuulaUrl"),
    published: formData.get("published") === "on",
  });
}
