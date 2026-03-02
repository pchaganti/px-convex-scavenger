#!/usr/bin/env python3
"""Quick test of Browser Use Cloud SDK."""

import asyncio
import os

async def main():
    # Ensure API key is set
    api_key = os.environ.get('BROWSER_USE_API_KEY')
    if not api_key:
        print("ERROR: BROWSER_USE_API_KEY not set in environment")
        print("Add to ~/.zshrc: export BROWSER_USE_API_KEY='your-key'")
        return
    
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    
    from browser_use_sdk.v3 import AsyncBrowserUse
    
    client = AsyncBrowserUse()
    
    try:
        print("\nRunning test task: 'What is the current date on timeanddate.com?'")
        result = await client.run("Go to timeanddate.com and tell me the current date")
        
        print(f"\nStatus: {result.status}")
        print(f"Output: {result.output}")
        print(f"Cost: {result.total_cost_usd}")
        print(f"Model: {result.model}")
        
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(main())
