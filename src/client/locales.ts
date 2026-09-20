/**
 * Notifications card dictionaries (en + zh).
 * The English dictionary defines the key set; both must stay in balance
 * (the locale registry enforces it at registration).
 */

const EN = {
  title: 'Sound notifications',
  description: 'Play a sound when the agent needs you or finishes work.',
  master: 'Enable notifications',
  volume: 'Master volume',
  'question.name': 'Question asked',
  'question.desc': 'The agent asks a question that blocks the session.',
  'approval.name': 'Approval requested',
  'approval.desc': 'A tool call is waiting for your approval.',
  'task.name': 'Task complete',
  'task.desc': 'The current turn finished successfully.',
  'job.name': 'Background job finished',
  'job.desc': 'A background job completed or was stopped.',
  'subagent.name': 'Subagent finished',
  'subagent.desc': 'A subagent of the current session stopped running.',
  'error.name': 'Error or failure',
  'error.desc': 'The turn ended with an error, or a job failed.',
} as const

/** The tab's locale key set (the English dictionary is canonical). */
export type NotificationsLocaleKey = keyof typeof EN

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Notifications tab copy. */
    'dsh.notifications': NotificationsLocaleKey
  }
}

/** Chinese dictionary: same key set, basic translation. */
export const ZH: Record<NotificationsLocaleKey, string> = {
  title: '声音通知',
  description: '当代理需要你或完成工作时播放提示音。',
  master: '启用通知',
  volume: '主音量',
  'question.name': '提出问题',
  'question.desc': '代理提出了一个阻塞会话的问题。',
  'approval.name': '请求批准',
  'approval.desc': '工具调用正在等待你的批准。',
  'task.name': '任务完成',
  'task.desc': '当前轮次成功结束。',
  'job.name': '后台作业结束',
  'job.desc': '后台作业完成或被停止。',
  'subagent.name': '子代理结束',
  'subagent.desc': '当前会话的子代理停止运行。',
  'error.name': '错误或失败',
  'error.desc': '轮次以错误结束，或作业失败。',
}

/** English dictionary (typed to the key set). */
export const EN_DICT: Record<NotificationsLocaleKey, string> = { ...EN }
