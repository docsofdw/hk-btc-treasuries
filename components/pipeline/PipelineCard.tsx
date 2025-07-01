'use client';

import { TreasuryEntity } from '@/types/treasury';
import { getPipelineStage, getStageProgress } from '@/lib/pipeline-stages';
import { ExternalLink, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import numeral from 'numeral';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface PipelineCardProps {
  entity: TreasuryEntity;
  className?: string;
  compact?: boolean;
}

export function PipelineCard({ entity, className = '', compact = false }: PipelineCardProps) {
  if (!entity.pipelineStage) return null;
  
  const stage = getPipelineStage(entity.pipelineStage);
  const progress = getStageProgress(entity.pipelineStage);
  const lastUpdated = entity.stageUpdatedAt ? dayjs(entity.stageUpdatedAt) : null;
  const isStale = lastUpdated ? dayjs().diff(lastUpdated, 'days') > 30 : false;

  const confidenceColors = {
    low: 'text-red-600 bg-red-50 border-red-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    high: 'text-green-600 bg-green-50 border-green-200',
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow ${className}`}>
        <div className="flex-shrink-0">
          <span className="text-lg">{stage.icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 truncate">{entity.legalName}</h4>
            <span className="text-xs text-gray-500">({entity.ticker})</span>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stage.bgColor} ${stage.color} ${stage.borderColor}`}>
              {stage.label}
            </span>
            
            {entity.estimatedBtc && entity.estimatedBtc > 0 && (
              <span className="text-xs text-gray-600">
                ~{numeral(entity.estimatedBtc).format('0,0')} BTC
              </span>
            )}
          </div>
        </div>

        {entity.source && (
          <a
            href={entity.source}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{entity.legalName}</h3>
              {isStale && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Information may be outdated ({lastUpdated?.fromNow()})</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{entity.ticker}</span>
              <span>•</span>
              <span>{entity.listingVenue}</span>
              <span>•</span>
              <span>{entity.hq}</span>
            </div>
          </div>

          {entity.source && (
            <a
              href={entity.source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
              title="View source"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          )}
        </div>

        {/* Stage and Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{stage.icon}</span>
              <span className={`font-medium ${stage.color}`}>{stage.label}</span>
            </div>
            
            <div className="text-right text-sm text-gray-600">
              {Math.round(progress)}% complete
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="text-xs text-gray-600 mt-1">
            {stage.description}
          </div>
        </div>

        {/* Estimated Holdings */}
        {entity.estimatedBtc && entity.estimatedBtc > 0 && (
          <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Estimated Holdings</span>
            </div>
            
            <div className="text-xl font-bold text-orange-700">
              {numeral(entity.estimatedBtc).format('0,0.00')} BTC
            </div>
            
            {entity.confidenceLevel && (
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${confidenceColors[entity.confidenceLevel]}`}>
                  {entity.confidenceLevel.charAt(0).toUpperCase() + entity.confidenceLevel.slice(1)} confidence
                </span>
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-2">
          {stage.estimatedTimeframe && stage.id !== 'verified' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Typical timeframe: {stage.estimatedTimeframe}</span>
            </div>
          )}
          
          {lastUpdated && (
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdated.format('MMM D, YYYY')} ({lastUpdated.fromNow()})
            </div>
          )}
        </div>

        {/* Interest URL for additional context */}
        {entity.interestUrl && entity.interestUrl !== entity.source && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a
              href={entity.interestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>Additional context</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}