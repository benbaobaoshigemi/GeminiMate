const source = { className: 'markdown gm-thought-original-hidden' };
const cloned = { className: source.className };
console.log('sourceHidden=' + source.className.includes('gm-thought-original-hidden'));
console.log('cloneHidden=' + cloned.className.includes('gm-thought-original-hidden'));
