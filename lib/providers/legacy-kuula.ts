import { z } from "zod";

export const kuulaUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .transform((value, context) => {
    const url = new URL(value);
    const approvedAuthority =
      /^https:\/\/(?:kuula\.co|www\.kuula\.co)(?=\/)/i.test(value);
    const valid =
      approvedAuthority &&
      url.protocol === "https:" &&
      ["kuula.co", "www.kuula.co"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      /^\/share\/(?:collection\/)?[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    if (!valid) {
      context.addIssue({
        code: "custom",
        message:
          "Use an HTTPS kuula.co share URL without credentials, ports, or fragments.",
      });
      return z.NEVER;
    }
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  });

export function kuulaEmbedUrl(value: string): string {
  return kuulaUrlSchema.parse(value);
}
