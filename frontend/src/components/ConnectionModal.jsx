import React, { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const ConnectionModal = ({ isOpen, onClose, database, connectionData }) => {
  const [copiedField, setCopiedField] = useState(null)

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success(`${field} copied to clipboard`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const connectionString = connectionData?.connectionUrl?.connectionString || ''
  const instructions = connectionData?.instructions || {}

  // Debug logging
  console.log('ConnectionModal - connectionData:', connectionData)
  console.log('ConnectionModal - connectionString:', connectionString)

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-25" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                  Database Connection Details
                </Dialog.Title>
                <p className="text-sm text-gray-600 mt-1">
                  {database.name} ({database.engine})
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Security Warning */}
              <div className="p-4 bg-warning-50 border border-warning-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-warning-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-warning-800">
                      Temporary Credentials
                    </h3>
                    <p className="text-sm text-warning-700 mt-1">
                      These credentials are temporary and will expire in {connectionData?.expiresIn || '1 hour'}. 
                      Please save your data and create permanent users if needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Connection String */}
              <div>
                <label className="label">Connection String</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={connectionString}
                    className="input pr-10 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(connectionString, 'Connection String')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {copiedField === 'Connection String' ? (
                      <CheckIcon className="w-5 h-5 text-success-500" />
                    ) : (
                      <ClipboardIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Individual Connection Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Host</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={instructions.host || ''}
                      className="input pr-10 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(instructions.host, 'Host')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {copiedField === 'Host' ? (
                        <CheckIcon className="w-5 h-5 text-success-500" />
                      ) : (
                        <ClipboardIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Port</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={instructions.port || ''}
                      className="input pr-10 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(instructions.port?.toString(), 'Port')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {copiedField === 'Port' ? (
                        <CheckIcon className="w-5 h-5 text-success-500" />
                      ) : (
                        <ClipboardIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Database</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={instructions.database || ''}
                      className="input pr-10 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(instructions.database, 'Database')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {copiedField === 'Database' ? (
                        <CheckIcon className="w-5 h-5 text-success-500" />
                      ) : (
                        <ClipboardIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={instructions.username || ''}
                      className="input pr-10 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(instructions.username, 'Username')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {copiedField === 'Username' ? (
                        <CheckIcon className="w-5 h-5 text-success-500" />
                      ) : (
                        <ClipboardIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    readOnly
                    value={instructions.password || ''}
                    className="input pr-10 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(instructions.password, 'Password')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {copiedField === 'Password' ? (
                      <CheckIcon className="w-5 h-5 text-success-500" />
                    ) : (
                      <ClipboardIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sample Commands */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Sample Connection Commands</h4>
                <div className="space-y-2">
                  {database.engine === 'mysql' && (
                    <code className="block text-xs bg-gray-800 text-gray-100 p-2 rounded">
                      mysql -h {instructions.host} -P {instructions.port} -u {instructions.username} -p{instructions.password} {instructions.database}
                    </code>
                  )}
                  {database.engine === 'postgresql' && (
                    <code className="block text-xs bg-gray-800 text-gray-100 p-2 rounded">
                      psql -h {instructions.host} -p {instructions.port} -U {instructions.username} -d {instructions.database}
                    </code>
                  )}
                  {database.engine === 'mongodb' && (
                    <code className="block text-xs bg-gray-800 text-gray-100 p-2 rounded">
                      mongo {instructions.host}:{instructions.port}/{instructions.database} -u {instructions.username} -p {instructions.password}
                    </code>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="btn-primary px-4 py-2"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}

export default ConnectionModal
