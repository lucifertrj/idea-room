import test from 'node:test';
import assert from 'node:assert/strict';
import {Conversation} from '../lib/conversation.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(length=8){
 const calls=[];
 const engine=new Conversation([],length,request=>new Promise(resolve=>{calls.push({request,finish:()=>resolve({role:'assistant',id:crypto.randomUUID(),content:`reply ${calls.length}`,speaker:'Aditi',memberId:'cleo'})});}));
 return {engine,calls};
}
test('FIFO interruptions enter after the current reply and before the next agent; no concurrent worker',async()=>{
 const {engine,calls}=harness();engine.enqueue('original idea','room');
 engine.enqueue('first correction','room');engine.enqueue('second correction','room');
 assert.equal(calls.length,1);assert.deepEqual(engine.snapshot().queue.map(m=>m.content),['first correction','second correction']);
 calls[0].finish();await tick();
 assert.deepEqual(calls[1].request.messages.map(m=>m.content),['original idea','reply 1','first correction','second correction']);
 engine.pause();calls[1].finish();await tick();
 assert.equal(engine.snapshot().messages.length,4);assert.equal(engine.snapshot().paused,true);
 engine.resume();assert.equal(calls[2].request.turn,1);engine.pause();calls[2].finish();await tick();
});
test('all six voices get turns; late queued input extends discussion and is not dropped',async()=>{
 const {engine,calls}=harness();engine.enqueue('idea','room');
 for(let i=0;i<7;i++){calls[i].finish();await tick();}
 engine.enqueue('late question','room');calls[7].finish();await tick();
 assert.equal(calls.length,9);assert.equal(calls[8].request.messages.at(-1).content,'late question');
 assert.deepEqual(calls.slice(0,8).map(c=>c.request.turn),[0,1,2,3,4,5,6,7]);
 engine.pause();calls[8].finish();await tick();
});
test('private conversation never shares room messages and closes a single response turn',async()=>{
 const room=harness(),dm=harness(1);room.engine.enqueue('public idea','room');dm.engine.enqueue('private concern','Aditi');
 assert.deepEqual(dm.calls[0].request.messages.map(m=>m.content),['private concern']);
 dm.calls[0].finish();await tick();assert.equal(dm.engine.snapshot().busy,false);assert.equal(room.engine.snapshot().busy,true);
 room.engine.pause();room.calls[0].finish();await tick();
});
test('failed turns preserve delivered messages and remaining queued input for retry',async()=>{
 let fail=true;const requests=[];
 const engine=new Conversation([],1,async request=>{requests.push(request);if(fail)throw Error('offline');return {role:'assistant',content:'ok',id:'ok'};});
 engine.enqueue('keep me','private');await tick();assert.equal(engine.snapshot().paused,true);
 engine.enqueue('also keep me','private');assert.equal(engine.snapshot().queue.length,1);
 fail=false;engine.resume();await tick();assert.deepEqual(requests[1].messages.map(m=>m.content),['keep me','also keep me']);
 assert.equal(engine.snapshot().queue.length,0);
});
test('cancel affects only pending messages',async()=>{
 const {engine,calls}=harness();engine.enqueue('idea','room');engine.enqueue('cancel me','room');engine.cancel(engine.snapshot().queue[0].id);
 assert.equal(engine.snapshot().queue.length,0);assert.equal(engine.snapshot().messages[0].content,'idea');engine.pause();calls[0].finish();await tick();
});
