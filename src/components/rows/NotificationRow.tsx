import React from "react";
import { WodBlock } from "../../lib/timer.types";

interface NotificationRowProps {
  block: WodBlock;
}

export const NotificationRow: React.FC<NotificationRowProps> = () => {
  return (
    <tr>
      <td colSpan={2} className="text-center p-8 bg-gray-50">
        <p className="text-gray-500">Parsing workout...</p>
      </td>
    </tr>
  );
};
