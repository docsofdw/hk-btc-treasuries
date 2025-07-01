'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Filter, Grid, List } from 'lucide-react';
import { PipelineFunnel } from '@/components/pipeline/PipelineFunnel';
import { PipelineCard } from '@/components/pipeline/PipelineCard';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TreasuryEntity, PipelineStageId } from '@/types/treasury';
import { PIPELINE_STAGES_ARRAY, getEntitiesByStage, isProspect } from '@/lib/pipeline-stages';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PipelinePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stageFilter, setStageFilter] = useState<PipelineStageId | 'all'>('all');
  
  const { data, error, isLoading } = useSWR<{ entities: TreasuryEntity[] }>(
    '/api/fetch-treasuries',
    fetcher,
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
    }
  );

  // Filter prospects from the data
  const prospects = data?.entities?.filter(entity => isProspect(entity) || entity.pipelineStage) || [];
  const filteredProspects = stageFilter === 'all' 
    ? prospects 
    : getEntitiesByStage(prospects, stageFilter);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Holdings</span>
              </Link>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900">
              Bitcoin Adoption Pipeline
            </h1>
            
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    {stageFilter === 'all' ? 'All Stages' : PIPELINE_STAGES_ARRAY.find(s => s.id === stageFilter)?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStageFilter('all')}>
                    All Stages
                  </DropdownMenuItem>
                  {PIPELINE_STAGES_ARRAY.map(stage => (
                    <DropdownMenuItem key={stage.id} onClick={() => setStageFilter(stage.id)}>
                      {stage.icon} {stage.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-white shadow-sm' : ''}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-white shadow-sm' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Description */}
        <div className="mb-8 text-center">
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Track companies on their journey from initial Bitcoin interest to verified treasury holdings. 
            Each stage represents a key milestone in corporate Bitcoin adoption.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 text-center">
            <p className="font-semibold text-lg mb-1">Error loading pipeline data</p>
            <p>Please refresh the page to try again.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
              <p className="mt-6 text-xl text-gray-700 font-medium">Loading pipeline data...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {data?.entities && (
          <div className="space-y-8">
            {/* Pipeline Funnel Overview */}
            <PipelineFunnel entities={data.entities} showEstimates={true} />

            {/* Individual Prospects */}
            {prospects.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Pipeline Companies
                    {filteredProspects.length !== prospects.length && (
                      <span className="ml-2 text-gray-500">
                        ({filteredProspects.length} of {prospects.length})
                      </span>
                    )}
                  </h2>
                  
                  {stageFilter !== 'all' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Showing:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${PIPELINE_STAGES_ARRAY.find(s => s.id === stageFilter)?.bgColor} ${PIPELINE_STAGES_ARRAY.find(s => s.id === stageFilter)?.color} ${PIPELINE_STAGES_ARRAY.find(s => s.id === stageFilter)?.borderColor}`}>
                        {PIPELINE_STAGES_ARRAY.find(s => s.id === stageFilter)?.icon} {PIPELINE_STAGES_ARRAY.find(s => s.id === stageFilter)?.label}
                      </span>
                    </div>
                  )}
                </div>

                {filteredProspects.length > 0 ? (
                  <div className={
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                      : 'space-y-4'
                  }>
                    {filteredProspects.map((entity) => (
                      <PipelineCard
                        key={entity.id}
                        entity={entity}
                        compact={viewMode === 'list'}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No companies in this stage
                    </h3>
                    <p className="text-gray-600">
                      {stageFilter === 'all' 
                        ? 'No pipeline data available yet.'
                        : `No companies currently in the "${PIPELINE_STAGES_ARRAY.find(s => s.id === stageFilter)?.label}" stage.`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {prospects.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <div className="text-gray-400 text-6xl mb-4">📈</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  No Pipeline Data Yet
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  We're actively monitoring for companies showing interest in Bitcoin treasury adoption. 
                  Check back soon for updates on the pipeline.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Pipeline data sourced from public announcements, media reports, and regulatory filings.
              <br />
              Estimated holdings are projections based on company size and public statements.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              View Verified Holdings
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}