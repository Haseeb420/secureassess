export interface ValidationResult {
  passed: boolean
  violations: ViolationType[]
}

export type ViolationType =
  | { type: 'MultipleDisplays' }
  | { type: 'ExternalDisplay' }
  | { type: 'ForbiddenProcess'; value: string }
  | { type: 'FocusLoss' }
  | { type: 'FullscreenExit' }
  | { type: 'ScreenRecording' }
  | { type: 'VirtualMachine' }

export interface ForbiddenProcess {
  name: string
  pid: number
  category: string
}
