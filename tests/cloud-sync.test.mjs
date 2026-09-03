import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrationDecision} from '../src/cloud-sync.mjs';
test('offline training is retained when cloud has not changed',()=>{const saved={logs:['first']},offline={logs:['second','first']};assert.equal(hydrationDecision(offline,saved,JSON.stringify(saved)),'keep-local');});
test('concurrent local and cloud edits require a choice without overwriting either',()=>{const saved={logs:['first']};assert.equal(hydrationDecision({logs:['offline','first']},{logs:['other-window','first']},JSON.stringify(saved)),'conflict');});
test('clean local state refreshes from cloud and identical updates do not conflict',()=>{const old={logs:[]},remote={logs:['first']};assert.equal(hydrationDecision(old,remote,JSON.stringify(old)),'use-cloud');assert.equal(hydrationDecision(remote,remote,JSON.stringify(old)),'use-cloud');});
