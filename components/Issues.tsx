
import React from 'react';
import { Currency, Issue, IssueStatus } from '../types';
import { ISSUES, USERS } from '../constants';
import Card from './ui/Card';

interface IssuesProps {
  currency: Currency;
}

const statusColors: { [key in IssueStatus]: string } = {
  [IssueStatus.Open]: 'border-t-blue-500',
  [IssueStatus.InProgress]: 'border-t-yellow-500',
  [IssueStatus.Closed]: 'border-t-green-500',
};

const IssueCard: React.FC<{ issue: Issue }> = ({ issue }) => {
  const assignee = USERS.find(u => u.id === issue.assigneeId);
  return (
    <div className={`bg-gray-700 p-4 rounded-lg shadow-md mb-4 border-t-4 ${statusColors[issue.status]}`}>
      <h4 className="font-bold text-white">{issue.title}</h4>
      <p className="text-sm text-gray-300 mt-2">{issue.body}</p>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center">
          {assignee && (
            <img src={assignee.avatar} alt={assignee.name} className="w-6 h-6 rounded-full mr-2" />
          )}
          <div className="flex space-x-2">
            {issue.labels.map(label => (
                <span key={label.name} className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${label.color}`}>
                    {label.name}
                </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


const Issues: React.FC<IssuesProps> = ({ currency }) => {
  const columns: IssueStatus[] = [IssueStatus.Open, IssueStatus.InProgress, IssueStatus.Closed];

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Issues Board</h2>
            <button className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition">
                New Issue
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map(status => (
                <div key={status}>
                    <Card title={status} className="!p-4">
                        <div className="h-full">
                        {ISSUES.filter(issue => issue.status === status).map(issue => (
                            <IssueCard key={issue.id} issue={issue} />
                        ))}
                        </div>
                    </Card>
                </div>
            ))}
        </div>
    </div>
  );
};

export default Issues;
