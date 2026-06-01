import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { ForbiddenProcess, ValidationResult } from './types'

export type { ForbiddenProcess, ValidationResult }

export interface FocusLossPayload {
  timestamp: string
  window_title: string
}

export function onFocusLoss(callback: (payload: FocusLossPayload) => void): Promise<UnlistenFn> {
  return listen<FocusLossPayload>('security:focus-loss', (event) => callback(event.payload))
}

export function onProcessViolation(
  callback: (payload: ForbiddenProcess) => void,
): Promise<UnlistenFn> {
  return listen<ForbiddenProcess>('security:process-violation', (event) =>
    callback(event.payload),
  )
}

export function validateDisplays(): Promise<ValidationResult> {
  return invoke<ValidationResult>('validate_displays')
}

export function checkForbiddenProcesses(): Promise<ForbiddenProcess[]> {
  return invoke<ForbiddenProcess[]>('check_forbidden_processes')
}

export function enterKioskMode(): Promise<void> {
  return invoke('enter_kiosk_mode')
}

export function exitKioskMode(): Promise<void> {
  return invoke('exit_kiosk_mode')
}

export function onFullscreenRestored(callback: () => void): Promise<UnlistenFn> {
  return listen('security:fullscreen-restored', () => callback())
}
