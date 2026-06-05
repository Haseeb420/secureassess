// Windows low-level keyboard hook — blocks process-switching shortcuts during assessment.
// The hook runs on a dedicated thread with a Win32 message loop; it is
// installed on enter_kiosk_mode and removed on exit_kiosk_mode.
//
// Ctrl+Alt+Del (SAS) cannot be intercepted at application level — that
// requires a kernel-mode driver and is intentionally left to Windows.

#[cfg(target_os = "windows")]
mod imp {
    use std::sync::atomic::{AtomicBool, AtomicIsize, AtomicU32, Ordering};
    use windows_sys::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
    use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows_sys::Win32::System::Threading::GetCurrentThreadId;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetKeyState, VK_CONTROL, VK_ESCAPE, VK_F4, VK_LWIN, VK_RWIN, VK_TAB,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
        TranslateMessage, UnhookWindowsHookEx, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL, WM_QUIT,
    };

    // Bit 5 of KBDLLHOOKSTRUCT.flags — set when Alt is held.
    const LLKHF_ALTDOWN: u32 = 0x20;

    pub(super) static HOOK_ACTIVE: AtomicBool = AtomicBool::new(false);
    static HOOK_HANDLE: AtomicIsize = AtomicIsize::new(0);
    static HOOK_THREAD_ID: AtomicU32 = AtomicU32::new(0);

    unsafe extern "system" fn keyboard_proc(
        n_code: i32,
        w_param: WPARAM,
        l_param: LPARAM,
    ) -> LRESULT {
        if n_code >= 0 && HOOK_ACTIVE.load(Ordering::Relaxed) {
            let kb = &*(l_param as *const KBDLLHOOKSTRUCT);
            let vk = kb.vkCode as u16;
            let alt_down = kb.flags & LLKHF_ALTDOWN != 0;
            let ctrl_down = GetKeyState(VK_CONTROL as i32) as u16 & 0x8000 != 0;

            let block = vk == VK_LWIN
                || vk == VK_RWIN              // Windows key (opens Start / Task View)
                || (vk == VK_TAB && alt_down) // Alt+Tab  — switch app
                || (vk == VK_F4 && alt_down)  // Alt+F4   — close window
                || (vk == VK_ESCAPE && ctrl_down) // Ctrl+Esc — Start menu
                || (vk == VK_ESCAPE && alt_down); // Alt+Esc  — switch window

            if block {
                return 1; // Non-zero return = keystroke consumed (blocked)
            }
        }
        CallNextHookEx(0, n_code, w_param, l_param)
    }

    pub fn install() {
        HOOK_ACTIVE.store(true, Ordering::Relaxed);
        std::thread::Builder::new()
            .name("keyboard-hook".into())
            .spawn(|| unsafe {
                HOOK_THREAD_ID.store(GetCurrentThreadId(), Ordering::Relaxed);
                let hmod = GetModuleHandleW(std::ptr::null());
                let hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), hmod, 0);
                HOOK_HANDLE.store(hook, Ordering::Relaxed);

                // Pump messages — the hook callback fires on this thread.
                let mut msg = std::mem::zeroed::<MSG>();
                while GetMessageW(&mut msg, 0, 0, 0) > 0 {
                    TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                }

                UnhookWindowsHookEx(HOOK_HANDLE.load(Ordering::Relaxed));
                HOOK_HANDLE.store(0, Ordering::Relaxed);
            })
            .expect("failed to spawn keyboard-hook thread");
    }

    pub fn uninstall() {
        HOOK_ACTIVE.store(false, Ordering::Relaxed);
        let thread_id = HOOK_THREAD_ID.swap(0, Ordering::Relaxed);
        if thread_id != 0 {
            unsafe {
                PostThreadMessageW(thread_id, WM_QUIT, 0, 0);
            }
        }
    }
}

pub fn install_keyboard_hook() {
    #[cfg(target_os = "windows")]
    imp::install();
}

pub fn uninstall_keyboard_hook() {
    #[cfg(target_os = "windows")]
    imp::uninstall();
}
