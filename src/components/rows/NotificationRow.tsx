import React from "react";
import { StatementBlock } from "../../lib/timer.types";
import { RuntimeBlock } from "../../lib/RuntimeBlock";

interface NotificationRowProps {
  block: RuntimeBlock;
}

export const NotificationRow: React.FC<NotificationRowProps> = ({ block }) => {
  return (
    <div className="w-full text-center p-8 bg-gray-50">
      <p className="text-gray-500">Parsing workout...</p>
    </div>
  );
};
