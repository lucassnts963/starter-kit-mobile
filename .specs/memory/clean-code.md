# Clean Code Standards

> Rules that define what "good code" means in this project. Every agent must follow these. Every code review checks against these.

---

## SOLID Principles

| Principle | Rule | Why |
|---|---|---|
| **S**ingle Responsibility | Every class, function, and component has exactly one reason to change | Enables isolated testing. A class that does 3 things needs 3x more test setup. |
| **O**pen/Closed | Extend behavior via composition or interfaces — never modify existing tested code | Prevents regression. New feature = new file, not edits to working code. |
| **L**iskov Substitution | Subtypes must be replaceable by their base type without breaking behavior | Prevents surprise test failures from inheritance chains. |
| **I**nterface Segregation | Small, focused interfaces. No "god interfaces" with 10+ methods | Mocks become trivial. A 3-method interface is easy to stub. |
| **D**ependency Inversion | Depend on abstractions, not concretions. Inject dependencies — never `new` inside a constructor | The single biggest enabler of testability. Swap real DB for mock without touching business logic. |

---

## Metrics

| Metric | Threshold | Reason |
|---|---|---|
| **Function length** | Max 20 lines | Fits on one screen. Tests become trivial. |
| **Function parameters** | Max 3 | Beyond 3, use an options/params object. Each parameter adds test combinations. |
| **Cyclomatic complexity** | Max 5 per function | Each branch needs its own test. High complexity = combinatorial test explosion. |
| **Class/module lines** | Max 200 | If it's bigger, it has multiple responsibilities. |
| **File length** | Max 300 lines | Exception: generated code, large switch statements for routing. |
| **Dependencies per module** | Max 5 imports from other project modules | High coupling = test setup becomes a nightmare. |

---

## Naming

| Context | Convention | Example |
|---|---|---|
| Boolean variables | `is`, `has`, `should` prefix | `isLoading`, `hasError`, `shouldRetry` |
| Event handlers | `handle` + event | `handleSubmit`, `handleInputChange` |
| Functions that return a value | Noun or noun phrase | `getUserById`, `calculateTotal` |
| Functions that perform an action | Verb | `saveUser`, `sendEmail` |
| Test names | `should <behavior> when <condition>` | `should return error when email is invalid` |

---

## Forbidden Patterns (Anti-Patterns)

| Pattern | Why Forbidden | Fix |
|---|---|---|
| **God class/component** (200+ lines) | Untestable, multiple responsibilities | Split by responsibility |
| **Magic numbers/strings** | No semantic meaning, hard to test edge cases | Named constants or enums |
| **`new` in constructor** | Hard dependency, impossible to mock | Inject via constructor parameter |
| **Static singletons / global state** | Tests pollute each other, flaky tests | Inject shared state, use factory |
| **Deep nesting** (>3 levels) | Each level adds test complexity | Early returns, extract functions |
| **Boolean trap** (`fn(true, false, true)`) | Caller intent is invisible | Options object or named parameters |
| **Comment explaining what code does** | Code should be self-documenting | Rename function/variable instead |
| **Catching and swallowing errors** | Silent failures, impossible to test error paths | Log + rethrow, or handle explicitly |

---

## Testability Rules

| Rule | Implementation |
|---|---|
| Every dependency is injectable | Pass via constructor, parameter, or context. Never import and use directly in business logic. |
| Side effects are isolated | I/O, HTTP, DB calls live at the edges (handlers, controllers). Core logic is pure functions. |
| Mock at seams, not internals | Mock interfaces, not implementation details. If you change an internal helper and a test breaks, the test is wrong. |
| One assert per test | Exception: closely related assertions on the same behavior (e.g., checking multiple fields of a result). |
| Arrange → Act → Assert | Every test has exactly 3 sections, clearly separated by blank lines. |

---

## Project-Specific Patterns

These patterns are mandatory for this codebase:

| Layer | Pattern | Example |
|---|---|---|---|
| **Backend** | Repository per entity | `UserRepository` handles all `users` table access |
| **Backend** | Adapter per external service | `StripeAdapter` wraps Stripe API. `S3Adapter` wraps file storage. |
| **Backend** | Service orchestrates | `PaymentService` coordinates repository + adapter, enforces business rules. |
| **Backend** | Thin handlers | Handlers parse input, call service, format output. Zero business logic. |
| **Backend** | Business logic in `business/` | Pure functions in services, no I/O. Fully unit-testable via mocked adapters/repositories. |
| **Frontend** | One component per file | Default export only. No multiple components per file. |
| **Frontend** | State via {STATE_MANAGEMENT} | Local state for UI-only, store for shared state |
| **Frontend** | Filtering via memoized/computed | Never mutate the source list — derive a filtered view |

---

## Refactor Checklist

After every Green phase, verify:

```
[ ] Functions under 20 lines
[ ] No more than 3 parameters per function
[ ] Dependencies injected — no new in constructors
[ ] No magic numbers or strings
[ ] No deep nesting (>3 levels)
[ ] Names explain intent (function, variable, parameter)
[ ] One responsibility per class/function
[ ] Dead code removed (not commented out)
[ ] No duplicated logic — if it appears twice, extract it
[ ] All tests still pass after refactoring
```

## References

- `.specs/memory/conventions.md` — naming and file structure conventions
- `.specs/memory/component-catalog.md` — reusable components to leverage before writing new code
- `run-tdd.md` — TDD cycle that applies these standards
