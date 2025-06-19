import React from 'react';
import { MdTimerRuntime } from '../src/parser/md-timer';
import { ICodeStatement } from '../src/CodeStatement';
import { ICodeFragment } from '../src/CodeFragment';

const getFragmentColorClasses = (type: string) => {
    const colorMap: { [key: string]: string } = {
        'timer': 'bg-blue-100 border-blue-200 text-blue-800',
        'rep': 'bg-green-100 border-green-200 text-green-800',
        'effort': 'bg-yellow-100 border-yellow-200 text-yellow-800',
        'distance': 'bg-teal-100 border-teal-200 text-teal-800',
        'rounds': 'bg-purple-100 border-purple-200 text-purple-800',
        'action': 'bg-pink-100 border-pink-200 text-pink-800',
        'increment': 'bg-indigo-100 border-indigo-200 text-indigo-800',
        'lap': 'bg-orange-100 border-orange-200 text-orange-800',
        'text': 'bg-gray-100 border-gray-200 text-gray-800',
        'resistance': 'bg-red-100 border-red-200 text-red-800',
    };
    return colorMap[type.toLowerCase()] || 'bg-gray-200 border-gray-300 text-gray-800';
};

const FragmentVisualizer = ({ fragments }: { fragments: ICodeFragment[] }) => {
    const groupedFragments = fragments.reduce((acc, fragment) => {
        const type = fragment.type || 'unknown';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(fragment);
        return acc;
    }, {} as Record<string, ICodeFragment[]>);

    return (
        <div className="flex flex-wrap gap-2">
            {Object.entries(groupedFragments).map(([type, frags]) => (
                <div key={type} className={`border rounded-lg p-2 ${getFragmentColorClasses(type)}`}>
                    <strong className="block mb-1 text-center text-xs font-bold uppercase tracking-wider">
                        {type}
                    </strong>
                    <div className="flex flex-col gap-1">
                        {frags.map((fragment, index) => (
                            <div
                                key={index}
                                className="bg-white bg-opacity-60 px-2 py-1 rounded-md font-mono text-sm shadow-sm"
                                title={JSON.stringify(fragment.value, null, 2)}>
                                {fragment.image || (typeof fragment.value === 'object' ? JSON.stringify(fragment.value) : String(fragment.value))}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const StatementRow = ({ statement }: { statement: ICodeStatement }) => {
    const lineNumber = statement.meta?.line ?? 'N/A';
    const range = statement.meta ? `[${statement.meta.columnStart} - ${statement.meta.columnEnd}]` : 'N/A';

    return (
        <tr className="border-b border-gray-200 hover:bg-gray-50">
            <td className="p-3 align-top text-sm text-gray-500 w-16">{lineNumber}</td>
            <td className="p-3 align-top text-sm text-gray-500 w-24">{range}</td>
            <td className="p-3">
                <FragmentVisualizer fragments={statement.fragments} />
            </td>
        </tr>
    );
};

export const Parser = ({ text }: { text: string }) => {
    const runtime = new MdTimerRuntime();
    const script = runtime.read(text);
    const statements = script.statements;

    return (
        <div className="p-4 font-sans">
            <div className="mb-4">                
                <pre className="bg-gray-800 text-white p-4 rounded-lg text-sm">{text}</pre>
            </div>
            <div>                
                <div className="overflow-hidden rounded-lg border border-gray-200 shadow-md">
                    <table className="w-full border-collapse bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Line</th>
                                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Range</th>
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
