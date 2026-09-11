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
import { render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

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

const models = [{ label: 'image-model', value: 'image-model' }]
const groups = [{ label: 'default', value: 'default', ratio: 1 }]

describe('MediaPlayground', () => {
  beforeAll(() => {
    i18next.addResourceBundle('en', 'translation', {
      'Image playground': 'Image playground',
      'No compatible models are available':
        'No compatible models are available',
      Generate: 'Generate',
      'Generated image {{number}}': 'Generated image {{number}}',
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

  test('disables generation when no compatible model is available', () => {
    render(
      <MediaPlayground
        mode='image'
        models={[]}
        groups={groups}
        group='default'
        onGroupChange={vi.fn()}
      />
    )

    expect(screen.getByText('No compatible models are available')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled()
  })

  test('renders generated images with download links', () => {
    generation.images = ['data:image/png;base64,aGVsbG8=']

    render(
      <MediaPlayground
        mode='image'
        models={models}
        groups={groups}
        group='default'
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
  })
})
