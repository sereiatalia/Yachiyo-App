const OPERATORS = new Set(['+','-','*','/','%','^','(',')']);

function tokensFor(expression) {
  const source=expression.replace(/[×x]/gi,'*').replace(/÷/g,'/').replace(/,/g,'').trim();
  if(!source || source.length>100 || /[^0-9.+\-*/%^()\s]/.test(source)) return null;
  const tokens=[];
  for(let index=0;index<source.length;) {
    const char=source[index];
    if(/\s/.test(char)) { index++; continue; }
    if(OPERATORS.has(char)) { tokens.push(char); index++; continue; }
    const number=source.slice(index).match(/^(?:\d+\.?\d*|\.\d+)/)?.[0];
    if(!number) return null;
    tokens.push(Number(number)); index+=number.length;
  }
  return tokens;
}

function calculate(tokens) {
  let position=0;
  const peek=()=>tokens[position];
  const take=()=>tokens[position++];
  const factor=()=>{
    if(peek()==='+') { take(); return factor(); }
    if(peek()==='-') { take(); return -factor(); }
    if(peek()==='(') { take(); const value=expression(); if(take()!==')') throw new Error('Missing closing bracket'); return value; }
    if(typeof peek()!=='number') throw new Error('Expected a number');
    return take();
  };
  const power=()=>{ let value=factor(); if(peek()==='^') { take(); const exponent=power(); if(Math.abs(exponent)>100) throw new Error('Exponent is too large'); value=value**exponent; } return value; };
  const term=()=>{ let value=power(); while(['*','/','%'].includes(peek())) { const operator=take(), right=power(); if((operator==='/'||operator==='%')&&right===0) throw new Error('Cannot divide by zero'); value=operator==='*'?value*right:operator==='/'?value/right:value%right; } return value; };
  const expression=()=>{ let value=term(); while(['+','-'].includes(peek())) { const operator=take(), right=term(); value=operator==='+'?value+right:value-right; } return value; };
  const result=expression(); if(position!==tokens.length || !Number.isFinite(result)) throw new Error('Invalid calculation'); return result;
}

export function solveSimpleMath(text) {
  if(!/[0-9]/.test(text) || !/[+\-*/%^×÷()]/.test(text)) return null;
  const cleaned=text.replace(/^(?:what\s+is|calculate|compute|solve|how\s+much\s+is|magkano\s+ang|kalkulahin|kwentahin|ano\s+ang)\s*/i,'').trim();
  const expression=cleaned.match(/[0-9.\s+\-*/%^×x÷()]+/)?.[0]?.trim();
  const tokens=tokensFor(expression ?? ''); if(!tokens) return null;
  try { const value=calculate(tokens); return {expression,value}; } catch { return {expression,error:true}; }
}
