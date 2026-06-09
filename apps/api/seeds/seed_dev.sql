-- ============================================================
-- SecureAssess — development seed data
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING)
-- Run via:  make db-seed
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- QUESTIONS
-- ────────────────────────────────────────────────────────────────────────────

-- 1. FizzBuzz — coding · easy
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, is_manually_scored)
VALUES (
  'aaa00001-0000-4000-a000-000000000001',
  'FizzBuzz',
  $$Given a positive integer n, print every integer from 1 to n (one per line).

- If the number is divisible by 3, print Fizz instead.
- If the number is divisible by 5, print Buzz instead.
- If divisible by both 3 and 5, print FizzBuzz.

Input: A single integer n (1 <= n <= 100)
Output: n lines, one value per line.$$,
  'coding', 'easy', 5000, 256,
  ARRAY['loops', 'conditionals', 'basics'],
  false
) ON CONFLICT (id) DO NOTHING;

-- 2. Two Sum — coding · medium
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, is_manually_scored)
VALUES (
  'aaa00002-0000-4000-a000-000000000002',
  'Two Sum',
  $$Given an array of integers and a target, return the indices of the two numbers that add up to target.

Exactly one solution exists. You may not use the same element twice.

Input:
- Line 1: space-separated integers (the array)
- Line 2: the target integer

Output: Two space-separated 0-based indices, e.g. 0 1$$,
  'coding', 'medium', 5000, 256,
  ARRAY['arrays', 'hash-map', 'two-pointers'],
  false
) ON CONFLICT (id) DO NOTHING;

-- 3. Valid Parentheses — coding · medium
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, is_manually_scored)
VALUES (
  'aaa00003-0000-4000-a000-000000000003',
  'Valid Parentheses',
  $$Given a string containing only ( ) { } [ ], determine if it is valid.

A string is valid if:
- Open brackets are closed by the same type of bracket.
- Open brackets are closed in the correct order.
- Every close bracket has a corresponding open bracket.

Input: A single string of bracket characters (1 <= length <= 10000)
Output: true or false$$,
  'coding', 'medium', 5000, 256,
  ARRAY['stack', 'strings', 'data-structures'],
  false
) ON CONFLICT (id) DO NOTHING;

-- 4. Binary Search — coding · easy
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, is_manually_scored)
VALUES (
  'aaa00004-0000-4000-a000-000000000004',
  'Binary Search',
  $$Given a sorted array of distinct integers and a target, return the index of target.
If the target does not exist, return -1. Your solution must run in O(log n).

Input:
- Line 1: space-separated sorted integers
- Line 2: the target integer

Output: The 0-based index, or -1 if not found.$$,
  'coding', 'easy', 5000, 256,
  ARRAY['binary-search', 'arrays', 'divide-and-conquer'],
  false
) ON CONFLICT (id) DO NOTHING;

-- 5. Longest Common Prefix — coding · hard
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, is_manually_scored)
VALUES (
  'aaa00005-0000-4000-a000-000000000005',
  'Longest Common Prefix',
  $$Find the longest common prefix string among an array of strings.
If there is no common prefix, return an empty string.

Input: A single line of space-separated words (1 <= words <= 200, each 1-200 chars)
Output: The longest common prefix, or an empty line if none.$$,
  'coding', 'hard', 8000, 256,
  ARRAY['strings', 'trie', 'divide-and-conquer'],
  false
) ON CONFLICT (id) DO NOTHING;

