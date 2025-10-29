/**
 * Centralized repository exports
 * Provides a single entry point for all repository utilities
 */

// Base repository pattern
export {
  AbstractBaseRepository,
  type BaseRepository,
  type FindManyOptions,
  type PaginationOptions,
  type PaginatedResult,
  type PrismaTransaction,
  type RepositoryConfig
} from './base'

// Repository factory
export {
  RepositoryFactory,
  Repository,
  InjectRepository,
  Repositories,
  repositoryFactory,
  RepositoryNames,
  type RepositoryName,
  type RepositoryRegistry,
  type RepositoryFactoryConfig
} from './factory'

// Enhanced repositories
export {
  CandidatesRepository,
  type CreateCandidateInput,
  type UpdateCandidateInput,
  type CandidateWhereInput,
  type ListCandidatesParams,
  type ResumeAnalysisInput,
  type FinalizeCandidateInput
} from './candidatesRepo.enhanced'

export {
  SessionsRepository,
  type CreateSessionInput as CreateSessionRepositoryInput,
  type UpdateSessionInput as UpdateSessionRepositoryInput,
  type SessionWhereInput,
  type UpsertAnswerInput
} from './sessionsRepo.enhanced'

export {
  AuthRepository,
  type UserDTO,
  type UserSessionDTO,
  type CreateUserInput,
  type UpdateUserInput,
  type UserWhereInput,
  type CreateSessionInput,
  type LoginCredentials
} from './authRepo.enhanced'

// Legacy repositories (for backward compatibility)
export * from './candidatesRepo'
export * from './sessionsRepo'