import { useState } from 'react';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { ICodeStatement } from '../../src/CodeStatement';
import { WodWiki } from '../../src/editor/WodWiki';
import { IScript } from '../../src/WodScript';
import { FragmentVisualizer } from '../../src/components/fragments';

const StatementRow = ({ statement }: { statement: ICodeStatement }) => {
    const lineNumber = statement.meta?.line ?? 'N/A';
    const range = statement.meta ? `[${statement.meta.columnStart} - ${statement.meta.columnEnd}]` : 'N/A';
    const paddingLeft = statement.meta?.columnStart ? `${(statement.meta.columnStart - 1) * 0.8}rem` : '0';

    return (
        <tr className="border-b border-gray-200 hover:bg-gray-50">
            <td className="p-3 align-top text-sm text-gray-500 w-16">{lineNumber}</td>
            <td className="p-3 align-top text-sm text-gray-500 w-24">{range}</td>
            <td className="p-3">
                <div style={{ paddingLeft }}>
                    <FragmentVisualizer fragments={statement.fragments} />
                </div>
            </td>
        </tr>
    );
};

export const Parser = ({ text }: { text: string }) => {
    const runtime = new MdTimerRuntime();
    const initialScript = runtime.read(text);
    const [script, setScript] = useState<IScript>(initialScript);

    const handleValueChange = (newScript?: IScript) => {
        if (newScript) {
            setScript(newScript);
        }
    };

    const statements = script.statements;
    
    return (
        <div className="p-4 font-sans">
            <div className="mb-4">  
                <WodWiki id="parser-editor" code={text} onValueChange={handleValueChange} />              
            </div>
            <div>                
                <div className="overflow-hidden rounded-lg border border-gray-200 shadow-md">
                    <table className="w-full border-collapse bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Line</th>
                                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Position</th>
                                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fragments Breakdown</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {statements.map((statement, index) => (
                                <StatementRow key={index} statement={statement} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
