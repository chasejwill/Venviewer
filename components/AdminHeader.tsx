import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function AdminHeader({ csrf }: { csrf: string }) {
  return (
    <header className="site-header">
      <div className="shell header-row">
        <Link href="/admin/tours">Venviewer admin</Link>
        <form action={logoutAction}>
          <input type="hidden" name="csrf" value={csrf} />
          <SubmitButton className="secondary">Log out</SubmitButton>
        </form>
      </div>
    </header>
  );
}
