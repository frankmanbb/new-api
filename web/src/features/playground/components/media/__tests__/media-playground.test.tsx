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
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

import { getImageSizes, IMAGE_MODEL_CONFIGS } from '../../../constants'
import { MediaPlayground } from '../media-playground'

const submit = vi.fn()
let generation = {
  error: null as Error | null,
  images: [] as string[],
  isPending: false,
  submit,
  taskId: '',
  video: undefined as
    | { status: string; progress?: number; error?: { message?: string } }
    | undefined,
}

vi.mock('@/components/model-group-selector', () => ({
  ModelGroupSelector: () => <div data-testid='model-group-selector' />,
}))

vi.mock('@/features/playground/hooks', () => ({
  useMediaGeneration: () => generation,
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { server_address: 'https://api.example.test' },
    loading: false,
    error: null,
  }),
}))

vi.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: (props: { code: string; children?: React.ReactNode }) => (
    <div>
      <pre data-testid='code-sample'>{props.code}</pre>
      {props.children}
    </div>
  ),
  CodeBlockCopyButton: () => <button type='button'>Copy code</button>,
}))

const models = [{ label: 'image-model', value: 'image-model' }]
const groups = [{ label: 'default', value: 'default', ratio: 1 }]
const pricingProps = {
  pricingModels: [] as Array<{
    model_name: string
    quota_type: number
    model_price?: number
  }>,
  groupRatios: { default: 1 },
}

describe('MediaPlayground', () => {
  beforeAll(() => {
    i18next.addResourceBundle('en', 'translation', {
      'Image playground': 'Image playground',
      'No compatible models are available':
        'No compatible models are available',
      Generate: 'Generate',
      Size: 'Size',
      Quality: 'Quality',
      'Generated image {{number}}': 'Generated image {{number}}',
      'Image preview': 'Image preview',
      'Zoom in': 'Zoom in',
      'Zoom out': 'Zoom out',
      'Reset zoom': 'Reset zoom',
      API: 'API',
      Playground: 'Playground',
      'Image generation API': 'Image generation API',
    })
  })

  beforeEach(() => {
    generation = {
      error: null,
      images: [],
      isPending: false,
      submit,
      taskId: '',
      video: undefined,
    }
  })

  test('uses the configured Qwen Image 2512 resolutions', () => {
    const model = 'lightx2v/Qwen-Image-2512-Lightning'

    expect(getImageSizes(model)).toEqual(IMAGE_MODEL_CONFIGS[model].sizes)
    expect(IMAGE_MODEL_CONFIGS[model]).toMatchObject({
      defaultSize: '1024x1024',
      minWidth: 256,
      minHeight: 256,
      maxWidth: 1664,
      maxHeight: 1664,
      dimensionMultiple: 16,
    })
  })

  test('defaults Qwen image generation to 1024 square without quality', () => {
    const model = 'lightx2v/Qwen-Image-2512-Lightning'

    render(
      <MediaPlayground
        mode='image'
        models={[{ label: model, value: model }]}
        groups={groups}
        group='default'
        {...pricingProps}
        onGroupChange={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Size')).toHaveTextContent('1024x1024')
    expect(screen.queryByText('Quality')).not.toBeInTheDocument()
  })

  test('disables generation when no compatible model is available', () => {
    render(
      <MediaPlayground
        mode='image'
        models={[]}
        groups={groups}
        group='default'
        {...pricingProps}
        onGroupChange={vi.fn()}
      />
    )

    expect(screen.getByText('No compatible models are available')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled()
  })

  test('opens generated images with zoom controls and download links', async () => {
    const user = userEvent.setup()
    generation.images = ['data:image/png;base64,aGVsbG8=']

    render(
      <MediaPlayground
        mode='image'
        models={models}
        groups={groups}
        group='default'
        {...pricingProps}
        onGroupChange={vi.fn()}
      />
    )

    expect(
      screen.getByRole('img', { name: 'Generated image 1' })
    ).toHaveAttribute('src', generation.images[0])
    expect(screen.getByRole('button', { name: /Download/ })).toHaveAttribute(
      'download',
      'generated-image-1.png'
    )

    await user.click(screen.getByRole('button', { name: 'Generated image 1' }))

    const preview = screen.getByRole('dialog')
    expect(preview).toBeVisible()
    const previewImage = within(preview).getByRole('img', {
      name: 'Generated image 1',
    })

    await user.click(within(preview).getByRole('button', { name: 'Zoom in' }))
    expect(within(preview).getByText('125%')).toBeVisible()
    expect(previewImage).toHaveStyle({
      transform: 'translate3d(0px, 0px, 0) scale(1.25)',
    })

    const viewport = within(preview).getByRole('region', {
      name: 'Image preview',
    })
    viewport.setPointerCapture = vi.fn()
    viewport.releasePointerCapture = vi.fn()
    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 10, clientY: 15 })
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 40, clientY: 35 })
    fireEvent.pointerUp(viewport, { pointerId: 1 })
    expect(previewImage).toHaveStyle({
      transform: 'translate3d(30px, 20px, 0) scale(1.25)',
    })

    await user.click(
      within(preview).getByRole('button', { name: 'Reset zoom' })
    )
    expect(within(preview).getByText('100%')).toBeVisible()
  })

  test('shows a live OpenAI-compatible image API example', async () => {
    const user = userEvent.setup()
    const model = 'lightx2v/Qwen-Image-2512-Lightning'

    render(
      <MediaPlayground
        mode='image'
        models={[{ label: model, value: model }]}
        groups={groups}
        group='default'
        {...pricingProps}
        onGroupChange={vi.fn()}
      />
    )

    await user.type(
      screen.getByRole('textbox', { name: 'Prompt' }),
      'A glass fox'
    )
    await user.click(screen.getByRole('combobox', { name: 'Size' }))
    await user.click(screen.getByRole('option', { name: '1328x1328' }))
    await user.click(screen.getByRole('tab', { name: 'API' }))

    expect(screen.getByText('Image generation API')).toBeVisible()
    expect(
      screen.getByText('POST https://api.example.test/v1/images/generations')
    ).toBeVisible()
    expect(screen.getByTestId('code-sample')).toHaveTextContent(model)
    expect(screen.getByTestId('code-sample')).toHaveTextContent('A glass fox')
    expect(screen.getByTestId('code-sample')).toHaveTextContent('1328x1328')
  })

  test('updates the generated image price from the configured base price', async () => {
    const user = userEvent.setup()
    const model = 'lightx2v/Qwen-Image-2512-Lightning'

    render(
      <MediaPlayground
        mode='image'
        models={[{ label: model, value: model }]}
        groups={groups}
        group='default'
        pricingModels={[
          { model_name: model, quota_type: 1, model_price: 0.04 },
        ]}
        groupRatios={{ default: 1 }}
        onGroupChange={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: /Generate.*\$0\.04/ })
    ).toBeVisible()

    await user.click(screen.getByRole('combobox', { name: 'Size' }))
    await user.click(screen.getByRole('option', { name: '1328x1328' }))

    expect(
      screen.getByRole('button', { name: /Generate.*\$0\.0673/ })
    ).toBeVisible()
  })
})
