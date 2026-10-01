import {z} from 'zod';

export const chatReplySchema=z.object({
 role:z.literal('assistant'),
 id:z.string().min(1).max(100),
 content:z.string().trim().min(1).max(8000),
 speaker:z.string().min(1).max(40),
 memberId:z.string().min(1).max(40),
 replyTo:z.string().max(100).optional(),
 replyToName:z.string().max(40).optional(),
});

export const chatResponseSchema=z.object({
 dialogue_protocol:z.literal(5),
 replies:z.array(chatReplySchema).max(1),
 done:z.boolean(),
 routing:z.object({reason:z.string().min(1).max(1000)}),
}).refine(result=>result.done||result.replies.length===1);
