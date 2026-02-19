import { redirect } from "next/navigation";

/** Overpass: redirect to technician dashboard. Real auth (token + role) will be added later. */
export default function HomePage() {
	redirect("/technician");
}
