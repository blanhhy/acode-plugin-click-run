import plugin from "../plugin.json";
import { RunButtonAPI } from "./runButtonAPI";
import { RunButtonUI } from "./runButtonUI";

const RUN_BUTTON_MODULE = "runButton";

if (window.acode) {
	const api = new RunButtonAPI();
	acode.define(RUN_BUTTON_MODULE, api);

	const ui = new RunButtonUI(api);

	const init: Acode.PluginInit = async () => {
		ui.attach();
	};

	acode.setPluginInit(plugin.id, init);

	acode.setPluginUnmount(plugin.id, () => {
		ui.detach();
	});
}
