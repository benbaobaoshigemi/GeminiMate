import JSZip from 'jszip';
import { Document, Packer, Paragraph, convertToXmlComponent } from 'docx';

const parser = new DOMParser();
const xmlDoc = parser.parseFromString('<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><m:r><m:t xml:space="preserve">x+1</m:t></m:r></m:oMath>', 'application/xml');
const converted = convertToXmlComponent(xmlDoc.documentElement);
const doc = new Document({ sections: [{ children: [new Paragraph({ children: [converted] })] }] });
const buffer = await Packer.toBuffer(doc);
const zip = await JSZip.loadAsync(buffer);
const xml = await zip.file('word/document.xml').async('string');
console.log(xml);
