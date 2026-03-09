// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('neural-sync-ui.resolveConflict', () => {
        const targetEditor = vscode.window.activeTextEditor;
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor found.');
            return;
        }

        const text = editor.document.getText();
        const panel = vscode.window.createWebviewPanel(
            'neuralSyncResolution',
            'Neural-Sync Resolution',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = getWebviewContent();
        panel.webview.postMessage({ command: 'scan', text: text });

        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'accept') {
                if (targetEditor) {
                    const document = targetEditor.document;
                    const text = document.getText();

                    // 1. Locate the exact start and end of the conflict block
                    const startIdx = text.indexOf('<<<<<<< HEAD');
                    const endMarker = '>>>>>>>';
                    const endMarkerIdx = text.indexOf(endMarker, startIdx);

                    if (startIdx !== -1 && endMarkerIdx !== -1) {
                        const edit = new vscode.WorkspaceEdit();

                        // Find the end of the line containing the >>>>>>> marker
                        const endOfMarkerLine = text.indexOf('\n', endMarkerIdx);
                        const finalEndIdx = (endOfMarkerLine !== -1) ? endOfMarkerLine + 1 : text.length;

                        // Create the exact range to replace
                        const conflictRange = new vscode.Range(
                            document.positionAt(startIdx),
                            document.positionAt(finalEndIdx)
                        );

                        // 2. Clean up the AI code (Handle escaped newlines/quotes)
                        let cleanCode = message.text;
                        try {
                            // If it's a double-encoded JSON string, parse it once to get raw text
                            if (typeof cleanCode === 'string' && (cleanCode.includes('\\n') || cleanCode.startsWith('"'))) {
                                // This converts literal "\n" into real line breaks
                                cleanCode = JSON.parse(`"${cleanCode.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
                            }
                        } catch (e) {
                            console.log("Cleanup failed, using raw text");
                        }

                        // 3. Execute the replacement
                        edit.replace(document.uri, conflictRange, cleanCode);
                        vscode.workspace.applyEdit(edit).then(success => {
                            if (success) {
                                vscode.window.showInformationMessage("Neural-Sync: Surgical Merge Successful!");
                            }
                        });
                    } else {
                        vscode.window.showErrorMessage("Could not locate conflict markers.");
                    }
                }
            }
        });
    });

    context.subscriptions.push(disposable);

    // --- THE NEURAL-SYNC TRIPWIRE (V2: Debounced) ---
    let isCooldown = false;

    vscode.workspace.onDidChangeTextDocument((event) => {
        const text = event.document.getText();

        if (text.includes("<<<<<<< HEAD") && text.includes("=======") && text.includes(">>>>>>>")) {

            if (!isCooldown) {
                isCooldown = true;

                vscode.window.showInformationMessage("Neural-Sync: Conflict detected! Initializing AI...");

                // THE FIX: Wait 1000ms (1 second) to let the pasted text settle in the editor
                setTimeout(() => {
                    // IMPORTANT: Replace 'your.command.name' with your actual command ID!
                    vscode.commands.executeCommand('neural-sync-ui.resolveConflict');
                }, 1000);

                // Reset the tripwire after 10 seconds to prevent infinite loops
                setTimeout(() => {
                    isCooldown = false;
                }, 10000);
            }
        }
    });
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neural-Sync Resolution</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-gray-100 p-6 font-sans antialiased">
    <div id="loading" class="flex flex-col items-center justify-center space-y-4 py-20">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div class="text-xl font-medium text-gray-300">Scanning for conflicts...</div>
    </div>
    
    <div id="result" class="hidden max-w-4xl mx-auto space-y-6">
        <div class="bg-gray-800 rounded-xl p-8 shadow-2xl border border-gray-700">
            <div class="flex items-center justify-between mb-8">
                <h2 class="text-3xl font-bold text-white tracking-tight">Merge Result</h2>
                <span id="intent-tag" class="px-4 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 text-sm font-bold uppercase tracking-wider rounded-full shadow-sm"></span>
            </div>
            
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-gray-400 mb-3 ml-1">Explanation</h3>
                <p id="explanation" class="text-gray-300 leading-relaxed text-lg bg-gray-900/50 p-4 rounded-lg border border-gray-700/50"></p>
            </div>
            
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-gray-400 mb-3 ml-1">Merged Code</h3>
                <div class="bg-gray-950 rounded-lg p-5 overflow-x-auto border border-gray-700 shadow-inner">
                    <pre><code id="code-block" class="language-python text-green-400 font-mono text-sm leading-relaxed block"></code></pre>
                </div>
            </div>
            
            <div class="mt-8 flex justify-end">
                <button id="accept-btn" class="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg hover:shadow-green-500/25 transition-all duration-200 transform hover:-translate-y-0.5">
                    Accept Merge
                </button>
            </div>
        </div>
    </div>
    
    <div id="error" class="hidden mt-6 bg-red-900/50 border border-red-700/50 text-red-200 px-6 py-4 rounded-lg text-center max-w-2xl mx-auto shadow-lg">
        <p id="error-message" class="font-medium"></p>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        window.addEventListener('message', async event => {
            const message = event.data;
            if (message.command === 'scan') {
                try {
                    const response = await fetch('https://neuralsync-seven.vercel.app/api/merge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ raw_conflict_text: message.text })
                    });
                    
                    if (!response.ok) throw new Error('Failed to resolve conflict. Status: ' + response.status);
                    
                    const data = await response.json();
                    
                    document.getElementById('loading').classList.add('hidden');
                    document.getElementById('result').classList.remove('hidden');
                    
                    document.getElementById('intent-tag').innerText = data.intent_tag;
                    document.getElementById('explanation').innerText = data.explanation;
                    
                    // Handle Groq's nested JSON structure safely:
                    let rawCode = data.merged_code || data.code || data;
                    if (typeof rawCode !== 'string') {
                        rawCode = rawCode.formatted || JSON.stringify(rawCode, null, 2);
                    }
                    // 1. Strip surrounding quotes if the AI double-stringified it
                    if (rawCode.startsWith('"') && rawCode.endsWith('"')) {
                        rawCode = rawCode.substring(1, rawCode.length - 1);
                    }
                    // 2. Force convert literal \\n text into real line breaks and fix quotes
                    let cleanCode = rawCode.replace(/\\\\n/g, '\\n').replace(/\\\\"/g, '"');
                    document.getElementById('code-block').innerText = cleanCode;
                    window.resolvedCode = cleanCode;
                    
                } catch (err) {
                    document.getElementById('loading').classList.add('hidden');
                    const errEl = document.getElementById('error');
                    errEl.classList.remove('hidden');
                    document.getElementById('error-message').textContent = err.message;
                }
            }
        });
        
        document.getElementById('accept-btn').addEventListener('click', () => {
            vscode.postMessage({ command: 'accept', text: window.resolvedCode });
        });
    </script>
</body>
</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() { }
