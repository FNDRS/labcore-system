export default async function ExamPage({
	params,
}: {
	params: Promise<{ workOrderId: string; examId: string }>;
}) {
	const { workOrderId, examId } = await params;
	return (
		<div>
			<h1>Examen</h1>
			<p>Orden de trabajo: {workOrderId}</p>
			<p>Examen: {examId}</p>
		</div>
	);
}
