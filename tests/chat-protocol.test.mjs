import test from 'node:test';
import assert from 'node:assert/strict';
import {chatResponseSchema} from '../lib/chat-protocol.ts';

test('only protocol 5 with explicit completion and valid agent messages is accepted',()=>{
 const completion={dialogue_protocol:5,replies:[],done:true,routing:{reason:'Answered'}};
 assert.equal(chatResponseSchema.safeParse(completion).success,true);
 assert.equal(chatResponseSchema.safeParse({...completion,done:false}).success,false);
 assert.equal(chatResponseSchema.safeParse({...completion,dialogue_protocol:4}).success,false);
 assert.equal(chatResponseSchema.safeParse({...completion,replies:[{content:'fake'}]}).success,false);
 const reply={id:'reply',role:'assistant',content:'Actual text',speaker:'Aditi',memberId:'cleo'};
 assert.equal(chatResponseSchema.safeParse({...completion,replies:[reply],done:false}).success,true);
 assert.equal(chatResponseSchema.safeParse({...completion,replies:[{...reply,content:' '}]}).success,false);
});
