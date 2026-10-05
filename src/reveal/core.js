/** Pure document primitives. Browser APIs, clocks and ID generation are injected. */
function createRevealCore() {
  const limits = Object.freeze({
    maxPages: 30, maxMasks: 1000, maxMasksPerPage: 200, maxQuestions: 1000,
    maxQuestionMasks: 50, maxInputBytes: 20 * 1024 ** 2,
    maxSide: 8192, maxPixels: 16000000, maxPngBytes: 32 * 1024 ** 2,
    maxAssetBytes: 64 * 1024 ** 2, maxJsonBytes: 96 * 1024 ** 2,
    maxHtmlBytes: 100 * 1024 ** 2, maxUndo: 100
  });
  function error(code) { const value = new Error(code); value.code = code; return value; }
  function newDocument(ctx, title = 'Untitled sheet') {
    return { id: ctx.newId('document'), revision: 1, title,
      defaults: { mode: 'free', otherAnswers: 'hidden' },
      pages: [], assets: [], questions: [], masks: [] };
  }
  function appendAsset(doc, asset, ctx, title) {
    const total = doc.assets.reduce((sum, item) => sum + item.byteLength, 0);
    if (doc.pages.length >= limits.maxPages || total + asset.byteLength > limits.maxAssetBytes)
      throw error('LIMIT_EXCEEDED');
    if (doc.assets.some(item => item.id === asset.id) || asset.mime !== 'image/png' ||
        !Number.isSafeInteger(asset.byteLength) || asset.byteLength < 1 || asset.byteLength > limits.maxPngBytes)
      throw error('INVALID_SHEET');
    // Only normalized, validated assets reach this internal command. Do not copy
    // File.name, lastModified, source bytes or editor/session state into the doc.
    const normalized = {id:asset.id, mime:asset.mime, width:asset.width, height:asset.height,
      byteLength:asset.byteLength, dataBase64:asset.dataBase64};
    return { ...doc, revision: doc.revision + 1,
      pages: [...doc.pages, {id:ctx.newId('page'), title, description:'', imageId:asset.id, questionOrder:[]}],
      assets: [...doc.assets, normalized] };
  }
  return Object.freeze({ limits, error, newDocument, appendAsset });
}
