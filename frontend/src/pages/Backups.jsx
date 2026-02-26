import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const Backups = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');

  useEffect(() => { fetchBackups(); fetchDatabases(); }, []);

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/backups', { headers: { Authorization: `Bearer ${token}` } });
      setBackups(res.data.backups);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchDatabases = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/databases', { headers: { Authorization: `Bearer ${token}` } });
      setDatabases(res.data.databases);
    } catch (e) { console.error(e); }
  };

  const createBackup = async (e) => {
    e.preventDefault();
    if (!selectedDatabase) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/backups', { databaseId: selectedDatabase }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchBackups();
      setSelectedDatabase('');
    } catch (e) { alert('Failed'); }
    setCreating(false);
  };

  const deleteBackup = async (id) => {
    if (!window.confirm('Delete backup?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/backups/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchBackups();
    } catch (e) {}
  };

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Database Backups</h1>
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <form onSubmit={createBackup} className="flex gap-4">
            <select value={selectedDatabase} onChange={(e) => setSelectedDatabase(e.target.value)} className="border rounded px-3 py-2 flex-1" required>
              <option value="">Select Database</option>
              {databases.map(db => <option key={db.id} value={db.id}>{db.name} ({db.engine})</option>)}
            </select>
            <button type="submit" disabled={creating} className="bg-blue-600 text-white px-6 py-2 rounded">{creating ? 'Creating...' : 'Create Backup'}</button>
          </form>
        </div>
        <div className="bg-white rounded-lg shadow">
          {loading ? <p className="p-4">Loading...</p> : backups.length === 0 ? <p className="p-4">No backups</p> : (
            <table className="min-w-full">
              <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Size</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Created</th><th className="px-4 py-2 text-right">Action</th></tr></thead>
              <tbody>{backups.map(b => (
                <tr key={b.id} className="border-t"><td className="px-4 py-2">{b.type}</td><td className="px-4 py-2">{b.size} MB</td><td className="px-4 py-2"><span className={`px-2 py-1 rounded text-xs ${b.status==='completed'?'bg-green-100':'bg-yellow-100'}`}>{b.status}</span></td><td className="px-4 py-2">{new Date(b.createdAt).toLocaleString()}</td><td className="px-4 py-2 text-right"><button onClick={() => deleteBackup(b.id)} className="text-red-600">Delete</button></td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};
export default Backups;
