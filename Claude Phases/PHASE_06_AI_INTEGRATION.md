# PHASE 06 — AI Integration Layer
## Claude, Gemini, Perplexity Sonar, and ElevenLabs

**Prerequisite:** Phases 01–05 complete. API keys configured in `.env`. Building detail page renders successfully.

---

## 1. Objective

Implement all five AI API integrations that power the application's intelligent features:

1. **Claude** — Deal memos, boardroom dialogue, state battle verdict, debrief scripts, outreach scripts
2. **Gemini** — Voice pitch scripts, satellite image analysis description, HydroDeliberation
3. **Perplexity Sonar** — Live building ownership research for automation dossiers
4. **ElevenLabs** — Login intelligence debrief audio generation
5. **Browser Speech Synthesis** — Fallback/primary for Voice Pitch (zero latency)

All AI calls go through the FastAPI backend — never directly from the browser (to protect API keys).

---

## 2. Claude Integration — `backend/services/claude_service.py`

Use the `anthropic` Python SDK. Model: `claude-sonnet-4-6`.

### 2a. Deal Strategist Memo

**Route:** `POST /api/building/{id}/memo`
**Body:** `{ mode: 'Sales' | 'Engineering' | 'Executive' }`
**Response:** Server-Sent Events (SSE) streaming response

```python
import anthropic
from fastapi.responses import StreamingResponse

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

def build_deal_memo_prompt(building: BuildingDetail, mode: str) -> str:
    base_context = f"""
Building: {building.name}
Address: {building.address}, {building.city}, {building.state}
Roof Area: {building.roof_sqft:,} square feet
Cooling Towers: {'Detected at ' + str(round(building.ct_confidence * 100)) + '% confidence' if building.ct_detected else 'Not detected'}
Annual Rain Capture: {building.annual_gallons:,.0f} gallons
Estimated Payback: {building.payback_years:.1f} years
IRR: {building.irr_pct:.1f}%
Owner: {building.owner_name}
Corporate Parent: {building.corporate_parent}
SEC Water Mentions: {building.water_mentions} mentions in recent 10-K
LEED Status: {building.leed_level if building.leed_certified else 'Not certified'}
Drought Condition: {building.drought_label}
Available Incentives: ${building.rebate_usd:,} rebate, {building.program_name}
Tax Exemptions: {'Sales tax exempt' if building.sales_tax_exempt else ''} {'Property tax exempt' if building.property_tax_exempt else ''}
Annual Water+Sewer Cost (current): ${(building.water_rate_per_kgal + building.sewer_rate_per_kgal) * building.annual_gallons / 1000:,.0f}
Viability Score: {building.final_score:.0f}/100
WRAI: {building.wrai:.0f}/100 ({building.wrai_badge})
Genome Archetype: {building.genome_archetype}
"""
    
    mode_prompts = {
        'Sales': f"""
{base_context}

Write a 280-320 word prospect brief for a Grundfos sales representative to send to a facilities director or procurement manager at {building.owner_name}. 

The brief must:
- Open with the most compelling urgency signal (drought condition, SEC water risk mention, or rate trajectory)
- Reference the building's specific roof area and annual capture potential in concrete gallons
- Mention the payback period and key incentive program by name
- Include the parent company's own SEC language about water risk (paraphrase as: "your own annual report cites...")
- Close with a specific, low-commitment next step (15-minute call, site walk)
- Sound human, confident, and data-grounded — not generic

Do NOT use generic phrases like "sustainable future" or "world-class solution". Ground every sentence in this building's actual numbers.
""",
        'Engineering': f"""
{base_context}

Write a 280-320 word technical brief for a facilities engineer or chief engineer at {building.owner_name}.

The brief must:
- Lead with the physical fit assessment (roof area, material type assumptions, cooling tower integration opportunity)
- Describe the Grundfos RainUSE Nexus system in terms of: collection surface, first-flush diversion, storage tank sizing (approximate), pump specifications, and end-use integration points
- Reference the annual capture volume and how it maps to typical building water end uses (cooling makeup water, irrigation, flushing)
- Note any integration complexity considerations based on detected building features
- Describe the commissioning and monitoring approach
- Be specific and technical — this reader knows mechanical systems

Do NOT include financial details beyond CAPEX range estimate.
""",
        'Executive': f"""
{base_context}

Write a 280-320 word C-suite brief for a CFO or VP of Sustainability at {building.corporate_parent}.

The brief must:
- Frame water reuse as a strategic resilience investment, not a cost-cutting measure
- Reference the company's own ESG commitments and SEC water-risk disclosures directly
- Quantify the financial case: NPV, IRR, payback, and stormwater fee avoidance
- Connect to industry peer pressure (name competitors that have already adopted water reuse)
- Address the regulatory trajectory: current incentives, upcoming mandates, penalty exposure
- Close with enterprise framing: if this building is successful, how many others in the portfolio qualify?
- Sound like a peer executive conversation, not a vendor pitch

Tone: Strategic. Measured. Credible. Board-ready.
"""
    }
    
    return mode_prompts[mode]

async def stream_deal_memo(building: BuildingDetail, mode: str):
    prompt = build_deal_memo_prompt(building, mode)
    
    async def generate():
        with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {text}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### 2b. Boardroom Clash Dialogue

**Route:** `POST /api/building/{id}/boardroom`
**Response:** JSON `{ dialogue: DialogueTurn[] }`

```python
BOARDROOM_SYSTEM_PROMPT = """
You are simulating a realistic internal stakeholder debate at a Fortune 500 company evaluating whether to purchase a Grundfos RainUSE Nexus water reuse system for a specific building.

Return ONLY a valid JSON array. No prose before or after. No markdown code blocks.

Format:
[
  {"persona": "CFO", "text": "..."},
  {"persona": "ESG_Officer", "text": "..."},
  {"persona": "Facilities_VP", "text": "..."},
  {"persona": "Risk_Manager", "text": "..."},
  ... (8-12 total turns, back-and-forth)
  {"persona": "Moderator", "verdict": "...", "confidence": 78}
]

Personas:
- CFO: Skeptical of capital allocation. Focuses on payback period, competing priorities, CapEx cycle timing. Uses phrases like "our CapEx budget", "IRR threshold", "board will ask".
- ESG_Officer: Enthusiastic. Cites company's own 10-K water risk language. References ESG goals, LEED targets, peer pressure from competitors. Uses specific water scarcity data.
- Facilities_VP: Pragmatic. Concerned about installation disruption, maintenance burden, contractor timeline, roof warranty implications. Not opposed — just cautious.
- Risk_Manager: Cites drought exposure, regulatory trend, Legionella risk from cooling towers, insurance implications. Net supportive but process-oriented.
- Moderator: Synthesizes all perspectives. Delivers a final verdict sentence and confidence score (0-100). Recommends specific next step.

Each turn must reference the ACTUAL data from the building provided. Do not use generic statements.
"""

