# PHASE 07 — Automation Engine
## Celery Tasks, Cron Scheduler, Run Pipeline, and `/automation` Page

**Prerequisite:** Phases 01–06 complete. Redis running. Perplexity and Claude API keys configured. Seed data includes one pre-completed automation run.

---

## 1. Objective

Build the autonomous prospecting engine — the feature that makes this application genuinely impressive to enterprise judges. The system must:

1. Run on a user-configured schedule (daily/weekly/biweekly) without any human trigger
2. Re-score all buildings in the user's territory
3. Detect buildings whose score has newly crossed the user's threshold
4. Fire a Perplexity Sonar research job for each qualifying building
5. Generate Claude outreach scripts for each report
6. Route reports to the nearest assigned rep
7. Display the full engine status, run history, and reports in the `/automation` page
8. Support a "Run Now" demo mode that executes the full pipeline in ~30 seconds with live UI progress

---

## 2. Celery Configuration — `backend/celery_app.py`

```python
from celery import Celery
from celery.schedules import crontab
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    class Config:
        env_file = ".env"

settings = Settings()

celery_app = Celery(
    "rainuse",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "tasks.scan_territory",
        "tasks.run_sonar",
        "tasks.generate_report",
        "tasks.route_to_rep",
        "tasks.generate_debrief",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Chicago",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,  # one task at a time per worker for AI calls
)

# Beat schedule is dynamically updated per-user in the settings save route
# Default schedules are managed via database-backed schedule (django-celery-beat equivalent)
# For hackathon: use static schedule for demo user
celery_app.conf.beat_schedule = {
    "demo-user-weekly-scan": {
        "task": "tasks.scan_territory.run_territory_scan",
        "schedule": crontab(hour=6, minute=0, day_of_week="monday"),
        "args": ["demo_user_id"],
    }
}
```

---

## 3. Task 1 — Territory Scan — `tasks/scan_territory.py`

```python
from celery_app import celery_app
from database import AsyncSessionLocal
from services import scoring_service, building_service
from models.user import UserSettings, AutomationRun
import asyncio

@celery_app.task(bind=True, name="tasks.scan_territory.run_territory_scan")
def run_territory_scan(self, user_id: str):
    """
    Main automation entry point.
    Re-scores all buildings in user's territory.
    Detects threshold crossings.
    Fires Sonar research for each new crossing.
    """
    return asyncio.run(_run_territory_scan_async(user_id, self.request.id))

async def _run_territory_scan_async(user_id: str, task_id: str):
    async with AsyncSessionLocal() as db:
        # Load user settings
        settings = await get_user_settings(user_id, db)
        
        # Create automation run record
        run = AutomationRun(
            user_id=user_id,
            status='running',
            buildings_scanned=0,
            crossings_count=0,
            reports_dispatched=0
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)
        
        try:
            # Load all buildings in territory
            buildings = await building_service.get_buildings_by_state(
                state=territory_to_state(settings.territory), 
                db=db
            )
            
            crossings = []
            
            for building in buildings:
                # Re-compute score (in production: only if data has changed)
                # For hackathon: recompute all to simulate real-time activity
                new_score = await scoring_service.compute_full_score(str(building.id), db)
                
                # Check if this newly crosses the threshold
                # "Newly" = previous score was below threshold, new score is above
                prev_score = building.viability_score.final_score if building.viability_score else 0
                
                if prev_score < settings.score_threshold <= new_score.final_score:
                    crossings.append({
                        "building_id": str(building.id),
                        "score_at_trigger": new_score.final_score,
                        "building_name": building.name,
                        "address": building.address,
                        "city": building.city,
                        "state": building.state
                    })
            
            # Update run with scan results
            run.buildings_scanned = len(buildings)
            run.crossings_count = len(crossings)
            await db.commit()
            
            # Fire Sonar research for each crossing
            for crossing in crossings:
                run_sonar_research.delay(
                    run_id=str(run.id),
                    user_id=user_id,
                    building_data=crossing,
                    threshold=settings.score_threshold
                )
            
            # Update run status
            run.status = 'completed'
            run.reports_dispatched = len(crossings)
            run.completed_at = datetime.utcnow()
            await db.commit()
            
            # Trigger debrief regeneration for the user
            generate_user_debrief.delay(user_id)
            
            return {
                "run_id": str(run.id),
                "buildings_scanned": len(buildings),
                "crossings": len(crossings),
                "status": "completed"
            }
            
        except Exception as e:
            run.status = 'failed'
            run.error_message = str(e)
            await db.commit()
            raise
```

---

## 4. Task 2 — Sonar Research — `tasks/run_sonar.py`

