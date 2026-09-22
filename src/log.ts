const PREFIX = "[click-run]";

type LogLevel = "error" | "warn" | "info";

function write(level: LogLevel, message: unknown, error?: unknown): void {
	const detail = error === undefined ? "" : `: ${String(error)}`;
	const text = `${PREFIX} ${String(message)}${detail}`;

	try {
		if (typeof log === "function") {
			log(level, text);
			return;
		}
	} catch {
		// fall back to the console below
	}

	if (level === "error") console.error(text, error);
	else if (level === "warn") console.warn(text);
	else console.info(text);
}

export function logInfo(message: unknown): void {
	write("info", message);
}

export function logWarn(message: unknown, error?: unknown): void {
	write("warn", message, error);
}

export function logError(message: unknown, error?: unknown): void {
	write("error", message, error);
}
