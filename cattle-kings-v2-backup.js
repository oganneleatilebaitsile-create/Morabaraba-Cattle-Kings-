const MILLS = [
[0,1,2],[2,3,4],[4,5,6],[6,7,0],
[8,9,10],[10,11,12],[12,13,14],[14,15,8],
[16,17,18],[18,19,20],[20,21,22],[22,23,16],
[1,9,17],[3,11,19],[5,13,21],[7,15,23]
];

const EDGES = [];
for (let r = 0; r < 3; r++) {
const base = r * 8;
for (let i = 0; i < 8; i++) EDGES.push([base+i, base+((i+1)%8)]);
}
for (const i of [1,3,5,7]) EDGES.push([i,i+8],[i+8,i+16]);

const ADJ = Array.from({length:24}, () => []);
for (const [a,b] of EDGES) { ADJ[a].push(b); ADJ[b].push(a); }

const other = p => p === "red" ? "blue" : "red";
const count = (g,p) => g.board.filter(x => x === p).length;
const millsAt = (board,p,pos) => MILLS.some(m => m.includes(pos) && m.every(i => board[i] === p));
const phaseOf = g => g.placed.red < 12 || g.placed.blue < 12 ? "placing" : "moving";

function canCapture(g,pos) {
const enemy = other(g.current);
if (g.board[pos] !== enemy) return false;
const enemies = g.board.map((v,i) => v === enemy ? i : -1).filter(i => i >= 0);
const outside = enemies.filter(i => !millsAt(g.board,enemy,i));
return outside.length === 0 || outside.includes(pos);
}

function legalMoves(g,p) {
const pieces = g.board.map((v,i) => v === p ? i : -1).filter(i => i >= 0);
const empty = g.board.map((v,i) => v === null ? i : -1).filter(i => i >= 0);
if (pieces.length === 3) return pieces.flatMap(from => empty.map(to => ({from,to})));
return pieces.flatMap(from => ADJ[from].filter(to => g.board[to] === null).map(to => ({from,to})));
}

function finishTurn(g) {
g.pendingCapture = false;
g.current = other(g.current);
g.phase = phaseOf(g);
if (g.phase === "moving" && count(g,g.current) < 3) {
g.status = "finished"; g.winner = other(g.current); return;
}
if (g.phase === "moving" && legalMoves(g,g.current).length === 0) {
g.status = "finished"; g.winner = other(g.current);
}
}

function makeGame(vsComputer = false, difficulty = "medium") {
return {
id: crypto.randomUUID(), board: Array(24).fill(null),
placed: {red:0,blue:0}, current:"red", phase:"placing",
pendingCapture:false, status:"playing", winner:null,
vsComputer, difficulty:["easy","medium","hard"].includes(difficulty) ? difficulty : "medium",
createdAt:new Date().toISOString()
};
}

function validMove(g,from,to) {
if (!Number.isInteger(from) || !Number.isInteger(to) ||
from < 0 || from > 23 || to < 0 || to > 23) return false;
if (g.board[from] !== g.current || g.board[to] !== null) return false;
return count(g,g.current) === 3 || ADJ[from].includes(to);
}

function evaluateMillPotential(board,p,pos) {
return MILLS.filter(m => m.includes(pos) &&
m.filter(i => board[i] === p).length === 2 &&
m.filter(i => board[i] === null).length === 1).length;
}

function getCaptureTarget(g) {
const enemy = other(g.current);
const enemies = g.board.map((v,i) => v === enemy ? i : -1).filter(i => i >= 0);
const outside = enemies.filter(i => !millsAt(g.board,enemy,i));
const candidates = outside.length ? outside : enemies;
if (!candidates.length) return -1;
return candidates.sort((a,b) =>
evaluateMillPotential(g.board,enemy,b) - evaluateMillPotential(g.board,enemy,a)
)[0];
}

function simulateMove(board, move, p) {
const b = [...board]; b[move.from] = null; b[move.to] = p; return b;
}

function chooseAIPlacement(g) {
const empty = g.board.map((v,i) => v === null ? i : -1).filter(i => i >= 0);
const difficulty = g.difficulty || "medium";
if (difficulty === "easy") return empty[Math.floor(Math.random()*empty.length)];

for (const pos of empty) {
const b = [...g.board]; b[pos] = "blue";
if (millsAt(b,"blue",pos)) return pos;
}

for (const pos of empty) {
const b = [...g.board]; b[pos] = "red";
if (millsAt(b,"red",pos)) return pos;
}

if (difficulty === "hard") {
return empty.map(pos => {
const b = [...g.board]; b[pos] = "blue";
const potential = evaluateMillPotential(b,"blue",pos);
const links = ADJ[pos].filter(n => b[n] === "blue").length;
const centerBonus = [9,11,13,15,17,19,21,23].includes(pos) ? 1 : 0;
return {pos, score:potential5 + links2 + centerBonus + Math.random()*0.1};
}).sort((a,b)=>b.score-a.score)[0].pos;
}
return empty[Math.floor(Math.random()*empty.length)];
}

