import { logError, logInfo } from "./log";
import type { RunButtonAPI } from "./runButtonAPI";
import type { RunAction } from "./types";

const CONTENT_REFRESH_DELAY = 1000;

const EDITOR_EVENTS = [
	"switch-file",
	"rename-file",
	"save-file",
	"file-loaded",
	"add-folder",
	"remove-folder",
	"update-folder",
] as const;

/**
 * Header run button: hides itself when nothing can run, runs directly when a
 * single file runner is active, otherwise opens the runner menu.
 */
export class RunButtonUI {
	#api: RunButtonAPI;
	#$btn: HTMLSpanElement;
	#$menu: Acode.ContextMenu | null = null;
	#attached = false;
	#contentTimer: ReturnType<typeof setTimeout> | null = null;
	#cleanups: Array<() => void> = [];

	constructor(api: RunButtonAPI) {
		this.#api = api;

		this.#$btn = document.createElement("span");
		this.#$btn.className = "icon play_arrow";
		this.#$btn.title = "Run";
		this.#$btn.style.fontSize = "1.2em";
		this.#$btn.style.pointerEvents = "all";
	}

	attach(): void {
		if (this.#attached) return;
		this.#attached = true;

		this.#$btn.addEventListener("click", this.#onClick);

		const refresh = () => {
			void this.#api.refresh();
		};
		for (const event of EDITOR_EVENTS) {
			editorManager.on(event, refresh);
		}
		this.#cleanups.push(() => {
			for (const event of EDITOR_EVENTS) {
				editorManager.off(event, refresh);
			}
		});

		editorManager.on("file-content-changed", this.#onContentChanged);
		this.#cleanups.push(() => {
			editorManager.off("file-content-changed", this.#onContentChanged);
		});

		this.#cleanups.push(this.#api.on("active-change", this.#onActiveChange));

		void this.#api.refresh();
		logInfo("run button attached");
	}

	detach(): void {
		if (!this.#attached) return;
		this.#attached = false;

		for (const cleanup of this.#cleanups.splice(0)) cleanup();

		this.#$btn.removeEventListener("click", this.#onClick);
		this.#$btn.remove();

		this.#clearContentTimer();

		this.#$menu?.hide();
		this.#$menu?.destroy();
		this.#$menu = null;

		logInfo("run button detached");
	}

	#onContentChanged = (): void => {
		if (this.#contentTimer !== null) clearTimeout(this.#contentTimer);
		this.#contentTimer = setTimeout(() => {
			this.#contentTimer = null;
			if (this.#attached) void this.#api.refresh();
		}, CONTENT_REFRESH_DELAY);
	};

	#onActiveChange = (): void => {
		this.#syncButton();
	};

	#onClick = async (): Promise<void> => {
		if (!this.#attached) return;

		const active = await this.#api.refresh();
		if (!this.#attached || !active.length) {
			logInfo(`run button clicked, but ${active.length} runners are active`);
			return;
		}

		if (active.length === 1 && active[0].category === "file") {
			logInfo(`single file runner active, running "${active[0].name}" directly`);
			await this.#run(active[0]);
			return;
		}

		logInfo(`opening runner menu (${active.length} active runners)`);
		this.#openMenu(active);
	};

	#syncButton(): void {
		if (!this.#attached) return;

		const active = this.#api.getActiveActions();
		if (!active.length) {
			this.#$btn.remove();
			return;
		}

		this.#$btn.title = active.length === 1 ? active[0].name : "Run";

		if (!this.#$btn.isConnected) {
			const $header = editorManager.header;
			$header.insertBefore(this.#$btn, $header.lastChild);
		}
	}

	#openMenu(active: RunAction[]): void {
		const contextMenu = acode.require("contextMenu");
		const rect = this.#$btn.getBoundingClientRect();

		this.#$menu?.destroy();
		this.#$menu = contextMenu({
			top: `${Math.round(rect.bottom)}px`,
			right: `${Math.round(innerWidth - rect.right)}px`,
			transformOrigin: "top right",
			items: [],
			innerHTML: () => this.#renderMenu(active),
			onselect: (id: string) => {
				const action =
					active.find((item) => item.id === id) ?? this.#api.getAction(id);
				if (action) void this.#run(action);
			},
		} as unknown as Acode.ContextMenuOptions);
		this.#$menu.show();
	}

	#renderMenu(active: RunAction[]): string {
		const projects = active.filter((action) => action.category === "project");
		const files = active.filter((action) => action.category === "file");

		const rows = projects.map(renderItem);
		if (projects.length && files.length) rows.push("<hr>");
		rows.push(...files.map(renderItem));

		return rows.join("");
	}

	async #run(action: RunAction): Promise<void> {
		logInfo(`running "${action.name}" (category=${action.category})`);
		try {
			await action.run(this.#api.getContext());
			logInfo(`runner "${action.name}" finished`);
		} catch (error) {
			logError(`runner "${action.name}" threw`, error);
		}
	}

	#clearContentTimer(): void {
		if (this.#contentTimer !== null) {
			clearTimeout(this.#contentTimer);
			this.#contentTimer = null;
		}
	}
}

function renderItem(action: RunAction): string {
	const icon = action.icon || "play_arrow";
	return (
		`<li data-action="${escapeHtml(action.id)}">` +
		`<span class="text">${escapeHtml(action.name)}</span>` +
		`<span class="icon ${escapeHtml(icon)}"></span>` +
		"</li>"
	);
}

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
