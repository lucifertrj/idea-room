import data from '../backend/team-data.json';
export type Member={id:string;name:string;avatar:string;role:string;primarySkill:string;icon:string;color:string;question:string;archetype:string;traits:string[];taste:string;dislikes:string;proposal:string;belief:string;blindSpot:string};
export const teams:Record<string,Member[]>=data;
export function getMembers(room:string,member?:string|null):Member[]{return (teams[room]??[]).filter(m=>!member||m.id===member);}
export function threadKey(room:string,member?:string|null){return member?`${room}:private:${member}`:`${room}:group`;}
