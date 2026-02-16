/**
 * Embeddings module public API.
 */

export { generateEmbedding, EMBEDDING_DIMENSION } from './bedrock-embeddings.js';
export {
  buildCandidateEmbeddingText,
  buildPositionEmbeddingText,
} from './embedding-text.js';
export type { CandidateEmbeddingData, PositionEmbeddingData } from './embedding-text.js';
export {
  findSimilarCandidates,
  findSimilarPositions,
  updateCandidateEmbedding,
  updatePositionEmbedding,
} from './search.js';
export type { SimilarCandidate, SimilarPosition } from './search.js';
