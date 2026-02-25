import { redirect } from "next/navigation";

/**
 * Root (/): always redirects to /login on the server. Avoids client/server loops;
 * the login page decides whether to show the form or redirect to the dashboard based on auth state.
 */
export default function HomePage() {
  redirect("/login");
}
