export type FileLink = { path: string; line?: number }

export type PyCharmLinks = {
  /** One markdown line of PyCharm links, drawn under the reply. */
  text: string
  /** Keyed by the href of each PyCharm link. */
  targets: Map<string, FileLink>
}

const MARKDOWN_LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g
const CODE = /(```[\s\S]*?(?:```|$)|`[^`\n]*`)/
const SCHEME = /^[a-z][a-z0-9+.-]*:/i
const LINE_SUFFIX = /(?::(\d+)(?::\d+)?|#L(\d+))$/

const toFileUrl = (absolute: string): string =>
  'file:///' + encodeURI(absolute.replaceAll('\\', '/')).replaceAll('#', '%23').replaceAll('?', '%3F').replaceAll('(', '%28').replaceAll(')', '%29')

const isAbsolute = (path: string): boolean => /^[a-z]:[\\/]/i.test(path) || path.startsWith('/')

const joinPath = (cwd: string, relative: string): string =>
  `${cwd.replace(/[\\/]+$/, '')}/${relative.replace(/^\.\//, '')}`

/** Reads a link target as a file on disk, or undefined for web links, anchors and folders. */
export const parseFileLink = (href: string, cwd: string): FileLink | undefined => {
  let raw = href
  if (/^file:/i.test(raw)) {
    raw = decodeURI(raw.replace(/^file:\/*/i, ''))
  } else if (SCHEME.test(raw) && !/^[a-z]:[\\/]/i.test(raw)) {
    return undefined
  }
  if (raw.startsWith('#')) return undefined

  const lineMatch = LINE_SUFFIX.exec(raw)
  const line = lineMatch ? Number(lineMatch[1] ?? lineMatch[2]) : undefined
  const bare = lineMatch ? raw.slice(0, lineMatch.index) : raw
  const name = bare.split(/[\\/]/).pop() ?? ''
  if (!name.includes('.') || name.startsWith('.') && name.lastIndexOf('.') === 0) return undefined

  return { path: isAbsolute(bare) ? bare : joinPath(cwd, bare), line }
}

/**
 * Builds a line of PyCharm links for the file links outside code, one per file and
 * line, or returns undefined when the reply has none.
 */
export const pycharmLinksFor = (text: string, cwd: string): PyCharmLinks | undefined => {
  const targets = new Map<string, FileLink>()
  const labels: string[] = []
  const seen = new Set<string>()

  // split() with a capture group alternates prose and code, code at the odd indexes.
  text.split(CODE).forEach((part, index) => {
    if (index % 2 === 1) return
    for (const [, label, href] of part.matchAll(MARKDOWN_LINK)) {
      const file = href && parseFileLink(href, cwd)
      if (!label || !file) continue
      const identity = `${file.path.toLowerCase()}:${file.line ?? ''}`
      if (seen.has(identity)) continue
      seen.add(identity)

      const pycharmHref = `${toFileUrl(file.path)}#pycharm-${targets.size}`
      targets.set(pycharmHref, file)
      labels.push(`[${label}](${pycharmHref})`)
    }
  })

  return targets.size === 0 ? undefined : { text: `PyCharm: ${labels.join(' · ')}`, targets }
}