-- 6. Big-O of Binary Search — MCQ · easy
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, options, is_manually_scored)
VALUES (
  'aaa00006-0000-4000-a000-000000000006',
  'Time Complexity of Binary Search',
  'What is the worst-case time complexity of binary search on a sorted array of n elements?',
  'mcq', 'easy', 60000, 256,
  ARRAY['algorithms', 'big-o', 'searching'],
  '[
    {"id": "a", "text": "O(1)",       "is_correct": false},
    {"id": "b", "text": "O(log n)",   "is_correct": true},
    {"id": "c", "text": "O(n)",       "is_correct": false},
    {"id": "d", "text": "O(n log n)", "is_correct": false}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 7. FIFO Data Structure — MCQ · easy
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, options, is_manually_scored)
VALUES (
  'aaa00007-0000-4000-a000-000000000007',
  'FIFO Data Structure',
  'Which data structure follows First-In, First-Out (FIFO) ordering?',
  'mcq', 'easy', 60000, 256,
  ARRAY['data-structures', 'fundamentals'],
  '[
    {"id": "a", "text": "Stack",               "is_correct": false},
    {"id": "b", "text": "Queue",               "is_correct": true},
    {"id": "c", "text": "Binary Search Tree",  "is_correct": false},
    {"id": "d", "text": "Hash Map",            "is_correct": false}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 8. REST Architecture Constraint — MCQ · medium
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, options, is_manually_scored)
VALUES (
  'aaa00008-0000-4000-a000-000000000008',
  'REST Architecture Constraint',
  'Which of the following is NOT a constraint of REST architecture?',
  'mcq', 'medium', 60000, 256,
  ARRAY['web', 'api-design', 'rest'],
  '[
    {"id": "a", "text": "Statelessness",          "is_correct": false},
    {"id": "b", "text": "Client-Server",           "is_correct": false},
    {"id": "c", "text": "Persistent connections",  "is_correct": true},
    {"id": "d", "text": "Uniform Interface",       "is_correct": false}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 9. Stack vs Queue — text · medium (manually scored)
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, is_manually_scored)
VALUES (
  'aaa00009-0000-4000-a000-000000000009',
  'Stack vs Queue',
  $$Explain the difference between a stack and a queue in your own words.

Include:
- How each structure orders elements
- A real-world analogy for each
- One concrete use-case in software engineering for each$$,
  'text', 'medium', 300000, 256,
  ARRAY['data-structures', 'fundamentals', 'design'],
  true
) ON CONFLICT (id) DO NOTHING;

-- 10. SOLID Principles — text · hard (manually scored)
INSERT INTO questions (id, title, description, type, difficulty, time_limit_ms, memory_limit_mb, tags, is_manually_scored)
VALUES (
  'aaa00010-0000-4000-a000-000000000010',
  'SOLID Principles',
  $$Choose any three of the five SOLID principles and for each one:

1. State the principle clearly.
2. Explain why it matters.
3. Give a short code example (pseudocode is fine) showing a violation and the corrected version.$$,
  'text', 'hard', 600000, 256,
  ARRAY['oop', 'design-principles', 'software-design'],
  true
) ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- TEST CASES  (coding questions only)
-- ────────────────────────────────────────────────────────────────────────────

-- ── FizzBuzz ─────────────────────────────────────────────────────────────────
INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden) VALUES
  ('cc000001-0000-4000-a000-000000000001', 'aaa00001-0000-4000-a000-000000000001', '5',  '1\n2\nFizz\n4\nBuzz', false),
  ('cc000002-0000-4000-a000-000000000002', 'aaa00001-0000-4000-a000-000000000001', '3',  '1\n2\nFizz', false),
  ('cc000003-0000-4000-a000-000000000003', 'aaa00001-0000-4000-a000-000000000001', '15', '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', true),
  ('cc000004-0000-4000-a000-000000000004', 'aaa00001-0000-4000-a000-000000000001', '1',  '1', true)
ON CONFLICT (id) DO NOTHING;

-- ── Two Sum ──────────────────────────────────────────────────────────────────
INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden) VALUES
  ('cc000011-0000-4000-a000-000000000001', 'aaa00002-0000-4000-a000-000000000002', '2 7 11 15\n9',   '0 1', false),
  ('cc000012-0000-4000-a000-000000000002', 'aaa00002-0000-4000-a000-000000000002', '3 2 4\n6',       '1 2', false),
  ('cc000013-0000-4000-a000-000000000003', 'aaa00002-0000-4000-a000-000000000002', '3 3\n6',         '0 1', true),
  ('cc000014-0000-4000-a000-000000000004', 'aaa00002-0000-4000-a000-000000000002', '1 5 3 8 2\n10',  '1 3', true)
ON CONFLICT (id) DO NOTHING;

