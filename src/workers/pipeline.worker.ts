import { detectPatterns } from '../pipeline/patterns';
import { mergeDetections } from '../pipeline/merge';
import { guessDocument } from '../pipeline/document';
import { runStage } from './stage';
import type { Request, Response } from './protocol';
import type { Detection, Word } from '../types';
import type { OCRResult } from '../pipeline/ocr';

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
    const preliminary = guessDocument(words, []);
    const confidence = words.filter(word => word.text.length > 2 && word.confidence !== undefined).map(word => word.confidence!).sort((a, b) => a - b);
    const unclear = confidence.length > 0 && (confidence[Math.floor(confidence.length / 2)] < 60 || confidence.filter(value => value >= 60).length < 6 || confidence.filter(value => value < 40).length > confidence.length * 0.4);
    progress('Finding faces and codes…');
    try {
      const vision = await runStage<{ faces: Detection[]; codes: Detection[] }>(new Worker(new URL('./vision.worker.ts', import.meta.url), { type: 'module' }), { file: data.file, receipt: preliminary === 'Receipt' });
      faces = vision.faces; codes = vision.codes;
    } catch { complete = false; warnings.push('Face and code checks did not finish. Check portraits, QR codes and barcodes manually.'); }
    const patterns = passes.flatMap((pass, index) => detectPatterns(pass, preliminary).map(box => ({ ...box, id: `pass-${index}-${box.id}` })));
    const documentGuess = guessDocument(words, patterns.map(box => box.category));
    // Generic entity models mistake receipt items and brands for people/locations.
    if (words.length && !unclear && documentGuess !== 'Receipt') {
      progress('Checking names and addresses…');
      try { entities = await runStage<Detection[]>(new Worker(new URL('./ner.worker.ts', import.meta.url), { type: 'module' }), words); }
      catch { complete = false; warnings.push('The name and address model could not run. Label-based checks still ran; review all names and addresses manually.'); }
    }
    const freshEntities = entities.filter(entity => !patterns.some(box => entity.x >= box.x && entity.x + entity.width <= box.x + box.width && entity.y >= box.y && entity.y + entity.height <= box.y + box.height));
    const detections = mergeDetections([...patterns, ...freshEntities, ...faces, ...codes], data.width, data.height);
    if (!words.length) { complete = false; warnings.push('No readable text was found. Automatic checks may have missed printed details.'); }
    if (unclear) {
      complete = false; warnings.push('Some text was difficult to read. Use a closer, well-lit photo and check all covers manually.');
    }
    if (documentGuess === 'ID' && (!detections.some(box => box.category === 'full_name') || !detections.some(box => ['drivers_license', 'passport', 'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig'].includes(box.category)))) {
      complete = false; warnings.push('The ID name or identity number was not located reliably. Cover any missing fields manually.');
    }
    if (detections.some(box => box.category === 'passport' || box.category === 'mrz') && ['birthday', 'birthplace', 'issue_date', 'expiry_date'].some(category => !detections.some(box => box.category === category))) {
      complete = false; warnings.push('Some passport fields were not located. Check date of birth, place of birth, issue date and expiry date; add covers wherever details remain visible.');
    }
    if (detections.some(box => box.category === 'signature')) warnings.push('Signature areas are estimated. Check the entire signature is covered.');
    if (detections.some(box => box.category === 'passport_security_area')) warnings.push('The passport security-area cover is estimated. Check that the faint portrait and all repeated personal details are hidden.');
    send({ id: data.id, type: 'result', result: {
      width: data.width, height: data.height, detections, documentGuess, warnings,
      elapsedMs: performance.now() - start, analysisStatus: complete ? 'complete' : 'partial',
    } });
  } catch { send({ id: data.id, type: 'error', error: 'Automatic checks stopped. You can still cover this photo manually.' }); }
};
