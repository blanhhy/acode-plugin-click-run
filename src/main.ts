import plugin from "../plugin.json";
import { logError, logInfo } from "./log";
import { RunButtonAPI } from "./runButtonAPI";
import { RunButtonUI } from "./runButtonUI";

const RUN_BUTTON_MODULE = "runButton";

if (window.acode) {
	logInfo(`v${plugin.version} script evaluated`);

	const api = new RunButtonAPI();
	acode.define(RUN_BUTTON_MODULE, api);
	logInfo(`module "${RUN_BUTTON_MODULE}" defined`);

	const ui = new RunButtonUI(api);

	const init: Acode.PluginInit = async () => {
		ui.attach();
		logInfo("plugin initialized");
	};

	acode.setPluginInit(plugin.id, init);

	acode.setPluginUnmount(plugin.id, () => {
		ui.detach();
		logInfo("plugin unmounted");
	});
} else {
	logError("window.acode is not available, plugin not loaded");
}
