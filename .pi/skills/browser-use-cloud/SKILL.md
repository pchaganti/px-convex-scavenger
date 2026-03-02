---
name: browser-use-cloud
description: Cloud-based AI browser agent for autonomous web tasks. Use when you need to perform complex browser automation tasks autonomously, scrape websites that require AI reasoning, fill forms intelligently, extract structured data from web pages, or perform multi-step web workflows. Triggers include "autonomous browsing", "AI browser", "browser-use", "scrape with AI", "extract structured data from website", "fill out form intelligently", "navigate website and find", or when the task requires reasoning about page content rather than just clicking elements. Prefer this over web-fetch when the task involves multiple steps, requires understanding page semantics, or when you need structured output.
---

# Browser Use Cloud SDK

Cloud-based AI browser agent that autonomously completes web tasks.

**When to use this vs. web-fetch:**
- Use **browser-use-cloud** for autonomous multi-step tasks requiring AI reasoning
- Use **web-fetch** for simple, deterministic browser automation (click this, fill that)

## Setup

API key is set in environment: `BROWSER_USE_API_KEY`

```bash
# Install SDK
pip install browser-use-sdk
```

## Quick Examples

### Simple Task (Python)

```python
from browser_use_sdk.v3 import AsyncBrowserUse

client = AsyncBrowserUse()

# Run a task and get result
result = await client.run("Find the latest dark pool data for AAPL on unusualwhales.com")
print(result.output)   # str
print(result.status)   # BuAgentSessionStatus
print(result.total_cost_usd)  # Cost tracking
```

### Structured Output

```python
from browser_use_sdk.v3 import AsyncBrowserUse
from pydantic import BaseModel

class DarkPoolData(BaseModel):
    ticker: str
    total_volume: int
    buy_ratio: float
    largest_print: int
    date: str

client = AsyncBrowserUse()
result = await client.run(
    "Get today's dark pool summary for NVDA from unusualwhales.com/stock/NVDA/dark-pool",
    output_schema=DarkPoolData
)
print(result.output)  # DarkPoolData(ticker="NVDA", total_volume=..., ...)
```

### Session Reuse (Multi-Step)

```python
# Create session for multiple tasks
session = await client.sessions.create(proxy_country_code="us")

# First task: Navigate and authenticate
result1 = await client.run(
    "Go to unusualwhales.com and accept cookies",
    session_id=str(session.id),
    keep_alive=True
)

# Second task: Extract data (same session, already set up)
result2 = await client.run(
    "Navigate to the options flow page and get the top 5 largest call sweeps",
    session_id=str(session.id),
    keep_alive=True
)

# Cleanup
await client.sessions.stop(str(session.id))
```

---

# API Reference (v3 Experimental)

## Constructor

```python
from browser_use_sdk.v3 import AsyncBrowserUse, BrowserUse

# Async client (recommended)
client = AsyncBrowserUse(
    api_key="...",      # default: BROWSER_USE_API_KEY env var
    base_url="...",     # default: https://api.browser-use.com/api/v3
    timeout=30.0        # HTTP request timeout (not polling timeout)
)

# Sync client (blocking)
client = BrowserUse(api_key="...", base_url="...", timeout=30.0)

# Context manager (sync only)
with BrowserUse() as client:
    result = client.run("Find the top HN post")
```

## run() Parameters

```python
result = await client.run(
    "Your task description",
    
    # Model selection
    model="bu-mini",           # "bu-mini" (default, faster) or "bu-max" (more capable)
    
    # Structured output
    output_schema=MyModel,     # Pydantic model for typed output (alias: schema)
    
    # Session management
    session_id="...",          # Reuse existing session
    keep_alive=False,          # Keep session alive after task (default: False)
    
    # Cost & proxy
    max_cost_usd=1.0,          # Cost cap in USD
    proxy_country_code="us",   # Residential proxy country (195+ countries)
    
    # Persistent state
    profile_id="uuid",         # Browser profile (cookies, localStorage persist)
)
```

## SessionResult Fields

After `await client.run()`:

```python
result.output                  # str or Pydantic model
result.id                      # Session UUID
result.status                  # "idle", "running", "stopped", "timed_out", "error"
result.model                   # "bu-mini" or "bu-max"
result.live_url                # Real-time browser monitoring URL

# Cost tracking
result.total_cost_usd          # Total cost (string)
result.llm_cost_usd            # LLM cost
result.proxy_cost_usd          # Proxy cost
result.proxy_used_mb           # Proxy bandwidth used

# Token usage
result.total_input_tokens
result.total_output_tokens

# Timestamps
result.created_at
result.updated_at
```

## Sessions Resource

```python
# Create session (optionally with task)
session = await client.sessions.create(
    proxy_country_code="us",
    profile_id="...",          # Optional: load persistent profile
)

# List sessions
sessions_list = await client.sessions.list(page=1, page_size=20)

# Get session details
details = await client.sessions.get(str(session.id))

# Stop session
await client.sessions.stop(str(session.id), strategy="session")  # Destroy sandbox (default)
await client.sessions.stop(str(session.id), strategy="task")     # Stop task only, keep session

# Delete session
await client.sessions.delete(str(session.id))
```

## File Upload/Download

```python
from browser_use_sdk.v3 import FileUploadItem

# Upload files before running a task
upload_resp = await client.sessions.upload_files(
    str(session.id),
    files=[FileUploadItem(name="data.csv", content_type="text/csv")]
)
# PUT each file to upload_resp.files[i].upload_url

# List files in session workspace
file_list = await client.sessions.files(
    str(session.id),
    include_urls=True,    # Presigned download URLs (60s expiry)
    prefix="outputs/",    # Filter by path
    limit=50,             # Max per page
)
```