```python
@celery_app.task(bind=True, name="tasks.run_sonar.run_sonar_research")
def run_sonar_research(self, run_id: str, user_id: str, building_data: dict, threshold: int):
    return asyncio.run(_run_sonar_async(run_id, user_id, building_data, threshold))

async def _run_sonar_async(run_id, user_id, building_data, threshold):
    async with AsyncSessionLocal() as db:
        # Call Perplexity Sonar
        from services.sonar_service import research_building
        
        sonar_result = await research_building(
            building_name=building_data['building_name'],
            address=building_data['address'],
            city=building_data['city'],
            state=building_data['state']
        )
        
        # Fire report generation task
        generate_automation_report.delay(
            run_id=run_id,
            user_id=user_id,
            building_id=building_data['building_id'],
            score_at_trigger=building_data['score_at_trigger'],
            sonar_data=sonar_result
        )
```

---

## 5. Task 3 — Report Generation — `tasks/generate_report.py`

```python
@celery_app.task(name="tasks.generate_report.generate_automation_report")
def generate_automation_report(run_id, user_id, building_id, score_at_trigger, sonar_data):
    return asyncio.run(_generate_report_async(run_id, user_id, building_id, score_at_trigger, sonar_data))

async def _generate_report_async(run_id, user_id, building_id, score_at_trigger, sonar_data):
    async with AsyncSessionLocal() as db:
        building = await building_service.get_building_full(building_id, db)
        
        # Extract contact from Sonar data
        contact = sonar_data.get('decision_maker', {})
        
        # Generate Claude outreach scripts
        from services.claude_service import generate_outreach_scripts
        outreach_scripts = await generate_outreach_scripts(building, contact)
        
        # Create automation report
        report = AutomationReport(
            run_id=run_id,
            building_id=building_id,
            score_at_trigger=score_at_trigger,
            sonar_raw_json=sonar_data,
            ownership_data={
                "legal_owner": sonar_data.get("legal_owner"),
                "corporate_parent": sonar_data.get("corporate_parent"),
                "business_type": sonar_data.get("business_type"),
                "property_manager": sonar_data.get("property_manager"),
                "facility_use": sonar_data.get("facility_use"),
            },
            contact_data=contact,
            outreach_scripts=outreach_scripts,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        
        # Route to rep
        route_to_rep.delay(str(report.id), user_id, building_id)
        
        return str(report.id)
```

---

## 6. Task 4 — Rep Routing — `tasks/route_to_rep.py`

```python
@celery_app.task(name="tasks.route_to_rep.route_to_rep")
def route_to_rep(report_id, user_id, building_id):
    return asyncio.run(_route_async(report_id, user_id, building_id))

async def _route_async(report_id, user_id, building_id):
    async with AsyncSessionLocal() as db:
        # For hackathon: route to the logged-in user themselves
        # In production: ZIP code matching against rep territory metadata
        report = await db.get(AutomationReport, report_id)
        report.routed_to_rep_id = user_id
        
        # Create rep notification
        notification = RepNotification(
            report_id=report_id,
            rep_id=user_id,
        )
        db.add(notification)
        await db.commit()
```

---

## 7. Task 5 — Debrief Generation — `tasks/generate_debrief.py`

```python
@celery_app.task(name="tasks.generate_debrief.generate_user_debrief")
def generate_user_debrief(user_id: str):
    return asyncio.run(_generate_debrief_async(user_id))

async def _generate_debrief_async(user_id: str):
    async with AsyncSessionLocal() as db:
        # Gather territory summary data
        territory_data = await building_service.get_territory_summary(user_id, db)
        
        # Generate script via Claude
        from services.claude_service import generate_debrief_script
        script = await generate_debrief_script(user_id, territory_data)
        
        # Generate audio via ElevenLabs
        settings = await get_user_settings(user_id, db)
        voice_id = VOICE_ADAM if settings.voice_model == 'adam' else VOICE_RACHEL
        
        from services.elevenlabs_service import generate_debrief_audio
        audio_url = await generate_debrief_audio(script, voice_id, user_id)
        
        # Save to DB
        debrief = LoginDebrief(
            user_id=user_id,
            script_text=script,
            elevenlabs_audio_url=audio_url
        )
        db.add(debrief)
        await db.commit()
```

---

## 8. Dynamic Schedule Management

When a user saves their onboarding settings, the backend initializes their personal Celery Beat schedule:

