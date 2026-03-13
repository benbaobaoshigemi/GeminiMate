import JSZip from 'jszip';
import { Document, Packer, Paragraph, convertToXmlComponent } from 'docx';
import { xml2js } from 'xml-js';

const omml = '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><m:r><m:t xml:space="preserve">x+1</m:t></m:r></m:oMath>';
const parsed = xml2js(omml, { compact: false });
const root = parsed.elements?.[0];
const converted = convertToXmlComponent(root);
const doc = new Document({ sections: [{ children: [new Paragraph({ children: [converted] })] }] });
const buffer = await Packer.toBuffer(doc);
const zip = await JSZip.loadAsync(buffer);
const xml = await zip.file('word/document.xml').async('string');
console.log(xml);
