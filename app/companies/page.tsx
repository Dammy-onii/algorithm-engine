import { redirect } from "next/navigation";

/** `/companies` is the default home now — send it to `/`. */
export default function CompaniesRedirect() {
  redirect("/");
}