## Error Handling

```python
from browser_use_sdk.v3 import BrowserUseError

try:
    result = await client.run("Do something")
except TimeoutError:
    print("SDK polling timed out (5 min default)")
except BrowserUseError as e:
    print(f"API error: {e}")
finally:
    await client.close()
```

---

# Key Concepts

| Concept | Description |
|---------|-------------|
| **Task** | Text prompt → agent browses autonomously → returns output |
| **Session** | Stateful browser sandbox. Auto-created or manual for follow-ups |
| **Profile** | Persistent browser state (cookies, localStorage). Survives sessions |
| **Proxies** | Set `proxy_country_code`. 195+ countries. CAPTCHAs auto-handled |
| **Stealth** | On by default. Anti-detect, CAPTCHA solving, ad blocking |
| **Models** | `bu-mini` (faster/cheaper) and `bu-max` (more capable) |
| **Cost control** | Set `max_cost_usd` to cap spending |
| **keep_alive** | If True, session stays idle for follow-ups |
| **Live URL** | Every session has `live_url` for real-time monitoring |

---

# Trading-Specific Examples

### Extract Dark Pool Data

```python
from browser_use_sdk.v3 import AsyncBrowserUse
from pydantic import BaseModel
from typing import List

class DarkPoolDay(BaseModel):
    date: str
    volume: int
    buy_ratio: float

class DarkPoolSummary(BaseModel):
    ticker: str
    five_day_avg_buy_ratio: float
    flow_direction: str  # "ACCUMULATION", "DISTRIBUTION", "NEUTRAL"
    daily_data: List[DarkPoolDay]

client = AsyncBrowserUse()

result = await client.run(
    """Go to unusualwhales.com/stock/NVDA/dark-pool and extract:
    1. The 5-day dark pool summary
    2. Daily breakdown with date, volume, and buy ratio
    3. Determine if the flow is ACCUMULATION (>60% buy), DISTRIBUTION (<40% buy), or NEUTRAL""",
    output_schema=DarkPoolSummary,
    model="bu-max"  # Use more capable model for complex extraction
)

print(f"NVDA: {result.output.flow_direction}")
print(f"5-day avg buy ratio: {result.output.five_day_avg_buy_ratio:.1%}")
```

### Extract Options Flow

```python
class OptionFlow(BaseModel):
    ticker: str
    strike: float
    expiry: str
    premium: int
    side: str  # "CALL" or "PUT"
    type: str  # "SWEEP", "BLOCK", etc.

class FlowSummary(BaseModel):
    flows: List[OptionFlow]
    total_call_premium: int
    total_put_premium: int

result = await client.run(
    "Go to unusualwhales.com/flow and get the top 10 largest options trades from today",
    output_schema=FlowSummary
)
```

### Multi-Step Research

```python
# Create persistent session
session = await client.sessions.create(proxy_country_code="us")

# Step 1: Get dark pool data
dp_result = await client.run(
    "Get 5-day dark pool summary for AAPL from unusualwhales.com",
    session_id=str(session.id),
    keep_alive=True
)

# Step 2: Get options chain (same session)
options_result = await client.run(
    "Now navigate to the options page and get ATM call prices for next month expiry",
    session_id=str(session.id),
    keep_alive=True
)

# Step 3: Check news (same session)
news_result = await client.run(
    "Check finviz.com/quote.ashx?t=AAPL for any recent news that might explain the flow",
    session_id=str(session.id)
)

await client.sessions.stop(str(session.id))
```

### Screenshot for Documentation

```python
# The agent can take screenshots as part of tasks
result = await client.run(
    "Go to finance.yahoo.com/quote/AAPL and take a screenshot of the current price chart",
    keep_alive=True
)

# Download files from session
files = await client.sessions.files(str(result.id), include_urls=True)
for f in files.files:
    print(f.url)  # Download URL
```

---

# v2 API (Legacy)

The v2 API is still available for simpler use cases:

```python
from browser_use_sdk import AsyncBrowserUse

client = AsyncBrowserUse()
result = await client.run("Find the top HN post")

# Stream steps
async for step in client.run("Go to google.com and search"):
    print(f"[{step.number}] {step.next_goal}")
```

## v2-specific parameters

```python
result = await client.run(
    "task",
    llm="...",                    # Model override
    start_url="...",              # Initial page
    max_steps=100,                # Max agent steps
    secrets={"domain": "pass"},   # Credentials
    allowed_domains=["..."],      # Restrict domains
    flash_mode=True,              # Faster but less careful
    vision=True,                  # Screenshot mode
)
```

---

# Best Practices

1. **Use structured output** — Always define Pydantic models for predictable data extraction
2. **Set cost caps** — Use `max_cost_usd` to avoid runaway costs
3. **Reuse sessions** — For multi-step tasks, create a session and reuse with `keep_alive=True`
4. **Choose the right model** — `bu-mini` for simple tasks, `bu-max` for complex reasoning
5. **Use proxies** — Set `proxy_country_code` for sites with geo-restrictions or anti-bot
6. **Handle errors** — Wrap in try/except for `TimeoutError` and `BrowserUseError`
7. **Clean up** — Always `await client.close()` or use context manager

## Cost Estimation

| Model | Approximate Cost |
|-------|------------------|
| bu-mini | ~$0.01-0.05 per task |
| bu-max | ~$0.05-0.20 per task |
| + Proxy | ~$0.001 per MB |

Monitor costs with `result.total_cost_usd` after each task.
