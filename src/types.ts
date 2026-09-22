export type RunCategory = "file" | "project";

/**
 * Snapshot of the editor state passed to a runner's `runnable` and `run`.
 */
export interface RunContext {
	/** Currently active editor file, `null` when nothing is opened. */
	file: Acode.EditorFile | null;
	/** Folder containing the active file, `null` when it is not inside an opened folder. */
	folder: Acode.Folder | null;
	uri?: string;
	filename?: string;
}

export interface RunAction {
	id: string;
	name: string;
	category: RunCategory;
	icon?: string;
	runnable: (context: RunContext) => boolean | Promise<boolean>;
	run: (context: RunContext) => void | Promise<void>;
}

export interface RunActionOptions {
	/** Unique id. Re-registering an existing id replaces that runner. Auto-generated when omitted. */
	id?: string;
	/** Label shown in the run menu. */
	name: string;
	category: RunCategory;
	/** Optional material icon class, defaults to `play_arrow`. */
	icon?: string;
	/** Returns whether this runner can currently run. Called on file/folder changes. */
	runnable: RunAction["runnable"];
	/** Runs the active file or project. */
	run: RunAction["run"];
}

export type RunnerOptions = Omit<RunActionOptions, "category">;

export type RunButtonEvent = "register" | "unregister" | "active-change";

export type RunButtonEventListener = () => void;
