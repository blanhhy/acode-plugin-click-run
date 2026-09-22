# Changelogs

## v1.0.0

- Initial release.
- Defines the `runButton` module so other plugins can register run actions.
- File runners (`registerFileRunner`) and project runners (`registerProjectRunner`).
- Single header run button: hidden when nothing can run, opens a menu with
  project runners above file runners separated by a divider, and runs directly
  when exactly one file runner is active.
