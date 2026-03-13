import temml from 'temml';
import { mml2omml } from '@hungknguyen/mathml2omml';
const sumMath = temml.renderToString(String.raw`\sum_{n=0}^{\infty} \frac{x^n}{n!}`, { displayMode: true, xml: true, annotate: false, throwOnError: true, colorIsTextColor: true, trust: false });
const omml = mml2omml(sumMath);
console.log(omml);
