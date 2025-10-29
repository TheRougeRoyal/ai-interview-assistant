/**
 * Example component demonstrating normalized state usage
 */

import React, { useEffect, useState } from 'react'
import { 
  useCandidates, 
  useCurrentCandidate, 
  useErrorHandler,
  usePerformanceMonitor 
} from '../hooks'
import type { CandidateEntity } from '../types'

/**
 * Example candidate list component using normalized state
 */
export const CandidateListExample: React.FC = () => {
  const { measureOperation } = usePerformanceMonitor('CandidateListExample')
  const { handleAsyncError } = useErrorHandler()
  const [searchQuery, setSearchQuery] = useState('')
  
  const {
    candidates,
    filteredCandidates,
    loading,
    creating,
    error,
    stats,
    actions
  } = useCandidates()
  
  const { currentCandidate, setCurrent } = useCurrentCandidate()

  // Load candidates on mount
  useEffect(() => {
    const loadCandidates = handleAsyncError(
      () => actions.fetchList({ page: 1, limit: 20 }),
      'Loading candidates'
    )
    
    loadCandidates()
  }, [actions, handleAsyncError])

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        actions.setFilters({ search: searchQuery.trim() })
      } else {
        actions.setFilters({ search: '' })
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, actions])

  const handleCreateCandidate = async () => {
    const candidateData: Partial<CandidateEntity> = {
      name: 'New Candidate',
      email: 'new@example.com',
      phone: '+1234567890'
    }

    try {
      const newCandidate = await actions.create(candidateData)
      setCurrent(newCandidate.id)
    } catch (error) {
      // Error is already handled by the hook
      console.error('Failed to create candidate:', error)
    }
  }

  const handleSelectCandidate = (candidate: CandidateEntity) => {
    measureOperation('selectCandidate', () => {
      setCurrent(candidate.id)
    })
  }

  const handleUpdateCandidate = async (candidate: CandidateEntity) => {
    try {
      await actions.update(candidate.id, {
        ...candidate,
        name: candidate.name + ' (Updated)'
      })
    } catch (error) {
      console.error('Failed to update candidate:', error)
    }
  }

  if (loading && candidates.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading candidates...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Candidates ({stats.total})
        </h2>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.notStarted}</div>
            <div className="text-sm text-gray-500">Not Started</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.averageScore.toFixed(1)}</div>
            <div className="text-sm text-gray-500">Avg Score</div>
          </div>
        </div>

        {/* Search and actions */}
        <div className="flex justify-between items-center">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={handleCreateCandidate}
            disabled={creating}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Add Candidate'}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Candidate list */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Candidates ({filteredCandidates.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredCandidates.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {searchQuery ? 'No candidates match your search.' : 'No candidates found.'}
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  currentCandidate?.id === candidate.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => handleSelectCandidate(candidate)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-lg font-medium text-gray-900">
                        {candidate.name}
                      </h4>
                      {candidate.finalScore !== undefined && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Score: {candidate.finalScore}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1 text-sm text-gray-500">
                      {candidate.email}
                      {candidate.phone && ` • ${candidate.phone}`}
                    </div>
                    
                    {candidate.skills?.technical && candidate.skills.technical.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {candidate.skills.technical.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.technical.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            +{candidate.skills.technical.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUpdateCandidate(candidate)
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Update
                    </button>
                    
                    <div className="text-sm text-gray-500">
                      {candidate.sessionIds.length} session{candidate.sessionIds.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Current candidate details */}
      {currentCandidate && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Selected Candidate: {currentCandidate.name}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{currentCandidate.email}</p>
            </div>
            
            {currentCandidate.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{currentCandidate.phone}</p>
              </div>
            )}
            
            {currentCandidate.experienceYears && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Experience</label>
                <p className="mt-1 text-sm text-gray-900">{currentCandidate.experienceYears} years</p>
              </div>
            )}
            
            {currentCandidate.seniorityLevel && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Seniority</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{currentCandidate.seniorityLevel}</p>
              </div>
            )}
          </div>
          
          {currentCandidate.summary && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Summary</label>
              <p className="mt-1 text-sm text-gray-900">{currentCandidate.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CandidateListExample