function chooseAIMove(g) {
const moves = legalMoves(g,"blue");
if (!moves.length) return null;
const difficulty = g.difficulty || "medium";
if (difficulty === "easy") return moves[Math.floor(Math.random()*moves.length)];

for (const move of moves) {
const b = simulateMove(g.board,move,"blue");
if (millsAt(b,"blue",move.to) && !millsAt(g.board,"blue",move.to)) return move;
}

const threats = new Set();
for (const mill of MILLS) {
const reds = mill.filter(i => g.board[i] === "red").length;
const empty = mill.filter(i => g.board[i] === null);
if (reds === 2 && empty.length === 1) threats.add(empty[0]);
}
for (const move of moves) if (threats.has(move.to)) return move;

if (difficulty === "medium") return moves[Math.floor(Math.random()*moves.length)];

let best = moves[0], bestScore = -Infinity;
for (const move of moves) {
const b = simulateMove(g.board,move,"blue");
let score = evaluateMillPotential(b,"blue",move.to)7;
score += ADJ[move.to].filter(i => b[i] === "blue").length1.5;
score -= MILLS.filter(m => m.includes(move.to) &&
m.filter(i => b[i] === "red").length === 2 &&
m.filter(i => b[i] === null).length === 1).length*5;
const redMoves = legalMoves({...g,board:b},"red").length;
score -= Math.max(0,8-redMoves)*0.6;
score += Math.random()*0.05;
if (score > bestScore) { bestScore=score; best=move; }
}
return best;
}

function aiTurn(g) {
if (!g.vsComputer || g.current !== "blue" || g.status !== "playing") return;
if (g.pendingCapture) {
const target = getCaptureTarget(g);
if (target >= 0) { g.board[target] = null; finishTurn(g); }
return;
}
if (g.phase === "placing") {
const chosen = chooseAIPlacement(g);
if (chosen === undefined) return;
g.board[chosen] = "blue"; g.placed.blue++;
g.phase = phaseOf(g);
if (millsAt(g.board,"blue",chosen)) { g.pendingCapture=true; return; }
finishTurn(g); return;
}
const move = chooseAIMove(g);
if (!move) { g.status="finished"; g.winner="red"; return; }
const before = [...g.board];
g.board[move.from]=null; g.board[move.to]="blue";
if (millsAt(g.board,"blue",move.to) && !millsAt(before,"blue",move.to)) {
g.pendingCapture=true; return;
}
finishTurn(g);
}

async function loadGame(env,id) {
if (!env.GAMES) throw new Error("GAMES KV binding is missing.");
const raw = await env.GAMES.get("game:"+id);
return raw ? JSON.parse(raw) : null;
}
async function saveGame(env,g) {
await env.GAMES.put("game:"+g.id,JSON.stringify(g),{expirationTtl:86400});
}

