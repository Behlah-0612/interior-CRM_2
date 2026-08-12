import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/guard";

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? ROLE_HOME[user.role] : "/login");
}
