"use server";

import { redirect } from "next/navigation";

export async function scanAction(formData: FormData) {
	const code = formData.get("code");
	if (!code) {
		return { error: "Code is required" };
	}

	//fetch examen-fetch-ordenTrabajo-id
	const examen = "idx"; //aqui irian los awaits de esto
	const ordenTrabajo = "idy"; //aqui irian los awaits de esto

	redirect(`/tecnico/orden-trabajo/${ordenTrabajo}/examen/${examen}`);
}
