import type { ButtonHTMLAttributes } from "react";

export function ViewerButton({
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={
        className ? `viewer-icon-button ${className}` : "viewer-icon-button"
      }
      {...props}
    />
  );
}
