import { type Mission, type SimulatedAction, type SimulatedInspector, type WorkspaceStatus } from '../data/missions'

export type MissionSession = {
  injected: boolean
  completedActionIds: string[]
  transcript: string[]
}

export type CommandResult = {
  session: MissionSession
  feedbackTitle?: string
  feedbackBody?: string
}

export type GradeResult = {
  session: MissionSession
  status: WorkspaceStatus
  feedbackTitle: string
  feedbackBody: string
}

const helpAliases = new Set(['help', 'kubectl help'])
const clearAliases = new Set(['clear', 'cls'])
const contextAliases = new Set(['kubectl config current-context'])
const gradeAliases = new Set(['simctl grade', 'grade', 'check'])

function normalizeCommand(command: string) {
  return command.trim().toLowerCase().replace(/\s+/g, ' ')
}

function appendTranscript(session: MissionSession, lines: string[]) {
  return {
    ...session,
    transcript: [...session.transcript, ...lines],
  }
}

function renderBanner(mission: Mission) {
  return [
    ...mission.cli.bannerLines,
    `Context: ${mission.cli.contextName}`,
    `Namespace: ${mission.cli.namespace}`,
    `Tip: type 'help' to list supported kubectl commands for ${mission.title}.`,
  ]
}

function getStageKey(mission: Mission, session: MissionSession) {
  if (!session.injected) {
    return 'idle' as const
  }

  if (session.completedActionIds.length === 0) {
    return 'broken' as const
  }

  if (session.completedActionIds.length < mission.cli.actions.length) {
    return 'partial' as const
  }

  return 'fixed' as const
}

function stageOutput(lines: SimulatedInspector['outputs'], stage: ReturnType<typeof getStageKey>) {
  if (stage === 'fixed') {
    return lines.fixed
  }

  if (stage === 'partial') {
    return lines.partial ?? lines.broken
  }

  return lines.broken
}

function hasCompleted(session: MissionSession, actionId: string) {
  return session.completedActionIds.includes(actionId)
}

function markCompleted(session: MissionSession, actionId: string) {
  if (hasCompleted(session, actionId)) {
    return session
  }

  return {
    ...session,
    completedActionIds: [...session.completedActionIds, actionId],
  }
}

function actionHelpLines(mission: Mission) {
  return [
    'Supported mission commands:',
    ...mission.commands.map((entry) => `- ${entry.command} :: ${entry.purpose}`),
    "- simctl grade :: run the simulated grader from the terminal",
    '- clear :: reset the terminal transcript for the current mission',
  ]
}

// The simulator is deliberately command-centric. It maps a curated set of
// kubectl-like commands onto a mission state machine so the learner can
// practice realistic investigation and repair loops without needing a live
// cluster or a local PTY bridge.
export function createMissionSession(mission: Mission): MissionSession {
  return {
    injected: false,
    completedActionIds: [],
    transcript: renderBanner(mission),
  }
}

export function getWorkspaceStatus(mission: Mission, session: MissionSession): WorkspaceStatus {
  if (!session.injected) {
    return 'idle'
  }

  if (session.completedActionIds.length === 0) {
    return 'broken'
  }

  if (session.completedActionIds.length < mission.cli.actions.length) {
    return 'in-progress'
  }

  return 'passed'
}

export function getStatusLabel(status: WorkspaceStatus) {
  switch (status) {
    case 'idle':
      return 'Not started'
    case 'broken':
      return 'Scenario active'
    case 'in-progress':
      return 'Repair in progress'
    case 'passed':
      return 'Passed'
  }
}

export function getProgressLabel(mission: Mission, session: MissionSession) {
  return `${session.completedActionIds.length}/${mission.cli.actions.length} repair steps complete`
}

export function startMission(mission: Mission): CommandResult {
  const session: MissionSession = {
    injected: true,
    completedActionIds: [],
    transcript: [
      ...renderBanner(mission),
      ...mission.cli.startLines,
      `Suggested first command: ${mission.cli.inspectors[0].aliases[0]}`,
    ],
  }

  return {
    session,
    feedbackTitle: mission.feedback.startTitle,
    feedbackBody: mission.feedback.startBody,
  }
}

function runInspector(mission: Mission, session: MissionSession, command: string, inspector: SimulatedInspector) {
  const updated = appendTranscript(session, [
    `${mission.cli.prompt} ${command}`,
    ...stageOutput(inspector.outputs, getStageKey(mission, session)),
  ])

  return { session: updated }
}

function runAction(mission: Mission, session: MissionSession, command: string, action: SimulatedAction) {
  if (hasCompleted(session, action.id)) {
    return {
      session: appendTranscript(session, [
        `${mission.cli.prompt} ${command}`,
        action.alreadyAppliedMessage,
      ]),
    }
  }

  const updatedSession = appendTranscript(markCompleted(session, action.id), [
    `${mission.cli.prompt} ${command}`,
    ...action.output,
  ])

  return {
    session: updatedSession,
    feedbackTitle: mission.feedback.repairTitle,
    feedbackBody: `${mission.feedback.repairBody} Progress: ${getProgressLabel(mission, updatedSession)}.`,
  }
}

