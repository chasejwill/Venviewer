"use client";

import { useRef } from "react";

export function AssetDeleteButton() {
  const confirmation = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={confirmation} type="hidden" name="confirm" value="" />
      <button
        className="danger"
        type="submit"
        onClick={(event) => {
          if (!window.confirm("Permanently delete this asset and its files?")) {
            event.preventDefault();
            return;
          }
          if (confirmation.current) confirmation.current.value = "delete";
        }}
      >
        Delete
      </button>
    </>
  );
}
