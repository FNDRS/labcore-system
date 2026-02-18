export default async function ExamenPage({
	params,
}: {
	params: Promise<{ ordentrabajoId: string; examenId: string }>;
}) {
	const { ordentrabajoId, examenId } = await params;
	return (
		<div>
			<h1>Examen</h1>
			<p>Orden de trabajo: {ordentrabajoId}</p>
			<p>Examen: {examenId}</p>
		</div>
	);
}