def build_boardroom_prompt(building: BuildingDetail) -> str:
    return f"""
Debate whether to purchase a Grundfos RainUSE Nexus system for this building:

Building: {building.name}, {building.city} {building.state}
Roof: {building.roof_sqft:,} sqft | Annual capture: {building.annual_gallons:,.0f} gallons
Payback: {building.payback_years:.1f} years | IRR: {building.irr_pct:.1f}% | System CAPEX: ~${int(building.roof_sqft * 0.018):,}
Cooling towers: {'2 detected at 84% confidence — cooling makeup water integration opportunity' if building.ct_detected else 'none detected'}
Drought: {building.drought_label} active in county
Owner's SEC 10-K water mentions: {building.water_mentions} ({"HIGH — flagged as ESG Accelerator prospect" if building.esg_accelerator else "moderate"})
Available incentive: {building.program_name} — ${building.rebate_usd:,} rebate, {'sales + property tax exemptions' if building.sales_tax_exempt else ''}
LEED status: {building.leed_level if building.leed_certified else 'not certified'}

Generate a realistic, specific debate. 8-12 turns. Moderator delivers final verdict.
"""

async def generate_boardroom(building: BuildingDetail) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        system=BOARDROOM_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_boardroom_prompt(building)}]
    )
    
    text = response.content[0].text.strip()
    # Clean any accidental markdown fences
    if text.startswith("```"):
        text = text[text.find("["):text.rfind("]")+1]
    
    dialogue = json.loads(text)
    return {"dialogue": dialogue}
