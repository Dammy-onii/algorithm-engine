# Finance Interview Track

The Finance interview track turns payment routing from a fixed tutorial into a
repeatable systems-design coding exercise for banks, fintechs, technical
interviews, hiring events, and scored hackathons.

Each stage is directly shareable as `/interview/[challengeId]`; the challenge
id resolves both its existing visible world and its server-only suite.

The candidate does not receive a single static input/output pair. They author a
policy that runs once per routing decision while the payment environment keeps
changing around it.

## Problems

| # | Problem | Difficulty | Visible workload | Hidden suite |
|---|---|---|---:|---:|
| 20 | Intelligent Payment Routing | Higher Medium · guided | 36 payments | 6 scenarios |
| 21 | Peak Hour Payment Switch | Higher Medium | 96 payments | 8 scenarios |
| 22 | Production Payment Orchestrator | Hard | 500 payments | 10 scenarios |

All three use the same runtime and observation contract and begin with an empty
rule set. Difficulty increases through traffic diversity and volume, shorter
deadlines, and more overlapping incidents.

### Intelligent Payment Routing

The guided interview introduces asynchronous processing, finite provider
capacity, transaction compatibility, amount limits, deadlines, retries,
congestion, and scheduled outages. The function/action vocabulary is available,
but the candidate authors every rule.

The intended decision hierarchy is:

1. Filter providers that cannot handle the payment.
2. Protect urgent, high-value, and near-deadline traffic.
3. Avoid immediately repeating a failed provider.
4. Optimize flexible traffic by live expected cost and load.
5. Hold only when waiting is safe.

### Peak Hour Payment Switch

The visible scenario is a sustained mixed-traffic surge. Provider latency rises
under load, one rail degrades, another briefly goes offline, and urgent payroll
traffic competes with flexible consumer payments. Routing a payment consumes a
provider slot until the work completes, so every decision changes future
capacity.

### Production Payment Orchestrator

The hard problem streams 500 retail, refund, payroll, business, settlement, and
international payments. Providers have different type support, maximum values,
capacity, latency, reliability, and incident schedules. Failures can become
retryable work with limited attempts and backoff.

The hidden suite reverses visible assumptions: provider identities, relative
fees, traffic mixtures, restrictions, deadlines, outages, recoveries, and
capacity schedules change without changing the policy contract.

## Real-time runtime

The engine still performs one policy decision per tick, but Finance now has
autonomous work between decisions:

```text
Observe ready payment and providers
              ↓
Run first matching policy branch
              ↓
Route / hold / decline
              ↓
Advance clock
              ↓
Complete due in-flight work
Release capacity
Apply arrivals, retries, deadlines, outages, recoveries, fees and health
              ↓
Next observation
```

`WorldModule.advanceTick` is the domain-neutral lifecycle hook for this
autonomous activity. Existing worlds can omit it.

### Transactions

Interview transactions can define:

- arrival tick;
- amount and destination;
- consumer, business, international, payroll, refund, or settlement type;
- numeric priority;
- deadline;
- retry limit;
- customer-impact weight.

Deterministic batch generators represent interview-scale traffic without
copying hundreds of JSON records.

### Providers

Interview providers can define:

- scheduled outage, recovery, fee, reliability, latency, and capacity changes;
- concurrent processing capacity;
- extra congestion latency per in-flight payment;
- supported transaction types;
- maximum transaction value.

An online provider is not necessarily eligible. `canRouteA/B/C` combines online
state, capacity, type compatibility, and value limits.

### Failures and retries

A route books its provider fee. An unavailable or unsuccessful attempt also
books the failure penalty. A failed payment returns to the ready queue when its
retry and deadline budgets allow it. It becomes eligible after backoff, and the
next observation exposes retry count and the last provider.

Transactions finish as succeeded, failed, declined, or lost to timeout.

## Policy facts

Transaction facts include:

```text
amount
isConsumer / isBusiness / isInternational
isPayroll / isRefund / isSettlement
isHighValue
priority / isPriority
timeWaiting / deadlineRemaining
retryCount / maxRetries / canRetry
lastProviderA / lastProviderB / lastProviderC
```

Provider facts for A/B/C include:

```text
online / canRoute
fee / successRate / currentLatency / expectedCost
capacityRemaining / queueLength / congestion / healthScore
```

System facts include queue depth, in-flight work, outcome counts, failed
attempts, timeouts, priority failures, overload rejections, costs, average
processing time, throughput, and penalty score.

## Scoring

The runtime penalty score combines provider fees, failure penalties, timeout
penalties, priority-failure penalties, overload penalties, and accumulated queue
pressure.

The hidden evaluator converts every scenario to 0–100:

| Area | Weight |
|---|---:|
| Finalization | 15 |
| Successful completion | 25 |
| Timeout control | 20 |
| Priority protection | 15 |
| Overload avoidance | 10 |
| Cost and queue efficiency | 15 |

A submission passes only if its average reaches the challenge threshold and it
satisfies every hidden scenario. A strong baseline cannot hide one catastrophic
outage or high-value-surge failure.

## Hidden evaluation

`POST /api/interview/submit` accepts a challenge id and compiled policy. It
is the only code path that resolves or executes server-owned fixtures. Apply &
Run creates only the visible simulation; hidden cases remain dormant until the
candidate explicitly presses Submit.

After submission, the route streams newline-delimited events in execution order:

```text
suite-start
scenario-start
scenario-result
scenario-start
scenario-result
...
suite-complete
```

Studio therefore shows the active hidden case, completed-case progress, and each
case result as it finishes. The route returns only labels, aggregate metrics,
diagnostic categories, and scores. Raw hidden transactions, schedules, and
guardrails are not returned. Responses use `Cache-Control: no-store`.

The adversarial families are:

1. shifted fees and reliability;
2. primary-provider collapse and recovery;
3. latency spike and congestion cascade;
4. urgent payroll/high-value surge;
5. oscillating provider capacity;
6. type and amount compatibility traps;
7. short-deadline pressure;
8. reversal of the visibly preferred provider;
9. mid-run fee and reliability shock;
10. retry storm after correlated failures.

Tests prove that a memorized Provider B policy is rejected and that one
live-fact-driven policy can pass all ten cases.

## Security boundary

The hidden route evaluates the sandbox-safe visual policy DSL and enforces
payload, rule, and function limits.

Studio Code mode executes JavaScript locally for development. The server does
not execute submitted arbitrary JavaScript. A bank or multi-tenant deployment
must run Code-mode controllers in an isolated ephemeral worker/container with
CPU, memory, time, filesystem, and network limits. `new Function`, Node `vm`, or
a route-handler process is not a security boundary for untrusted interview code.
Production hosting must also add authenticated interview sessions, per-candidate
attempt limits, rate limiting, audit logs, encrypted result persistence, and
version-pinned suites. Those deployment controls are outside this local build.

## Verification

Automated tests cover:

- rejection of a provider-memorizing policy;
- all ten hidden scenario families;
- a general adaptive policy passing the complete hidden suite;
- the same policy completing all three visible scenarios and their objectives;
- compatibility with the original six Finance levels.

See `lib/interview/__tests__/financeInterview.test.ts`.
