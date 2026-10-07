# sourav-claude-mods

Claude Code mods by Sourav.

## Mods

### limits-band

A bar above the prompt that shows what is left of your limits:

```
Hourly Left 98% (4h 37m)   ·   Weekly Left 100% (6d 9h)   ·   Context Left 62%
```

- Percent turns red below 20%.
- The bracket shows time until that limit resets.
- Hourly and weekly limits are saved between sessions, so a resumed chat shows the last known values before its first reply.
- Needs a Claude subscription plan. On API billing, only context shows.

## Install

```bash
claude plugin marketplace add sourav-das-enosis/sourav-claude-mods
claude plugin install limits-band@sourav-claude-mods
```