function runGradeCommand(mission: Mission, session: MissionSession): GradeResult {
  return gradeMission(mission, appendTranscript(session, [`${mission.cli.prompt} simctl grade`]))
}

export function runMissionCommand(
  mission: Mission,
  session: MissionSession,
  rawCommand: string,
): CommandResult {
  const command = rawCommand.trim()

  if (!command) {
    return { session }
  }

  const normalized = normalizeCommand(command)

  if (clearAliases.has(normalized)) {
    return {
      session: session.injected
        ? {
            ...session,
            transcript: [...renderBanner(mission), ...mission.cli.startLines],
          }
        : createMissionSession(mission),
    }
  }

  if (helpAliases.has(normalized)) {
    return {
      session: appendTranscript(session, [
        `${mission.cli.prompt} ${command}`,
        ...actionHelpLines(mission),
      ]),
    }
  }

  if (contextAliases.has(normalized)) {
    return {
      session: appendTranscript(session, [`${mission.cli.prompt} ${command}`, mission.cli.contextName]),
    }
  }

  if (gradeAliases.has(normalized)) {
    return runGradeCommand(mission, session)
  }

  if (!session.injected) {
    return {
      session: appendTranscript(session, [
        `${mission.cli.prompt} ${command}`,
        'The mission resources are not injected yet.',
        'Use Start Scenario first so there is a simulated cluster state to inspect.',
      ]),
      feedbackTitle: 'Start the mission first',
      feedbackBody: 'The simulator needs an injected scenario before kubectl commands can return mission-specific output.',
    }
  }

  const inspector = mission.cli.inspectors.find((item) =>
    item.aliases.some((alias) => normalizeCommand(alias) === normalized),
  )
  if (inspector) {
    return runInspector(mission, session, command, inspector)
  }

  const action = mission.cli.actions.find((item) =>
    item.aliases.some((alias) => normalizeCommand(alias) === normalized),
  )
  if (action) {
    return runAction(mission, session, command, action)
  }

  return {
    session: appendTranscript(session, [
      `${mission.cli.prompt} ${command}`,
      'Unsupported command for this simulated mission.',
      `Try one of these next: ${mission.commands
        .slice(0, 3)
        .map((entry) => entry.command)
        .join(' | ')}`,
    ]),
    feedbackTitle: 'Command not modeled yet',
    feedbackBody:
      'This simulator accepts a curated command set for the selected mission. Use help to see the supported investigation and repair commands.',
  }
}

export function gradeMission(mission: Mission, session: MissionSession): GradeResult {
  if (!session.injected) {
    return {
      session,
      status: 'idle',
      feedbackTitle: 'No exercise running',
      feedbackBody: 'Start the simulated mission first so the grader has something concrete to evaluate.',
    }
  }

  const missingActions = mission.cli.actions.filter((action) => !hasCompleted(session, action.id))

  if (missingActions.length > 0) {
    const gradedSession = appendTranscript(session, [
      'Grade result: FAIL',
      ...missingActions.map((action) => `- Missing repair step: ${action.label}`),
    ])

    return {
      session: gradedSession,
      status: getWorkspaceStatus(mission, gradedSession),
      feedbackTitle: mission.feedback.failTitle,
      feedbackBody: `${mission.feedback.failBody} Remaining repairs: ${missingActions
        .map((action) => action.label)
        .join(', ')}.`,
    }
  }

  const passedSession = appendTranscript(session, [
    'Grade result: PASS',
    ...mission.cli.successCriteria.map((criterion) => `- ${criterion}`),
  ])

  return {
    session: passedSession,
    status: 'passed',
    feedbackTitle: mission.feedback.passTitle,
    feedbackBody: mission.feedback.passBody,
  }
}

export function applyGuidedRepair(mission: Mission, session: MissionSession): CommandResult {
  if (!session.injected) {
    return {
      session,
      feedbackTitle: 'Nothing to repair yet',
      feedbackBody: 'Start the mission first, then use Guided Repair if you want the simulator to demonstrate the fix path.',
    }
  }

  let updatedSession = session
  const appliedLines: string[] = []

  mission.cli.actions.forEach((action) => {
    if (!hasCompleted(updatedSession, action.id)) {
      updatedSession = markCompleted(updatedSession, action.id)
      appliedLines.push(`${mission.cli.prompt} ${action.aliases[0]}`)
      appliedLines.push(...action.output)
    }
  })

  return {
    session: appendTranscript(updatedSession, appliedLines.length > 0 ? appliedLines : ['Guided repair already applied.']),
    feedbackTitle: mission.feedback.repairTitle,
    feedbackBody: `${mission.feedback.repairBody} Progress: ${getProgressLabel(mission, updatedSession)}.`,
  }
}
