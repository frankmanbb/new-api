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
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AiMagicIcon,
  Download01Icon,
  Image01Icon,
  Video01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { ModelGroupSelector } from '@/components/model-group-selector'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { PricingModel } from '@/features/pricing/types'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { getServerErrorMessage } from '@/lib/server-error-message'

import { getGeneratedVideoContentUrl } from '../../api'
import {
  getImageAreaRatio,
  getImageSizes,
  VIDEO_DURATIONS,
  VIDEO_SIZES,
} from '../../constants'
import { useMediaGeneration } from '../../hooks'
import {
  mediaFormSchema,
  type MediaFormValues,
} from '../../lib/media/media-form'
import type { GroupOption, ModelOption, PlaygroundMode } from '../../types'

type ImagePricing = Pick<
  PricingModel,
  'model_name' | 'quota_type' | 'model_price'
>

type MediaPlaygroundProps = {
  mode: Exclude<PlaygroundMode, 'chat'>
  models: ModelOption[]
  groups: GroupOption[]
  group: string
  pricingModels: ImagePricing[]
  groupRatios: Record<string, number>
  onGroupChange: (group: string) => void
}

export function MediaPlayground(props: MediaPlaygroundProps) {
  const { t } = useTranslation()
  const generation = useMediaGeneration(props.mode)
  const isImage = props.mode === 'image'
  const initialModel = props.models[0]?.value ?? ''
  const form = useForm<MediaFormValues>({
    resolver: zodResolver(mediaFormSchema),
    defaultValues: {
      prompt: '',
      model: initialModel,
      group: props.group,
      size: isImage ? getImageSizes(initialModel)[0] : VIDEO_SIZES[0],
      count: 1,
      duration: VIDEO_DURATIONS[0],
    },
  })
  const selectedModel = form.watch('model')
  const selectedSize = form.watch('size')
  const imageCount = form.watch('count')
  const sizes = isImage ? getImageSizes(selectedModel) : VIDEO_SIZES
  const selectedPricing = props.pricingModels.find(
    (pricing) => pricing.model_name === selectedModel
  )
  const imagePrice =
    isImage &&
    selectedPricing?.quota_type === 1 &&
    typeof selectedPricing.model_price === 'number'
      ? selectedPricing.model_price *
        getImageAreaRatio(selectedModel, selectedSize) *
        imageCount *
        (props.groupRatios[props.group] ?? 1)
      : null

  useEffect(() => {
    const current = form.getValues('model')
    if (!props.models.some((model) => model.value === current)) {
      form.setValue('model', props.models[0]?.value ?? '')
    }
  }, [form, props.models])

  useEffect(() => {
    form.setValue('group', props.group)
  }, [form, props.group])

  useEffect(() => {
    const current = form.getValues('size')
    if (!sizes.some((size) => size === current)) {
      form.setValue('size', sizes[0])
    }
  }, [form, sizes])

  let error = ''
  if (generation.error) {
    error = getServerErrorMessage(generation.error, t('Generation failed'))
  } else if (generation.video?.status === 'failed') {
    error = generation.video.error?.message ?? t('Generation failed')
  }
  const videoComplete = ['completed', 'succeeded'].includes(
    generation.video?.status ?? ''
  )
  const title = isImage ? t('Image playground') : t('Video playground')
  const description = isImage
    ? t('Turn a prompt into images and compare formats in one place.')
    : t('Create a video, follow its progress, and preview the result.')

  return (
    <div className='min-h-0 flex-1 overflow-y-auto p-4 md:p-6'>
      <div className='mx-auto grid w-full max-w-7xl gap-5 lg:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]'>
        <Card className='h-fit'>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <form onSubmit={form.handleSubmit(generation.submit)}>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${props.mode}-prompt`}>
                    {t('Prompt')}
                  </FieldLabel>
                  <Textarea
                    id={`${props.mode}-prompt`}
                    className='min-h-36 resize-y'
                    placeholder={t('Describe what you want to create...')}
                    aria-invalid={Boolean(form.formState.errors.prompt)}
                    {...form.register('prompt')}
                  />
                  {form.formState.errors.prompt && (
                    <FieldError>{t('Enter a prompt to continue')}</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel>{t('Model and group')}</FieldLabel>
                  <ModelGroupSelector
                    selectedModel={selectedModel}
                    models={props.models}
                    onModelChange={(value) => form.setValue('model', value)}
                    selectedGroup={props.group}
                    groups={props.groups}
                    onGroupChange={props.onGroupChange}
                    disabled={generation.isPending}
                  />
                  {props.models.length === 0 && (
                    <FieldError>
                      {t('No compatible models are available')}
                    </FieldError>
                  )}
                </Field>

                <div
                  className={
                    isImage ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'
                  }
                >
                  <MediaSelect
                    id={`${props.mode}-size`}
                    label={t('Size')}
                    value={selectedSize}
                    options={sizes.map((size) => ({
                      label: size,
                      value: size,
                    }))}
                    onChange={(value) => form.setValue('size', value)}
                  />
                  {!isImage && (
                    <MediaSelect
                      id='video-duration'
                      label={t('Duration')}
                      value={form.watch('duration')}
                      options={VIDEO_DURATIONS.map((duration) => ({
                        label: t('{{seconds}} seconds', { seconds: duration }),
                        value: duration,
                      }))}
                      onChange={(value) => form.setValue('duration', value)}
                    />
                  )}
                </div>
              </FieldGroup>
            </CardContent>
            <CardFooter className='mt-4 justify-between gap-3'>
              <span className='text-muted-foreground text-xs'>
                {isImage ? t('OpenAI image API') : t('OpenAI video API')}
              </span>
              <Button
                type='submit'
                disabled={generation.isPending || props.models.length === 0}
              >
                {generation.isPending ? (
                  <Spinner data-icon='inline-start' />
                ) : (
                  <HugeiconsIcon icon={AiMagicIcon} data-icon='inline-start' />
                )}
                {generation.isPending ? t('Generating...') : t('Generate')}
                {imagePrice !== null && (
                  <span>
                    ·{' '}
                    {formatBillingCurrencyFromUSD(imagePrice, {
                      abbreviate: false,
                      digitsLarge: 4,
                      digitsSmall: 4,
                    })}
                  </span>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className='min-h-[480px]'>
          <CardHeader>
            <CardTitle>{t('Output')}</CardTitle>
            <CardDescription>
              {t('Your generated media will appear here.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='flex min-h-0 flex-1 items-center justify-center'>
            {error && (
              <Empty className='border border-dashed'>
                <EmptyHeader>
                  <EmptyTitle>{t('Generation failed')}</EmptyTitle>
                  <EmptyDescription>{error}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
            {!error && generation.isPending && (
              <div className='flex w-full max-w-md flex-col items-center gap-5 text-center'>
                <div className='bg-muted flex size-12 items-center justify-center rounded-xl'>
                  <Spinner className='size-6' />
                </div>
                <div className='flex flex-col gap-1'>
                  <p className='font-medium'>{t('Creating your media')}</p>
                  <p className='text-muted-foreground text-sm'>
                    {isImage
                      ? t('Image generation may take a few moments.')
                      : t('Video generation can take several minutes.')}
                  </p>
                </div>
                {!isImage && (
                  <Progress value={generation.video?.progress ?? 0}>
                    <ProgressLabel>{t('Progress')}</ProgressLabel>
                    <ProgressValue />
                  </Progress>
                )}
              </div>
            )}
            {!error &&
              !generation.isPending &&
              isImage &&
              generation.images.length > 0 && (
                <div className='grid w-full gap-4 sm:grid-cols-2'>
                  {generation.images.map((source, index) => (
                    <div
                      key={source}
                      className='group bg-muted relative overflow-hidden rounded-xl border'
                    >
                      <Dialog
                        title={t('Generated image {{number}}', {
                          number: index + 1,
                        })}
                        contentClassName='sm:max-w-[calc(100vw-2rem)]'
                        contentHeight='calc(100vh - 10rem)'
                        bodyClassName='overflow-auto'
                        trigger={
                          <Button
                            type='button'
                            variant='ghost'
                            className='block h-auto w-full rounded-none p-0'
                          >
                            <img
                              src={source}
                              alt={t('Generated image {{number}}', {
                                number: index + 1,
                              })}
                              className='aspect-square size-full cursor-zoom-in object-contain'
                            />
                          </Button>
                        }
                      >
                        <div className='max-h-full max-w-full overflow-auto'>
                          <img
                            src={source}
                            alt={t('Generated image {{number}}', {
                              number: index + 1,
                            })}
                            className='h-auto max-w-none'
                          />
                        </div>
                      </Dialog>
                      <Button
                        variant='secondary'
                        size='sm'
                        className='absolute right-3 bottom-3 shadow-sm'
                        render={
                          <a
                            href={source}
                            download={`generated-image-${index + 1}.png`}
                          />
                        }
                        nativeButton={false}
                      >
                        <HugeiconsIcon
                          icon={Download01Icon}
                          data-icon='inline-start'
                        />
                        {t('Download')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            {!error &&
              !generation.isPending &&
              !isImage &&
              videoComplete &&
              generation.taskId && (
                <video
                  controls
                  className='max-h-[640px] w-full rounded-xl bg-black'
                  src={getGeneratedVideoContentUrl(generation.taskId)}
                >
                  {t('Your browser does not support video playback.')}
                </video>
              )}
            {!error &&
              !generation.isPending &&
              !(isImage && generation.images.length > 0) &&
              !(!isImage && videoComplete && generation.taskId) && (
                <Empty className='border border-dashed'>
                  <EmptyHeader>
                    <EmptyMedia variant='icon'>
                      <HugeiconsIcon
                        icon={isImage ? Image01Icon : Video01Icon}
                      />
                    </EmptyMedia>
                    <EmptyTitle>{t('Ready to create')}</EmptyTitle>
                    <EmptyDescription>
                      {t('Enter a prompt and choose your generation settings.')}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type MediaSelectProps = {
  id: string
  label: string
  value: string
  options: Array<{ label: string; value: string }>
  onChange: (value: string) => void
}

function MediaSelect(props: MediaSelectProps) {
  return (
    <Field>
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <Select
        items={props.options}
        value={props.value}
        onValueChange={(value) => value !== null && props.onChange(value)}
      >
        <SelectTrigger id={props.id} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {props.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
