import type { EngineInterface, Register } from 'claude-code'

import { pycharmLinksFor } from './links'

const PYCHARM = 'C:\\Users\\govinda\\AppData\\Local\\Programs\\PyCharm\\bin\\pycharm64.exe'
const LAUNCHER = 'C:\\Users\\govinda\\AppData\\Local\\Temp\\open-in-pycharm.cmd'
const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'MultiEdit'])

type FileToolInput = { file_path?: string; new_string?: string; offset?: number }

const lineOf = (text: string, needle: string): number | undefined => {
  const index = text.indexOf(needle)
  return index < 0 ? undefined : text.slice(0, index).split('\n').length
}

const openInPyCharm = async ($: EngineInterface, filePath: string, line?: number): Promise<void> => {
  const lineArgs = line ? `--line ${line} ` : ''
  // cmd expands %VAR% even inside quotes, so a literal % is doubled.
  const target = filePath.replaceAll('/', '\\').replaceAll('%', '%%')
  await $.fs.write(LAUNCHER, `@start "" "${PYCHARM}" ${lineArgs}"${target}"\r\n`)
  // Explorer runs the script, not this process: a PyCharm started from Claude's
  // process tree cannot hand the file to the running PyCharm and shows "Start Failed".
  await $.process.run(['explorer.exe', LAUNCHER])
}

export const register: Register = on => {
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const drawn = await next(e)
    const input = e.props.input as FileToolInput
    const filePath = input?.file_path

    if (!FILE_TOOLS.has(e.props.tool) || !filePath || e.props.isRunning || e.props.isErrored) {
      return drawn
    }

    const { Box, Button } = $.ui.resolve(e)

    const open = async () => {
      let line = input.offset
      if (input.new_string) {
        line = lineOf(await $.fs.read(filePath), input.new_string) ?? line
      }
      await openInPyCharm($, filePath, line)
    }

    return (
      <Box flexDirection="column">
        {drawn}
        <Button key={`pycharm-${e.requestId}`} label="Open in PyCharm" onPress={open} />
      </Box>
    )
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary) return next(e)

    const links = pycharmLinksFor(e.props.text, await $.session.cwd())
    if (!links) return next(e)

    // The app draws the reply itself, so its styling stays; the links go on a line below.
    const drawn = await next(e)
    const { Box, Markdown } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {drawn}
        <Markdown
          key={`pycharm-links-${e.requestId}`}
          text={links.text}
          dimColor
          pressableLinks={[...links.targets.keys()]}
          onLinkPress={async link => {
            const file = links.targets.get(link.href)
            if (file) await openInPyCharm($, file.path, file.line)
          }}
        />
      </Box>
    )
  })
}
