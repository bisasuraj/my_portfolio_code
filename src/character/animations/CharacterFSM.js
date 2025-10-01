import { FiniteStateMachine } from './FiniteStateMachine.js';
import { IdleState } from './states/IdleState.js';
import { WalkState } from './states/WalkState.js';
import { RunState } from './states/RunState.js';
import { DanceState } from './states/DanceState.js';

export class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }

  _Init() {
    this._AddState("idle", IdleState);
    this._AddState("walk", WalkState);
    this._AddState("run", RunState);
    this._AddState("dance", DanceState);
  }
}