
import React, { useState } from 'react';
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
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    assigneeId: '',
    status: IssueStatus.Open,
  });

  const handleOpenModal = () => {
    setFormData({
      title: '',
      body: '',
      assigneeId: '',
      status: IssueStatus.Open,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to backend API when issue endpoints are ready
    alert('Issue creation will be connected to the backend API soon!');
    console.log('New issue data:', formData);
    handleCloseModal();
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Issues Board</h2>
            <button
              onClick={handleOpenModal}
              className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
            >
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create New Issue</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Enter issue title"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Enter issue description"
                    rows={4}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Assignee</label>
                  <select
                    value={formData.assigneeId}
                    onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select assignee</option>
                    {USERS.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as IssueStatus })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    required
                  >
                    <option value={IssueStatus.Open}>Open</option>
                    <option value={IssueStatus.InProgress}>In Progress</option>
                    <option value={IssueStatus.Closed}>Closed</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default Issues;