```python
# In routers/settings.py — POST /api/settings/{user_id}
async def save_settings(user_id: str, body: SaveSettingsRequest, db: AsyncSession):
    # Save to DB
    ...
    
    # Initialize/update Celery Beat schedule for this user
    from celery_app import celery_app
    
    schedule_map = {
        'daily': crontab(hour=6, minute=0),
        'weekly': crontab(hour=6, minute=0, day_of_week='monday'),
        'biweekly': crontab(hour=6, minute=0, day_of_week='monday', week_of_month='1,3'),
    }
    
    schedule_name = f"scan-{user_id}"
    celery_app.add_periodic_task(
        schedule_map[body.cadence],
        run_territory_scan.s(user_id),
        name=schedule_name
    )
    
    return saved_settings
```

---

## 9. Demo Mode — "Run Now" Feature

The `/automation` page has a "Run Now" button that fires the full pipeline in accelerated demo mode (~30 seconds wall time).

**Backend route:** `POST /api/automation/run-now`

```python
@router.post("/automation/run-now")
async def run_now(body: RunNowRequest, db: AsyncSession = Depends(get_db)):
    """
    Triggers an immediate automation run in demo mode.
    Uses pre-seeded "threshold crossing" buildings for speed.
    Returns a task_id that the frontend polls for progress.
    """
    task = run_territory_scan.apply_async(
        args=[body.user_id],
        kwargs={"demo_mode": True}  # skips actual re-scoring, uses pre-selected buildings
    )
    return {"task_id": task.id}

@router.get("/automation/run-status/{task_id}")
async def get_run_status(task_id: str):
    """
    Returns current status of an automation run task.
    Frontend polls this every 1 second during demo.
    """
    from celery.result import AsyncResult
    result = AsyncResult(task_id)
    return {
        "status": result.status,
        "progress": result.info if isinstance(result.info, dict) else {},
        "result": result.result if result.ready() else None
    }
```

**Demo mode task behavior:**
In demo mode, `run_territory_scan` skips actual re-scoring and immediately treats the 3 pre-seeded "threshold crossing" buildings as the crossings. This ensures the demo completes in 30 seconds regardless of scoring complexity.

---

## 10. Automation Intelligence Center — `app/automation/page.tsx`

### Full Page Layout

```tsx
export default function AutomationPage() {
  return (
    <div className="automation-page">
      <AppNav />
      <div className="automation-content">
        <h1 className="page-title">Automation Intelligence Center</h1>
        
        {/* Section 1: Engine Status */}
        <EngineStatusPanel />
        
        {/* Section 2: Run History Timeline */}
        <RunHistoryTimeline />
        
        {/* Section 3: All Reports Feed */}
        <ReportsFeed />
      </div>
    </div>
  )
}
```

### Section 1 — Engine Status Panel — `components/automation/EngineStatusPanel.tsx`

```tsx
// Left: Animated pulse ring + ENGINE ACTIVE label
// Right: Three stat blocks (Next Run, Territory, Threshold)
// Below: Cadence pill buttons (Daily/Weekly/Bi-Weekly)
// Top-right of card: "Run Now" button

// Pulse animation:
// @keyframes enginePulse {
//   0%, 100% { box-shadow: 0 0 0 0 rgba(0,229,204,0.4); }
//   50% { box-shadow: 0 0 0 16px rgba(0,229,204,0); }
// }

// Next Run countdown:
const nextRunTime = computeNextRunTime(settings.cadence, lastRunAt)
// Update every second with setInterval
// Display as HH:MM:SS in Space Mono 28px

// Run Now button click:
// 1. POST /api/automation/run-now
// 2. Show live progress indicator (4 stages)
// 3. Poll /api/automation/run-status/{task_id} every 1s
// 4. Check off stages as they complete
```

**Live progress indicator:**
```tsx
const PIPELINE_STAGES = [
  { id: 'scanning', label: 'Scanning Buildings' },
  { id: 'scoring', label: 'Evaluating Scores' },
  { id: 'flagging', label: 'Flagging Threshold Crossings' },
  { id: 'sonar', label: 'Running Sonar Research' },
  { id: 'dispatching', label: 'Dispatching Reports' },
]

// Each stage shows:
// [ ] Pending → [⟳] Running (spinning) → [✓] Completed (teal checkmark)
// Stages complete one after another based on polling results
// Framer Motion: each checkmark appears with a bounce animation
```

### Section 2 — Run History Timeline — `components/automation/RunHistoryTimeline.tsx`

