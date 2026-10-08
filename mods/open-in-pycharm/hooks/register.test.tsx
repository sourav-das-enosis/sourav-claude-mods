import { expect, test } from 'claude-code/testing'
import type { RenderPropsOf } from 'claude-code'

const editRow = (overrides: Partial<RenderPropsOf['ToolUse']> = {}): RenderPropsOf['ToolUse'] => ({
  tool_use_id: 'tu1',
  tool: 'Edit',
  input: { file_path: 'C:/repo/app.py', old_string: 'a', new_string: 'b = 2' },
  isRunning: false,
  isErrored: false,
  isInterrupted: false,
  ...overrides,
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: edit row button opens PyCharm at the edited line`, async ($, on) => {
    const runs: (readonly string[])[] = []
    const scripts: string[] = []
    on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine row'] }))
    on('fs.read', () => ({ value: 'x = 1\nb = 2\n' }))
    on('fs.write', (_$, e) => {
      scripts.push(e.text)
      return { value: undefined }
    })
    on('process.run', (_$, e) => {
      runs.push(e.argv)
      return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    })

    const ui = await $.ui.mount({ plugin: 'open-in-pycharm', surface, component: 'ToolUse', props: editRow(), requestId: 'tu1' })
    expect(await ui.find({ text: 'engine row' })).toBeDefined()
    await ui.press({ key: 'pycharm-tu1' })

    expect(scripts[0]).toContain('pycharm64.exe" --line 2 "C:\\repo\\app.py"')
    expect(runs).toHaveLength(1)
    expect(runs[0]?.[0]).toBe('explorer.exe')
  })

  test(`${surface}: a % in the path is escaped for cmd`, async ($, on) => {
    const scripts: string[] = []
    on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine row'] }))
    on('fs.write', (_$, e) => {
      scripts.push(e.text)
      return { value: undefined }
    })
    on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

    const props = editRow({ tool: 'Read', input: { file_path: 'C:/repo/100%done.py' } })
    const ui = await $.ui.mount({ plugin: 'open-in-pycharm', surface, component: 'ToolUse', props, requestId: 'tu2' })
    await ui.press({ key: 'pycharm-tu2' })

    expect(scripts[0]).toContain('"C:\\repo\\100%%done.py"')
  })

  test(`${surface}: no button while the call is still running`, async ($, on) => {
    on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine row'] }))

    const ui = await $.ui.mount({ plugin: 'open-in-pycharm', surface, component: 'ToolUse', props: editRow({ isRunning: true }) })
    expect(await ui.find({ type: 'Button' })).toBeUndefined()
  })
}

const REPLY_WITH_FILES = [
  '**Files**',
  '- [main.py](src/app/main.py)',
  '- [test_main.py](src/tests/test_main.py:12)',
  'Docs: [site](https://example.com) and `[code](not/a/link.py)`',
].join('\n')

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: reply without file links is drawn by the engine untouched`, async ($, on) => {
    const seen: string[] = []
    on('session.cwd', () => ({ value: 'C:/repo' }))
    on('ui.render', (_$, e) => {
      if (e.component === 'AssistantMessage') seen.push(e.props.text)
      return { type: 'Text', props: {}, children: ['engine reply'] }
    })

    const text = 'No files here, just [a site](https://example.com) and a [heading](#top).'
    const ui = await $.ui.mount({ plugin: 'open-in-pycharm', surface, component: 'AssistantMessage', props: { text, isFirstOfReply: true } })

    expect(seen).toEqual([text])
    expect(await ui.find({ text: 'engine reply' })).toBeDefined()
  })

  test(`${surface}: reply with file links keeps the engine drawing and adds a PyCharm line under it`, async ($, on) => {
    const scripts: string[] = []
    const seen: string[] = []
    on('session.cwd', () => ({ value: 'C:/repo' }))
    on('ui.render', (_$, e) => {
      if (e.component === 'AssistantMessage') seen.push(e.props.text)
      return { type: 'Text', props: {}, children: ['engine reply'] }
    })
    on('fs.write', (_$, e) => {
      scripts.push(e.text)
      return { value: undefined }
    })
    on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

    const ui = await $.ui.mount({ plugin: 'open-in-pycharm', surface, component: 'AssistantMessage', props: { text: REPLY_WITH_FILES, isFirstOfReply: true }, requestId: 'm1' })
    const links = await ui.find({ type: 'Markdown' })

    expect(seen).toEqual([REPLY_WITH_FILES])
    expect(await ui.find({ text: 'engine reply' })).toBeDefined()
    expect(links?.text).toBe(
      'PyCharm: [main.py](file:///C:/repo/src/app/main.py#pycharm-0)'
        + ' · [test_main.py](file:///C:/repo/src/tests/test_main.py#pycharm-1)',
    )

    await ui.press({ key: 'pycharm-links-m1', link: { href: 'file:///C:/repo/src/tests/test_main.py#pycharm-1' } })
    expect(scripts[0]).toContain('--line 12 "C:\\repo\\src\\tests\\test_main.py"')
  })
}

test('a file linked twice at the same line gets one PyCharm link', async ($, on) => {
  on('session.cwd', () => ({ value: 'C:/repo' }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine reply'] }))

  const text = 'See [a.py](src/a.py:3), again [a.py](src/a.py:3), and [a.py:9](src/a.py:9).'
  const ui = await $.ui.mount({ plugin: 'open-in-pycharm', surface: 'desktop', component: 'AssistantMessage', props: { text, isFirstOfReply: true } })

  expect((await ui.find({ type: 'Markdown' }))?.text).toBe(
    'PyCharm: [a.py](file:///C:/repo/src/a.py#pycharm-0) · [a.py:9](file:///C:/repo/src/a.py#pycharm-1)',
  )
})
