import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun({ text: '中文测试 Hello' })] })] }] });
const buffer = await Packer.toBuffer(doc);
const zip = await JSZip.loadAsync(buffer);
const xml = await zip.file('word/document.xml').async('string');
console.log(xml);
