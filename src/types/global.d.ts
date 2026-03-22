export { };

declare global {
    interface Window {
        monaco?: {
            editor: {
                getModels: () => Array<{
                    getValue: () => string;
                    getLanguageId: () => string;
                }>;
            };
        };
    }
}