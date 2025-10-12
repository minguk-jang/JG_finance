
import React, { useState, useEffect } from 'react';
import { Currency, Issue, IssueStatus, IssuePriority } from '../types';
import { USERS } from '../constants';
import { api } from '../lib/api';
import Card from './ui/Card';

interface IssuesProps {
  currency: Currency;
}

const statusColors: { [key in IssueStatus]: string } = {
  [IssueStatus.Open]: 'border-t-blue-500',
  [IssueStatus.InProgress]: 'border-t-yellow-500',
  [IssueStatus.Closed]: 'border-t-green-500',
};

const priorityColors: { [key in IssuePriority]: string } = {
  [IssuePriority.Low]: 'bg-gray-500',
  [IssuePriority.Medium]: 'bg-blue-500',
  [IssuePriority.High]: 'bg-orange-500',
  [IssuePriority.Critical]: 'bg-red-600',
};

const priorityLabels: { [key in IssuePriority]: string } = {
  [IssuePriority.Low]: '낮음',
  [IssuePriority.Medium]: '보통',
  [IssuePriority.High]: '높음',
  [IssuePriority.Critical]: '긴급',
};

interface IssueCardProps {
  issue: Issue;
  users: any[];
  onEdit: (issue: Issue) => void;
  onDelete: (issueId: number) => void;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, users, onEdit, onDelete }) => {
  // Handle both camelCase and snake_case
  const assigneeId = (issue as any).assigneeId || (issue as any).assignee_id;
  const assignee = users.find(u => u.id === assigneeId);
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`bg-gray-700 p-4 rounded-lg shadow-md mb-4 border-t-4 ${statusColors[issue.status]} cursor-pointer hover:bg-gray-650 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onEdit(issue)}
    >
      <div className="flex items-start justify-between">
        <h4 className="font-bold text-white flex-1">{issue.title}</h4>
        {showActions && (
          <div className="flex gap-1 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(issue);
              }}
              className="p-1 hover:bg-gray-600 rounded transition"
              title="수정"
            >
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(issue.id);
              }}
              className="p-1 hover:bg-gray-600 rounded transition"
              title="삭제"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-300 mt-2">{issue.body}</p>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {assignee && (
            <div className="flex items-center gap-2">
              <img src={assignee.avatar} alt={assignee.name} className="w-6 h-6 rounded-full" />
              <span className="text-sm text-gray-400">{assignee.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${priorityColors[issue.priority]}`}>
            {priorityLabels[issue.priority]}
          </span>
          {Array.isArray(issue.labels) && issue.labels.map(label => (
            <span key={label.name} className={`px-2 py-1 text-xs font-semibold text-white rounded ${label.color}`}>
              {label.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};


const statusLabels: { [key in IssueStatus]: string } = {
  [IssueStatus.Open]: '열림',
  [IssueStatus.InProgress]: '진행중',
  [IssueStatus.Closed]: '완료',
};

// Available label options
const AVAILABLE_LABELS = [
  { name: 'Budgeting', color: 'bg-blue-500' },
  { name: 'Investing', color: 'bg-green-500' },
  { name: 'Bills', color: 'bg-red-500' },
  { name: 'Savings', color: 'bg-yellow-500' },
  { name: 'Planning', color: 'bg-purple-500' },
  { name: 'Urgent', color: 'bg-orange-500' },
];

const Issues: React.FC<IssuesProps> = ({ currency }) => {
  const columns: IssueStatus[] = [IssueStatus.Open, IssueStatus.InProgress, IssueStatus.Closed];
  const [issues, setIssues] = useState<Issue[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    assigneeId: '',
    status: IssueStatus.Open,
    priority: IssuePriority.Medium,
    labels: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issuesData, labelsData, usersData] = await Promise.all([
        api.getIssues(),
        api.getLabels(),
        api.getUsers(),
      ]);
      setIssues(issuesData);
      setLabels(labelsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      alert('이슈 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setEditingIssue(null);
    setFormData({
      title: '',
      body: '',
      assigneeId: '',
      status: IssueStatus.Open,
      priority: IssuePriority.Medium,
      labels: [],
    });
    setShowModal(true);
  };

  const handleEditIssue = (issue: Issue | any) => {
    console.log('Edit issue clicked:', issue);
    try {
      setEditingIssue(issue);
      // Handle both camelCase and snake_case field names
      const assigneeId = issue.assigneeId || issue.assignee_id;
      setFormData({
        title: issue.title,
        body: issue.body,
        assigneeId: assigneeId ? assigneeId.toString() : '',
        status: issue.status,
        priority: issue.priority,
        labels: Array.isArray(issue.labels) ? issue.labels.map(l => l.name) : [],
      });
      console.log('Form data set, opening modal...');
      setShowModal(true);
    } catch (error) {
      console.error('Error editing issue:', error);
      alert('이슈 수정 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const toggleLabel = (labelName: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.includes(labelName)
        ? prev.labels.filter(l => l !== labelName)
        : [...prev.labels, labelName]
    }));
  };

  const handleDeleteIssue = async (issueId: number) => {
    if (confirm('정말 이 이슈를 삭제하시겠습니까?')) {
      try {
        await api.deleteIssue(issueId);
        await fetchData();
        alert('이슈가 삭제되었습니다.');
      } catch (error) {
        console.error('Failed to delete issue:', error);
        alert('이슈 삭제에 실패했습니다.');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIssue(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Get label IDs from label names
      const labelIds = formData.labels
        .map(labelName => labels.find(l => l.name === labelName)?.id)
        .filter((id): id is number => id !== undefined);

      const issueData = {
        title: formData.title,
        body: formData.body,
        status: formData.status,
        priority: formData.priority,
        assignee_id: parseInt(formData.assigneeId),
        label_ids: labelIds,
      };

      if (editingIssue) {
        await api.updateIssue(editingIssue.id, issueData);
        alert('이슈가 수정되었습니다.');
      } else {
        await api.createIssue(issueData);
        alert('이슈가 생성되었습니다.');
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save issue:', error);
      alert(editingIssue ? '이슈 수정에 실패했습니다.' : '이슈 생성에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-400">로딩 중...</div>
      </div>
    );
  }

  // Get available labels - use API labels if available, otherwise fallback to AVAILABLE_LABELS
  const availableLabels = labels.length > 0 ? labels : AVAILABLE_LABELS;

  // Get available users - use API users if available, otherwise fallback to USERS
  const availableUsers = users.length > 0 ? users : USERS;

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">이슈 보드</h2>
            <button
              onClick={handleOpenModal}
              className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
            >
                새 이슈
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map(status => {
              const issuesInColumn = issues.filter(issue => issue.status === status);
              const issueCount = issuesInColumn.length;

              return (
                <div key={status}>
                    <Card
                      title={
                        <div className="flex items-center justify-between">
                          <span>{statusLabels[status]}</span>
                          <span className="bg-gray-600 px-2 py-1 rounded-full text-sm font-semibold">
                            {issueCount}
                          </span>
                        </div>
                      }
                      className="!p-4"
                    >
                        <div className="min-h-[400px]">
                        {issueCount === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
                            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-center font-medium">이슈가 없습니다</p>
                            <p className="text-sm text-center mt-1">새 이슈를 생성해보세요</p>
                          </div>
                        ) : (
                          issuesInColumn.map(issue => (
                            <IssueCard
                              key={issue.id}
                              issue={issue}
                              users={availableUsers}
                              onEdit={handleEditIssue}
                              onDelete={handleDeleteIssue}
                            />
                          ))
                        )}
                        </div>
                    </Card>
                </div>
              );
            })}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingIssue ? '이슈 수정' : '새 이슈 생성'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-300">제목</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                    placeholder="이슈 제목 입력"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-300">설명</label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all resize-none"
                    placeholder="이슈 설명 입력"
                    rows={4}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-300">담당자</label>
                  <div className="relative">
                    <select
                      value={formData.assigneeId}
                      onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                      className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                      required
                    >
                      <option value="" className="bg-gray-800">담당자 선택</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id} className="bg-gray-800">{user.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-300">우선순위</label>
                  <div className="relative">
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as IssuePriority })}
                      className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                      required
                    >
                      <option value={IssuePriority.Low} className="bg-gray-800">낮음</option>
                      <option value={IssuePriority.Medium} className="bg-gray-800">보통</option>
                      <option value={IssuePriority.High} className="bg-gray-800">높음</option>
                      <option value={IssuePriority.Critical} className="bg-gray-800">긴급</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-300">라벨</label>
                  <div className="flex flex-wrap gap-2">
                    {availableLabels.map(label => {
                      const isSelected = formData.labels.includes(label.name);
                      return (
                        <button
                          key={label.name}
                          type="button"
                          onClick={() => toggleLabel(label.name)}
                          className={`px-3 py-1.5 text-sm font-semibold rounded transition-all ${
                            isSelected
                              ? `${label.color} text-white scale-105 shadow-md`
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-300">상태</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as IssueStatus })}
                      className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                      required
                    >
                      <option value={IssueStatus.Open} className="bg-gray-800">열림</option>
                      <option value={IssueStatus.InProgress} className="bg-gray-800">진행중</option>
                      <option value={IssueStatus.Closed} className="bg-gray-800">완료</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
                  >
                    {editingIssue ? '수정' : '생성'}
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
