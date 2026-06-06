import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Keyboard, X } from 'lucide-react'

type Tab = 'io' | 'shortcuts'

const IO_EXAMPLES = [
  {
    lang: 'Python',
    color: '#3572A5',
    read: `name = input()          # reads one line\nlines = sys.stdin.read().splitlines()  # all lines`,
    write: `print("Hello, " + name)`,
  },
  {
    lang: 'JavaScript',
    color: '#F7DF1E',
    read: `// Lines collected in the 'lines' array\n// (starter template sets this up for you)\nconst a = lines[0];   // first line\nconst b = lines[1];   // second line`,
    write: `console.log("Answer: " + result);`,
  },
  {
    lang: 'TypeScript',
    color: '#3178C6',
    read: `// Same as JavaScript — starter template\n// includes the required declare shims\nconst a = lines[0];`,
    write: `console.log(\`Answer: \${result}\`);`,
  },
  {
    lang: 'Java',
    color: '#b07219',
    read: `Scanner sc = new Scanner(System.in);\nString name = sc.nextLine();\nint n    = sc.nextInt();`,
    write: `System.out.println("Hello, " + name);`,
  },
  {
    lang: 'C++',
    color: '#f34b7d',
    read: `string name;\ngetline(cin, name);   // full line\nint n; cin >> n;      // one value`,
    write: `cout << "Hello, " << name << "\\n";`,
  },
  {
    lang: 'Go',
    color: '#00ADD8',
    read: `reader := bufio.NewReader(os.Stdin)\nname, _ := reader.ReadString('\\n')\nname = strings.TrimSpace(name)`,
    write: `fmt.Printf("Hello, %s!\\n", name)`,
  },
  {
    lang: 'Rust',
    color: '#dea584',
    read: `let stdin = io::stdin();\nlet name = stdin.lock()\n  .lines().next().unwrap().unwrap();`,
    write: `println!("Hello, {}!", name);`,
  },
  {
    lang: 'C# / Kotlin / Ruby / others',
    color: '#9B59B6',
    read: `// All follow the same pattern:\n// read lines from stdin`,
    write: `// print to stdout — no extra prompts`,
  },
] as const

interface IdeGuideModalProps {
  open: boolean
  onClose: () => void
}

