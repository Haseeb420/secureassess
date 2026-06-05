const CONFIG = {
  apiBaseUrl:
    // 1. Check if app-level override exists (for testing without rebuild)
    (window as any).__SECUREASSESS_CONFIG__?.apiBaseUrl ||
    // 2. Fall back to build-time env var
    import.meta.env.VITE_API_BASE_URL ||
    // 3. Last resort: localhost
    'http://localhost:8000',

  supabaseUrl:
    (window as any).__SECUREASSESS_CONFIG__?.supabaseUrl ||
    import.meta.env.VITE_SUPABASE_URL || '',

  supabaseAnonKey:
    (window as any).__SECUREASSESS_CONFIG__?.supabaseAnonKey ||
    import.meta.env.VITE_SUPABASE_ANON_KEY || '',
}

export default CONFIG
