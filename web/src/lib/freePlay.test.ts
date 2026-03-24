import { describe, expect, it } from 'vitest'
import { createFreePlayState, getFreePlayStatus, runFreePlayCommand } from './freePlay'

describe('free play simulator', () => {
  it('creates and mutates sandbox resources through kubectl commands', () => {
    let state = createFreePlayState()

    state = runFreePlayCommand(state, 'kubectl create deployment demo-api --image=nginx:1.25').state
    expect(state.deployments.some((item) => item.name === 'demo-api' && item.image === 'nginx:1.25')).toBe(true)

    state = runFreePlayCommand(state, 'kubectl set image deployment/demo-api demo-api=nginx:1.26').state
    expect(state.deployments.find((item) => item.name === 'demo-api')?.image).toBe('nginx:1.26')

    state = runFreePlayCommand(state, 'kubectl expose deployment demo-api --type=ClusterIP --port=80').state
    expect(state.services.some((item) => item.name === 'demo-api' && item.port === 80)).toBe(true)
  })

  it('updates namespace context and reflects user activity in sandbox status', () => {
    let state = createFreePlayState()

    expect(getFreePlayStatus(state)).toBe('idle')

    state = runFreePlayCommand(state, 'kubectl config set-context --current --namespace=dev').state
    expect(state.currentNamespace).toBe('dev')

    state = runFreePlayCommand(state, 'kubectl create namespace training').state
    expect(state.namespaces.some((item) => item.name === 'training')).toBe(true)
    expect(getFreePlayStatus(state)).toBe('in-progress')
  })
})