```

### 2c. State Battle Market Verdict

**Route:** `GET /api/states/{a}/vs/{b}` — appended to the response

```python
STATE_VERDICT_PROMPT = """
You are a senior water market strategist for Grundfos. Given two state market profiles, write exactly 2 sentences recommending which state to prioritize for Q1 sales push and why. Be specific and data-grounded. No fluff.
"""

async def generate_state_verdict(state_a: StateProfile, state_b: StateProfile) -> str:
    context = f"""
State A: {state_a.state}
- Buildings >100k sqft: {state_a.total_buildings_over_100k}
- Avg Viability Score: {state_a.avg_viability_score:.1f}
- Top Incentive: ${state_a.top_incentive_value_usd:,}
- Avg Drought: {state_a.avg_drought_score:.1f}/4
- Radar: Volume={state_a.radar_scores['volume']}, ROI={state_a.radar_scores['roi']}, Regulation={state_a.radar_scores['regulation']}

State B: {state_b.state}
- Buildings >100k sqft: {state_b.total_buildings_over_100k}
- Avg Viability Score: {state_b.avg_viability_score:.1f}
- Top Incentive: ${state_b.top_incentive_value_usd:,}
- Avg Drought: {state_b.avg_drought_score:.1f}/4
- Radar: Volume={state_b.radar_scores['volume']}, ROI={state_b.radar_scores['roi']}, Regulation={state_b.radar_scores['regulation']}

Which state should Grundfos prioritize for Q1? Why?
"""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=120,
        messages=[{"role": "user", "content": STATE_VERDICT_PROMPT + "\n\n" + context}]
    )
    return response.content[0].text.strip()
```

### 2d. Login Debrief Script Generation

**Called by:** `tasks/generate_debrief.py` (Celery task, Phase 07)

```python
async def generate_debrief_script(user_id: str, territory_data: dict) -> str:
    prompt = f"""
Write a 45-60 second intelligence debrief script (approximately 120-140 words) for a Grundfos sales representative logging in to their RainUSE Nexus dashboard.

Speak as a warm, professional intelligence system — not a robot. First person ("Since your last session...").

Data for the script:
- Territory: {territory_data['territory']}
- New buildings that crossed threshold since last login: {territory_data['new_crossings']} 
- Top new prospect: {territory_data['top_building_name']}, {territory_data['top_building_city']}, Score {territory_data['top_score']}, {territory_data['top_gallons_m']:.1f}M gallons/year
- Active drought condition: {territory_data['drought_label']} ({territory_data['drought_description']})
- Recent market event: {territory_data['latest_event']}
- Automation reports ready: {territory_data['reports_pending']}

The script must feel like a personalized morning briefing. Start with the most important thing first. End with an actionable suggestion. Do NOT say "Grundfos" — the system is speaking to a Grundfos employee.

Return ONLY the script text. No labels, no stage directions.
"""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()
```

### 2e. Outreach Scripts for Automation Reports

```python
async def generate_outreach_scripts(building: BuildingDetail, contact: dict) -> dict:
    base = f"""
Building: {building.name}, {building.city}
Owner: {building.owner_name} / {building.corporate_parent}
Contact: {contact.get('name', 'Facilities Director')}, {contact.get('title', 'Facilities Director')}
Key data: {building.roof_sqft:,} sqft roof, {building.annual_gallons:,.0f} gal/yr potential, {building.payback_years:.1f}yr payback
Drought: {building.drought_label} | Incentive: {building.program_name} ${building.rebate_usd:,}
SEC water mentions: {building.water_mentions}
"""
    
    scripts_prompt = f"""
{base}

Generate three outreach scripts for a Grundfos sales rep. Return as JSON only:

{{
  "cold_email": {{
    "subject": "...",
    "body": "... (4 paragraphs, ~200 words)"
  }},
  "linkedin": "... (3 sentences, connection request, ~60 words)",
  "phone": "... (90-second phone opener with key talking points, ~200 words, includes likely objections)"
}}

All three scripts must:
- Reference the building by name and specific data points
- Reference the company's water risk posture (SEC mentions) naturally
- Mention the active drought condition and incentive by name
- Sound like a peer-to-peer conversation, not a vendor pitch
- Be genuinely useful to send without editing

Return ONLY the JSON object.
"""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        messages=[{"role": "user", "content": scripts_prompt}]
    )
    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text[text.find("{"):text.rfind("}")+1]
    return json.loads(text)
