(() => {
    try {
        if (window.monaco?.editor) {
            const models = window.monaco.editor.getModels();

            if (models.length > 0) {
                let bestModel: string | null = null;
                let maxLength = 0;
                let languageId: string | null = null;

                models.forEach((model) => {
                    const val = model.getValue();
                    if (val.length > maxLength) {
                        maxLength = val.length;
                        bestModel = val;
                        languageId = model.getLanguageId();
                    }
                });

                if (bestModel) {
                    window.postMessage({
                        type: 'GEMINI_CODE_FOUND',
                        code: bestModel,
                        languageId: languageId
                    }, '*');
                    return;
                }
            }
        }
    } catch (e) {
        console.error("Error accessing Monaco", e);
    }
    window.postMessage({ type: 'GEMINI_MONACO_NOT_FOUND' }, '*');
})();