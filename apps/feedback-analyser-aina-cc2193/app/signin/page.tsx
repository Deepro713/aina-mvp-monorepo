import { redirect } from "next/navigation";

// Sign-in was removed: the app works without an account. Old links land on the dashboard.
export default function SignInPage() {
  redirect("/dashboard");
}