const html = `<!DOCTYPE html>

<html lang="en">  
<head>  
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">  
<meta name="theme-color" content="#090b10">  
<title>Cattle Kings | Morabaraba</title>  
<style>  
:root{--gold:#e9bd61;--gold2:#8c6427;--ink:#090b10;--panel:#151923;--red:#e74747;--blue:#3d8de8}  
*{box-sizing:border-box}  
body{margin:0;background:radial-gradient(ellipse at top,#29303c 0,#11151e 45%,#07090e 100%);color:#f7f0df;font-family:system-ui,Arial,sans-serif;text-align:center;min-height:100vh}  
body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.09;background-image:repeating-linear-gradient(45deg,transparent 0 18px,#d5a84f 19px 20px,transparent 21px 38px),repeating-linear-gradient(-45deg,transparent 0 18px,#d5a84f 19px 20px,transparent 21px 38px);mask-image:linear-gradient(to bottom,black,transparent 75%)}  
header{padding:25px 12px 18px;border-bottom:1px solid #8c642755;background:linear-gradient(120deg,#090b10,#202631,#090b10);position:relative}  
.brand{font-size:clamp(28px,7vw,48px);font-weight:1000;letter-spacing:.12em;color:var(--gold);text-shadow:0 2px 0 #5a3b10,0 0 22px #e9bd6140;margin:0}  
.sub{letter-spacing:.35em;color:#e8dfc9;font-size:12px;margin:5px 0 0}  
main{max-width:760px;margin:auto;padding:14px}  
.panel{background:linear-gradient(145deg,#202633ee,#11151dee);border:1px solid #b58b454d;border-radius:18px;padding:15px;margin:13px 0;box-shadow:0 12px 35px #0008,inset 0 1px #ffffff0b}  
.controls{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px}  
label{font-size:13px;color:#e8d7b1}  
select,button{font:inherit;border-radius:10px;padding:11px 14px}  
select{background:#090d15;color:#f7e8c3;border:1px solid #a77b3d}  
button{background:linear-gradient(135deg,#f4d78d,#b27b2d);color:#211607;border:1px solid #ffdf94;font-weight:800;box-shadow:0 4px 14px #0006;cursor:pointer}  
button:active{transform:translateY(1px)}  
button.secondary{background:linear-gradient(135deg,#333d4d,#171e2a);color:#f6e8c9;border-color:#687080}  
#turn{color:var(--gold);font-size:clamp(18px,4vw,24px);margin:5px}  
#message{min-height:28px;color:#f7d994}  
#counts{color:#e7dfd0;font-weight:700;font-size:14px}  
.board-wrap{max-width:530px;margin:12px auto;padding:8px;border-radius:18px;background:linear-gradient(135deg,#f0cf86,#8a5b25,#f5d995);box-shadow:0 12px 28px #0009}  
svg{display:block;width:100%;background:radial-gradient(circle at 50% 45%,#c99b5b,#95602e);border-radius:12px;touch-action:manipulation}  
line{stroke:#3a2516;stroke-width:5;stroke-linecap:round}  
circle{cursor:pointer;stroke:#f8e4b7;stroke-width:2.5;filter:drop-shadow(0 3px 2px #0007);transition:r .12s}  
.small{color:#b9c0cc;font-size:12px}  
.footer{color:#8e98a8;font-size:11px;letter-spacing:.08em}  
@media(max-width:420px){main{padding:8px}.panel{padding:11px}.board-wrap{padding:5px}}  
</style></head>  
<body>  
<header><h1 class="brand">MORABARABA</h1><p class="sub">CATTLE KINGS • AFRICAN STRATEGY</p></header>  
<main>  
<div class="panel">  
<div class="controls">  
<label>Game mode <select id="mode"><option value="computer">Player vs Computer</option><option value="local">Two Players</option></select></label>  
<label>AI level <select id="difficulty"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select></label>  
<button id="start">♛ New Game</button>  
</div></div>  
<div class="panel">  
<h3 id="turn">Start a new game</h3><p id="message">Welcome to the arena.</p><p id="counts"></p>  
<div class="board-wrap"><svg id="board" viewBox="0 0 500 500" role="img" aria-label="Morabaraba board"></svg></div>  
<p class="small">🔴 Red: Player 1 &nbsp; | &nbsp; 🔵 Blue: Player 2 / Computer</p>  
</div>  
<div class="panel"><button class="secondary" id="language">Setswana / English</button><p class="footer">CATTLE KINGS • VERSION 2 DESIGN PREVIEW</p></div>  
</main>  <script>  
const points=[[50,50],[250,50],[450,50],[450,250],[450,450],[250,450],[50,450],[50,250],[125,125],[250,125],[375,125],[375,250],[375,375],[250,375],[125,375],[125,250],[200,200],[250,200],[300,200],[300,250],[300,300],[250,300],[200,300],[200,250]];  
const edges=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,8],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,16],[1,9],[9,17],[3,11],[11,19],[5,13],[13,21],[7,15],[15,23]];  
let game=null,selected=null,lang="en";  
const $=id=>document.getElementById(id);  
const say=(en,tn)=>$("message").textContent=lang==="en"?en:tn;  
async function api(path,method="GET",body){const r=await fetch("/api"+path,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw new Error(d.error||"API error");return d;}  
function draw(){if(!game)return;const svg=$("board");svg.innerHTML="";  
 for(const [a,b] of edges){const l=document.createElementNS("http://www.w3.org/2000/svg","line");l.setAttribute("x1",points[a][0]);l.setAttribute("y1",points[a][1]);l.setAttribute("x2",points[b][0]);l.setAttribute("y2",points[b][1]);svg.appendChild(l);}  
 points.forEach(([x,y],i)=>{const c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("cx",x);c.setAttribute("cy",y);c.setAttribute("r",game.board[i]?17:11);c.setAttribute("fill",game.board[i]==="red"?"#e74747":game.board[i]==="blue"?"#3d8de8":"#f3dfb7");if(selected===i){c.setAttribute("stroke","#fff");c.setAttribute("stroke-width","6");}c.addEventListener("click",()=>clickPoint(i));svg.appendChild(c);});  
 $("turn").textContent=game.status==="finished"?(game.winner==="red"?"🏆 Red wins!":"🏆 Blue wins!"):(game.pendingCapture?"Capture an opponent's cow":(game.current==="red"?"Red's turn":"Blue's turn")+" • "+game.phase);  
 $("counts").textContent="Red: "+game.board.filter(x=>x==="red").length+" | Blue: "+game.board.filter(x=>x==="blue").length+" | Placed: "+game.placed.red+"/12 and "+game.placed.blue+"/12";  
}  
async function refresh(){const d=await api("/games/"+game.id);game=d.game;draw();}  
async function start(){try{selected=null;const d=await api("/games","POST",{vsComputer:$("mode").value==="computer",difficulty:$("difficulty").value});game=d.game;say("Game started. Red plays first.","Motshameko o simolotse. Mohibidu o simolola.");draw();}catch(e){say(e.message,e.message);}}  
async function clickPoint(i){if(!game||game.status!=="playing")return;if(game.vsComputer&&game.current==="blue")return;try{  
 if(game.pendingCapture){await api("/games/"+game.id+"/capture","POST",{at:i});say("Cattle captured!","Kgomo e tshwerwe!");selected=null;}  
 else if(game.phase==="placing"){await api("/games/"+game.id+"/place","POST",{to:i});}  
 else if(selected===null){if(game.board[i]===game.current)selected=i;else return;}  
 else{const from=selected;selected=null;await api("/games/"+game.id+"/move","POST",{from,to:i});}  
 await refresh();await computerPlay();  
 }catch(e){say(e.message,e.message);}}  
async function computerPlay(){if(!game||!game.vsComputer)return;let safety=0;while(game&&game.status==="playing"&&game.current==="blue"&&safety++<3){await api("/games/"+game.id+"/ai","POST",{});await refresh();}}  
$("start").addEventListener("click",start);  
$("language").addEventListener("click",()=>{lang=lang==="en"?"tn":"en";if(game)draw();});  
api("/status").then(d=>say(d.message,d.message)).catch(e=>say(e.message,e.message));  
</script></body></html>`;  export default {
async fetch(request,env) {
const url=new URL(request.url),path=url.pathname,method=request.method;
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json",...headers}});
if(method==="OPTIONS")return new Response(null,{headers});
if(path==="/"&&method==="GET")return new Response(html,{headers:{"Content-Type":"text/html;charset=UTF-8"}});
if(path==="/api/status"&&method==="GET")return reply({success:true,game:"Morabaraba: Cattle Kings",version:"2.0-preview",message:"Cattle Kings API is online"});
if(!path.startsWith("/api/"))return reply({success:false,error:"Route not found"},404);
if(!env.GAMES)return reply({success:false,error:"Missing GAMES KV binding."},500);
if(path==="/api/games"&&method==="POST"){
let body={};try{body=await request.json();}catch{}
const g=makeGame(body.vsComputer===true,body.difficulty||"medium");
await saveGame(env,g);return reply({success:true,game:g},201);
}
const match=path.match(/^/api/games/([a-f0-9-]+)(?:/(place|move|capture|ai))?$/i);
if(!match)return reply({success:false,error:"Unknown API route"},404);
const id=match[1],action=match[2]||"";
let g;try{g=await loadGame(env,id);}catch(e){return reply({success:false,error:e.message},500);}
if(!g)return reply({success:false,error:"Game not found or expired"},404);
if(method==="GET"&&!action)return reply({success:true,game:g});
if(method!=="POST")return reply({success:false,error:"Use POST for game actions"},405);
if(g.status!=="playing")return reply({success:false,error:"This game has finished",game:g},400);
if(g.vsComputer&&g.current==="blue"&&action!=="ai")return reply({success:false,error:"It is the computer's turn"},403);
let body;try{body=await request.json();}catch{return reply({success:false,error:"Invalid JSON"},400);}
if(action==="place"){
const to=body.to;
if(g.phase!=="placing"||g.pendingCapture||!Number.isInteger(to)||to<0||to>23||g.board[to]!==null||g.placed[g.current]>=12)return reply({success:false,error:"Illegal placement"},400);
const p=g.current;g.board[to]=p;g.placed[p]++;g.phase=phaseOf(g);
if(millsAt(g.board,p,to))g.pendingCapture=true;else finishTurn(g);
} else if(action==="move"){
if(g.phase!=="moving"||g.pendingCapture||!validMove(g,body.from,body.to))return reply({success:false,error:"Illegal move"},400);
const p=g.current,before=[...g.board];g.board[body.from]=null;g.board[body.to]=p;
if(millsAt(g.board,p,body.to)&&!millsAt(before,p,body.to))g.pendingCapture=true;else finishTurn(g);
} else if(action==="capture"){
const at=body.at;if(!g.pendingCapture||!Number.isInteger(at)||!canCapture(g,at))return reply({success:false,error:"Illegal capture"},400);
g.board[at]=null;finishTurn(g);
} else if(action==="ai"){
if(!g.vsComputer||g.current!=="blue")return reply({success:false,error:"Computer is not active"},400);
aiTurn(g);
} else return reply({success:false,error:"Unknown action"},404);
await saveGame(env,g);return reply({success:true,game:g});
}
};