```

---

## 3. Gemini Integration — `backend/services/gemini_service.py`

```python
import google.generativeai as genai

genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')
```

### 3a. Voice Pitch Script

**Route:** `POST /api/building/{id}/voice-script`
**Response:** `{ script: string }` — ~80-100 words, 20-25 seconds spoken

```python
async def generate_voice_pitch(building: BuildingDetail) -> str:
    prompt = f"""
Write a 80-100 word sales pitch script that will be spoken aloud for {building.name} in {building.city}, {building.state}.

Data: {building.roof_sqft:,} sqft roof, {building.annual_gallons/1e6:.1f} million gallons annual capture potential, {building.payback_years:.1f} year payback, ${building.rebate_usd:,} rebate available.
{'Cooling towers detected — additional cooling makeup water savings opportunity.' if building.ct_detected else ''}
{building.drought_label} drought active in the county.
Owner: {building.corporate_parent} — {building.water_mentions} water risk mentions in their 10-K.

The script will be spoken by text-to-speech. Write for the ear, not the eye.
- Short sentences. Active verbs. Specific numbers.
- Open with the building talking about itself (first person: "I am the...")
- Build to a clear call to action: "The question isn't whether this building should harvest water. The question is when."
- Sound confident, data-grounded, and urgent.

Return ONLY the script text. No labels or stage directions.
"""
    response = model.generate_content(prompt)
    return response.text.strip()
```

### 3b. Satellite Image Analysis (Gemini Vision)

**Route:** `POST /api/building/{id}/analyze-image`
Used to generate the description shown in the Satellite Viewer section.

```python
async def analyze_satellite_image(building: BuildingDetail, image_url: str) -> str:
    import httpx
    
    # Download the image
    async with httpx.AsyncClient() as http:
        img_response = await http.get(image_url)
    
    import PIL.Image
    import io
    image = PIL.Image.open(io.BytesIO(img_response.content))
    
    vision_model = genai.GenerativeModel('gemini-2.0-flash')
    
    prompt = f"""
Analyze this satellite/aerial image of a commercial building at {building.address}, {building.city}.

Describe in 2-3 sentences:
1. The rooftop structure type and size (flat commercial roof, etc.)
2. Whether you can identify cooling towers or HVAC equipment and their configuration
3. Any features relevant to rainwater harvesting potential

Be specific and technical. This analysis is for a water systems engineer.
"""
    
    response = vision_model.generate_content([prompt, image])
    return response.text.strip()
```

For the demo, pre-compute this analysis for the 5 primary buildings and store in the database as `cv_results.gemini_analysis_text`. The route serves the cached analysis, not a live API call, to avoid latency during demo.

### 3c. HydroDeliberation

Used to classify the dominant opportunity thesis per building. Called once during score computation.

```python
async def hydro_deliberation(building: BuildingDetail) -> str:
    """Returns 'rain_roi' | 'cooling_reuse' | 'resilience_flood'"""
    prompt = f"""
Given this building's profile, classify the primary water opportunity thesis. Return ONLY ONE of these three strings:
- "rain_roi" — primary value is roof rainfall capture and utility savings
- "cooling_reuse" — primary value is cooling tower water recycling (building has cooling towers)
- "resilience_flood" — primary value is flood resilience and stormwater management

Building data:
- Roof: {building.roof_sqft:,} sqft
- Cooling towers: {building.ct_detected} at {building.ct_confidence:.0%} confidence
- Drought: {building.drought_label}
- Flood zone: {building.flood_zone}
- Rain: {building.annual_rain_inches}" annual
- Stormwater fee: ${building.stormwater_fee_annual:,}/yr

Return ONLY the classification string.
"""
    response = model.generate_content(prompt)
    return response.text.strip().lower()
```

---

## 4. Perplexity Sonar Integration — `backend/services/sonar_service.py`

Used exclusively by the automation engine (Phase 07). Called once per building that crosses the threshold.

```python
import httpx

