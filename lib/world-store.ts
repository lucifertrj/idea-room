import {create} from 'zustand';
import type {Point} from './navigation';
export type Destination={point:Point;roomId?:string;memberId?:string};
export const COMMONS:Point={x:50,y:64};
export const roomDestinations:Record<string,Point>={content:{x:24,y:25},technical:{x:50,y:24},sports:{x:79,y:25},fashion:{x:24,y:54},travel:{x:75,y:54},gaming:{x:37,y:79},music:{x:63,y:80}};
export const useWorldStore=create<{position:Point;destination:Destination|null;moving:boolean;moveTo:(destination:Destination|null)=>void;setPosition:(p:Point)=>void;setMoving:(moving:boolean)=>void}>(set=>({position:{...COMMONS},destination:null,moving:false,moveTo:destination=>set({destination}),setPosition:position=>set({position}),setMoving:moving=>set({moving})}));
