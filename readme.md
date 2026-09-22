# Click Run

A single button for every runner plugin.

<img width="1080" height="810" alt="1000170708" src="https://github.com/user-attachments/assets/4472bc26-4fca-4bf0-ab95-125d8b33272d" />

Acode has no unified run button API, 
so each plugin with runner logic adds its own button to the editor header. 
When several runner plugins are installed 
the header fills up with look-alike play buttons that are hard to tell apart.

Click Run fixes that:  

Plugins register their run actions once 
and Click Run renders one button and one menu for all of them.

## Behavior

- The button only appears while at least one registered runner can run the
  active file or project.
- Tapping it opens a menu of all active runners: project runners on top, file
  runners below, separated by a light divider.
- When exactly one single-file runner is active, the menu is skipped and that
  runner is executed directly.
- Active runners are re-evaluated when the active file changes, is renamed,
  saved or loaded, when folders are added, removed or updated, when file
  content changes (debounced), and when runners are registered or
  unregistered.

## Build

```sh
npm install
npm run dev        # watch, serve on :3000, rebuild plugin.zip
npm run typecheck
npm run build      # typecheck, bundle, write plugin.zip
```

In Acode, install from **Plugins → + → Remote** using
`http://<your-ip>:3000/plugin.zip`.


# Click-run APIs

## Registering a runner

Click Run defines the `runButton` module. Plugin load order is not guaranteed,
so wait for the plugin before requiring the module and handle the case where
Click Run is not installed:

```js
const CLICK_RUN_PLUGIN_ID = "acode.plugin.clickrun";

function withRunButton(callback) {
  const runButton = acode.require("runButton");
  if (runButton) return callback(runButton);

  acode
    .waitForPlugin(CLICK_RUN_PLUGIN_ID)
    .then(() => {
      const runButton = acode.require("runButton");
      if (runButton) callback(runButton);
    })
    .catch(() => {
      // Click Run is not installed or failed to load.
    });
}
```

### Single-file runner

```js
withRunButton((runButton) => {
  const dispose = runButton.registerFileRunner({
    id: "my.plugin.mylang",
    name: "Run MyLang",
    runnable: ({ file }) => !!file && file.filename.endsWith(".mylang"),
    run: ({ file }) => runMyLang(file),
  });

  // Call dispose() from your plugin's unmount callback.
});
```

### Project runner

```js
withRunButton((runButton) => {
  runButton.registerProjectRunner({
    id: "my.plugin.project",
    name: "Run MyLang project",
    runnable: ({ folder }) => !!folder && hasProjectMarker(folder.url),
    run: ({ folder }) => runProject(folder.url),
  });
});
```

## API

`acode.require("runButton")` returns:

| Method                      | Description                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `register(options)`         | Registers a runner. Returns a disposer that unregisters it.            |
| `registerFileRunner(opts)`  | Same as `register()` with `category: "file"`.                          |
| `registerProjectRunner(opts)` | Same as `register()` with `category: "project"`.                     |
| `unregister(idOrAction)`    | Removes a runner by id or by object.                                   |
| `getActions()`              | All registered runners, in registration order.                         |
| `getAction(id)`             | A registered runner by id.                                             |
| `getActiveActions()`        | Runners that were active during the last evaluation.                   |
| `getContext()`              | The current `RunContext`.                                              |
| `refresh()`                 | Re-evaluates every `runnable()`; resolves with the active runners.     |
| `on(event, listener)`       | Subscribes to `register`, `unregister` or `active-change`. Returns an unsubscribe function. |
| `off(event, listener)`      | Removes a listener.                                                    |

### Runner options

| Field      | Required           | Description                                                              |
| ---------- | ------------------ | ------------------------------------------------------------------------ |
| `name`     | yes                | Label shown in the menu.                                                 |
| `category` | via `register()`   | `"file"` or `"project"`.                                                 |
| `runnable` | yes                | `(context) => boolean \| Promise<boolean>`. Errors count as `false`.     |
| `run`      | yes                | `(context) => void \| Promise<void>`. Errors are logged.                 |
| `id`       | no                 | Unique id; registering an existing id replaces that runner. Auto-generated when omitted. |
| `icon`     | no                 | Material icon class shown in the menu, defaults to `play_arrow`.         |

### RunContext

```ts
{
  file: Acode.EditorFile | null; // active editor file
  folder: Acode.Folder | null;   // folder containing the file, if opened in Acode
  uri?: string;                  // file.uri
  filename?: string;             // file.filename
}
```

## Notes

- Register once and dispose on plugin unmount. Registrations live in a shared
  store, so runner plugins are not asked to register again when Click Run is
  reloaded or updated.
- `id` values must be unique across plugins (prefix them with your plugin id).
  Registering a duplicate id replaces the previous runner.
- Keep `runnable()` cheap: it runs for every registered runner on every
  file/folder/content change.