SONAR_API_URL = "https://api.perplexity.ai/chat/completions"

async def research_building(building_name: str, address: str, city: str, state: str) -> dict:
    """
    Performs live web research on a building and returns structured intelligence.
    """
    
    prompt = f"""
Research this commercial building and return structured intelligence:

Building: {building_name}
Address: {address}, {city}, {state}

Find and return as JSON:
{{
  "legal_owner": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "corporate_parent": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "business_type": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "property_manager": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "facility_use": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "decision_maker": {{
    "name": "...",
    "title": "...",
    "email": "...",
    "linkedin": "...",
    "confidence": "high|medium|low"
  }},
  "recent_news": "... (any relevant news about sustainability, expansion, water use)",
  "esg_commitments": "... (any public sustainability pledges or certifications)"
}}

For confidence levels:
- high: verified from official public record (county deed, SEC, official business registry)
- medium: inferred from multiple reliable sources
- low: single source, unverified

Return ONLY the JSON object. If a field cannot be found, use null.
"""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            SONAR_API_URL,
            headers={
                "Authorization": f"Bearer {settings.PERPLEXITY_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "sonar",
                "messages": [
                    {"role": "system", "content": "You are a commercial real estate intelligence researcher. Provide only verified, factual information. Return structured JSON."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 800,
                "temperature": 0.1
            },
            timeout=30.0
        )
        
        data = response.json()
        text = data["choices"][0]["message"]["content"].strip()
        
        # Clean markdown fences if present
        if "```" in text:
            text = text[text.find("{"):text.rfind("}")+1]
        
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Fallback: return partial data
            return {"error": "Parse error", "raw": text}
```

---

## 5. ElevenLabs Integration — `backend/services/elevenlabs_service.py`

```python
import httpx

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"

async def generate_debrief_audio(script: str, voice_id: str, user_id: str) -> str:
    """
    Converts script text to MP3 audio via ElevenLabs.
    Uploads to S3 and returns the URL.
    Returns the public S3 URL to the audio file.
    """
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{ELEVENLABS_BASE}/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg"
            },
            json={
                "text": script,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.65,
                    "similarity_boost": 0.80,
                    "style": 0.15,
                    "use_speaker_boost": True
                }
            },
            timeout=30.0
        )
        
        audio_bytes = response.content
    
    # Upload to S3
    audio_url = await upload_to_s3(
        audio_bytes,
        key=f"debriefs/{user_id}/{int(time.time())}.mp3",
        content_type="audio/mpeg"
    )
    
    return audio_url

async def upload_to_s3(data: bytes, key: str, content_type: str) -> str:
    import boto3
    s3 = boto3.client('s3', endpoint_url=settings.S3_ENDPOINT_URL)
    s3.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=data,
        ContentType=content_type,
        ACL='public-read'
    )
    return f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}"
```

---

## 6. Frontend API Client — `frontend/lib/claude.ts` and `gemini.ts`

These are thin wrappers calling the FastAPI backend routes. Never call AI APIs directly from the browser.

```typescript
// frontend/lib/claude.ts
export async function streamDealMemo(
  buildingId: string,
  mode: 'Sales' | 'Engineering' | 'Executive',
  onChunk: (text: string) => void
): Promise<void> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/building/${buildingId}/memo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  })
  
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader!.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        onChunk(line.slice(6))
      }
    }
  }
}

export async function generateBoardroom(buildingId: string): Promise<DialogueTurn[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/building/${buildingId}/boardroom`, {
    method: 'POST'
  })
  const data = await res.json()
  return data.dialogue
}
```

```typescript
// frontend/lib/gemini.ts
export async function generateVoiceScript(buildingId: string): Promise<string> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/building/${buildingId}/voice-script`, {
    method: 'POST'
  })
  const data = await res.json()
  return data.script
}
```

---

## 7. Backend Routes for AI Features

Add to `routers/buildings.py`:

```python
@router.post("/building/{building_id}/memo")
async def generate_memo(building_id: str, request: MemoRequest, db: AsyncSession = Depends(get_db)):
    building = await building_service.get_building_full(building_id, db)
    return await claude_service.stream_deal_memo(building, request.mode)

