const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`Duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
for (const name of ['openPdf','openSpreadsheet','openRichArchiveDocumentV32','openLegacyDocV32','openDxfV32','openMedia','openRtf','runOcr','runOcrV33','buildOcrLayer','buildOcrMatrix','openOcrTableEditor','exportEditableDocx','exportSvgV32','exportVideoWebmV32','renderPptxSlideV32','openOdtSafe','releaseDistantPdfPages','saveLocalDraftV32','restoreLocalDraftV32','recordDocumentHistory','searchPdf','renderPdfThumbnail','removeSelectedImageBackground','printContentOnly','undoAction','buildPdfDocumentV33','mergeAdditionalPdfs','splitPdfToZip','exportPdfPageImages','batchImagesV33','compareWithDocument','initMediaCutter']) {
  if (!app.includes(`function ${name}`)) throw new Error(`Missing function: ${name}`);
}
for (const format of ['.doc','.dxf','audio/*','video/*']) {
  if (!html.includes(format)) throw new Error(`Missing accepted format: ${format}`);
}
if (!html.includes('app.js?v=83') || !html.includes('styles.css?v=83')) throw new Error('Release cache version is not v83');
for (const id of ['pdfSearchInput','pdfSearchBtn','ocrTableBtn','pdfLetterSpacing','imageRotation','imageBrightness','mediaStart','mediaEnd','mediaBitrate','addRectVector','pageMoveUp','mergePdfInput','batchImageInput','redactSensitiveBtn','themeToggle','compareDocBtn','pdfHeaderText','pdfFooterText','pdfPageNumbers','exportPageImagesBtn','compressPdfBtn']) {
  if (!ids.includes(id)) throw new Error(`Missing v32 control: ${id}`);
}
for (const id of [...app.matchAll(/\$\('#([A-Za-z][\w-]*)'\)/g)].map(match => match[1])) {
if (!ids.includes(id) && !['mediaPlayer','mediaWaveform','mediaSelectionStart','mediaSelectionEnd','mediaPlayhead','mediaPlayBtn','mediaTimeLabel','mediaSetStartBtn','mediaSetEndBtn','mediaRangeStart','mediaRangeEnd','mediaWidthInline','mediaBitrateInline','mediaMuteInline','mediaStartControl','mediaEndControl','mediaPositionFields','mediaCutModeBtn','mediaCutLength','mediaNudgeControls','mediaOutputFormat','mediaSaveBtn','mediaStepButtons'].includes(id)) throw new Error(`JavaScript references missing ID: ${id}`);
}
for (const src of [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1])) {
  if (/^https?:/.test(src)) throw new Error(`External runtime script: ${src}`);
  const relative = src.replace(/^\/convertit\//, '').split('?')[0];
  if (!fs.existsSync(path.join(root, relative))) throw new Error(`Missing script: ${relative}`);
}
console.log(`Convertit smoke checks passed (${ids.length} unique IDs)`);
