import { logError } from "./log";
import type {
	RunAction,
	RunActionOptions,
	RunButtonEvent,
	RunButtonEventListener,
	RunContext,
	RunnerOptions,
} from "./types";

const REGISTRY_KEY = Symbol.for("acode.plugin.clickrun.registry");

interface SharedRegistry {
	actions: Map<string, RunAction>;
	seq: number;
}

const store = globalThis as unknown as Record<symbol, SharedRegistry | undefined>;

function getRegistry(): SharedRegistry {
	let registry = store[REGISTRY_KEY];
	if (!registry) {
		registry = { actions: new Map(), seq: 0 };
		store[REGISTRY_KEY] = registry;
	}
	return registry;
}

/**
 * Registry shared with every plugin through `acode.require("runButton")`.
 *
 * Registrations are kept in a global store so they survive a reload of this
 * plugin while the plugins that registered them stay loaded.
 */
export class RunButtonAPI {
	readonly isRunButtonAPI = true;

	#registry = getRegistry();
	#active: RunAction[] = [];
	#activeKey = "";
	#refreshToken = 0;
	#listeners = new Map<RunButtonEvent, Set<RunButtonEventListener>>();

	/**
	 * Registers a run action. Returns a disposer that unregisters it.
	 */
	register(options: RunActionOptions): () => void {
		if (!options || typeof options !== "object") {
			throw new TypeError("[click-run] register() expects an options object");
		}

		const { name, category, runnable, run, icon } = options;

		if (typeof name !== "string" || !name.trim()) {
			throw new TypeError("[click-run] runner name must be a non-empty string");
		}
		if (category !== "file" && category !== "project") {
			throw new TypeError(
				'[click-run] runner category must be "file" or "project"',
			);
		}
		if (typeof runnable !== "function") {
			throw new TypeError(
				`[click-run] runner "${name}" must provide a runnable() function`,
			);
		}
		if (typeof run !== "function") {
			throw new TypeError(
				`[click-run] runner "${name}" must provide a run() function`,
			);
		}

		const id =
			typeof options.id === "string" && options.id.trim()
				? options.id.trim()
				: `_${++this.#registry.seq}`;

		const action: RunAction = {
			id,
			name: name.trim(),
			category,
			runnable,
			run,
		};
		if (icon) action.icon = icon;

		this.#registry.actions.set(id, action);
		this.#emit("register");
		void this.refresh();

		return () => {
			if (this.#registry.actions.get(id) === action) this.unregister(id);
		};
	}

	registerFileRunner(options: RunnerOptions): () => void {
		return this.register({ ...options, category: "file" });
	}

	registerProjectRunner(options: RunnerOptions): () => void {
		return this.register({ ...options, category: "project" });
	}

	/**
	 * Removes a runner by id or by the object returned from `getActions()`.
	 */
	unregister(action: string | RunAction): boolean {
		const id = typeof action === "string" ? action : action?.id;
		if (!id) return false;
		if (!this.#registry.actions.delete(id)) return false;
		this.#emit("unregister");
		void this.refresh();
		return true;
	}

	/** All registered runners, in registration order. */
	getActions(): RunAction[] {
		return [...this.#registry.actions.values()];
	}

	getAction(id: string): RunAction | undefined {
		return this.#registry.actions.get(id);
	}

	/** Runners whose `runnable()` was true during the last refresh. */
	getActiveActions(): RunAction[] {
		return [...this.#active];
	}

	on(event: RunButtonEvent, listener: RunButtonEventListener): () => void {
		let listeners = this.#listeners.get(event);
		if (!listeners) {
			listeners = new Set();
			this.#listeners.set(event, listeners);
		}
		listeners.add(listener);
		return () => this.off(event, listener);
	}

	off(event: RunButtonEvent, listener: RunButtonEventListener): void {
		this.#listeners.get(event)?.delete(listener);
	}

	/** Current editor state passed to every `runnable()` and `run()`. */
	getContext(): RunContext {
		const file = editorManager.activeFile ?? null;
		let folder: Acode.Folder | null = null;

		if (file) {
			const found = acode.require("openFolder").find(file.uri) as unknown as
				| Acode.Folder
				| undefined;
			folder = found ?? null;
		}

		return { file, folder, uri: file?.uri, filename: file?.filename };
	}

	/** Re-evaluates every runner's `runnable()` and notifies the UI. */
	async refresh(): Promise<RunAction[]> {
		const token = ++this.#refreshToken;
		const context = this.getContext();
		const actions = this.getActions();

		const checks = await Promise.all(
			actions.map(async (action) => {
				try {
					return (await action.runnable(context)) ? action : null;
				} catch (error) {
					logError(`runnable() of runner "${action.name}" threw`, error);
					return null;
				}
			}),
		);

		if (token !== this.#refreshToken) return this.#active;

		const active = checks.filter(
			(check): check is RunAction => check !== null,
		);
		const key = active
			.map((action) => `${action.id}\u0001${action.category}\u0001${action.name}`)
			.join("\u0000");

		this.#active = active;
		if (key !== this.#activeKey) {
			this.#activeKey = key;
			this.#emit("active-change");
		}

		return active;
	}

	#emit(event: RunButtonEvent): void {
		const listeners = this.#listeners.get(event);
		if (!listeners) return;
		for (const listener of [...listeners]) {
			try {
				listener();
			} catch (error) {
				logError(`listener for "${event}" threw`, error);
			}
		}
	}
}
