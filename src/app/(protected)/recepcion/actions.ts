"use server";

import { getCurrentUser } from "aws-amplify/auth/server";
import {
	generateSpecimensForOrder,
	markLabelsPrintedForOrder,
	markOrderReadyForLab,
} from "@/lib/services/specimen-generation-service";
import {
	listReceptionOrders,
	lookupOrderByCode,
	type ReceptionListFilters,
	type ReceptionListPage,
} from "@/lib/repositories/reception-repository";
import type { ReceptionOrder } from "./types";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

async function getUserId(): Promise<string> {
	const { userId } = await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => getCurrentUser(ctx),
	});
	return userId ?? "unknown";
}

export async function fetchReceptionOrders(
	filters: ReceptionListFilters,
	pagination?: { limit?: number; nextToken?: string | null },
): Promise<ReceptionListPage> {
	return listReceptionOrders(filters, pagination);
}

export async function lookupReceptionOrderByCode(
	code: string,
): Promise<ReceptionOrder | null> {
	return lookupOrderByCode(code);
}

export type GenerateSpecimensActionResult =
	| { ok: true; barcodes: string[] }
	| { ok: false; error: string };

export async function generateSpecimensAction(
	workOrderId: string,
): Promise<GenerateSpecimensActionResult> {
	const userId = await getUserId();
	const result = await generateSpecimensForOrder(workOrderId, userId);
	if (result.ok) {
		return { ok: true, barcodes: result.barcodes };
	}
	return { ok: false, error: result.error };
}

export type MarkReadyForLabActionResult =
	| { ok: true }
	| { ok: false; error: string };

export type MarkLabelsPrintedActionResult =
	| { ok: true }
	| { ok: false; error: string };

export async function markReadyForLabAction(
	workOrderId: string,
): Promise<MarkReadyForLabActionResult> {
	const userId = await getUserId();
	return markOrderReadyForLab(workOrderId, userId);
}

export async function markLabelsPrintedAction(
	workOrderId: string,
): Promise<MarkLabelsPrintedActionResult> {
	const userId = await getUserId();
	return markLabelsPrintedForOrder(workOrderId, userId);
}