@router.post("/building/{building_id}/boardroom")
async def generate_boardroom(building_id: str, db: AsyncSession = Depends(get_db)):
    building = await building_service.get_building_full(building_id, db)
    return await claude_service.generate_boardroom(building)

@router.post("/building/{building_id}/voice-script")
async def generate_voice_script(building_id: str, db: AsyncSession = Depends(get_db)):
    building = await building_service.get_building_full(building_id, db)
    script = await gemini_service.generate_voice_pitch(building)
    return {"script": script}
```

Add to `routers/settings.py` (or `debrief.py`):

```python
@router.get("/debrief/{user_id}")
async def get_latest_debrief(user_id: str, db: AsyncSession = Depends(get_db)):
    debrief = await get_latest_debrief_for_user(user_id, db)
    if not debrief:
        return {"script_text": None, "elevenlabs_audio_url": None}
    return debrief

@router.post("/debrief/generate")
async def trigger_debrief(body: DebriefRequest, db: AsyncSession = Depends(get_db)):
    # Gather territory data
    territory_data = await building_service.get_territory_summary(body.user_id, db)
    # Generate script via Claude
    script = await claude_service.generate_debrief_script(body.user_id, territory_data)
    # Generate audio via ElevenLabs
    settings = await get_user_settings(body.user_id, db)
    voice_id = settings.voice_model == 'adam' ? VOICE_ADAM : VOICE_RACHEL
    audio_url = await elevenlabs_service.generate_debrief_audio(script, voice_id, body.user_id)
    # Store in DB
    debrief = await save_debrief(body.user_id, script, audio_url, db)
    return debrief
```

---

## 8. Error Handling for All AI Calls

Every AI service call must have:
```python
try:
    result = await ai_service.call(...)
    return result
except anthropic.APIError as e:
    logger.error(f"Claude API error: {e}")
    raise HTTPException(status_code=503, detail="AI service temporarily unavailable")
except Exception as e:
    logger.error(f"Unexpected error in AI call: {e}")
    raise HTTPException(status_code=500, detail="Internal error")
```

Frontend must handle AI errors gracefully: show a toast "AI generation failed — please try again" with a retry button.

---

## 9. Demo Fallbacks (Hackathon Insurance)

Pre-generate and hardcode fallback responses for all 5 primary buildings:

```typescript
// frontend/lib/demo-fallbacks.ts
// These are used when API calls fail during demo

export const FALLBACK_DEAL_MEMOS: Record<string, Record<string, string>> = {
  'amazon-ftw6-id': {
    Sales: "Dallas is in D2 drought...",
    Engineering: "The 295,000 sqft TPO roof at...",
    Executive: "Amazon's 2024 10-K identifies water..."
  },
  // etc. for all 5 buildings
}

export const FALLBACK_BOARDROOM: Record<string, DialogueTurn[]> = {
  'amazon-ftw6-id': [
    { persona: 'CFO', text: 'A 3.1-year payback is actually competitive for infrastructure...' },
    // etc.
  ]
}

export const FALLBACK_VOICE_SCRIPTS: Record<string, string> = {
  'amazon-ftw6-id': 'I am a 295,000 square foot roof in Fort Worth, Texas...',
}
```

The frontend checks for fallback data if the API call fails or times out (10s timeout on all AI calls from frontend).

---

## 10. Checklist Before Moving to Phase 07

- [ ] Claude streams deal memo correctly for all 3 modes
- [ ] Memo output renders token-by-token in the UI
- [ ] Boardroom dialogue generates 8-12 turns as valid JSON
- [ ] Messages display with 700ms delays in the UI
- [ ] Moderator verdict card renders with confidence ring
- [ ] Gemini voice script generates in < 3 seconds
- [ ] Browser speech synthesis speaks the script aloud
- [ ] Waveform animation plays during speech
- [ ] State battle verdict generates and displays in Compare page
- [ ] Perplexity Sonar returns structured ownership JSON (test with a manual POST)
- [ ] ElevenLabs generates audio and returns S3 URL (test with debrief endpoint)
- [ ] Debrief player in frontend loads audio and plays on login
- [ ] All AI errors show user-friendly toast messages
- [ ] Demo fallbacks are loaded for the 5 primary buildings
