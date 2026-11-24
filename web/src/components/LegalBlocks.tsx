import type { ReactElement } from 'react'
import type { TFunction } from 'i18next'
import { Trans } from 'react-i18next'

type Block = { p: string; caps?: boolean } | { h3: string } | { ul: string[] }

/**
 * Renders a legal section's body from locales/<lang>/{privacy,terms}.json's
 * block arrays. Each string may contain `{{var}}` interpolation (via
 * `values`) and inline tags like `<b>`/`<code>`/`<link-privacy>` that map to
 * `components` — translators are instructed to keep the tags, only
 * translating the text around and inside them (see docs/i18n-architecture.md).
 */
export function LegalBlocks({ t, ns, path, values, components }: { t: TFunction; ns: string; path: string; values: Record<string, string>; components: Record<string, ReactElement> }) {
  const blocks = t(path, { ns, returnObjects: true }) as Block[]
  return (
    <>
      {blocks.map((block, i) => {
        if ('h3' in block) {
          return <h3 key={i}>{block.h3}</h3>
        }
        if ('ul' in block) {
          return (
            <ul key={i}>
              {block.ul.map((_, j) => (
                <li key={j}>
                  <Trans t={t} i18nKey={`${path}.${i}.ul.${j}`} ns={ns} values={values} components={components} />
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className={block.caps ? 'caps' : undefined}>
            <Trans t={t} i18nKey={`${path}.${i}.p`} ns={ns} values={values} components={components} />
          </p>
        )
      })}
    </>
  )
}
