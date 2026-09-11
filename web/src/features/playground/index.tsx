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
  BubbleChatIcon,
  Image01Icon,
  Video01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { PlaygroundChat } from './components/chat/playground-chat'
import { PlaygroundInput } from './components/input/playground-input'
import { MediaPlayground } from './components/media/media-playground'
import {
  useChatHandler,
  usePlaygroundConversation,
  usePlaygroundOptions,
  usePlaygroundState,
} from './hooks'

export function Playground() {
  const { t } = useTranslation()
  const {
    config,
    parameterEnabled,
    messages,
    isLoadingMessages,
    models,
    groups,
    updateMessages,
    setModels,
    setGroups,
    updateConfig,
    updateParameterEnabled,
    clearMessages,
  } = usePlaygroundState()

  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled,
    onMessageUpdate: updateMessages,
  })

  const {
    editingMessageKey,
    handleSendMessage,
    handleRegenerateMessage,
    handleEditMessage,
    handleEditOpenChange,
    applyEdit,
    handleDeleteMessage,
  } = usePlaygroundConversation({
    messages,
    updateMessages,
    sendChat,
  })

  const handleClearMessages = () => {
    handleEditOpenChange(false)
    clearMessages()
  }

  const { isLoadingModels, isLoadingPricing, pricingModels } =
    usePlaygroundOptions({
      currentGroup: config.group,
      currentModel: config.model,
      setGroups,
      setModels,
      updateConfig,
    })

  const imageModels = useMemo(
    () =>
      models.filter((option) =>
        pricingModels
          .find((pricing) => pricing.model_name === option.value)
          ?.supported_endpoint_types?.includes('image-generation')
      ),
    [models, pricingModels]
  )
  const videoModels = useMemo(
    () =>
      models.filter((option) =>
        pricingModels
          .find((pricing) => pricing.model_name === option.value)
          ?.supported_endpoint_types?.includes('openai-video')
      ),
    [models, pricingModels]
  )

  return (
    <Tabs defaultValue='chat' className='size-full min-h-0 gap-0'>
      <div className='border-border/70 flex shrink-0 justify-center border-b px-4 py-3'>
        <TabsList aria-label={t('Playground mode')}>
          <TabsTrigger value='chat'>
            <HugeiconsIcon icon={BubbleChatIcon} data-icon='inline-start' />
            {t('Chat')}
          </TabsTrigger>
          <TabsTrigger value='image'>
            <HugeiconsIcon icon={Image01Icon} data-icon='inline-start' />
            {t('Image')}
          </TabsTrigger>
          <TabsTrigger value='video'>
            <HugeiconsIcon icon={Video01Icon} data-icon='inline-start' />
            {t('Video')}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value='chat' className='min-h-0 overflow-hidden'>
        <div className='relative flex size-full min-h-0 flex-col overflow-hidden'>
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            <PlaygroundChat
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              onRegenerateMessage={handleRegenerateMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onSelectPrompt={handleSendMessage}
              isGenerating={isGenerating}
              editingKey={editingMessageKey}
              onCancelEdit={handleEditOpenChange}
              onSaveEdit={(newContent) => applyEdit(newContent, false)}
              onSaveEditAndSubmit={(newContent) => applyEdit(newContent, true)}
            />
          </div>
          <div className='mx-auto w-full max-w-4xl'>
            <PlaygroundInput
              config={config}
              disabled={isGenerating}
              groups={groups}
              groupValue={config.group}
              isGenerating={isGenerating}
              isModelLoading={isLoadingModels}
              modelValue={config.model}
              models={models}
              onGroupChange={(value) => updateConfig('group', value)}
              onConfigChange={updateConfig}
              onClearMessages={handleClearMessages}
              onModelChange={(value) => updateConfig('model', value)}
              onParameterEnabledChange={updateParameterEnabled}
              onStop={stopGeneration}
              onSubmit={handleSendMessage}
              parameterEnabled={parameterEnabled}
              hasMessages={messages.length > 0}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value='image' className='min-h-0 overflow-hidden'>
        <MediaPlayground
          mode='image'
          models={imageModels}
          groups={groups}
          group={config.group}
          onGroupChange={(value) => updateConfig('group', value)}
        />
      </TabsContent>

      <TabsContent value='video' className='min-h-0 overflow-hidden'>
        <MediaPlayground
          mode='video'
          models={videoModels}
          groups={groups}
          group={config.group}
          onGroupChange={(value) => updateConfig('group', value)}
        />
      </TabsContent>
      {(isLoadingModels || isLoadingPricing) && (
        <span className='sr-only' role='status'>
          {t('Loading models...')}
        </span>
      )}
    </Tabs>
  )
}
