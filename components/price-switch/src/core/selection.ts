import type {Plan} from './index';
/** Paid memory changes only when a value is committed, never on a controlled request. */
export function createPlanMemory(initial: Plan) {
  let paid: Exclude<Plan,'free'> = initial==='annual'?'annual':'monthly';
  return {
    request(action: Plan|'premium'): Plan {return action==='premium'?paid:action;},
    commit(value: Plan) {if(value!=='free')paid=value;},
  };
}
