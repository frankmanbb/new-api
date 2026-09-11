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
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { generateImage, generateVideo, getGeneratedVideo } from '../api'
import {
  imageSource,
  videoTaskId,
  type MediaFormValues,
} from '../lib/media/media-form'
import type { PlaygroundMode } from '../types'

const TERMINAL_VIDEO_STATUSES = new Set(['completed', 'succeeded', 'failed'])

export function useMediaGeneration(mode: Exclude<PlaygroundMode, 'chat'>) {
  const [images, setImages] = useState<string[]>([])
  const [taskId, setTaskId] = useState('')

  const imageMutation = useMutation({
    mutationFn: (values: MediaFormValues) =>
      generateImage({
        model: values.model,
        group: values.group,
        prompt: values.prompt,
        n: values.count,
        size: values.size,
        response_format: 'b64_json',
      }),
    onSuccess: (response) => {
      setImages(response.data.map(imageSource).filter(Boolean))
    },
  })

  const videoMutation = useMutation({
    mutationFn: (values: MediaFormValues) =>
      generateVideo({
        model: values.model,
        group: values.group,
        prompt: values.prompt,
        seconds: values.duration,
        size: values.size,
      }),
    onSuccess: (response) => setTaskId(videoTaskId(response)),
  })

  const videoQuery = useQuery({
    queryKey: ['playground-video', taskId],
    queryFn: () => getGeneratedVideo(taskId),
    enabled: mode === 'video' && taskId !== '',
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && TERMINAL_VIDEO_STATUSES.has(status) ? false : 2000
    },
  })

  const submit = (values: MediaFormValues) => {
    if (mode === 'image') {
      setImages([])
      imageMutation.mutate(values)
      return
    }
    setTaskId('')
    videoMutation.mutate(values)
  }

  return {
    error:
      mode === 'image'
        ? imageMutation.error
        : (videoMutation.error ?? videoQuery.error),
    images,
    isPending:
      mode === 'image'
        ? imageMutation.isPending
        : videoMutation.isPending ||
          (taskId !== '' &&
            !TERMINAL_VIDEO_STATUSES.has(videoQuery.data?.status ?? '')),
    submit,
    taskId,
    video: videoQuery.data,
  }
}
