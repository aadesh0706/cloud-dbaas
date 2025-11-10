import React, { useState, useEffect } from 'react';
import { BookOpenIcon, SparklesIcon, ExclamationCircleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const RelationshipStory = ({ databaseId }) => {
  const [loading, setLoading] = useState(true);
  const [storyData, setStoryData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (databaseId) {
      fetchRelationshipStory();
    }
  }, [databaseId]);

  const fetchRelationshipStory = async () => {
    setLoading(true);
    setError(null);

    try {
  const response = await api.get(`/databases/${databaseId}/relationship-story`);
  // `api` interceptor returns response.data directly, so `response` is already the payload
  setStoryData(response);
    } catch (err) {
      console.error('Error fetching relationship story:', err);
      setError(err.response?.data?.message || 'Failed to load relationship story');
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <ExclamationCircleIcon className="w-5 h-5 text-yellow-600" />;
      case 'info':
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Analyzing database relationships...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center text-red-600">
          <ExclamationCircleIcon className="w-6 h-6 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!storyData || !storyData.success) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center text-gray-600">
          <InformationCircleIcon className="w-6 h-6 mr-2" />
          <span>Unable to analyze relationships for this database.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {/* Header */}
      <div className="flex items-center mb-4">
        <BookOpenIcon className="w-6 h-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Database Relationship Story</h3>
        <SparklesIcon className="w-5 h-5 text-yellow-500 ml-2" />
      </div>

      {/* Schema Info Summary */}
      {storyData.schemaInfo && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-600">Total Tables</div>
            <div className="text-2xl font-bold text-blue-900">
              {storyData.schemaInfo.totalTables}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-purple-600">Relationships</div>
            <div className="text-2xl font-bold text-purple-900">
              {storyData.schemaInfo.totalRelationships}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-green-600">Database Engine</div>
            <div className="text-lg font-bold text-green-900 capitalize">
              {storyData.engine}
            </div>
          </div>
        </div>
      )}

      {/* The Story */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
        <div className="space-y-2">
          {storyData.story && storyData.story.map((line, index) => (
            <div 
              key={index}
              className={`${
                line.startsWith('📖') || line.startsWith('✨') 
                  ? 'font-semibold text-gray-900 text-lg' 
                  : line.startsWith('•') 
                    ? 'text-gray-800 ml-4' 
                    : 'text-gray-700'
              }`}
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {storyData.insights && storyData.insights.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Insights & Recommendations
          </h4>
          {storyData.insights.map((insight, index) => (
            <div
              key={index}
              className={`flex items-start p-4 rounded-lg border ${getInsightColor(insight.type)}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getInsightIcon(insight.type)}
              </div>
              <div className="ml-3 text-sm">
                {insight.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Relationships Table (Optional) */}
      {storyData.relationships && storyData.relationships.length > 0 && (
        <div className="mt-6">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
              <span>View Detailed Relationships</span>
              <svg className="w-4 h-4 ml-2 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From Table
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Column
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      →
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To Table
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Column
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {storyData.relationships.map((rel, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {rel.fromTable}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {rel.fromColumn}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400">
                        →
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {rel.toTable}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {rel.toColumn}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rel.type === 'one-to-one' ? 'bg-green-100 text-green-800' :
                          rel.type === 'one-to-many' ? 'bg-blue-100 text-blue-800' :
                          rel.type === 'many-to-one' ? 'bg-purple-100 text-purple-800' :
                          rel.type === 'many-to-many' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rel.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Footer with refresh button */}
      <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
        <span>
          Last analyzed: {new Date(storyData.timestamp).toLocaleString()}
        </span>
        <button
          onClick={fetchRelationshipStory}
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
};

export default RelationshipStory;
