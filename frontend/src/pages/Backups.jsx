import { useState, useEffect } from 'react';
import { backupsAPI, databasesAPI } from '../services/api';

const statusBadge = (status) => {
  const map = {
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    restoring: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800'
  };
  return map[status] || 'bg-gray-100 text-gray-800';
};

const Backups = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [backupType, setBackupType] = useState('full');
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    fetchBackups();
    fetchDatabases();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await backupsAPI.getAll();
      setBackups(res.backups || []);
    } catch (e) {
      console.error('Failed to load backups:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabases = async () => {
    try {
      const res = await databasesAPI.getAll();
      setDatabases(res.databases || []);
    } catch (e) {
      console.error('Failed to load databases:', e);
    }
  };

  const createBackup = async (e) => {
    e.preventDefault();
    if (!selectedDatabase) return;
    setCreating(true);
    try {
      await backupsAPI.create(selectedDatabase, backupType);
      await fetchBackups();
      setSelectedDatabase('');
      setBackupType('full');
    } catch (e) {
      alert('Failed to create backup: ' + (e.response?.data?.error || e.message));
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (id) => {
    if (!window.confirm('Restore this backup? The target database will be overwritten.')) return;
    setRestoringId(id);
    try {
      await backupsAPI.restore(id);
      await fetchBackups();
    } catch (e) {
      alert('Failed to restore backup: ' + (e.response?.data?.error || e.message));
    } finally {
      setRestoringId(null);
    }
  };

  const deleteBackup = async (id) => {
    if (!window.confirm('Delete this backup? This action cannot be undone.')) return;
    try {
      await backupsAPI.delete(id);
      await fetchBackups();
    } catch (e) {
      console.error('Failed to delete backup:', e);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Database Backups</h1>

      {/* Create Backup Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Create New Backup</h2>
        <form onSubmit={createBackup} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
            <select
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a database...</option>
              {databases.map(db => (
                <option key={db.id} value={db.id}>
                  {db.name} ({db.engine})
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-36">
            <label className="block text-sm font-medium text-gray-700 mb-1">Backup Type</label>
            <select
              value={backupType}
              onChange={(e) => setBackupType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="full">Full</option>
              <option value="schema">Schema only</option>
              <option value="data">Data only</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creating || !selectedDatabase}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-md text-sm font-medium"
          >
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
        </form>
      </div>

      {/* Backups Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Backup History</h2>
        </div>

        {loading ? (
          <p className="p-6 text-gray-500">Loading backups...</p>
        ) : backups.length === 0 ? (
          <p className="p-6 text-gray-500">No backups found. Create your first backup above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Database</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{b.databaseName || b.databaseId}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">{b.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {b.sizeMb ? `${parseFloat(b.sizeMb).toFixed(1)} MB` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {b.expiresAt ? new Date(b.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => restoreBackup(b.id)}
                        disabled={b.status !== 'completed' || restoringId === b.id}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                      >
                        {restoringId === b.id ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        onClick={() => deleteBackup(b.id)}
                        disabled={b.status === 'in_progress' || b.status === 'restoring'}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Backups;
