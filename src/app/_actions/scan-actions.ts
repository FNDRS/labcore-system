"use server";

import { redirect } from "next/navigation";

export async function scanAction(formData: FormData) {
	const code = formData.get("code");
	if (!code) {
		return { error: "Code is required" };
	}

	// TODO: resolve workOrderId and examId from code (barcode lookup)
	const examId = "idx";
	const workOrderId = "idy";

	redirect(`/technician/work-order/${workOrderId}/exam/${examId}`);
}