-- ── Valid Parentheses ────────────────────────────────────────────────────────
INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden) VALUES
  ('cc000021-0000-4000-a000-000000000001', 'aaa00003-0000-4000-a000-000000000003', '()',     'true',  false),
  ('cc000022-0000-4000-a000-000000000002', 'aaa00003-0000-4000-a000-000000000003', '()[]{}', 'true',  false),
  ('cc000023-0000-4000-a000-000000000003', 'aaa00003-0000-4000-a000-000000000003', '(]',     'false', false),
  ('cc000024-0000-4000-a000-000000000004', 'aaa00003-0000-4000-a000-000000000003', '{[()]}', 'true',  true),
  ('cc000025-0000-4000-a000-000000000005', 'aaa00003-0000-4000-a000-000000000003', '([)]',   'false', true),
  ('cc000026-0000-4000-a000-000000000006', 'aaa00003-0000-4000-a000-000000000003', ']',      'false', true)
ON CONFLICT (id) DO NOTHING;

-- ── Binary Search ────────────────────────────────────────────────────────────
INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden) VALUES
  ('cc000031-0000-4000-a000-000000000001', 'aaa00004-0000-4000-a000-000000000004', '-1 0 3 5 9 12\n9',         '4',  false),
  ('cc000032-0000-4000-a000-000000000002', 'aaa00004-0000-4000-a000-000000000004', '-1 0 3 5 9 12\n2',         '-1', false),
  ('cc000033-0000-4000-a000-000000000003', 'aaa00004-0000-4000-a000-000000000004', '1\n1',                     '0',  true),
  ('cc000034-0000-4000-a000-000000000004', 'aaa00004-0000-4000-a000-000000000004', '1 3 5 7 9 11 13 15 17 19\n15', '7', true)
ON CONFLICT (id) DO NOTHING;

-- ── Longest Common Prefix ─────────────────────────────────────────────────────
INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden) VALUES
  ('cc000041-0000-4000-a000-000000000001', 'aaa00005-0000-4000-a000-000000000005', 'flower flow flight',          'fl',        false),
  ('cc000042-0000-4000-a000-000000000002', 'aaa00005-0000-4000-a000-000000000005', 'dog racecar car',             '',          false),
  ('cc000043-0000-4000-a000-000000000003', 'aaa00005-0000-4000-a000-000000000005', 'interview interviewee interviewer', 'interview', true),
  ('cc000044-0000-4000-a000-000000000004', 'aaa00005-0000-4000-a000-000000000005', 'a',                           'a',         true)
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- ASSESSMENTS
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Backend Engineering Assessment (real · open · 90 min)
INSERT INTO assessments (id, title, status, duration_minutes, allowed_languages, security_level, question_ids, type, assessment_type, is_mock, timezone)
VALUES (
  'bbb00001-0000-4000-a000-000000000001',
  'Backend Engineering Assessment',
  'active', 90,
  ARRAY['python', 'javascript', 'java', 'cpp'],
  'strict',
  ARRAY[
    'aaa00001-0000-4000-a000-000000000001'::UUID,
    'aaa00002-0000-4000-a000-000000000002'::UUID,
    'aaa00003-0000-4000-a000-000000000003'::UUID,
    'aaa00005-0000-4000-a000-000000000005'::UUID,
    'aaa00009-0000-4000-a000-000000000009'::UUID
  ],
  'open', 'open', false, 'UTC'
) ON CONFLICT (id) DO NOTHING;

-- 2. Frontend Developer Screen (real · open · 60 min)
INSERT INTO assessments (id, title, status, duration_minutes, allowed_languages, security_level, question_ids, type, assessment_type, is_mock, timezone)
VALUES (
  'bbb00002-0000-4000-a000-000000000002',
  'Frontend Developer Screen',
  'active', 60,
  ARRAY['javascript', 'typescript'],
  'standard',
  ARRAY[
    'aaa00004-0000-4000-a000-000000000004'::UUID,
    'aaa00006-0000-4000-a000-000000000006'::UUID,
    'aaa00007-0000-4000-a000-000000000007'::UUID,
    'aaa00008-0000-4000-a000-000000000008'::UUID,
    'aaa00010-0000-4000-a000-000000000010'::UUID
  ],
  'open', 'open', false, 'UTC'
) ON CONFLICT (id) DO NOTHING;

