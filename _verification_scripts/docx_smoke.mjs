import { Document, Packer, Paragraph } from 'docx';

const doc = new Document({
  sections: [{ children: [new Paragraph('hello')] }],
});

const blob = await Packer.toBlob(doc);
console.log('blob-size=' + blob.size);
