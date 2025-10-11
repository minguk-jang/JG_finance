
import React from 'react';
import Card from './ui/Card';
import { USERS } from '../constants';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Settings</h2>
      
      <Card title="Family Members">
        <div className="mb-4 flex justify-end">
            <button className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition">
            Invite Member
            </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map(user => (
                <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                  <td className="p-3 flex items-center">
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                    {user.name}
                  </td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'Admin' ? 'bg-red-500 text-white' :
                        user.role === 'Editor' ? 'bg-yellow-500 text-gray-900' :
                        'bg-blue-500 text-white'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <button className="text-sky-400 hover:text-sky-300 mr-2">Edit</button>
                    <button className="text-red-400 hover:text-red-300">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Budget Settings">
        <p className="text-gray-400">Manage your monthly budgets for different categories here.</p>
        {/* Placeholder for budget settings UI */}
         <div className="mt-4">
            <button className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition">
                Manage Budgets
            </button>
         </div>
      </Card>
    </div>
  );
};

export default Settings;
