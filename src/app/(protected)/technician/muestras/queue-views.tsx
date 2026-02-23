"use client";

import type { Filter } from "./constants";
import { useTechnicianWorkstation } from "../technician-workstation-context";
import { MuestrasTable } from "./muestras-table";

/** Props shared by all queue views. */
interface QueueViewProps {
	tableRef: React.RefObject<HTMLDivElement | null>;
	rowRefs: (id: string) => (el: HTMLTableRowElement | null) => void;
}

/** Renders the samples table with a specific filter. Explicit variant per filter. */
function QueueView({ filter, tableRef, rowRefs }: QueueViewProps & { filter: Filter }) {
	const {
		state: {
			samples,
			searchQuery,
			selectedId,
			highlightedId,
		},
		actions: {
			openPanel,
			onMarkReceived,
			onProcess,
			onReportProblem,
		},
	} = useTechnicianWorkstation();

	return (
		<MuestrasTable
			rows={samples}
			filter={filter}
			searchQuery={searchQuery}
			selectedId={selectedId}
			highlightedId={highlightedId}
			onSelect={openPanel}
			onMarkReceived={onMarkReceived}
			onProcess={onProcess}
			onReportProblem={onReportProblem}
			tableRef={tableRef}
			rowRefs={rowRefs}
		/>
	);
}

export function AllQueueView(props: QueueViewProps) {
	return <QueueView {...props} filter="All" />;
}

export function ProcessingQueueView(props: QueueViewProps) {
	return <QueueView {...props} filter="Processing" />;
}

export function ReceivedQueueView(props: QueueViewProps) {
	return <QueueView {...props} filter="Received" />;
}

export function UrgentQueueView(props: QueueViewProps) {
	return <QueueView {...props} filter="Urgent" />;
}

export function FlaggedQueueView(props: QueueViewProps) {
	return <QueueView {...props} filter="Flagged" />;
}

export function MineQueueView(props: QueueViewProps) {
	return <QueueView {...props} filter="Mine" />;
}

const QUEUE_VIEW_MAP = {
	All: AllQueueView,
	Processing: ProcessingQueueView,
	Received: ReceivedQueueView,
	Urgent: UrgentQueueView,
	Flagged: FlaggedQueueView,
	Mine: MineQueueView,
} as const;

export function FilteredQueueView(
	props: QueueViewProps & { filter: Filter },
) {
	const View = QUEUE_VIEW_MAP[props.filter] ?? AllQueueView;
	return <View tableRef={props.tableRef} rowRefs={props.rowRefs} />;
}
