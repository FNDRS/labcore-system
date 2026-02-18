"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function BarcodeScanPlaceholder() {
	return (
		<Card className="border-dashed">
			<CardContent className="pt-6">
				<label className="text-muted-foreground block text-sm font-medium mb-2">
					Escanear código de barras
				</label>
				<Input
					type="text"
					placeholder="Pase el lector o escriba el código..."
					className="font-mono max-w-md"
					readOnly
					onFocus={(e) => e.target.blur()}
				/>
				<p className="text-muted-foreground mt-2 text-xs">
					Placeholder — integración con lector de códigos de barras pendiente
				</p>
			</CardContent>
		</Card>
	);
}
