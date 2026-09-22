const PREFIX = "[click-run]";

export function logError(message: unknown, error?: unknown): void {
	const detail = error === undefined ? "" : `: ${String(error)}`;
	try {
		if (typeof log === "function") {
			log("error", `${PREFIX} ${String(message)}${detail}`);
			return;
		}
	} catch {
		// fall back to console below
	}
	console.error(`${PREFIX} ${String(message)}`, error);
}
