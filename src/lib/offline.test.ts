import { describe, expect, it } from 'vitest';
import { nextConnectivityState, type ConnectivityState } from './offline';

const initial: ConnectivityState = { stable: false, goodPings: 0, badPings: 0 };

function run(states: boolean[]): ConnectivityState {
  return states.reduce(nextConnectivityState, initial);
}

describe('nextConnectivityState (stable-connection hysteresis)', () => {
  it('stays unstable after a single good ping', () => {
    const state = run([true]);
    expect(state.stable).toBe(false);
  });

  it('goes stable after two consecutive good pings', () => {
    const state = run([true, true]);
    expect(state.stable).toBe(true);
  });

  it('a single bad ping resets the good streak without dropping stability yet', () => {
    // one good ping, then a bad one — never reached "stable" in the first place
    const state = run([true, false]);
    expect(state.stable).toBe(false);
    expect(state.goodPings).toBe(0);
    expect(state.badPings).toBe(1);
  });

  it('does not flip to unstable on a single bad ping once stable (avoids flapping mid-sync)', () => {
    const state = run([true, true, false]);
    expect(state.stable).toBe(true);
  });

  it('drops to unstable after two consecutive bad pings while stable', () => {
    const state = run([true, true, false, false]);
    expect(state.stable).toBe(false);
  });

  it('a flapping signal (alternating good/bad) never reaches stable', () => {
    const state = run([true, false, true, false, true, false, true, false]);
    expect(state.stable).toBe(false);
  });

  it('recovers to stable again after flapping settles into two good pings', () => {
    const state = run([true, false, true, false, true, true]);
    expect(state.stable).toBe(true);
  });
});
