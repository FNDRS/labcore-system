"use server";

import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { requireAuthWithGroup } from "@/lib/auth-server";
import {
	markExamStarted,
	saveExamDraft,
	finalizeExam,
	sendToValidation,
	type ExamResultStatus,
} from "@/lib/services/exam-result-service";
import type { ResultsRecord } from "@/lib/process/field-schema-types";

async function getUserId(): Promise<string> {
	await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => requireAuthWithGroup(ctx, "tecnico"),
	});
	const { userId } = await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => getCurrentUser(ctx),
	});
	return userId ?? "unknown";
}

export async function markExamStartedAction(
	examId: string,
): Promise<ExamResultStatus> {
	await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => requireAuthWithGroup(ctx, "tecnico"),
	});
	const userId = await getUserId();
	return markExamStarted(examId, userId);
}

export async function saveExamDraftAction(
	examId: string,
	results: ResultsRecord,
	expectedUpdatedAt?: string | null,
): Promise<ExamResultStatus> {
	await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => requireAuthWithGroup(ctx, "tecnico"),
	});
	const userId = await getUserId();
	return saveExamDraft(examId, results, userId, expectedUpdatedAt);
}

export async function finalizeExamAction(
	examId: string,
	results: ResultsRecord,
	expectedUpdatedAt?: string | null,
): Promise<ExamResultStatus> {
	await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => requireAuthWithGroup(ctx, "tecnico"),
	});
	const userId = await getUserId();
	return finalizeExam(examId, results, userId, expectedUpdatedAt);
}

export async function sendToValidationAction(
	examId: string,
): Promise<ExamResultStatus> {
	await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => requireAuthWithGroup(ctx, "tecnico"),
	});
	const userId = await getUserId();
	return sendToValidation(examId, userId);
}
