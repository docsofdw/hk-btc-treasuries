import { PipelineStage, PipelineStageId } from '@/types/treasury';

export const PIPELINE_STAGES: Record<PipelineStageId, PipelineStage> = {
  rumoured: {
    id: 'rumoured',
    label: 'Rumoured',
    description: 'Media reports or executive comments about potential Bitcoin adoption',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: '🟡',
    estimatedTimeframe: '1-6 months',
    order: 1,
  },
  board_vote: {
    id: 'board_vote',
    label: 'Board Vote Announced',
    description: 'Official announcement of board decision to purchase Bitcoin',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: '🔵',
    estimatedTimeframe: '2-8 weeks',
    order: 2,
  },
  filing: {
    id: 'filing',
    label: 'Exchange Filing',
    description: 'Filed with exchange but awaiting on-chain verification',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: '🟠',
    estimatedTimeframe: '1-4 weeks',
    order: 3,
  },
  verified: {
    id: 'verified',
    label: 'On-chain Verified',
    description: 'Bitcoin holdings confirmed through on-chain analysis',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '🟢',
    estimatedTimeframe: 'Complete',
    order: 4,
  },
};

export const PIPELINE_STAGES_ARRAY = Object.values(PIPELINE_STAGES).sort((a, b) => a.order - b.order);

export function getPipelineStage(stageId: PipelineStageId): PipelineStage {
  return PIPELINE_STAGES[stageId];
}

export function getNextStage(currentStage: PipelineStageId): PipelineStageId | null {
  const current = PIPELINE_STAGES[currentStage];
  const next = PIPELINE_STAGES_ARRAY.find(stage => stage.order === current.order + 1);
  return next?.id || null;
}

export function getPreviousStage(currentStage: PipelineStageId): PipelineStageId | null {
  const current = PIPELINE_STAGES[currentStage];
  const previous = PIPELINE_STAGES_ARRAY.find(stage => stage.order === current.order - 1);
  return previous?.id || null;
}

export function getStageProgress(stageId: PipelineStageId): number {
  const stage = PIPELINE_STAGES[stageId];
  return (stage.order / PIPELINE_STAGES_ARRAY.length) * 100;
}

// Helper function to determine if an entity is a prospect vs confirmed holding
export function isProspect(entity: { btc: number; pipelineStage?: PipelineStageId }): boolean {
  return entity.btc === 0 && entity.pipelineStage !== 'verified';
}

// Helper function to get entities by stage
export function getEntitiesByStage<T extends { pipelineStage?: PipelineStageId }>(
  entities: T[],
  stageId: PipelineStageId
): T[] {
  return entities.filter(entity => entity.pipelineStage === stageId);
}