-- 3. Full Stack Practice Mock (mock · 45 min)
INSERT INTO assessments (id, title, status, duration_minutes, allowed_languages, security_level, question_ids, type, assessment_type, is_mock, timezone)
VALUES (
  'bbb00003-0000-4000-a000-000000000003',
  'Full Stack Practice Mock',
  'active', 45,
  ARRAY['python', 'javascript', 'typescript', 'java', 'cpp'],
  'standard',
  ARRAY[
    'aaa00001-0000-4000-a000-000000000001'::UUID,
    'aaa00002-0000-4000-a000-000000000002'::UUID,
    'aaa00006-0000-4000-a000-000000000006'::UUID
  ],
  'open', 'open', true, 'UTC'
) ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- ASSESSMENT_QUESTIONS  (weightages sum to exactly 100 per assessment)
-- ────────────────────────────────────────────────────────────────────────────

-- Assessment 1: Backend Engineering  (5 questions → 100%)
INSERT INTO assessment_questions (id, assessment_id, question_id, weightage, order_index) VALUES
  ('aq000001', 'bbb00001-0000-4000-a000-000000000001', 'aaa00001-0000-4000-a000-000000000001', 10, 0),
  ('aq000002', 'bbb00001-0000-4000-a000-000000000001', 'aaa00002-0000-4000-a000-000000000002', 25, 1),
  ('aq000003', 'bbb00001-0000-4000-a000-000000000001', 'aaa00003-0000-4000-a000-000000000003', 25, 2),
  ('aq000004', 'bbb00001-0000-4000-a000-000000000001', 'aaa00005-0000-4000-a000-000000000005', 25, 3),
  ('aq000005', 'bbb00001-0000-4000-a000-000000000001', 'aaa00009-0000-4000-a000-000000000009', 15, 4)
ON CONFLICT (id) DO NOTHING;

-- Assessment 2: Frontend Developer Screen  (5 questions → 100%)
INSERT INTO assessment_questions (id, assessment_id, question_id, weightage, order_index) VALUES
  ('aq000011', 'bbb00002-0000-4000-a000-000000000002', 'aaa00004-0000-4000-a000-000000000004', 20, 0),
  ('aq000012', 'bbb00002-0000-4000-a000-000000000002', 'aaa00006-0000-4000-a000-000000000006', 15, 1),
  ('aq000013', 'bbb00002-0000-4000-a000-000000000002', 'aaa00007-0000-4000-a000-000000000007', 15, 2),
  ('aq000014', 'bbb00002-0000-4000-a000-000000000002', 'aaa00008-0000-4000-a000-000000000008', 20, 3),
  ('aq000015', 'bbb00002-0000-4000-a000-000000000002', 'aaa00010-0000-4000-a000-000000000010', 30, 4)
ON CONFLICT (id) DO NOTHING;

-- Assessment 3: Full Stack Practice Mock  (3 questions → 100%)
INSERT INTO assessment_questions (id, assessment_id, question_id, weightage, order_index) VALUES
  ('aq000021', 'bbb00003-0000-4000-a000-000000000003', 'aaa00001-0000-4000-a000-000000000001', 30, 0),
  ('aq000022', 'bbb00003-0000-4000-a000-000000000003', 'aaa00002-0000-4000-a000-000000000002', 40, 1),
  ('aq000023', 'bbb00003-0000-4000-a000-000000000003', 'aaa00006-0000-4000-a000-000000000006', 30, 2)
ON CONFLICT (id) DO NOTHING;


COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Summary (runs outside the transaction so it always prints)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  q_count  INT; tc_count INT; a_count INT; aq_count INT;
BEGIN
  SELECT COUNT(*) INTO q_count  FROM questions            WHERE id::text LIKE 'aaa%';
  SELECT COUNT(*) INTO tc_count FROM test_cases           WHERE id::text LIKE 'tc%';
  SELECT COUNT(*) INTO a_count  FROM assessments          WHERE id::text LIKE 'bbb%';
  SELECT COUNT(*) INTO aq_count FROM assessment_questions WHERE id       LIKE 'aq%';
  RAISE NOTICE 'Seed complete — questions: %, test_cases: %, assessments: %, assessment_questions: %',
    q_count, tc_count, a_count, aq_count;
END $$;
