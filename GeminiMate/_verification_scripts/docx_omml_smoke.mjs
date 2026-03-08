import { Document, ImportedXmlComponent, Packer, Paragraph } from 'docx';
const omml = '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><m:r><m:t xml:space="preserve">x+1</m:t></m:r></m:oMath>';
const math = ImportedXmlComponent.fromXmlString(omml);
const doc = new Document({ sections: [{ children: [new Paragraph({ children: [math] })] }] });
const blob = await Packer.toBlob(doc);
console.log('omml-docx-size=' + blob.size);
