'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Globe } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { REGIONS_ARRAY, ACTIVE_REGIONS, UPCOMING_REGIONS, getRegionBySlug } from '@/types/regions';

interface RegionSelectorProps {
  className?: string;
  compact?: boolean;
}

export function RegionSelector({ className = '', compact = false }: RegionSelectorProps) {
  const pathname = usePathname();
  
  // Determine current region from pathname
  const currentRegion = (() => {
    if (pathname === '/') return null;
    const pathSegments = pathname.split('/').filter(Boolean);
    const regionSlug = pathSegments[0];
    return getRegionBySlug(regionSlug);
  })();

  const isHomePage = pathname === '/';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`${compact ? 'px-3' : 'px-4'} ${className}`}>
          <Globe className="h-4 w-4 mr-2" />
          {currentRegion ? (
            <span className="flex items-center gap-2">
              <span className="text-lg">{currentRegion.flag}</span>
              {!compact && <span>{currentRegion.shortName}</span>}
            </span>
          ) : (
            <span>{compact ? 'Regions' : 'All Regions'}</span>
          )}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        {/* All Regions Option */}
        <DropdownMenuItem asChild>
          <Link 
            href="/" 
            className={`flex items-center gap-3 ${isHomePage ? 'bg-gray-100 font-medium' : ''}`}
          >
            <Globe className="h-4 w-4" />
            <span>All Regions</span>
            {isHomePage && <span className="ml-auto text-orange-600">●</span>}
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Active Regions */}
        <div className="px-2 py-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Active Markets
          </div>
        </div>
        
        {ACTIVE_REGIONS.map((region) => {
          const isCurrentRegion = currentRegion?.id === region.id;
          return (
            <DropdownMenuItem key={region.id} asChild>
              <Link 
                href={`/${region.slug}`}
                className={`flex items-center gap-3 ${isCurrentRegion ? 'bg-gray-100 font-medium' : ''}`}
              >
                <span className="text-lg">{region.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{region.name}</div>
                  <div className="text-xs text-gray-500">{region.primaryExchange}</div>
                </div>
                {isCurrentRegion && <span className="text-orange-600">●</span>}
              </Link>
            </DropdownMenuItem>
          );
        })}
        
        {UPCOMING_REGIONS.length > 0 && (
          <>
            <DropdownMenuSeparator />
            
            {/* Coming Soon Regions */}
            <div className="px-2 py-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Coming Soon
              </div>
            </div>
            
            {UPCOMING_REGIONS.map((region) => (
              <DropdownMenuItem key={region.id} asChild>
                <Link 
                  href={`/${region.slug}`}
                  className="flex items-center gap-3 opacity-75"
                >
                  <span className="text-lg">{region.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{region.name}</div>
                    <div className="text-xs text-gray-500">{region.primaryExchange}</div>
                  </div>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full">
                    Soon
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Pipeline Link */}
        <DropdownMenuItem asChild>
          <Link href="/pipeline" className="flex items-center gap-3">
            <span className="text-lg">📈</span>
            <span>Global Pipeline</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}