// src/db/types.ts — Database row type definitions (P1 - remove any)

export interface BenchRunRow {
	id: number;
	model_name: string;
	hardware: string | null;
	runtime: string | null;
	speed_prompt_tps: number;
	speed_gen_tps: number;
	speed_ttft_ms: number;
	retention_pct: number;
	accuracy_pct: number;
	created_at: string;
}
