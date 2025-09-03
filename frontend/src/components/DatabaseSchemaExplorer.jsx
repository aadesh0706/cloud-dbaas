import React, { useState } from 'react'
import { useQuery } from 'react-query'
import {
  TableCellsIcon,
  MagnifyingGlassIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  KeyIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import { databasesAPI } from '../services/api'
import LoadingSpinner from './LoadingSpinner'
import toast from 'react-hot-toast'

const DatabaseSchemaExplorer = ({ database }) => {
  const [selectedTable, setSelectedTable] = useState(null)
  const [queryInput, setQueryInput] = useState('')
  const [queryResult, setQueryResult] = useState(null)
  const [isExecutingQuery, setIsExecutingQuery] = useState(false)
  const [expandedTable, setExpandedTable] = useState(null)
  const [collectionData, setCollectionData] = useState(null)
  const [isLoadingCollectionData, setIsLoadingCollectionData] = useState(false)

  // Fetch database schema
  const { data: schemaResponse, isLoading: loadingSchema } = useQuery(
    ['database-schema', database.id],
    () => databasesAPI.getSchema(database.id),
    { enabled: !!database.id }
  )

  // Fetch selected table details
  const { data: tableResponse, isLoading: loadingTable } = useQuery(
    ['table-details', database.id, selectedTable],
    () => databasesAPI.getTableDetails(database.id, selectedTable),
    { enabled: !!selectedTable }
  )

  const schema = schemaResponse?.schema
  const tableDetails = tableResponse?.table

  const handleViewData = async (tableName) => {
    setIsLoadingCollectionData(true)
    try {
      const response = await databasesAPI.getCollectionData(database.id, tableName, { limit: 10 })
      setCollectionData({
        tableName,
        data: response.data,
        columns: response.columns,
        total: response.total
      })
      toast.success(`Loaded ${response.data.length} records from ${tableName}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load collection data')
      setCollectionData(null)
    } finally {
      setIsLoadingCollectionData(false)
    }
  }

  const handleExecuteQuery = async () => {
    if (!queryInput.trim()) {
      toast.error('Please enter a query')
      return
    }

    setIsExecutingQuery(true)
    try {
      const response = await databasesAPI.executeQuery(database.id, queryInput, 100)
      setQueryResult(response.result)
      toast.success('Query executed successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Query execution failed')
      setQueryResult(null)
    } finally {
      setIsExecutingQuery(false)
    }
  }

  const getSampleQuery = (tableName) => {
    if (database.engine === 'mysql' || database.engine === 'postgresql') {
      return `SELECT * FROM ${tableName} LIMIT 10`
    } else if (database.engine === 'mongodb') {
      return `db.${tableName}.find({}).limit(10)`
    }
    return ''
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (loadingSchema) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!schema) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Schema Available</h3>
        <p className="text-gray-600">Unable to load database schema information.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Schema Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TableCellsIcon className="w-5 h-5 mr-2 text-primary-600" />
            Database Schema
          </h3>
          <div className="text-sm text-gray-600">
            {schema.totalTables} {schema.engine === 'mongodb' ? 'collections' : 'tables'}
          </div>
        </div>

        {/* Tables/Collections List */}
        <div className="space-y-2">
          {schema.tables.map((table) => (
            <div key={table.name} className="border border-gray-100 rounded-lg">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
              >
                <div className="flex items-center">
                  {expandedTable === table.name ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400 mr-2" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 mr-2" />
                  )}
                  <TableCellsIcon className="w-4 h-4 text-primary-600 mr-2" />
                  <span className="font-medium text-gray-900">{table.name}</span>
                  {table.type && (
                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {table.type}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {table.row_count !== undefined && (
                    <span>{table.row_count} rows</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTable(table.name)
                      setQueryInput(getSampleQuery(table.name))
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="View details"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedTable === table.name && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="flex space-x-4 text-sm">
                    <button
                      onClick={() => handleViewData(table.name)}
                      disabled={isLoadingCollectionData}
                      className="text-green-600 hover:text-green-700 font-medium flex items-center"
                    >
                      <PlayIcon className="w-4 h-4 mr-1" />
                      {isLoadingCollectionData ? 'Loading...' : 'View Data'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTable(table.name)
                        setQueryInput(getSampleQuery(table.name))
                      }}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setQueryInput(getSampleQuery(table.name))
                        copyToClipboard(getSampleQuery(table.name))
                      }}
                      className="text-gray-600 hover:text-gray-700 flex items-center"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                      Copy Sample Query
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {schema.tables.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No {schema.engine === 'mongodb' ? 'collections' : 'tables'} found in this database.
            </div>
          )}
        </div>
      </div>

      {/* Table Details */}
      {selectedTable && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2 text-primary-600" />
              {selectedTable} Details
            </h3>
            {loadingTable && <LoadingSpinner size="sm" />}
          </div>

          {tableDetails && (
            <div className="space-y-6">
              {/* Columns */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <TableCellsIcon className="w-4 h-4 mr-2" />
                  {database.engine === 'mongodb' ? 'Fields' : 'Columns'}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Name</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Type</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Nullable</th>
                        {tableDetails.engine !== 'mongodb' && (
                          <>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Default</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Key</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tableDetails.columns.map((column, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-sm font-mono">{column.name}</td>
                          <td className="py-2 px-3 text-sm text-primary-600">{column.type}</td>
                          <td className="py-2 px-3 text-sm">{column.nullable}</td>
                          {tableDetails.engine !== 'mongodb' && (
                            <>
                              <td className="py-2 px-3 text-sm font-mono text-gray-600">
                                {column.default_value || '-'}
                              </td>
                              <td className="py-2 px-3 text-sm">
                                {column.key_type && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                                    <KeyIcon className="w-3 h-3 mr-1" />
                                    {column.key_type}
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Indexes */}
              {tableDetails.indexes && tableDetails.indexes.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <KeyIcon className="w-4 h-4 mr-2" />
                    Indexes
                  </h4>
                  <div className="space-y-2">
                    {tableDetails.indexes.map((index, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="font-mono text-sm">{index.name}</span>
                        {index.column_name && (
                          <span className="text-sm text-gray-600">on {index.column_name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collection Data Viewer */}
      {collectionData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TableCellsIcon className="w-5 h-5 mr-2 text-primary-600" />
              {collectionData.tableName} Data
            </h3>
            <div className="text-sm text-gray-600">
              Showing {collectionData.data.length} of {collectionData.total} records
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 border border-gray-200 rounded">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {collectionData.columns.map((column, index) => (
                    <th key={index} className="text-left py-2 px-3 text-sm font-medium text-gray-700 border-r border-gray-200">
                      {column.name}
                      <span className="text-xs text-gray-500 ml-1">({column.type})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collectionData.data.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                    {collectionData.columns.map((column, colIndex) => (
                      <td key={colIndex} className="py-2 px-3 text-sm border-r border-gray-100">
                        <div className="max-w-xs overflow-hidden">
                          {row[column.name] !== null && row[column.name] !== undefined 
                            ? typeof row[column.name] === 'object' 
                              ? (
                                <pre className="text-xs bg-gray-100 p-1 rounded max-h-20 overflow-y-auto">
                                  {JSON.stringify(row[column.name], null, 2)}
                                </pre>
                              )
                              : (
                                <span className="font-mono text-sm">
                                  {String(row[column.name])}
                                </span>
                              )
                            : <span className="text-gray-400 italic">null</span>
                          }
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => setCollectionData(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close Data View
            </button>
          </div>
        </div>
      )}

      {/* SQL Query Interface */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CodeBracketIcon className="w-5 h-5 mr-2 text-primary-600" />
          Query Interface
        </h3>

        <div className="space-y-4">
          <div>
            <textarea
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder={
                database.engine === 'mongodb'
                  ? 'Enter MongoDB query (e.g., db.collection.find({}))'
                  : 'Enter SQL query (SELECT, SHOW, DESCRIBE, EXPLAIN only)'
              }
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="flex justify-between">
            <div className="text-sm text-gray-600">
              Only read-only queries are allowed for security.
            </div>
            <button
              onClick={handleExecuteQuery}
              disabled={isExecutingQuery || !queryInput.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecutingQuery ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                  Execute Query
                </>
              )}
            </button>
          </div>
        </div>

        {/* Query Results */}
        {queryResult && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Query Results ({queryResult.rowCount} rows)
            </h4>
            
            <div className="overflow-x-auto max-h-96 border border-gray-200 rounded">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {queryResult.columns.map((column, index) => (
                      <th key={index} className="text-left py-2 px-3 text-sm font-medium text-gray-700 border-r border-gray-200">
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                      {queryResult.columns.map((column, colIndex) => (
                        <td key={colIndex} className="py-2 px-3 text-sm font-mono border-r border-gray-100">
                          {row[column.name] !== null && row[column.name] !== undefined 
                            ? typeof row[column.name] === 'object' 
                              ? JSON.stringify(row[column.name])
                              : String(row[column.name])
                            : 'NULL'
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DatabaseSchemaExplorer
