# sourav-claude-mods

Claude Code mods by Sourav.

## Mods

### limits-band

A bar above the prompt that shows what is left of your limits:

![limits-band showing Hourly Left, Weekly Left and Context Left above the prompt](docs/limits-band.png)

- Percent turns red below 20%.
- The bracket shows time until that limit resets.
- Hourly and weekly limits are shared between sessions, so every chat shows the freshest reading any session has seen, even before its own first reply.
- Needs a Claude subscription plan. On API billing, only context shows.

### open-in-pycharm

Opens files in PyCharm from the chat:

- A `PyCharm:` line under each of Claude's replies that links to files, one link per file. The reply itself is drawn by the app as usual; replies with no file links get nothing.
- An "Open in PyCharm" button under each Read, Edit and Write row. An Edit opens at the changed line.
- PyCharm starts through Explorer, so a running PyCharm takes the file instead of failing with "Start Failed".
- Windows only. The PyCharm path is set in `hooks/register.tsx`.

## Install

```bash
claude plugin marketplace add sourav-das-enosis/sourav-claude-mods
claude plugin install limits-band@sourav-claude-mods
claude plugin install open-in-pycharm@sourav-claude-mods
```

In the desktop app, list the mod folder in `CLAUDE_CODE_PLUGIN_DIRS` under `env` in `~/.claude/settings.json` instead (paths separated by `;` on Windows).
