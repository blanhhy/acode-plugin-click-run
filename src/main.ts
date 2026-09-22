import plugin from "../plugin.json";

class RunButton {
	baseUrl = "";
	$runBtn!: HTMLSpanElement;

	initRunButton() {
        this.$runBtn = document.createElement("span");
        this.$runBtn.className = "icon play_arrow";
        this.$runBtn.setAttribute("action", "run");
        this.$runBtn.title = "Click to run";

        const listener = async () => {
            if (this.$runBtn.isConnected) {
                this.$runBtn.remove();
            }

        }
    
        editorManager.on('switch-file', listener);
        editorManager.on('rename-file', listener);

        return listener()
    }

	initAPI() {
		acode.define("runButton", {

		});
	}
}

if (window.acode) {
	const instance = new RunButton();

	const init: Acode.PluginInit = async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
		instance.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
		
	}

	const unmount = () => {}

	acode.setPluginInit(plugin.id, init);
	acode.setPluginUnmount(plugin.id, unmount);
}