```tsx
// CSS timeline: vertical line with dot markers
// ::before on container = the vertical line (1px solid rgba(0,229,204,0.3))
// Each run entry = a card with left dot marker

{runs.map((run, i) => (
  <div key={run.id} className="run-entry">
    <div className="run-dot" />  {/* positioned absolute, on the line */}
    <div className="run-card">
      <div className="run-header">
        <span className="run-timestamp">{formatRunTimestamp(run.run_at)}</span>
        <StatusBadge status={run.status} />
      </div>
      <div className="run-stats">
        <span>{run.buildings_scanned.toLocaleString()} buildings evaluated</span>
        <span>{run.crossings_count} buildings crossed threshold of {threshold}</span>
        <span>{run.reports_dispatched} reports generated</span>
      </div>
      
      {/* Expanded view for most recent run */}
      {i === 0 && (
        <div className="run-crossings">
          {runBuildings.map(b => (
            <BuildingCard key={b.id} building={b} compact showScore showViewReport />
          ))}
        </div>
      )}
    </div>
  </div>
))}
```

### Section 3 — Reports Feed — `components/automation/ReportsFeed.tsx`

```tsx
// Filter bar above list: date range, score range, genome archetype
// Reverse chronological list of all reports

{reports.map(report => (
  <div key={report.id} className="report-card">
    <div className="report-left">
      <h4>{report.building_name}</h4>
      <p className="report-address">{report.building_address}</p>
      <GenomeBadge archetype={report.genome_archetype} />
    </div>
    <div className="report-center">
      <div className="score-trigger">
        Score crossed {report.threshold} → now <strong>{report.score_at_trigger.toFixed(0)}</strong>
      </div>
      <div className="contact-preview">
        {report.contact_data?.name && (
          <span>{report.contact_data.name}, {report.contact_data.title}</span>
        )}
      </div>
    </div>
    <div className="report-right">
      <p className="report-run-label">Generated by {formatRunLabel(report.run_at)}</p>
      <button onClick={() => router.push(`/report/${report.id}`)}>
        View Full Report →
      </button>
      <button 
        className="send-to-rep-btn"
        onClick={() => openApprovalGate(report)}
      >
        Send to Rep
      </button>
    </div>
  </div>
))}
```

---

## 11. Automation API Routes — `routers/automation.py`

```python
@router.get("/automation/runs")
async def get_automation_runs(user_id: str, db: AsyncSession = Depends(get_db)):
    runs = await db.execute(
        select(AutomationRun)
        .where(AutomationRun.user_id == user_id)
        .order_by(AutomationRun.run_at.desc())
        .limit(20)
    )
    return {"data": runs.scalars().all()}

@router.get("/automation/reports")
async def get_automation_reports(
    user_id: str,
    min_score: float = None,
    genome: str = None,
    db: AsyncSession = Depends(get_db)
):
    # Join automation_reports with automation_runs (filter by user_id)
    # Join with buildings for name/address
    # Join with viability_scores for genome
    # Apply optional filters
    ...

@router.post("/automation/run-now")
async def trigger_run_now(body: RunNowRequest, db: AsyncSession = Depends(get_db)):
    task = run_territory_scan.apply_async(args=[body.user_id])
    return {"task_id": str(task.id)}

@router.get("/automation/run-status/{task_id}")
async def get_run_status(task_id: str):
    ...
```

---

## 12. Frontend Polling Hook

```typescript
// hooks/useAutomationRun.ts
export function useAutomationRun(taskId: string | null) {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState<Record<string, 'pending' | 'running' | 'done'>>({})
  
  useEffect(() => {
    if (!taskId) return
    
    const interval = setInterval(async () => {
      const res = await fetch(`/api/automation/run-status/${taskId}`)
      const data = await res.json()
      
      setStatus(data.status === 'SUCCESS' ? 'completed' : data.status === 'FAILURE' ? 'failed' : 'running')
      if (data.progress) setProgress(data.progress)
      
      if (data.status === 'SUCCESS' || data.status === 'FAILURE') {
        clearInterval(interval)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [taskId])
  
  return { status, progress }
}
```

---

## 13. Checklist Before Moving to Phase 08

- [ ] Celery worker starts without errors
- [ ] Celery Beat scheduler starts without errors
- [ ] `run_territory_scan` task completes and creates `AutomationRun` record
- [ ] `run_sonar_research` task calls Perplexity and creates `AutomationReport`
- [ ] `generate_automation_report` task creates outreach scripts via Claude
- [ ] `route_to_rep` task creates `RepNotification` record
- [ ] `generate_user_debrief` task creates `LoginDebrief` record with ElevenLabs URL
- [ ] "Run Now" button on `/automation` triggers the full pipeline
- [ ] Pipeline progress stages check off in the UI in ~30 seconds
- [ ] Run history timeline shows completed runs in reverse order
- [ ] Most recent run expanded to show the 3 triggered buildings
- [ ] Reports feed shows all generated reports with correct data
- [ ] Engine Status Panel shows correct countdown to next run
- [ ] Cadence pill buttons update schedule on click
- [ ] Pre-seeded automation run and 3 reports appear on page load
