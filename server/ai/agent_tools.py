import json
import urllib.request
import urllib.error

# We assume the key is passed down from the frontend in the request
# since it's stored in js/secrets.js as CONFIG.GOOGLE_API_KEY.

SYSTEM_PROMPT = """You are Compass, an AI-Powered Travel Agent.
You are helping a user plan their trip. You have access to tools that can fetch live travel data.
When the user asks for something, ALWAYS use your tools if you need information.
If the user says it started raining or there's traffic, use the `replan_schedule` tool.

Do NOT invent fake hotel names, fake prices, or fake itineraries. Only use information from the tools or general knowledge.
Keep your responses very brief and helpful."""

TOOLS = [
    {
        "name": "replan_schedule",
        "description": "Trigger the backend replanning engine to adjust the itinerary due to a disruption (e.g., rain, traffic, delay).",
        "parameters": {
            "type": "object",
            "properties": {
                "disruption_type": {
                    "type": "string",
                    "description": "The type of disruption (e.g., 'rain', 'traffic')"
                }
            },
            "required": ["disruption_type"]
        }
    }
]

def call_gemini(messages, api_key):
    """Call Gemini REST API directly to avoid requiring the SDK."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    # Format messages for Gemini REST API
    gemini_contents = []
    for m in messages:
        role = "model" if m["role"] == "assistant" else "user"
        
        # Handle function calls in history
        parts = []
        if "content" in m and m["content"]:
            parts.append({"text": m["content"]})
            
        if "tool_calls" in m:
            for tc in m["tool_calls"]:
                parts.append({
                    "functionCall": {
                        "name": tc["function"]["name"],
                        "args": json.loads(tc["function"]["arguments"])
                    }
                })
                
        if parts:
            gemini_contents.append({"role": role, "parts": parts})
            
    # Add system prompt
    if gemini_contents and gemini_contents[0]["role"] == "user":
        gemini_contents[0]["parts"].insert(0, {"text": f"SYSTEM INSTRUCTIONS:\n{SYSTEM_PROMPT}\n\nUSER MESSAGE:\n"})

    payload = {
        "contents": gemini_contents,
        "tools": [{"functionDeclarations": TOOLS}]
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        # Bypassing Mac SSL Certificate Verification issues
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, context=ctx) as response:
            result = json.loads(response.read().decode())
            
            if "candidates" in result and result["candidates"]:
                candidate = result["candidates"][0]
                content = candidate.get("content", {})
                parts = content.get("parts", [])
                
                for part in parts:
                    if "functionCall" in part:
                        fc = part["functionCall"]
                        return {
                            "type": "tool_call",
                            "name": fc["name"],
                            "arguments": fc.get("args", {})
                        }
                    elif "text" in part:
                        return {"type": "message", "content": part["text"]}
            
            return {"type": "message", "content": "I couldn't process that right now."}
            
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode()
        print(f"Gemini API Error: {err_msg}")
        return {"type": "message", "content": f"API Error: 403 Forbidden. Your key may have restricted permissions."}
    except Exception as e:
        print(f"Error: {e}")
        return {"type": "message", "content": "Internal error reaching AI."}
