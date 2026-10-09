import { detectPatterns } from '../pipeline/patterns';
import { mergeDetections } from '../pipeline/merge';
import { guessDocument, usesEntityModel } from '../pipeline/document';
import { runStage } from './stage';
import type { Request, Response } from './protocol';
import type { Detection, Word } from '../types';
import type { OCRResult } from '../pipeline/ocr';
import { coverageWarnings, passportPrivacyArea } from '../pipeline/coverage';

function send(message: Response) { self.postMessage(message); }

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  const progress = (text: string) => send({ id: data.id, type: 'progress', text });
  const start = performance.now();
  const warnings: string[] = [];
  let words: Word[] = [];
  let passes: Word[][] = [];
  let faces: Detection[] = [];
  let codes: Detection[] = [];
  let entities: Detection[] = [];
  let complete = true;
  try {
    progress('Reading text…');
    try {
      const ocr = await runStage<OCRResult>(new Worker(new URL('./ocr.worker.ts', import.meta.url), { type: 'module' }), data.file);
      words = ocr.primary; passes = ocr.passes;
    }
    catch { complete = false; warnings.push('Text checks did not finish. Cover names, dates, addresses and identity numbers manually.'); }
    // Different threshold passes recover different headings. A sharper logo must
    // not hide receipt context present in the other OCR pass.
    const documentWords = passes.length ? passes.flat() : words;
    const preliminary = guessDocument(documentWords, []);
    const confidence = words.filter(word => word.text.length > 2 && word.confidence !== undefined).map(word => word.confidence!).sort((a, b) => a - b);
    const unclear = confidence.length > 0 && (confidence[Math.floor(confidence.length / 2)] < 60 || confidence.filter(value => value >= 60).length < 6 || confidence.filter(value => value < 40).length > confidence.length * 0.4);
    progress('Finding faces and codes…');
    try {
      const vision = await runStage<{ faces: Detection[]; codes: Detection[] }>(new Worker(new URL('./vision.worker.ts', import.meta.url), { type: 'module' }), { file: data.file, strictFaces: preliminary === 'Receipt' || (preliminary === 'Unknown' && unclear) });
      faces = vision.faces; codes = vision.codes;
    } catch { complete = false; warnings.push('Face and code checks did not finish. Check portraits, QR codes and barcodes manually.'); }
    const patterns = passes.flatMap((pass, index) => detectPatterns(pass, preliminary).map(box => ({ ...box, id: `pass-${index}-${box.id}` })));
    const documentGuess = guessDocument(documentWords, patterns.map(box => box.category));
    if (words.length && !unclear && usesEntityModel(documentGuess, patterns.map(box => box.category))) {
      progress('Checking names and addresses…');
      try { entities = await runStage<Detection[]>(new Worker(new URL('./ner.worker.ts', import.meta.url), { type: 'module' }), words); }
      catch { complete = false; warnings.push('The name and address model could not run. Label-based checks still ran; review all names and addresses manually.'); }
    }
    const freshEntities = entities.filter(entity => !patterns.some(box => entity.x >= box.x && entity.x + entity.width <= box.x + box.width && entity.y >= box.y && entity.y + entity.height <= box.y + box.height));
    const detections = passportPrivacyArea(mergeDetections([...patterns, ...freshEntities, ...faces, ...codes], data.width, data.height));
    if (freshEntities.length) {
      complete = false;
      warnings.push('Possible names and locations are model suggestions, not verified personal details. Remove incorrect suggestions and check for missed text.');
    }
    if (!words.length) { complete = false; warnings.push('No readable text was found. Automatic checks may have missed printed details.'); }
    if (unclear) {
      complete = false; warnings.push('Some text was difficult to read. Use a closer, well-lit photo and check all covers manually.');
    }
    const missingFields = coverageWarnings(documentWords, detections.map(box => box.category), documentGuess);
    if (missingFields.length) { complete = false; warnings.push(...missingFields); }
    if (detections.some(box => box.category === 'signature')) warnings.push('Signature areas are estimated. Check the entire signature is covered.');
    if (detections.some(box => box.category === 'passport_security_area')) warnings.push('The passport security-area cover is estimated. Check that the faint portrait and all repeated personal details are hidden.');
    if (detections.some(box => box.category === 'passport_portrait_area')) warnings.push('The full passport portrait cover is estimated. Check its edges for repeated personal details.');
    if (detections.some(box => box.category === 'passport_details_area')) warnings.push('The passport personal-data area is covered conservatively, including fields that text recognition may miss. Check the area’s edges before sharing.');
    send({ id: data.id, type: 'result', result: {
      width: data.width, height: data.height, detections, documentGuess, warnings,
      elapsedMs: performance.now() - start, analysisStatus: complete ? 'complete' : 'partial',
    } });
  } catch { send({ id: data.id, type: 'error', error: 'Automatic checks stopped. You can still cover this photo manually.' }); }
};
