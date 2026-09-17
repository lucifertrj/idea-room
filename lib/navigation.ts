export type Point={x:number;y:number};
const floors=[ [7,6,34,30],[36,6,64,29],[66,6,92,30], [31,29,70,36], [36,35,64,62], [7,34,35,59],[34,47,39,55], [65,36,92,59],[61,43,67,54], [7,63,44,88],[43,69,50,79], [56,63,92,88],[50,68,58,79], [46,60,54,88] ];
export function walkable(x:number,y:number){return floors.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b);}
export function findPath(start:Point,end:Point):Point[]{
 const sx=Math.round(start.x),sy=Math.round(start.y),ex=Math.round(end.x),ey=Math.round(end.y);const key=(x:number,y:number)=>y*101+x;
 const queue:[number,number][]=[[sx,sy]],previous=new Map<number,number>();previous.set(key(sx,sy),-1);let head=0;
 while(head<queue.length){const [x,y]=queue[head++];if(x===ex&&y===ey){const path:Point[]=[];let n=key(x,y);while(previous.get(n)!==-1){path.push({x:n%101,y:Math.floor(n/101)});n=previous.get(n)!;}return path.reverse();}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(!previous.has(k)&&walkable(nx,ny)){previous.set(k,key(x,y));queue.push([nx,ny]);}}}
 return [];
}
