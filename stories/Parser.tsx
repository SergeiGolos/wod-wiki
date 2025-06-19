import React from 'react';
import { MdTimerRuntime } from '../src/parser/md-timer';
import { ICodeStatement } from '../src/ICodeStatement';
import { ICodeFragment } from '../src/CodeFragment';

const StatementRow = ({ statement }: { statement: ICodeStatement }) => {
    return (
        <tr>
            <td>{statement.constructor.name}</td>
            <td>
                <table>
                    <thead>
                        <tr>
                            <th>Fragment</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statement.fragments.map((fragment: ICodeFragment, index: number) => (
                            <tr key={index}>
                                <td>{fragment.constructor.name}</td>
                                <td>{JSON.stringify(fragment as any)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </td>
        </tr>
    );
};

export const Parser = ({ text }: { text: string }) => {
    const runtime = new MdTimerRuntime();
    const script = runtime.read(text);
    const statements = script.statements;

    return (
        <div>
            <h2>Input Text:</h2>
            <pre>{text}</pre>
            <h2>Parsed Output:</h2>
            <table>
                <thead>
                    <tr>
                        <th>Statement</th>
                        <th>Fragments</th>
                    </tr>
                </thead>
                <tbody>
                    {statements.map((statement, index) => (
                        <StatementRow key={index} statement={statement} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};
