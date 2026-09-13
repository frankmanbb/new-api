/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BundledLanguage } from 'shiki/bundle/web'

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStatus } from '@/hooks/use-status'

type SampleLanguage = 'curl' | 'javascript' | 'python'

const LANGUAGE_LABELS: Record<SampleLanguage, string> = {
  curl: 'cURL',
  javascript: 'JavaScript',
  python: 'Python',
}

const LANGUAGE_HIGHLIGHTS: Record<SampleLanguage, BundledLanguage> = {
  curl: 'bash',
  javascript: 'javascript',
  python: 'python',
}

type ImageApiTabProps = {
  count: number
  model: string
  prompt: string
  size: string
}

function buildImageApiSample(
  language: SampleLanguage,
  baseUrl: string,
  requestBody: Record<string, string | number>
): string {
  const endpoint = `${baseUrl}/v1/images/generations`
  const body = JSON.stringify(requestBody, null, 2)

  if (language === 'curl') {
    const shellBody = body
      .replaceAll("'", "'\"'\"'")
      .replaceAll('\n', '\n     ')
    return [
      `curl ${endpoint} \\`,
      '  -H "Authorization: Bearer $NEW_API_KEY" \\',
      '  -H "Content-Type: application/json" \\',
      `  -d '${shellBody}'`,
    ].join('\n')
  }

  if (language === 'python') {
    return [
      'import os',
      'import requests',
      '',
      `response = requests.post(`,
      `    "${endpoint}",`,
      `    headers={`,
      `        "Authorization": f"Bearer {os.environ['NEW_API_KEY']}",`,
      `        "Content-Type": "application/json",`,
      `    },`,
      `    json=${body.replaceAll('\n', '\n    ')},`,
      ')',
      'response.raise_for_status()',
      'print(response.json())',
    ].join('\n')
  }

  return [
    `const response = await fetch('${endpoint}', {`,
    `  method: 'POST',`,
    `  headers: {`,
    `    Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,`,
    `    'Content-Type': 'application/json',`,
    `  },`,
    `  body: JSON.stringify(${body.replaceAll('\n', '\n  ')}),`,
    `})`,
    '',
    'if (!response.ok) throw new Error(await response.text())',
    'console.log(await response.json())',
  ].join('\n')
}

export function ImageApiTab(props: ImageApiTabProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [language, setLanguage] = useState<SampleLanguage>('curl')
  const baseUrl = useMemo(() => {
    const candidate =
      (status as Record<string, unknown> | null)?.server_address ??
      (status as Record<string, unknown> | null)?.serverAddress ??
      (status?.data as Record<string, unknown> | undefined)?.server_address ??
      (status?.data as Record<string, unknown> | undefined)?.serverAddress
    if (typeof candidate === 'string' && candidate) {
      return candidate.replace(/\/$/, '')
    }
    if (typeof window !== 'undefined') return window.location.origin
    return 'https://api.example.com'
  }, [status])
  const requestBody = useMemo(
    () => ({
      model: props.model || 'lightx2v/Qwen-Image-2512-Lightning',
      prompt: props.prompt || 'A serene landscape at sunset.',
      n: props.count,
      size: props.size,
    }),
    [props.count, props.model, props.prompt, props.size]
  )
  const code = useMemo(
    () => buildImageApiSample(language, baseUrl, requestBody),
    [baseUrl, language, requestBody]
  )

  return (
    <Card className='mx-auto w-full max-w-5xl'>
      <CardHeader>
        <CardTitle>{t('Image generation API')}</CardTitle>
        <CardDescription>
          {t('Use the OpenAI-compatible image endpoint with your API key.')}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        <section className='space-y-2'>
          <h3 className='text-sm font-medium'>{t('Endpoint')}</h3>
          <code className='bg-muted block overflow-x-auto rounded-md border px-4 py-3 font-mono text-sm'>
            POST {baseUrl}/v1/images/generations
          </code>
        </section>

        <section className='space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h3 className='text-sm font-medium'>{t('Code examples')}</h3>
            <Tabs
              value={language}
              onValueChange={(value) => setLanguage(value as SampleLanguage)}
            >
              <TabsList aria-label={t('Programming language')}>
                {(Object.keys(LANGUAGE_LABELS) as SampleLanguage[]).map(
                  (item) => (
                    <TabsTrigger key={item} value={item}>
                      {LANGUAGE_LABELS[item]}
                    </TabsTrigger>
                  )
                )}
              </TabsList>
            </Tabs>
          </div>
          <CodeBlock code={code} language={LANGUAGE_HIGHLIGHTS[language]}>
            <CodeBlockCopyButton />
          </CodeBlock>
          <p className='text-muted-foreground text-xs'>
            {t('Replace')}{' '}
            <code className='bg-muted rounded px-1 py-0.5 font-mono text-[11px]'>
              $NEW_API_KEY
            </code>{' '}
            {t('with the API key from your token settings.')}
          </p>
        </section>
      </CardContent>
    </Card>
  )
}
