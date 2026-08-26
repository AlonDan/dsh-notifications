/** Shared shape of the 14 scalar notification settings fields (host + client halves). */
import type { SoundId } from './sound-ids'

export interface NotificationSettings {
  master: boolean
  volume: number
  questionOn: boolean
  questionSound: SoundId
  approvalOn: boolean
  approvalSound: SoundId
  taskOn: boolean
  taskSound: SoundId
  jobOn: boolean
  jobSound: SoundId
  subagentOn: boolean
  subagentSound: SoundId
  errorOn: boolean
  errorSound: SoundId
}
