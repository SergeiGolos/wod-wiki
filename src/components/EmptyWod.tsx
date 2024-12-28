import React from "react";

export const EmptyWod: React.FC = () => {
  return (
    <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <tbody className="bg-white divide-y divide-gray-200">
          <tr>
            <td colSpan={2} className="text-center p-8">
              <p className="text-gray-500">No workout data available</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
