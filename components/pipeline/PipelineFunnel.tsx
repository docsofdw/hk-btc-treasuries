'use client';

import { useMemo } from 'react';
import { TreasuryEntity } from '@/types/treasury';
import { PIPELINE_STAGES_ARRAY, getEntitiesByStage, isProspect } from '@/lib/pipeline-stages';
import { ArrowRight, TrendingUp } from 'lucide-react';
import numeral from 'numeral';

interface PipelineFunnelProps {
  entities: TreasuryEntity[];
  className?: string;
  showEstimates?: boolean;
}

export function PipelineFunnel({ entities, className = '', showEstimates = false }: PipelineFunnelProps) {
  const pipelineData = useMemo(() => {
    // Split entities into verified holdings and prospects
    const verifiedHoldings = entities.filter(e => !isProspect(e));
    const prospects = entities.filter(e => isProspect(e));
    
    // Calculate totals for each stage
    const stageData = PIPELINE_STAGES_ARRAY.map(stage => {
      const stageEntities = getEntitiesByStage(prospects, stage.id);
      const estimatedBtc = stageEntities.reduce((sum, entity) => sum + (entity.estimatedBtc || 0), 0);
      
      return {
        ...stage,
        count: stageEntities.length,
        entities: stageEntities,
        estimatedBtc,
        conversionRate: stage.order === 1 ? 100 : 0, // Will calculate based on historical data
      };
    });

    // Add verified holdings as final stage
    const verifiedStageData = {
      ...PIPELINE_STAGES_ARRAY[3], // verified stage
      count: verifiedHoldings.length,
      entities: verifiedHoldings,
      estimatedBtc: verifiedHoldings.reduce((sum, entity) => sum + entity.btc, 0),
      conversionRate: 100,
    };

    return {
      stages: [...stageData.slice(0, 3), verifiedStageData],
      totalProspects: prospects.length,
      totalVerified: verifiedHoldings.length,
      totalEstimatedBtc: stageData.reduce((sum, stage) => sum + stage.estimatedBtc, 0),
    };
  }, [entities]);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bitcoin Adoption Pipeline</h3>
          <p className="text-sm text-gray-600 mt-1">
            Track companies from initial interest to verified holdings
          </p>
        </div>
        
        {showEstimates && (
          <div className="text-right">
            <div className="text-sm text-gray-600">Estimated Pipeline Value</div>
            <div className="text-xl font-bold text-orange-600">
              {numeral(pipelineData.totalEstimatedBtc).format('0,0')} BTC
            </div>
          </div>
        )}
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-4">
        {pipelineData.stages.map((stage, index) => {
          const isLast = index === pipelineData.stages.length - 1;
          const width = 100 - (index * 15); // Funnel shape
          
          return (
            <div key={stage.id} className="relative">
              {/* Stage Bar */}
              <div 
                className={`mx-auto rounded-lg border-2 ${stage.bgColor} ${stage.borderColor} p-4 transition-all hover:shadow-md`}
                style={{ width: `${Math.max(width, 40)}%` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stage.icon}</span>
                    <div>
                      <div className={`font-semibold ${stage.color}`}>
                        {stage.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {stage.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {stage.count}
                    </div>
                    <div className="text-xs text-gray-600">
                      {stage.count === 1 ? 'company' : 'companies'}
                    </div>
                  </div>
                </div>
                
                {/* Estimated BTC for prospects */}
                {showEstimates && stage.estimatedBtc > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Estimated BTC:</span>
                      <span className="font-medium text-gray-900">
                        {numeral(stage.estimatedBtc).format('0,0.00')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Timeframe for non-verified stages */}
                {stage.estimatedTimeframe && stage.id !== 'verified' && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500">
                      ⏱️ Typical timeframe: {stage.estimatedTimeframe}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Arrow between stages */}
              {!isLast && (
                <div className="flex justify-center mt-2 mb-2">
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Active Pipeline</div>
            <div className="text-xl font-bold text-blue-600">
              {pipelineData.totalProspects}
            </div>
            <div className="text-xs text-gray-500">prospects</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Verified Holdings</div>
            <div className="text-xl font-bold text-green-600">
              {pipelineData.totalVerified}
            </div>
            <div className="text-xs text-gray-500">companies</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Conversion Rate</div>
            <div className="text-xl font-bold text-orange-600">
              {pipelineData.totalProspects > 0 
                ? numeral(pipelineData.totalVerified / (pipelineData.totalProspects + pipelineData.totalVerified)).format('0.0%')
                : '0%'
              }
            </div>
            <div className="text-xs text-gray-500">to verified</div>
          </div>
        </div>
      </div>

      {/* Pipeline Insights */}
      <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div className="flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-800 mb-1">
              Pipeline Insights
            </div>
            <div className="text-xs text-blue-700">
              {pipelineData.stages[0].count > 0 && (
                <span>
                  <strong>{pipelineData.stages[0].count}</strong> companies showing initial interest. 
                </span>
              )}
              {pipelineData.stages[1].count > 0 && (
                <span>
                  {' '}<strong>{pipelineData.stages[1].count}</strong> have announced board decisions.
                </span>
              )}
              {' '}Strong pipeline indicates growing adoption momentum.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}