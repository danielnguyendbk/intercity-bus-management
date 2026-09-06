import asyncio
import json
from typing import Dict, Any, List
from fastapi import Request
from starlette.responses import StreamingResponse

class NotificationBroker:
    def __init__(self):
        self.listeners: List[asyncio.Queue] = []

    async def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.listeners.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.listeners:
            self.listeners.remove(q)

    async def broadcast(self, event_name: str, data: Dict[str, Any]):
        msg = json.dumps({"event": event_name, "data": data})
        for q in self.listeners:
            await q.put(msg)

broker = NotificationBroker()

async def event_generator(request: Request):
    q = await broker.subscribe()
    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                # Wait for event with timeout to send keep-alive comment
                msg = await asyncio.wait_for(q.get(), timeout=15.0)
                yield f"data: {msg}\n\n"
            except asyncio.TimeoutError:
                yield ": keep-alive\n\n"
    finally:
        broker.unsubscribe(q)
