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
import {
  RefreshIcon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'

const MIN_SCALE = 1
const MAX_SCALE = 4
const SCALE_STEP = 0.25

type ImagePreviewDialogProps = {
  alt: string
  source: string
}

export function ImagePreviewDialog(props: ImagePreviewDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState(MIN_SCALE)
  const imageRef = useRef<HTMLImageElement>(null)
  const translationRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const updateTransform = useCallback((nextScale: number) => {
    const image = imageRef.current
    if (!image) return

    const translation = translationRef.current
    image.style.transform = `translate3d(${translation.x}px, ${translation.y}px, 0) scale(${nextScale})`
  }, [])

  const resetView = useCallback(() => {
    translationRef.current = { x: 0, y: 0 }
    dragRef.current = null
    setScale(MIN_SCALE)
    updateTransform(MIN_SCALE)
  }, [updateTransform])

  const changeScale = useCallback(
    (nextScale: number) => {
      const boundedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
      if (boundedScale === MIN_SCALE) {
        translationRef.current = { x: 0, y: 0 }
      }
      setScale(boundedScale)
      updateTransform(boundedScale)
    },
    [updateTransform]
  )

  useEffect(() => {
    updateTransform(scale)
  }, [scale, updateTransform])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetView()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={props.alt}
      description={t('Scroll to zoom. Drag to pan.')}
      contentClassName='sm:max-w-[calc(100vw-2rem)]'
      contentHeight='calc(100vh - 10rem)'
      bodyClassName='h-full p-0'
      trigger={
        <Button
          type='button'
          variant='ghost'
          className='block h-auto w-full rounded-none p-0'
          aria-label={props.alt}
        >
          <img
            src={props.source}
            alt={props.alt}
            className='aspect-square size-full cursor-zoom-in object-contain'
          />
        </Button>
      }
    >
      <div className='bg-muted/60 relative size-full min-h-72 overflow-hidden rounded-md'>
        <div
          className='size-full touch-none overflow-hidden outline-none'
          role='region'
          aria-label={t('Image preview')}
          tabIndex={0}
          onDoubleClick={() =>
            changeScale(scale === MIN_SCALE ? MIN_SCALE * 2 : MIN_SCALE)
          }
          onWheel={(event) => {
            event.preventDefault()
            changeScale(scale + (event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP))
          }}
          onKeyDown={(event) => {
            if (event.key === '+' || event.key === '=') {
              event.preventDefault()
              changeScale(scale + SCALE_STEP)
            } else if (event.key === '-') {
              event.preventDefault()
              changeScale(scale - SCALE_STEP)
            } else if (event.key === '0') {
              event.preventDefault()
              resetView()
            }
          }}
          onPointerDown={(event) => {
            if (scale === MIN_SCALE) return
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: translationRef.current.x,
              originY: translationRef.current.y,
            }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId) return
            translationRef.current = {
              x: drag.originX + event.clientX - drag.startX,
              y: drag.originY + event.clientY - drag.startY,
            }
            updateTransform(scale)
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId !== event.pointerId) return
            dragRef.current = null
            event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onPointerCancel={() => {
            dragRef.current = null
          }}
        >
          <div className='flex size-full items-center justify-center'>
            <img
              ref={imageRef}
              src={props.source}
              alt={props.alt}
              draggable={false}
              className={
                scale > MIN_SCALE
                  ? 'max-h-full max-w-full cursor-grab object-contain active:cursor-grabbing'
                  : 'max-h-full max-w-full cursor-zoom-in object-contain'
              }
            />
          </div>
        </div>

        <div className='bg-background/90 absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border p-1 shadow-sm backdrop-blur'>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={t('Zoom out')}
            disabled={scale === MIN_SCALE}
            onClick={() => changeScale(scale - SCALE_STEP)}
          >
            <HugeiconsIcon icon={ZoomOutAreaIcon} />
          </Button>
          <output className='min-w-12 text-center text-xs tabular-nums'>
            {Math.round(scale * 100)}%
          </output>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={t('Zoom in')}
            disabled={scale === MAX_SCALE}
            onClick={() => changeScale(scale + SCALE_STEP)}
          >
            <HugeiconsIcon icon={ZoomInAreaIcon} />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={t('Reset zoom')}
            disabled={scale === MIN_SCALE}
            onClick={resetView}
          >
            <HugeiconsIcon icon={RefreshIcon} />
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
