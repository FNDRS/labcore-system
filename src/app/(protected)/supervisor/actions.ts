"use server";

import { cache } from "react";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { requireAuthWithGroup } from "@/lib/auth-server";
import {
	getDashboardStats,
	listPendingValidation,
} from "@/lib/repositories/supervisor-repository";
import {
	approveExam,
	createIncidence,
	rejectExam,
	type IncidenceResult,
	type ValidationServiceResult,
} from "@/lib/services/validation-service";
import type {
	SupervisorDashboardStats,
	ValidationQueueItem,
} from "@/lib/types/validation-types";

async function requireSupervisorAuth() {
	await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => requireAuthWithGroup(ctx, "supervisor"),
	});
}

async function getUserId(): Promise<string> {
	await requireSupervisorAuth();
	const { userId } = await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => getCurrentUser(ctx),
	});
	return userId ?? "unknown";
}

export type SupervisorDashboardData = {
	stats: SupervisorDashboardStats;
	pending: ValidationQueueItem[];
};

export const fetchSupervisorDashboard = cache(async (): Promise<SupervisorDashboardData> => {
	await requireSupervisorAuth();
	const [stats, pending] = await Promise.all([
		getDashboardStats(),
		listPendingValidation(),
	]);
	return { stats, pending };
});

export async function approveExamAction(
	examId: string,
	comments?: string,
	expectedUpdatedAt?: string | null,
): Promise<ValidationServiceResult> {
	await requireSupervisorAuth();
	const userId = await getUserId();
	return approveExam(examId, userId, comments, expectedUpdatedAt);
}

export async function rejectExamAction(
	examId: string,
	reason: string,
	comments?: string,
	expectedUpdatedAt?: string | null,
): Promise<ValidationServiceResult> {
	await requireSupervisorAuth();
	const userId = await getUserId();
	return rejectExam(examId, userId, reason, comments, expectedUpdatedAt);
}

export async function createIncidenceAction(
	examId: string,
	type: string,
	description: string,
): Promise<IncidenceResult> {
	await requireSupervisorAuth();
	const userId = await getUserId();
	return createIncidence(examId, userId, type, description);
}
