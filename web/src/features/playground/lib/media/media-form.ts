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
import { z } from 'zod'

export const mediaFormSchema = z.object({
  prompt: z.string().trim().min(1),
  model: z.string().min(1),
  group: z.string().min(1),
  size: z.string().min(1),
  count: z.number().int().min(1).max(4),
  duration: z.string(),
})

export type MediaFormValues = z.infer<typeof mediaFormSchema>

export function imageSource(item: { b64_json?: string; url?: string }): string {
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`
  return item.url ?? ''
}

export function videoTaskId(response: {
  id?: string
  task_id?: string
}): string {
  return response.id ?? response.task_id ?? ''
}
