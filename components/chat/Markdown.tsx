import {Fragment,ReactNode} from 'react';

// Minimal, dependency-free Markdown renderer for the subset agents emit:
// headings, bold/italic/code, links, bullet & numbered lists, hr, paragraphs.

function inline(text:string,keyBase:string):ReactNode[]{
 const nodes:ReactNode[]=[];
 // Order matters: code first so ** inside code is left alone.
 const pattern=/(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*|_[^_]+_)|(\[[^\]]+\]\([^)]+\))/g;
 let last=0,match:RegExpExecArray|null,i=0;
 while((match=pattern.exec(text))){
  if(match.index>last)nodes.push(text.slice(last,match.index));
  const tok=match[0];
  const key=`${keyBase}-${i++}`;
  if(tok.startsWith('`'))nodes.push(<code key={key}>{tok.slice(1,-1)}</code>);
  else if(tok.startsWith('**'))nodes.push(<strong key={key}>{tok.slice(2,-2)}</strong>);
  else if(tok.startsWith('*')||tok.startsWith('_'))nodes.push(<em key={key}>{tok.slice(1,-1)}</em>);
  else{const m=/\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;nodes.push(<a key={key} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>);}
  last=match.index+tok.length;
 }
 if(last<text.length)nodes.push(text.slice(last));
 return nodes;
}

export default function Markdown({text}:{text:string}){
 const blocks=text.replace(/\r\n/g,'\n').split(/\n{2,}/);
 return <>{blocks.map((block,b)=>{
  const lines=block.split('\n');
  if(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(block))return <hr key={b}/>;
  const heading=lines[0].match(/^(#{1,4})\s+(.*)$/);
  if(heading&&lines.length===1){const Tag=`h${heading[1].length}` as 'h1';return <Tag key={b}>{inline(heading[2],`h${b}`)}</Tag>;}
  if(lines.every(l=>/^\s*[-*]\s+/.test(l)))
   return <ul key={b}>{lines.map((l,i)=><li key={i}>{inline(l.replace(/^\s*[-*]\s+/,''),`u${b}-${i}`)}</li>)}</ul>;
  if(lines.every(l=>/^\s*\d+[.)]\s+/.test(l)))
   return <ol key={b}>{lines.map((l,i)=><li key={i}>{inline(l.replace(/^\s*\d+[.)]\s+/,''),`o${b}-${i}`)}</li>)}</ol>;
  return <p key={b}>{lines.map((l,i)=><Fragment key={i}>{i>0&&<br/>}{inline(l,`p${b}-${i}`)}</Fragment>)}</p>;
 })}</>;
}
