import { mml2omml } from '@hungknguyen/mathml2omml';
const mml = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></math>';
const omml = mml2omml(mml);
console.log(omml);
