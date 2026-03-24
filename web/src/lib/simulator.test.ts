import { describe, expect, it } from 'vitest'
import { buildCommandBreakdown, missions } from '../data/missions'
import {
  createMissionSession,
  getStatusLabel,
  getWorkspaceStatus,
  gradeMission,
  runMissionCommand,
  startMission,
} from './simulator'

describe('simulator', () => {
  it('ships at least twenty missions', () => {
    expect(missions.length).toBeGreaterThanOrEqual(20)
  })

  it('derives mission status from real repair progress', () => {
    const mission = missions[0]
    let session = createMissionSession(mission)

    expect(getWorkspaceStatus(mission, session)).toBe('idle')
    expect(getStatusLabel(getWorkspaceStatus(mission, session))).toBe('Not started')

    session = startMission(mission).session
    expect(getWorkspaceStatus(mission, session)).toBe('broken')

    session = runMissionCommand(mission, session, 'kubectl set image pod/demo-pod app=nginx:1.25').session
    expect(getWorkspaceStatus(mission, session)).toBe('in-progress')

    session = runMissionCommand(
      mission,
      session,
      'kubectl wait --for=condition=Ready pod/demo-pod --timeout=90s',
    ).session
    expect(getWorkspaceStatus(mission, session)).toBe('passed')
  })

  it('grades incomplete and complete missions differently', () => {
    const mission = missions[0]
    let session = startMission(mission).session

    const failed = gradeMission(mission, session)
    expect(failed.feedbackTitle).toBe('Not fixed yet')

    session = runMissionCommand(mission, session, 'kubectl set image pod/demo-pod app=nginx:1.25').session
    session = runMissionCommand(
      mission,
      session,
      'kubectl wait --for=condition=Ready pod/demo-pod --timeout=90s',
    ).session

    const passed = gradeMission(mission, session)
    expect(passed.feedbackTitle).toBe('Great work')
    expect(passed.status).toBe('passed')
  })

  it('keeps mission metadata and command breakdowns complete', () => {
    const ids = new Set<string>()

    missions.forEach((mission) => {
      expect(ids.has(mission.id)).toBe(false)
      ids.add(mission.id)

      expect(mission.docsUrl).toMatch(/^https:\/\/kubernetes\.io\/docs\//)
      expect(mission.hints.length).toBeGreaterThan(0)
      expect(mission.commands.length).toBeGreaterThan(0)
      expect(mission.glossary.length).toBeGreaterThan(0)
      expect(mission.values.length).toBeGreaterThan(0)

      mission.commands.forEach((entry) => {
        expect(entry.breakdown?.length ?? 0).toBeGreaterThan(0)
      })
    })
  })

  it('explains command parts for mission help surfaces', () => {
    const parts = buildCommandBreakdown('kubectl set image deployment/demo-api demo-api=nginx:1.26')

    expect(parts[0]?.role).toBe('Executable')
    expect(parts[1]?.role).toBe('Primary verb')
    expect(parts.some((part) => part.role === 'Qualified resource')).toBe(true)
    expect(parts.some((part) => part.role === 'Assignment')).toBe(true)
  })
})
