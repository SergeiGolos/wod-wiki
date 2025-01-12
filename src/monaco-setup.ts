// import * as monaco from 'monaco-editor';
// import { useRouter } from 'next/router';


// const router = useRouter();
// const basePath = router.basePath;
// // Using a more compatible way to load workers
// const jsonWorkerUrl = new URL(
//     'node_modules/monaco-editor/esm/vs/language/json/json.worker.js',
//      basePath + '/'
// ).href;

// const tsWorkerUrl = new URL(
//     'node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js',
//     basePath + '/'
// ).href;

// const editorWorkerUrl = new URL(
//     'node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
//     basePath + '/'
// ).href;

// // @ts-ignore
// self.MonacoEnvironment = {
//     getWorker(_: any, label : string) {
//         if (label === 'json') {
//             return new Worker(jsonWorkerUrl, { type: 'module' });
//         }
//         if (label === 'typescript' || label === 'javascript') {
//             return new Worker(tsWorkerUrl, { type: 'module' });
//         }
//         return new Worker(editorWorkerUrl, { type: 'module' });
//     }
// };
