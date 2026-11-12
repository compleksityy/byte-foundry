function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const ri=(r,a,b)=>a+Math.floor(r()*(b-a+1));
const bin=(n,w)=>n.toString(2).padStart(w||8,'0');
const p=(r,a)=>a[ri(r,0,a.length-1)];
const GEV=(g,a,b)=>({AND:a&b,OR:a|b,NAND:1-(a&b),NOR:1-(a|b),XOR:a^b}[g]);
const GATE_ID=[
["Which logic gate outputs 1 only when both of its inputs are 1?", "and"],
["Which logic gate outputs 1 when at least one of its inputs is 1?", "or"],
["Which logic gate outputs 1 when its two inputs are different?", "xor"],
["Which single-input logic gate flips its input (1 becomes 0, 0 becomes 1)?", "not"],
["Which gate behaves like an AND gate with the output inverted?", "nand"],
["Which gate behaves like an OR gate with the output inverted?", "nor"],
["Which gate outputs 0 only when both of its inputs are 1?", "nand"],
["Which gate outputs 0 when at least one of its inputs is 1?", "nor"],
["Which gate outputs 0 when its two inputs are the same?", "xor"],
["Which logic gate is also called an inverter?", "not"],
["An AND gate with a small circle on its output symbol represents which gate?", "nand"],
["An OR gate with a small circle on its output symbol represents which gate?", "nor"],
["This gate's symbol is a triangle with a small circle on the tip. Which gate is it?", "not"],
["A D-shaped (AND) gate symbol with a circle at the output is which gate?", "nand"],
["Which gate keeps its output at 1 unless at least one of its inputs is 1?", "nor"],
["Which gate keeps its output at 1 unless both of its inputs are 1?", "nand"]
];
const g1=function(r){const gate=p(r,['AND','OR','NAND','NOR','XOR','NOT']);const a=ri(r,0,1);const b=gate==='NOT'?a:ri(r,0,1);const out=gate==='NOT'?1-a:GEV(gate,a,b);const q=gate==='NOT'?('Given input A='+a+', what is the output of the NOT gate? (answer 0 or 1)'):('Given A='+a+' and B='+b+', what is the output of the '+gate+' gate? (answer 0 or 1)');return{q,a:''+out};};
const g2=function(r){const ins=p(r,[1,2,3,4,5]);return{q:'How many rows are there in the truth table of a logic gate with '+ins+' input'+(ins>1?'s':'')+'?',a:''+(2**ins)};};
const g3=function(r){const x=p(r,GATE_ID);return{q:x[0],a:x[1]};};
const g4=function(r){const x=p(r,[["A AND 0 always equals what?","0"],["A OR 1 always equals what?","1"],["If B = 1, A OR B equals what? (A may be 0 or 1)","1"],["If B = 0, A AND B equals what?","0"],["A XOR 0 equals what?","a"],["A NAND 0 equals what?","1"]]);return{q:x[0],a:x[1]};};
// run d1 only
function runD1(seed){const r=rng(seed),seen=new Set();const res=[];const entries=[[22,1,g1],[5,1,g2],[14,1,g3],[3,1,g4]];
for(const[n,d,g]of entries){let k=0,guard=0;let firstFail=null;while(k<n){if(guard++>9999){console.log('FAIL need',n,'got',k,'at gen entry index',entries.indexOf([n,d,g]),'guard',guard);return;}const x=g(r,k);const key=(x.c||'')+x.q;if(!seen.has(key)){seen.add(key);res.push(x);k++;}}}
console.log('d1 ok total',res.length);}
runD1(5);