"use client";

import { useActionState } from "react";
import { type ActionState, updateEmbedSettingsAction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

type Values = {
  id: string;
  embedPolicy: string;
  embedAllowedDomains: string;
  integrationEnabled: boolean;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  showPoweredByVenview: boolean;
  logoUrl: string;
  accentColor: string;
};

const POLICIES = [
  ["any", "Any site"],
  ["venview_only", "Venview hosts only"],
  ["approved_domains", "Approved domains"],
  ["disabled", "Disabled"],
] as const;

export function EmbedSettingsForm({
  csrf,
  tour,
}: {
  csrf: string;
  tour: Values;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateEmbedSettingsAction.bind(null, tour.id),
    {},
  );

  return (
    <form action={action} className="card form stack">
      <h2>Embed policy</h2>
      <input type="hidden" name="csrf" value={csrf} />
      <label>
        Who can embed this tour
        <select name="embedPolicy" defaultValue={tour.embedPolicy}>
          {POLICIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <small>
          New tours start as Venview hosts only. Existing tours stay open to any
          site until you change them.
        </small>
      </label>
      <label>
        Approved domains
        <textarea
          name="embedAllowedDomains"
          rows={3}
          defaultValue={tour.embedAllowedDomains}
          placeholder="customer.com, listings.example.com"
        />
        <small>
          Used when the policy is approved domains. One per line or
          comma-separated.
        </small>
      </label>
      <label className="checkbox">
        <input
          name="integrationEnabled"
          type="checkbox"
          defaultChecked={tour.integrationEnabled}
        />
        Listed for Venview integration
      </label>
      <label>
        Primary button label
        <input
          name="primaryCtaLabel"
          type="text"
          defaultValue={tour.primaryCtaLabel}
          maxLength={80}
        />
      </label>
      <label>
        Primary button URL
        <input
          name="primaryCtaUrl"
          type="url"
          defaultValue={tour.primaryCtaUrl}
        />
      </label>
      <label>
        Secondary button label
        <input
          name="secondaryCtaLabel"
          type="text"
          defaultValue={tour.secondaryCtaLabel}
          maxLength={80}
        />
      </label>
      <label>
        Secondary button URL
        <input
          name="secondaryCtaUrl"
          type="url"
          defaultValue={tour.secondaryCtaUrl}
        />
      </label>
      <label>
        Logo URL
        <input name="logoUrl" type="url" defaultValue={tour.logoUrl} />
      </label>
      <label>
        Accent color
        <input
          name="accentColor"
          type="text"
          defaultValue={tour.accentColor}
          placeholder="#176b87"
        />
      </label>
      <label className="checkbox">
        <input
          name="showPoweredByVenview"
          type="checkbox"
          defaultChecked={tour.showPoweredByVenview}
        />
        Show powered by Venview
      </label>
      {state.error ? (
        <p className="error" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton>Save embed settings</SubmitButton>
    </form>
  );
}