export function IdeGuideModal({ open, onClose }: IdeGuideModalProps) {
  const [tab, setTab] = useState<Tab>('io')

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            className="relative flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#383850] bg-[#1E1E2E] shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#383850] px-6 py-4">
              <h2
                id="guide-title"
                className="text-[15px] font-semibold text-[#CDD6F4]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Assessment Guide
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close guide"
                className="flex items-center justify-center rounded-lg p-1.5 text-[#CDD6F4]/40 transition-colors hover:bg-white/10 hover:text-[#CDD6F4]"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-[#383850]">
              {([
                { id: 'io' as Tab, label: 'I/O Guide', Icon: BookOpen },
                { id: 'shortcuts' as Tab, label: 'Shortcuts', Icon: Keyboard },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={[
                    'flex items-center gap-2 border-b-2 px-5 py-3 text-[13px] transition-colors',
                    tab === id
                      ? 'border-brand-orange text-[#CDD6F4]'
                      : 'border-transparent text-[#CDD6F4]/40 hover:text-[#CDD6F4]/70',
                  ].join(' ')}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'io' ? <IOGuideContent /> : <ShortcutsContent />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function IOGuideContent() {
  return (
    <div className="space-y-6 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Overview */}
      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#CDD6F4]/30">
          How it works
        </h3>
        <div className="rounded-xl border border-[#383850] bg-[#262637] p-4 leading-relaxed text-[#CDD6F4]/70">
          <p>
            Each test case sends input through{' '}
            <code className="rounded bg-[#383850] px-1.5 py-0.5 font-dm-mono text-[11px] text-brand-orange">
              stdin
            </code>
            . Your program reads it, computes the result, and prints it to{' '}
            <code className="rounded bg-[#383850] px-1.5 py-0.5 font-dm-mono text-[11px] text-brand-orange">
              stdout
            </code>
            .
          </p>
          <p className="mt-2 text-[#CDD6F4]/45">
            Output is compared line-by-line to the expected answer. Capitalisation,
            spaces, and punctuation all matter.
          </p>
        </div>
      </section>

      {/* Do / Don't */}
      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#CDD6F4]/30">
          Rules
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-green-500/20 bg-green-500/[0.05] p-3">
            <p className="mb-2 text-xs font-semibold text-green-400">Do</p>
            <ul className="space-y-1 text-xs text-[#CDD6F4]/55">
              <li>✓ Read from stdin</li>
              <li>✓ Print only the answer</li>
              <li>✓ Match the expected format exactly</li>
              <li>✓ Use the starter template</li>
            </ul>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3">
            <p className="mb-2 text-xs font-semibold text-red-400">Don't</p>
            <ul className="space-y-1 text-xs text-[#CDD6F4]/55">
              <li>✗ Print input prompts ("Enter x:")</li>
              <li>✗ Print debug / log messages</li>
              <li>✗ Add extra blank lines</li>
              <li>✗ Read from files or network</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Multi-line input */}
      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#CDD6F4]/30">
          Multi-value input
        </h3>
        <div className="rounded-xl border border-[#383850] bg-[#262637] p-4 text-[#CDD6F4]/70">
          <p className="mb-3 leading-relaxed">
            When a problem has multiple inputs, each value is on its own line. Read them in order.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 font-dm-mono text-[10px] text-[#CDD6F4]/30">Sample stdin</p>
              <pre className="rounded-lg bg-[#1E1E2E] p-2.5 font-dm-mono text-[11px] text-[#CDD6F4]/65 leading-relaxed">
                {"Alice\n25\n3.14"}
              </pre>
            </div>
            <div>
              <p className="mb-1 font-dm-mono text-[10px] text-[#CDD6F4]/30">What each line means</p>
              <pre className="rounded-lg bg-[#1E1E2E] p-2.5 font-dm-mono text-[11px] text-[#CDD6F4]/65 leading-relaxed">
                {'line 0 → "Alice"\nline 1 → "25"\nline 2 → "3.14"'}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Language examples */}
      <section>
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#CDD6F4]/30">
          Reading & writing — by language
        </h3>
        <div className="space-y-2.5">
          {IO_EXAMPLES.map((ex) => (
            <div key={ex.lang} className="rounded-xl border border-[#383850] bg-[#262637] p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ex.color }} />
                <span className="text-[12px] font-semibold text-[#CDD6F4]">{ex.lang}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <p className="mb-1 font-dm-mono text-[9px] font-semibold uppercase tracking-widest text-[#CDD6F4]/25">
                    Read input
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-[#1E1E2E] p-2.5 font-dm-mono text-[11px] leading-relaxed text-[#CDD6F4]/65">
                    {ex.read}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 font-dm-mono text-[9px] font-semibold uppercase tracking-widest text-[#CDD6F4]/25">
                    Write output
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-[#1E1E2E] p-2.5 font-dm-mono text-[11px] leading-relaxed text-[#CDD6F4]/65">
                    {ex.write}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#CDD6F4]/30">
          Every starter template already includes the correct boilerplate for reading stdin
          in that language — you just need to process{' '}
          <code className="font-dm-mono text-[10px] text-[#CDD6F4]/50">lines[0]</code>,{' '}
          <code className="font-dm-mono text-[10px] text-[#CDD6F4]/50">lines[1]</code>… or
          use the language's native stdin API.
        </p>
      </section>

      {/* Run vs Submit */}
      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#CDD6F4]/30">
          Run vs Submit
        </h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3 rounded-xl border border-[#383850] bg-[#262637] p-3">
            <span className="mt-0.5 shrink-0 rounded-full bg-brand-orange/20 px-2 py-0.5 font-dm-mono text-[10px] text-brand-orange">
              Run
            </span>
            <p className="text-xs leading-relaxed text-[#CDD6F4]/60">
              Executes your code against the <strong className="text-[#CDD6F4]/75">visible sample test cases</strong> only.
              Use this to verify your logic before submitting.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-[#383850] bg-[#262637] p-3">
            <span className="mt-0.5 shrink-0 rounded-full bg-white/10 px-2 py-0.5 font-dm-mono text-[10px] text-[#CDD6F4]/60">
              Submit
            </span>
            <p className="text-xs leading-relaxed text-[#CDD6F4]/60">
              Runs against <strong className="text-[#CDD6F4]/75">all test cases</strong> including hidden ones, then
              records your final score. You can submit multiple times.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function ShortcutsContent() {
  return (
    <div className="space-y-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <section>
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#CDD6F4]/30">
          Editor shortcuts
        </h3>
        <div className="space-y-1.5">
          {[
            { action: 'Run sample tests',  keys: ['⌘/Ctrl', '↵'] },
            { action: 'Submit solution',   keys: ['⌘/Ctrl', '⇧', '↵'] },
            { action: 'Save code',         keys: ['⌘/Ctrl', 'S'] },
          ].map(({ action, keys }) => (
            <div
              key={action}
              className="flex items-center justify-between rounded-lg border border-[#383850] bg-[#262637] px-4 py-3"
            >
              <span className="text-[13px] text-[#CDD6F4]/60">{action}</span>
              <div className="flex items-center gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded bg-[#383850] px-2 py-0.5 font-dm-mono text-[11px] text-[#CDD6F4]"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
